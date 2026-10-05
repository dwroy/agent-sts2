#!/usr/bin/env bash
# The scheduler of the codex ops session (Dai 2026-10-04 21:00; docs/codex-ops.md). Cron runs the mechanical work; the
# codex session (one session, resumed per wake) is woken with event messages only when something needs judgment.
#
#   bash ops/codex-ops.sh start            pre-check, install the cron block, create the session (first wake, in the background)
#   bash ops/codex-ops.sh start --loop     the same schedule from a setsid'ed bash loop instead of cron (PID in loop.pid)
#   bash ops/codex-ops.sh stop [--now]     remove the cron block / stop the loop (--now also stops a running wake by PID)
#   bash ops/codex-ops.sh status           cron, session (size, context, compactions), queue, wake, learner, last log lines
#   bash ops/codex-ops.sh pause | unpause  ticks and wakes do nothing while ops/codex-ops/PAUSE exists
#   bash ops/codex-ops.sh wake <text>      queue a `manual` event and wake now (in the background; --fg to wait)
#   bash ops/codex-ops.sh tick stall|learn|snapshot   one cron job (below), then deliver the queue
#   bash ops/codex-ops.sh drain            deliver the queued events (one wake at a time, flock; up to 5 wakes in a row)
#
# Cron (installed by start, between the BEGIN/END markers; other crontab lines are kept as they are):
#   */5 * * * *   tick stall      ops/stall-check.sh; OK -> nothing; STALL -> a `stall` event (same cause: woken again
#                                 after 10, 20, 40, 80, then every 120 min while it lasts)
#   13,43 * * * * tick learn      ops/codex-ops-learn.py tick: victories, a new ascension, post-mortem batches
#                                 (dispatched here, the learner-done event comes when a batch ends), 10 pending -> inbox
#   7 4 * * *     tick snapshot   ops/paper_dataset.py (full), the session file copied with keys redacted, a decision-log line
# Every tick also retries a queue a failed wake left behind.
set -u
. "$(dirname "$0")/paths.sh"
ROOT="${CODEX_OPS_ROOT:-$ROOT}"
DIR="${CODEX_OPS_DIR:-$ROOT/ops/codex-ops}"
QUEUE="$DIR/queue"
LOG="$DIR/scheduler.log"
export PATH="$HOME/.local/node/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export STS2_WORKSPACE="$ROOT"
TSX="${CODEX_OPS_TSX:-$OPS/../agent/node_modules/.bin/tsx}"
MAIN="$OPS/codex/main.ts"
MARK="agent-sts2 codex-ops"
mkdir -p "$DIR" "$QUEUE"

log() { echo "$(date '+%F %H:%M') $*" >> "$LOG"; }
paused() { [ -f "$DIR/PAUSE" ]; }

# enqueue <kind> <text>: one event file, <epoch ns>-<kind>.md (ops/codex/lib.ts readQueue).
enqueue() {
  local name; name="$(date +%s%N)-$1.md"
  printf '%s\n' "$2" > "$QUEUE/.$name" && mv "$QUEUE/.$name" "$QUEUE/$name"
  log "queued $1"
}

