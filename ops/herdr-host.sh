#!/usr/bin/env bash
# Host long-running processes in herdr panes (Roy 2026-10-05; docs/codex-ops.md「herdr 托管」). Generic: it knows labels,
# panes and commands, nothing about the project. One workspace (label $HERDR_HOST_WORKSPACE, default sts2-run), one tab per
# label; label -> pane id is kept in $HERDR_HOST_STATE (default ops/codex-ops/herdr.json, git-ignored).
#
#   bash ops/herdr-host.sh available                 exit 0 when the herdr binary and its server answer
#   bash ops/herdr-host.sh ensure-workspace          print the workspace id (created when missing)
#   bash ops/herdr-host.sh open-pane <label> [--env K=V]...
#                                                    print the pane id: the recorded pane when it still exists and its
#                                                    shell is idle; a new tab otherwise; exit 4 when the label's pane is busy
#   bash ops/herdr-host.sh run <label> [--pidfile F] [--close-on-exit] [--tail-log F] [--env K=V]... -- <cmd> [args...]
#                                                    open-pane, then run the command in it (herdr pane run; --env K=V
#                                                    is put in front of it as `env K=V`, nothing secret: the line shows
#                                                    in the pane). Prints
#                                                    "<pane id> <pid>" (pid from --pidfile, waited for up to 10 s). Without
#                                                    --close-on-exit the command replaces the wrapper (pid = the command);
#                                                    with it the wrapper waits, then closes the pane, keeping its last
#                                                    lines in the tail log (pid = the wrapper, the command's parent)
#   bash ops/herdr-host.sh list | status [--json]    recorded labels: pane, alive (pane exists), busy, foreground pids
#   bash ops/herdr-host.sh stop <label> [--keep-pane]  ctrl+c, wait up to 10 s, close the pane (recorded labels only)
#   bash ops/herdr-host.sh close <label> [--pane ID] [--tail-log F] [--delay S]
#                                                    keep the pane's last lines in the tail log, close it, forget the label
#   bash ops/herdr-host.sh attach-hint               how to look at the panes from another machine
#
# Commands run in the pane's interactive shell: their environment is the herdr server's plus the pane's (--env), not the
# caller's. Closing a pane, or stopping the herdr server, kills what runs in it.
set -u
OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$OPS_DIR")"
HERDR="${HERDR_BIN:-$(command -v herdr 2>/dev/null || echo "$HOME/.local/bin/herdr")}"
WS_LABEL="${HERDR_HOST_WORKSPACE:-sts2-run}"
WS_CWD="${HERDR_HOST_CWD:-${CODEX_OPS_ROOT:-$ROOT_DIR}}"
STATE="${HERDR_HOST_STATE:-${CODEX_OPS_DIR:-$WS_CWD/ops/codex-ops}/herdr.json}"
TAIL_LOG_DEFAULT="$(dirname "$STATE")/herdr-panes.log"
LABEL_RE='^[a-z][a-z0-9._-]{0,63}$'

die() { echo "herdr-host: $1" >&2; exit "${2:-1}"; }
h() { "$HERDR" "$@"; }

# py <expr> [args...]: run a python snippet with the JSON on stdin as `d` (None when it is not JSON).
py() {
  local code="$1"; shift
  python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = None
$code" "$@"
}

state_get() { [ -f "$STATE" ] && py 'print((d or {}).get("panes", {}).get(sys.argv[1], {}).get("pane_id", ""))' "$1" < "$STATE"; }
state_labels() { [ -f "$STATE" ] && py 'print("\n".join(sorted((d or {}).get("panes", {}))))' < "$STATE"; }
state_set() {  # state_set <label> <pane id> [<workspace id>]
  mkdir -p "$(dirname "$STATE")"
  local tmp="$STATE.tmp.$$"
  { [ -f "$STATE" ] && cat "$STATE" || echo '{}'; } | py '
import time
d = d if isinstance(d, dict) else {}
label, pane, ws = sys.argv[1], sys.argv[2], sys.argv[3]
panes = d.setdefault("panes", {})
if pane:
    panes[label] = {"pane_id": pane, "since": time.strftime("%Y-%m-%d %H:%M:%S")}
else:
    panes.pop(label, None)
if ws:
    d["workspace_id"] = ws
d["workspace_label"] = sys.argv[4]
json.dump(d, sys.stdout, indent=1, sort_keys=True)
print()' "$1" "$2" "${3:-}" "$WS_LABEL" > "$tmp" && mv "$tmp" "$STATE"
}
# Serialise state changes and pane creation between concurrent callers.
lock() { mkdir -p "$(dirname "$STATE")"; exec 9> "$STATE.lock"; flock -w 30 9 || die "state lock busy"; }

