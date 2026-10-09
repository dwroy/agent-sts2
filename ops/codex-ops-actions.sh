#!/usr/bin/env bash
# The allow-listed actions the codex ops session may ask for outside its sandbox (docs/codex-ops.md). Run only by the
# wake process's broker (ops/codex/main.ts, outside the sandbox), after ops/codex/lib.ts validateRequest; each action
# checks its own arguments again. The sandbox has its own PID namespace, no network (not 127.0.0.1 either) and no
# Windows interop, so these are the only ways the session touches processes, the mod's HTTP state and Windows.
#
#   bash ops/codex-ops-actions.sh <action> [arg]
#
#   procs              our processes: autoplay, stop-after, play, report.py, learner runs, the scheduler's wake
#   stall-check        ops/stall-check.sh
#   mod-state          GET 127.0.0.1:8080/state (the STS2-Agent mod), complete validated JSON
#   autoplay-start     the ops prompt's start: refuses while autoplay / stop-after / play runs; rm ops/STOP; starts
#                      ops/autoplay.sh with setsid nohup; prints its PID and live's commit (PID in ops/codex-ops/autoplay.pid)
#   autoplay-reload <old PID> <play PID>  replace the verified old loop with WAIT_PID; preserve play and return versions
#   autoplay-stop      kill the autoplay bash started by autoplay-start (by PID, after checking its command line)
#   play-stop          ops/stop.sh (stops the play node process by PID; autoplay starts the next one)
#   kill <pid>         kill one of our processes by PID: autoplay.sh, stop-after*.sh, index.ts play, report.py, learner/run.ts
#   launch-game        start STS2 on the desktop session (schtasks /it, memory card launch-game-on-desktop), then wait
#                      for the mod; refuses while SlayTheSpire2.exe runs
#   win-procs          Windows processes: steam.exe, steamwebhelper count, SlayTheSpire2.exe, with their session
#   win-kill <pid>     taskkill a steam.exe / SlayTheSpire2.exe that runs in session 0 (Services) only
#   postmortem <ids>   start a post-mortem batch now (ops/codex-ops-learn.py dispatch)
#   learner-status     the post-mortem batches (ops/codex-ops-learn.py status)
#   scheduler-status   ops/codex-ops.sh status
#   eval-metrics <character> <ascension>  full metrics for one character/ascension, saved as a new Markdown report
set -u
. "$(dirname "$0")/paths.sh"
ROOT="${CODEX_OPS_ROOT:-$ROOT}"
DIR="${CODEX_OPS_DIR:-$ROOT/ops/codex-ops}"
export PATH="$HOME/.local/node/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
MOD="${CODEX_OPS_MOD_URL:-http://127.0.0.1:8080}"
WIN=/mnt/c/Windows/System32
STEAM_URI="steam://rungameid/2868840"
TASK=sts2-launch-desktop
action="${1:-}"; arg="${2:-}"