# drain [init]: wake while events are queued (at most 5 wakes in a row; events queued meanwhile go in the next one).
# "init" also wakes with an empty queue when there is no session yet (start: the first turn = the ops prompt).
drain() {
  local mode="${1:-}" i rc
  paused && return 0
  [ "${CODEX_OPS_NO_DRAIN:-0}" = 1 ] && return 0  # tests
  exec 8> "$DIR/wake.lock"
  flock -n 8 || { log "drain: a wake is running; the queue waits for it"; return 0; }
  for i in 1 2 3 4 5; do
    paused && break
    if ! ls "$QUEUE"/*.md > /dev/null 2>&1; then
      [ "$mode" = init ] && [ ! -s "$DIR/session-id" ] || break
    fi
    mode=""
    nice -n 5 "$TSX" "$MAIN" wake >> "$DIR/wake.out" 2>&1
    rc=$?
    if [ $rc -ne 0 ]; then
      echo "$(( $(cat "$DIR/fails" 2>/dev/null || echo 0) + 1 ))" > "$DIR/fails"
      log "wake failed (exit $rc, $(cat "$DIR/fails") in a row); the events stay queued for the next tick"
      # Tell the dev session once, at the third failure in a row.
      if [ "$(cat "$DIR/fails")" = 3 ]; then
        echo "- $(date '+%F %H:%M') [codex-ops 调度器] 运维 codex 会话连续 3 次叫不醒（最后 exit $rc；3 = codex 不可用或 key 隔离自检没过）。事件留在 ops/codex-ops/queue/，见 ops/codex-ops/scheduler.log。" >> "$ROOT/ops/inbox-dev.md"
      fi
      break
    fi
    rm -f "$DIR/fails"
  done
  flock -u 8
}

# The STALL backoff: same cause (digits stripped) -> wake again after 10, 20, 40, 80, then every 120 minutes.
tick_stall() {
  local out first sig now count next
  out=$(bash ${CODEX_OPS_STALL_CHECK:-"$OPS/stall-check.sh"} 2>&1)
  # The verdict is the line starting OK / STALL; anything before it (e.g. a /proc race from a process that just exited) is noise.
  first=$(printf '%s\n' "$out" | grep -E '^(OK|STALL)' | tail -1)
  [ -n "$first" ] || first=$(printf '%s\n' "$out" | head -1)
  if [ "${first:0:2}" = OK ]; then
    [ -f "$DIR/stall.state" ] && { log "stall over: $first"; rm -f "$DIR/stall.state"; }
    return 0
  fi
  sig=$(printf '%s' "$first" | tr -d '0-9' | cksum | cut -d' ' -f1)
  now=$(date +%s); count=0; next=0
  if [ -f "$DIR/stall.state" ]; then
    read -r osig count next < "$DIR/stall.state" || true
    [ "$osig" = "$sig" ] || { count=0; next=0; }
  fi
  if [ "$now" -lt "${next:-0}" ]; then
    log "stall (woken $count time(s) for this cause; next wake after $(date -d "@$next" '+%H:%M')): $first"
    return 0
  fi
  count=$((count + 1))
  local wait=$(( 10 * (1 << (count - 1)) )); [ "$wait" -gt 120 ] && wait=120
  echo "$sig $count $(( now + wait * 60 ))" > "$DIR/stall.state"
  rm -f "$QUEUE"/*-stall.md
  enqueue stall "卡死检查（第 $count 次，同一原因；下次最早 $wait 分钟后再叫你）：
$out"
}

# gitleaks over the archived codex transcripts (values redacted in its report). More findings than last time -> one inbox
# line for the dev session (not a wake: the ops session does not handle keys). The count is kept in gitleaks-session.count.
gitleaks_session() {
  local target="$ROOT/paper/materials/session/codex" report="$DIR/gitleaks-session.json" count last
  [ -d "$target" ] || return 0
  command -v "${CODEX_OPS_GITLEAKS:-gitleaks}" > /dev/null || { log "snapshot: gitleaks not installed"; return 0; }
  nice -n 10 "${CODEX_OPS_GITLEAKS:-gitleaks}" dir "$target" --no-banner --redact --log-level error \
    --report-format json --report-path "$report" --exit-code 0 > /dev/null 2>&1
  count=$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))))' "$report" 2>/dev/null || echo "?")
  last=$(cat "$DIR/gitleaks-session.count" 2>/dev/null || echo 0)
  echo "$count" > "$DIR/gitleaks-session.count"
  echo "gitleaks paper/materials/session/codex: $count finding(s) (report $report, values redacted)"
  if [ "$count" != "?" ] && [ "$count" -gt "${last:-0}" ] 2>/dev/null; then
    echo "- $(date '+%F %H:%M') [codex-ops 调度器] gitleaks 在 paper/materials/session/codex/（论文用的 codex 记录）里报了 $count 处（上次 $last），报告 $report（值已遮掉）。请开发会话核对是不是真 key。" >> "$ROOT/ops/inbox-dev.md"
  fi
}

tick_snapshot() {
  local rc out
  out="$DIR/snapshot.log"
  { echo "== $(date '+%F %T') paper_dataset.py"; nice -n 10 python3 "$ROOT/ops/paper_dataset.py"; } > "$out" 2>&1
  rc=$?
  nice -n 10 "$TSX" "$MAIN" snapshot-session >> "$out" 2>&1
  gitleaks_session >> "$out" 2>&1
  echo "- $(date '+%F %H:%M') 论文数据快照（codex-ops 调度器）：ops/paper_dataset.py 完整版 exit $rc；运维会话和学习者的 codex 记录替换 key 后复制到 paper/materials/session/codex/（gitleaks：$(cat "$DIR/gitleaks-session.count" 2>/dev/null || echo 未跑) 处）" >> "$ROOT/paper/materials/decision-log.md"
  [ $rc -eq 0 ] || enqueue snapshot-failed "每日快照 ops/paper_dataset.py 失败（exit $rc）。输出末尾：
$(tail -n 15 "$out")"
}

# The same schedule without cron (start --loop): one setsid'ed bash, PID in ops/codex-ops/loop.pid. Each job runs as its
# own `tick` process (they lock themselves), so a long learn tick never delays a stall check.
loop() {
  echo $$ > "$DIR/loop.pid"
  log "loop started (PID $$)"
  local last="" key m h
  while [ -f "$DIR/loop.pid" ] && [ "$(cat "$DIR/loop.pid" 2>/dev/null)" = "$$" ]; do
    key=$(date '+%F %H:%M'); m=$((10#$(date +%M))); h=$((10#$(date +%H)))
    if [ "$key" != "$last" ]; then
      last="$key"
      [ $((m % 5)) -eq 0 ] && bash "$OPS/codex-ops.sh" tick stall > /dev/null 2>&1 &
      { [ "$m" -eq 13 ] || [ "$m" -eq 43 ]; } && bash "$OPS/codex-ops.sh" tick learn > /dev/null 2>&1 &
      [ "$h" -eq 4 ] && [ "$m" -eq 7 ] && bash "$OPS/codex-ops.sh" tick snapshot > /dev/null 2>&1 &
    fi
    sleep $(( 61 - 10#$(date +%S) ))
  done
  log "loop stopped (PID $$)"
}
loop_pid() {
  local pid; pid=$(cat "$DIR/loop.pid" 2>/dev/null)
  [ -n "$pid" ] && tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q 'codex-ops\.sh loop' && echo "$pid"
}

cron_block() {
  local sh="$OPS/codex-ops.sh"
  echo "# BEGIN $MARK (ops/codex-ops.sh start/stop; docs/codex-ops.md)"
  echo "*/5 * * * * /bin/bash $sh tick stall >/dev/null 2>&1"
  echo "13,43 * * * * /bin/bash $sh tick learn >/dev/null 2>&1"
  echo "7 4 * * * /bin/bash $sh tick snapshot >/dev/null 2>&1"
  echo "# END $MARK"
}
without_block() { crontab -l 2>/dev/null | sed "/^# BEGIN $MARK/,/^# END $MARK/d"; }
cron_installed() { crontab -l 2>/dev/null | grep -q "^# BEGIN $MARK"; }