available() { [ -x "$HERDR" ] || command -v "$HERDR" > /dev/null 2>&1 || return 1; h workspace list > /dev/null 2>&1; }

workspace_id() {
  h workspace list 2>/dev/null | py '
for w in ((d or {}).get("result") or {}).get("workspaces", []):
    if w.get("label") == sys.argv[1]:
        print(w["workspace_id"]); break' "$WS_LABEL"
}

ensure_workspace() {
  # Follow the live ops pane rather than the first workspace with a matching label.
  # Multiple workspaces may share that label after a reconnect or migration.
  local ws ops_pane
  ops_pane=$(state_get ops)
  ws=""
  if [ -n "$ops_pane" ]; then
    ws=$(pane_json "$ops_pane" | py '
p = ((d or {}).get("result") or {}).get("pane") or {}
if p.get("label") == "ops":
    print(p.get("workspace_id", ""))')
  fi
  [ -n "$ws" ] || ws=$(workspace_id)
  if [ -z "$ws" ]; then
    ws=$(h workspace create --cwd "$WS_CWD" --label "$WS_LABEL" --no-focus | py 'print(d["result"]["workspace"]["workspace_id"])') \
      || die "workspace create failed"
  fi
  [ -n "$ws" ] || die "no workspace $WS_LABEL"
  echo "$ws"
}

# pane_json <pane id>: the pane's info, empty when it does not exist.
pane_json() { h pane get "$1" 2>/dev/null; }
pane_label() { pane_json "$1" | py 'print((((d or {}).get("result") or {}).get("pane") or {}).get("label", ""))'; }
# pane_busy <pane id>: 0 = something runs in the foreground (not the pane's shell), 1 = the shell is idle, 2 = no such pane.
pane_busy() {
  local info; info=$(h pane process-info --pane "$1" 2>/dev/null) || return 2
  printf '%s' "$info" | py '
p = ((d or {}).get("result") or {}).get("process_info")
if not p:
    sys.exit(2)
sys.exit(0 if p.get("foreground_process_group_id") != p.get("shell_pid") else 1)'
}
pane_fg() {
  h pane process-info --pane "$1" 2>/dev/null | py '
p = ((d or {}).get("result") or {}).get("process_info") or {}
procs = [x for x in p.get("foreground_processes", []) if x.get("pid") != p.get("shell_pid")]
print(" ".join("%s:%s" % (x.get("pid"), x.get("name")) for x in procs))'
}
# A pane in the workspace that carries <label> (state lost, e.g. the state file was removed).
find_labelled() {
  h pane list --workspace "$1" 2>/dev/null | py '
for p in ((d or {}).get("result") or {}).get("panes", []):
    if p.get("label") == sys.argv[1]:
        print(p["pane_id"]); break' "$2"
}

open_pane() {
  local label="$1"; shift
  [[ "$label" =~ $LABEL_RE ]] || die "bad label: $label" 2
  local envs=() pane ws busy
  while [ $# -gt 0 ]; do
    case "$1" in --env) envs+=(--env "$2"); shift 2 ;; *) die "open-pane: unknown option $1" 2 ;; esac
  done
  ws=$(ensure_workspace) || exit 1
  pane=$(state_get "$label")
  if [ -n "$pane" ] && [ "$(pane_label "$pane")" != "$label" ]; then pane=""; fi
  if [ -n "$pane" ] && [ "$(pane_json "$pane" | py 'print(d["result"]["pane"].get("workspace_id", ""))')" != "$ws" ]; then
    pane_busy "$pane"; busy=$?
    [ $busy -eq 0 ] && die "pane $pane ($label) is busy in another workspace: $(pane_fg "$pane")" 4
    if [ $busy -eq 1 ]; then
      # Only migrate idle panes we own; preserve their last output before closing.
      { echo "=== $(date '+%F %T') $label ($pane) migrated; last lines:"; h pane read "$pane" --source recent-unwrapped --lines 40 2>/dev/null; } >> "$TAIL_LOG_DEFAULT"
      h pane close "$pane" > /dev/null || die "idle pane close failed ($pane)"
    fi
    state_set "$label" ""
    pane=""
  fi
  [ -n "$pane" ] || pane=$(find_labelled "$ws" "$label")
  if [ -n "$pane" ]; then
    pane_busy "$pane"; busy=$?
    if [ $busy -eq 1 ]; then state_set "$label" "$pane" "$ws"; echo "$pane"; return 0; fi
    [ $busy -eq 0 ] && die "pane $pane ($label) is busy: $(pane_fg "$pane")" 4
  fi
  pane=$(h tab create --workspace "$ws" --cwd "$WS_CWD" --label "$label" --no-focus "${envs[@]}" | py 'print(d["result"]["root_pane"]["pane_id"])') \
    || die "tab create failed"
  h pane rename "$pane" "$label" > /dev/null || die "pane rename failed"
  state_set "$label" "$pane" "$ws"
  # The new shell needs a moment before it takes input (pane run on a pane still starting loses the line).
  for _ in $(seq 1 50); do pane_busy "$pane"; [ $? -eq 1 ] && break; sleep 0.2; done
  echo "$pane"
}