# Our processes (never this script): pid + command line.
ours() {
  pgrep -af 'ops/autoplay\.sh|ops/stop-after[^ ]*\.sh|index\.ts pla[y]|ops/report\.py|knowledge/builders/|learner/run\.ts|codex-ops-learner\.sh|ops/codex/main\.ts' 2>/dev/null \
    | grep -v -E '^[0-9]+ (pgrep|grep) ' | cut -c1-220
}
play_pids() {
  for p in $(pgrep -x node); do
    tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'index\.ts pla[y]' && echo "$p"
  done
}
cmdline() { tr '\0' ' ' < "/proc/$1/cmdline" 2>/dev/null; }
tasklist() { (cd /mnt/c && timeout 30 "$WIN/tasklist.exe" /FO CSV /NH 2>/dev/null | tr -d '\r'); }
# hosting <key> <env name> <default>: $<env name>, else "<key>=<value>" in $DIR/hosting (ops/learner_jobs.py hosting).
hosting() {
  local value="${!2:-}"
  [ -z "$value" ] && [ -f "$DIR/hosting" ] && value=$(sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*\([a-z]*\).*/\1/p" "$DIR/hosting" | tail -1)
  echo "${value:-$3}"
}

case "$action" in
  codex-brain-cache-probe)
    [ "$#" -eq 1 ] || { echo "codex-brain-cache-probe takes no arguments"; exit 2; }
    CACHE_WORKTREE="$ROOT/.worktrees/codex-brain-cache"
    CACHE_RUN="$CACHE_WORKTREE/learner/runs/20261008-153529-codex-brain-cache"
    CACHE_RUNNER="$CACHE_WORKTREE/ops/codex-brain-cache-probe.ts"
    CACHE_AGENT_TREE="08dd9a59bb69317f447d770fe6207474b4c82c6f"
    CACHE_RUNNER_SHA="094c940768dc1177166ec70bb138f4f86ced85c07865e14c4d3a13116a72e935"
    [ "$(sha256sum "$CACHE_RUNNER" | cut -d ' ' -f1)" = "$CACHE_RUNNER_SHA" ] || { echo "probe runner differs from tested source"; exit 2; }
    git -C "$CACHE_WORKTREE" diff --quiet "$CACHE_AGENT_TREE" HEAD:agent || { echo "probe agent tree differs from tested source"; exit 2; }
    git -C "$CACHE_WORKTREE" diff --quiet HEAD -- agent/src || { echo "probe source is dirty"; exit 2; }
    git -C "$CACHE_WORKTREE" diff --cached --quiet HEAD -- agent/src || { echo "probe source index is dirty"; exit 2; }
    exec nice -n 19 node --import "$CACHE_WORKTREE/agent/node_modules/tsx/dist/loader.mjs" "$CACHE_RUNNER" ;;
  procs)
    ours || true
    [ -f "$DIR/autoplay.pid" ] && echo "autoplay.pid: $(cat "$DIR/autoplay.pid")"
    [ -f "$ROOT/ops/STOP" ] && echo "ops/STOP present"
    [ -f "$DIR/herdr.json" ] && { echo "herdr panes:"; timeout 20 bash "$OPS/herdr-host.sh" status 2>&1 | tail -n +2; }
    exit 0 ;;
  stall-check)
    exec bash "$ROOT/ops/stall-check.sh" ;;
  mod-state)
    response=$(curl -fs -m 10 -w '\n%{http_code}' "$MOD/state"); rc=$?
    [ $rc -ne 0 ] && { echo "mod unreachable (curl exit $rc)"; exit 1; }
    out="${response%$'\n'*}"; http="${response##*$'\n'}"
    [ "$http" = 200 ] || { echo "mod state request failed (HTTP $http)"; exit 1; }
    printf '%s' "$out" | python3 "$OPS/mod-state.py" --json
    exit $? ;;
  autoplay-start)
    busy=$(pgrep -af 'ops/autoplay\.sh|ops/stop-after[^ ]*\.sh' | grep -v -E '^[0-9]+ (pgrep|grep) ')
    play=$(play_pids)
    if [ -n "$busy" ] || [ -n "$play" ]; then
      echo "refused: still running:"; [ -n "$busy" ] && echo "$busy"; [ -n "$play" ] && echo "play PIDs: $play"
      exit 1
    fi
    rm -f "$ROOT/ops/STOP"
    mkdir -p "$DIR"
    pid=""; where=""
    # hosting autoplay=herdr (docs/codex-ops.md「herdr 托管」): in the herdr pane `autoplay`; the PID file is the same.
    if [ "$(hosting autoplay CODEX_OPS_AUTOPLAY_HOST setsid)" = herdr ]; then
      out=$(bash "$OPS/herdr-host.sh" run autoplay --pidfile "$DIR/autoplay.pid" -- bash "$ROOT/ops/autoplay.sh" 2>&1)
      if [[ "$out" =~ ^([a-zA-Z0-9]+:p[0-9]+)\ ([0-9]+)$ ]]; then pid="${BASH_REMATCH[2]}"; where=" in herdr pane ${BASH_REMATCH[1]} (label autoplay)"
      else echo "herdr unavailable or refused (${out:0:200}); starting with setsid"; fi
    fi
    if [ -z "$pid" ]; then
      setsid nohup bash "$ROOT/ops/autoplay.sh" > /dev/null 2>&1 < /dev/null &
      pid=$!
      echo "$pid" > "$DIR/autoplay.pid"
    fi
    sleep 2
    kill -0 "$pid" 2>/dev/null || { echo "autoplay (PID $pid) exited at once; see ops/autoplay.log"; exit 1; }
    echo "autoplay started: PID $pid$where; live $(git -C "$LIVE" rev-parse --short HEAD 2>/dev/null); $(date '+%F %T')"
    exit 0 ;;
  autoplay-reload)
    [ $# -eq 3 ] || { echo "autoplay-reload 需要旧 autoplay PID 和当前 play PID"; exit 2; }
    old_pid="$2"; play_pid="$3"
    for pid in "$old_pid" "$play_pid"; do
      [[ "$pid" =~ ^[1-9][0-9]{0,9}$ ]] && [ "$pid" -gt 1 ] && [ "$pid" -le 2147483647 ] \
        || { echo "autoplay-reload 需要有效 PID"; exit 2; }
    done
    [ "$old_pid" != "$play_pid" ] || { echo "两个 PID 必须不同"; exit 2; }
    exec nice -n 19 python3 "$OPS/autoplay-reload.py" "$ROOT" "$LIVE" "$DIR" "$old_pid" "$play_pid"
    ;;
  autoplay-stop)
    pid=$(cat "$DIR/autoplay.pid" 2>/dev/null)
    if [ -z "$pid" ] || ! cmdline "$pid" | grep -q 'ops/autoplay\.sh'; then
      echo "no autoplay started by autoplay-start is running${pid:+ (PID $pid is not ops/autoplay.sh)}; running ones:"
      pgrep -af 'ops/autoplay\.sh' | grep -v -E '^[0-9]+ (pgrep|grep) ' || echo "(none)"
      exit 1
    fi
    kill "$pid" && echo "stopped autoplay PID $pid" && rm -f "$DIR/autoplay.pid"
    exit 0 ;;
  play-stop)
    exec bash "$ROOT/ops/stop.sh" ;;
  kill)
    [[ "$arg" =~ ^[0-9]+$ ]] || { echo "kill takes a PID"; exit 2; }
    line=$(cmdline "$arg")
    [ -n "$line" ] || { echo "no process $arg"; exit 1; }
    [ "$(stat -c %u "/proc/$arg")" = "$(id -u)" ] || { echo "refused: $arg is not ours"; exit 2; }
    echo "$line" | grep -q -E 'ops/autoplay\.sh|ops/stop-after[^ ]*\.sh|index\.ts play|ops/report\.py|learner/run\.ts' \
      || { echo "refused: $arg is not autoplay / stop-after / play / report.py / a learner run: ${line:0:160}"; exit 2; }
    kill "$arg" && echo "sent SIGTERM to $arg (${line:0:120})"
    exit 0 ;;
  launch-game)
    procs=$(tasklist); rc=$?
    [ $rc -ne 0 ] && { echo "tasklist.exe failed (rc=$rc): Windows interop is down, not launching"; exit 1; }
    if printf '%s\n' "$procs" | grep -qi '"SlayTheSpire2.exe"'; then
      echo "refused: SlayTheSpire2.exe is running:"; printf '%s\n' "$procs" | grep -i -E '"(steam|SlayTheSpire2)\.exe"'
      exit 1
    fi
    cd /mnt/c || exit 1
    "$WIN/schtasks.exe" /create /tn "$TASK" /tr "C:\\Windows\\explorer.exe $STEAM_URI" /sc once /st 23:59 /it /f 2>&1 | tr -d '\r'
    "$WIN/schtasks.exe" /run /tn "$TASK" 2>&1 | tr -d '\r'
    sleep 10
    "$WIN/schtasks.exe" /delete /tn "$TASK" /f 2>&1 | tr -d '\r'
    for _ in $(seq 1 36); do
      # Validate the same successful HTTP response we report; transport alone is not readiness.
      response=$(curl -fs -m 4 -w '\n%{http_code}' "$MOD/state"); rc=$?
      state="${response%$'\n'*}"; http="${response##*$'\n'}"
      if [ $rc -eq 0 ] && [ "$http" = 200 ] && screen=$(printf '%s' "$state" | python3 "$OPS/mod-state.py" 2>/dev/null); then
        echo "mod answers: $screen"
        tasklist | grep -i -E '"(steam|SlayTheSpire2)\.exe"'
        exit 0
      fi
      sleep 5
    done
    echo "the mod did not answer within 3 minutes after the launch:"; tasklist | grep -i -E '"(steam|SlayTheSpire2)\.exe"'
    exit 1 ;;
  win-procs)
    procs=$(tasklist); rc=$?
    [ $rc -ne 0 ] && { echo "tasklist.exe failed (rc=$rc)"; exit 1; }
    printf '%s\n' "$procs" | grep -i -E '"(steam|SlayTheSpire2|steamservice)\.exe"' || echo "(no steam.exe / SlayTheSpire2.exe)"
    echo "steamwebhelper.exe: $(printf '%s\n' "$procs" | grep -ci '"steamwebhelper.exe"')"
    exit 0 ;;
  win-kill)
    [[ "$arg" =~ ^[0-9]+$ ]] || { echo "win-kill takes a Windows PID"; exit 2; }
    row=$(tasklist | python3 -c '
import csv, sys
pid = sys.argv[1]
for row in csv.reader(sys.stdin):
    if len(row) >= 4 and row[1] == pid:
        print("\t".join(row[:4]))
' "$arg")
    [ -n "$row" ] || { echo "no Windows process $arg"; exit 1; }
    image=$(cut -f1 <<< "$row"); session=$(cut -f3 <<< "$row")
    case "${image,,}" in steam.exe|slaythespire2.exe) ;; *) echo "refused: $arg is $image"; exit 2 ;; esac
    [ "$session" = "Services" ] || { echo "refused: $image $arg runs in session '$session' (only session 0 / Services instances may be closed here; the desktop one is Dai's)"; exit 2; }
    (cd /mnt/c && "$WIN/taskkill.exe" /PID "$arg" /F 2>&1 | tr -d '\r')
    exit 0 ;;
  postmortem)
    exec python3 "$OPS/codex-ops-learn.py" dispatch --runs "$arg" ;;
  experience-update)
    exec python3 "$OPS/codex-ops-learn.py" write --task experience-update --runs "$arg" ;;
  fix-batch)
    exec python3 "$OPS/codex-ops-learn.py" write --task fix-batch ;;
  core-build-notify)
    [ $# -eq 2 ] && [[ "$arg" =~ ^[0-9]{8}-[0-9]{6}-fix-batch$ ]] || exit 2
    exec nice -n 19 python3 "$OPS/codex-ops-learn.py" core-notify --batch "$arg" ;;
  boss-sim-check)
    CODEX_OPS_ROOT="$ROOT" exec nice -n 19 python3 "$ROOT/.worktrees/live/ops/codex-ops-learn.py" boss-check ;;
  strategy-proposal)
    [ $# -eq 2 ] && [[ "$arg" =~ ^[0-9A-Z]{12}(,[0-9A-Z]{12}){0,9}$ ]] || exit 2
    exec python3 "$OPS/codex-ops-learn.py" write --task strategy-proposal --runs "$arg" ;;
  learner-merge)
    exec python3 "$OPS/codex-ops-learn.py" request-merge --branch "$arg" ;;
  learner-recheck)
    [ $# -eq 2 ] && [[ "$arg" =~ ^[0-9]{8}-[0-9]{6}-(experience-update|fix-batch|strategy-proposal)$|^[0-9]{8}-[0-9]{6}-s2-strategy-proposal$ ]] || exit 2
    exec nice -n 19 python3 "$OPS/codex-ops-learn.py" recheck --batch "$arg" ;;
  eval-metrics)
    [ $# -eq 3 ] || { echo "eval-metrics takes character and ascension" >&2; exit 2; }
    case "$arg" in ironclad|silent|regent|necrobinder|defect) ;; *) echo "eval-metrics: unknown character" >&2; exit 2 ;; esac
    asc="$3"
    [[ "$asc" =~ ^(0|[1-9][0-9]{0,2})$ ]] || { echo "eval-metrics: ascension must be an integer 0-999 without leading zeros" >&2; exit 2; }
    python="$ROOT/data/logdb-venv/bin/python"
    [ -x "$python" ] || { echo "eval-metrics: missing log database Python: $python" >&2; exit 127; }
    folder="$ROOT/paper/materials/$arg"
    mkdir -p "$folder" || exit 1
    stamp=$(date '+%Y%m%d-%H%M%S') || exit 1
    report_tmp=$(mktemp "$folder/.a${asc}-metrics-${stamp}.XXXXXX") || exit 1
    trap 'rm -f -- "$report_tmp"' EXIT
    # Keep failures and partial output out of the published reports; never overwrite an earlier snapshot.
    (cd "$ROOT" && nice -n 19 "$python" "$ROOT/eval/metrics.py" --character "$arg" --ascension "$asc" --group-by ascension --md) > "$report_tmp"
    rc=$?
    [ $rc -eq 0 ] || { echo "eval-metrics failed (exit $rc); no report published" >&2; exit "$rc"; }
    [ -s "$report_tmp" ] || { echo "eval-metrics: empty output; no report published" >&2; exit 1; }
    name="${report_tmp##*/}"
    report="$folder/${name#.}.md"
    mv -- "$report_tmp" "$report" || exit 1
    trap - EXIT
    printf 'eval-metrics saved: %s\n' "$report"
    exit 0 ;;
  learner-status)
    exec python3 "$OPS/codex-ops-learn.py" status ;;
  scheduler-status)
    exec bash "$OPS/codex-ops.sh" status ;;
  *)
    echo "unknown action: $action"; exit 2 ;;
esac