status() {
  echo "scheduler: cron $(cron_installed && echo installed || echo 'not installed'); loop $( [ -n "$(loop_pid)" ] && echo "running (PID $(loop_pid))" || echo 'not running')$(paused && echo '; PAUSED')"
  if [ -s "$DIR/session-id" ]; then "$TSX" "$MAIN" growth 2>&1 | head -3; else echo "session: none yet"; fi
  local pid; pid=$(cat "$DIR/wake.pid" 2>/dev/null)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then echo "wake: running (codex PID $pid)"; else echo "wake: idle"; fi
  echo "queue: $(ls "$QUEUE"/*.md 2>/dev/null | wc -l) event(s)$( [ -f "$DIR/fails" ] && echo ", $(cat "$DIR/fails") failed wake(s) in a row")"
  [ -f "$DIR/stall.state" ] && echo "stall state: $(cat "$DIR/stall.state")"
  python3 "$OPS/codex-ops-learn.py" status 2>&1 | tail -3
  echo "--- $LOG"; tail -n 8 "$LOG" 2>/dev/null
}

cmd="${1:-}"; shift || true
case "$cmd" in
  tick)
    job="${1:-}"
    paused && exit 0
    exec 7> "$DIR/tick-$job.lock"
    flock -n 7 || exit 0
    # Sample on the existing five-minute job, under a separate lock and time bound. Never delay a stall check/wake.
    if [ "$job" = stall ]; then
      (
        exec 6> "$DIR/usage.lock"
        flock -n 6 || exit 0
        exec nice -n 19 timeout 25s node --import "$OPS/../agent/node_modules/tsx/dist/loader.mjs" "$OPS/sample-subscription-usage.ts"
      ) > /dev/null 2>&1 &
    fi
    case "$job" in
      stall) tick_stall ;;
      learn) python3 "$OPS/codex-ops-learn.py" tick >> "$DIR/learn.out" 2>&1 || log "learn tick failed (see learn.out)" ;;
      snapshot) tick_snapshot ;;
      *) echo "unknown job: $job" >&2; exit 2 ;;
    esac
    flock -u 7
    drain ;;
  drain)
    drain "${1:-}" ;;
  wake)
    [ $# -ge 1 ] || { echo "usage: codex-ops.sh wake [--fg] <text>" >&2; exit 2; }
    fg=0; [ "$1" = --fg ] && { fg=1; shift; }
    enqueue manual "$*"
    if [ $fg = 1 ]; then drain; else setsid nohup bash "$OPS/codex-ops.sh" drain > /dev/null 2>&1 < /dev/null & fi ;;
  loop)
    loop ;;
  start)
    "$TSX" "$MAIN" precheck || { echo "pre-check failed: not starting" >&2; exit 3; }
    [ -f "$ROOT/ops/ops-session-silent-codex-prompt.md" ] || { echo "no ops/ops-session-silent-codex-prompt.md" >&2; exit 2; }
    if [ "${1:-}" = --loop ]; then
      cron_installed && { echo "the cron block is installed: stop first (one scheduler at a time)" >&2; exit 2; }
      if [ -z "$(loop_pid)" ]; then
        setsid nohup bash "$OPS/codex-ops.sh" loop > /dev/null 2>&1 < /dev/null &
        sleep 1
      fi
      echo "loop scheduler: PID $(loop_pid)"
    else
      [ -n "$(loop_pid)" ] && { echo "the loop scheduler runs (PID $(loop_pid)): stop first (one scheduler at a time)" >&2; exit 2; }
      if ! cron_installed; then { without_block; cron_block; } | crontab - && log "cron block installed"; fi
      crontab -l | sed -n "/^# BEGIN $MARK/,/^# END $MARK/p"
    fi
    rm -f "$DIR/PAUSE"
    if [ -s "$DIR/session-id" ]; then
      echo "session $(cat "$DIR/session-id") kept; the next event resumes it"
    else
      log "start: creating the session (first wake)"
      setsid nohup bash "$OPS/codex-ops.sh" drain init > /dev/null 2>&1 < /dev/null &
      echo "creating the session in the background (log: $LOG, $DIR/wakes/)"
    fi ;;
  stop)
    if cron_installed; then without_block | crontab - && log "cron block removed"; fi
    pid=$(loop_pid)
    if [ -n "$pid" ]; then rm -f "$DIR/loop.pid"; kill "$pid" && log "loop scheduler stopped (PID $pid)"; fi
    if [ "${1:-}" = --now ]; then
      pid=$(cat "$DIR/wake.pid" 2>/dev/null)
      if [ -n "$pid" ] && tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q codex; then kill -- "-$pid" 2>/dev/null || kill "$pid"; log "stop --now: stopped the wake (codex PID $pid)"; fi
    fi
    echo "stopped: no more ticks (session id kept in $DIR/session-id)" ;;
  pause) touch "$DIR/PAUSE"; log paused; echo paused ;;
  unpause) rm -f "$DIR/PAUSE"; log unpaused; echo unpaused ;;
  status) status ;;
  *) sed -n '2,24p' "$0"; exit 2 ;;
esac