quote() { local out="" a; for a in "$@"; do out+=" $(printf '%q' "$a")"; done; printf '%s' "${out# }"; }

run() {
  local label="$1"; shift
  local pidfile="" close=0 taillog="" envs=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --pidfile) pidfile="$2"; shift 2 ;;
      --close-on-exit) close=1; shift ;;
      --tail-log) taillog="$2"; shift 2 ;;
      --env) envs+=(--env "$2"); shift 2 ;;
      --) shift; break ;;
      *) die "run: unknown option $1" 2 ;;
    esac
  done
  [ $# -ge 1 ] || die "run: no command" 2
  lock
  local pane; pane=$(open_pane "$label") || exit $?
  [ -n "$pidfile" ] && rm -f "$pidfile"
  # --env K=V reaches the command (env K=V <cmd>), not just a new tab: the pane's shell does not have the caller's env.
  local line assigns=() i
  for ((i = 1; i < ${#envs[@]}; i += 2)); do assigns+=("${envs[$i]}"); done
  line="$(quote bash "$OPS_DIR/herdr-exec.sh" "$label" "${pidfile:--}" "$close" "${taillog:--}" "$STATE" --)"
  [ ${#assigns[@]} -gt 0 ] && line+=" $(quote env "${assigns[@]}")"
  line+=" $(quote "$@")"
  h pane run "$pane" " $line" > /dev/null || die "pane run failed ($pane)"
  local pid=""
  if [ -n "$pidfile" ]; then
    for _ in $(seq 1 50); do
      pid=$(cat "$pidfile" 2>/dev/null)
      # The file was removed before the run, so any PID in it is this run's (a short job may be over already).
      [[ "$pid" =~ ^[0-9]+$ ]] && break
      pid=""; sleep 0.2
    done
    [ -n "$pid" ] || die "no pid in $pidfile after 10 s (pane $pane)"
  fi
  echo "$pane${pid:+ $pid}"
}

close_pane() {
  local label="$1"; shift
  local pane="" taillog="$TAIL_LOG_DEFAULT" delay=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --pane) pane="$2"; shift 2 ;;
      --tail-log) [ "$2" != - ] && taillog="$2"; shift 2 ;;
      --delay) delay="$2"; shift 2 ;;
      *) die "close: unknown option $1" 2 ;;
    esac
  done
  [ "$delay" != 0 ] && sleep "$delay"
  [ -n "$pane" ] || pane=$(state_get "$label")
  [ -n "$pane" ] || die "no pane recorded for $label" 1
  [ "$(pane_label "$pane")" = "$label" ] || { lock; state_set "$label" ""; die "pane $pane is not labelled $label (gone?); forgot it" 1; }
  { echo "=== $(date '+%F %T') $label ($pane) closed; last lines:"; h pane read "$pane" --source recent-unwrapped --lines 40 2>/dev/null | grep -v '^[[:space:]]*$' | tail -n 30; } >> "$taillog"
  h pane close "$pane" > /dev/null
  lock; state_set "$label" ""
}

stop() {
  local label="$1" keep="${2:-}" pane
  state_labels | grep -qx -- "$label" || die "$label is not a label this helper started" 2
  pane=$(state_get "$label")
  [ "$(pane_label "$pane")" = "$label" ] || { lock; state_set "$label" ""; echo "$label: pane gone"; return 0; }
  h pane send-keys "$pane" ctrl+c > /dev/null
  for _ in $(seq 1 50); do pane_busy "$pane"; [ $? -ne 0 ] && break; sleep 0.2; done
  if [ "$keep" = --keep-pane ]; then echo "$label: interrupted ($pane kept)"; return 0; fi
  close_pane "$label" --pane "$pane"
  echo "$label: stopped, pane $pane closed"
}

status() {
  local json="${1:-}" label pane alive busy fg rows=""
  for label in $(state_labels); do
    pane=$(state_get "$label"); alive=no; busy=no; fg=""
    if [ -n "$pane" ] && [ "$(pane_label "$pane")" = "$label" ]; then
      alive=yes; pane_busy "$pane" && { busy=yes; fg=$(pane_fg "$pane"); }
    fi
    rows+="$label	$pane	$alive	$busy	$fg"$'\n'
  done
  if [ "$json" = --json ]; then
    printf '%s' "$rows" | python3 -c '
import json, sys
out = []
for line in sys.stdin.read().splitlines():
    label, pane, alive, busy, fg = (line.split("\t") + [""] * 5)[:5]
    out.append({"label": label, "pane_id": pane, "alive": alive == "yes", "busy": busy == "yes",
                "pids": [int(x.split(":")[0]) for x in fg.split() if x.split(":")[0].isdigit()]})
print(json.dumps(out))'
  else
    echo "workspace $WS_LABEL ($(workspace_id || true)); state $STATE"
    [ -n "$rows" ] && printf 'label\tpane\talive\tbusy\tforeground\n%s' "$rows" | column -t -s $'\t' || echo "(no panes recorded)"
  fi
}

cmd="${1:-}"; shift || true
case "$cmd" in
  available) available ;;
  ensure-workspace) available || die "herdr unavailable"; ensure_workspace ;;
  open-pane) [ $# -ge 1 ] || die "usage: open-pane <label>" 2; available || die "herdr unavailable"; lock; open_pane "$@" ;;
  run) [ $# -ge 1 ] || die "usage: run <label> [options] -- <cmd>" 2; [[ "$1" =~ $LABEL_RE ]] || die "bad label: $1" 2; available || die "herdr unavailable"; run "$@" ;;
  close) [ $# -ge 1 ] || die "usage: close <label>" 2; close_pane "$@" ;;
  stop) [ $# -ge 1 ] || die "usage: stop <label> [--keep-pane]" 2; available || die "herdr unavailable"; stop "$@" ;;
  list|status) status "${1:-}" ;;
  attach-hint)
    cat <<EOF
From the Mac (SSH_AUTH_SOCK set, see the memory card multi-machine-agent-control):
  herdr --machine xdwin workspace list                      # find "$WS_LABEL"
  herdr --machine xdwin pane list --workspace <id>          # one tab per label
  herdr --machine xdwin pane read <pane id> --source recent-unwrapped --lines 80
  herdr --machine xdwin agent read ops --source recent-unwrapped --lines 80   # the ops codex TUI
  herdr --remote xdwin                                      # the full TUI; pick workspace "$WS_LABEL"
On xdwin: herdr (attach), or bash ops/herdr-host.sh status.
Typing into the ops pane: see docs/codex-ops.md (the scheduler waits while the composer holds unsent text).
EOF
    ;;
  *) sed -n '2,24p' "$0"; exit 2 ;;
esac
