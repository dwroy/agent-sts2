## ops/codex-ops.sh

```text
46: paused() { [ -f "$DIR/PAUSE" ] || [ -f "$DIR/LLM_DRAIN" ]; }
230:     job="${1:-}"
231:     paused && exit 0
232:     exec 7> "$DIR/tick-$job.lock"
233:     flock -n 7 || exit 0
234:     # Sample on the existing five-minute job, under a separate lock and time bound. Never delay a stall check/wake.
235:     if [ "$job" = stall ]; then
264:       learn)
265:         python3 "$OPS/codex-ops-learn.py" tick >> "$DIR/learn.out" 2>&1 || log "learn tick failed (see learn.out)"
266:         nice -n 19 timeout 180s python3 "$OPS/open_book_refresh.py" --root "$ROOT" tick >> "$DIR/open-book.log" 2>&1 || log "open book refresh failed (see open-book.log)"
267:         ;;
268:       snapshot) tick_snapshot ;;
269:       *) echo "unknown job: $job" >&2; exit 2 ;;
270:     esac
```

## ops/codex-ops-learn.py

```text
396: def account_draining():
397:     """A manual account handoff blocks new work, never completion records or checks."""
398:     return any(os.path.isfile(os.path.join(DIR, name)) for name in ("LLM_DRAIN", "ACCOUNT_DRAIN"))
399: 
416:                               proposal_check=lambda report, current: proposal_dispatch.links(report, current, ROOT, SCRIPTS))
417:         if not account_draining():
418:             check_jobs(state, ROOT, SCRIPTS, batch["character"], alive, dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
419:         save_state(state)
440:             strategy_backfill_jobs.reconcile(state, DIR)
441:         if batch["state"] == "failed":
442:             batch["retry_at"] = time.time() + RETRY_AFTER_S
443:         if (not account_draining() and disk_admission.jobs_allowed(ROOT, DIR)
444:                 and batch.get("learner_task") in ("silent-boss-calibration", "boss-sim-batch")):
445:             boss_sim_jobs.check(state, ROOT, SCRIPTS, args.character, alive,
446:                                 dt.datetime.now().strftime("%Y%m%d-%H%M%S"), start_learner)
447:         if batch.get("proposal_repair_needed"):
448:             state.setdefault("proposal_repairs",{})[args.batch] = {"character":batch["character"],"runs":batch.get("runs",[]),"state":"pending","reason":"experience/proposal link audit failed"}
665:     # A merge request only appends an event; full checks manage their own short state transactions.
666:     if args.command in ("request-merge", "recheck", "core-notify", "status"):
667:         return handler(args) or 0
668:     with state_lock():
669:         if account_draining() and args.command in ("tick", "dispatch", "write", "boss-check"):
670:             print(json.dumps({"dispatched": None, "reason": "account_drain", "command": args.command}))
671:             return 75
672:         if args.command in ("dispatch", "write", "boss-check") and not disk_admission.jobs_allowed(ROOT, DIR):
673:             print(json.dumps({"dispatched": None, "reason": "disk_capacity_hold", "command": args.command}))
674:             return 75
675:         result = handler(args) or 0
676:         checks_pending = args.command == "finish" and load_state()["batches"].get(args.batch, {}).get("checks_pending")
677:     if checks_pending:
678:         cmd_recheck(args)
679:     if args.command in ("finish", "tick"):
680:         ordinary_close.close_pending(ROOT, DIR, enqueue)
```

## ops/codex-ops-learner.sh

```text
218:   fi
219:   [ "$learner_task" != boss-sim-batch ] || args+=(--set "evidence=${7}" --set "batch=$batch")
220:   if [ "$task" = postmortem ]; then args+=(--set "runs=$runs");
221:   elif [ "$task" = ascension-audit ]; then
222:     args+=(--set "runs=$runs" --set "target_ascension=$level" --set "previous_ascension=$previous")
223:   elif [ "$source_kind" != external ] && [ "$learner_task" != silent-historical-core-builds ]; then
224:     args+=(--set merge=live)
225:     [ "$task" = fix-batch ] || args+=(--set "runs=$runs")
226:   fi
227:   # The launcher may retry only a proven pre-session failure under this same registration.
228:   export LEARNER_BATCH_ID="$batch" LEARNER_STATE_FILE="$DIR/learn.json"
229:   unset LEARNER_BACKFILL_SOURCE LEARNER_EXTERNAL_SOURCE LEARNER_EXTERNAL_SERVICE_TIER
230:   if [ -n "$backfill_source" ]; then
231:     if [ "$source_kind" = external ]; then
232:       export LEARNER_EXTERNAL_SOURCE="$backfill_source"
233:       args+=(--service-tier fast)
234:     else
235:       export LEARNER_BACKFILL_SOURCE="$backfill_source"
236:     fi
237:   fi
```

## ops/run.sh

```text
10: fi
11: # Drain only at admission. Never use STOP, which cancels an in-flight brain request.
12: if [ -f "$ROOT/ops/codex-ops/LLM_DRAIN" ]; then
13:   echo "LLM drain: next play deferred" >&2
14:   exit 76
15: fi
16: cd "$LIVE/agent"
```

## ops/autoplay.sh

```text
49: mkdir -p "$NOTES"
50: restarts=0
51: while [ ! -f "$OPS/STOP" ]; do
52:   # A borrowed play must finish and report once; new play waits for the handoff.
53:   [ -z "${WAIT_PID:-}" ] && [ -f "$OPS/codex-ops/LLM_DRAIN" ] && break
54:   if [ -n "${WAIT_PID:-}" ]; then
55:     while kill -0 "$WAIT_PID" 2>/dev/null; do sleep 5; done
56:     WAIT_PID=""
```

## ops/open_book_refresh.py

```text
25: def tick(root):
26:     directory = root / 'data/external/open-book'
27:     pending = directory / 'pending'
28:     if not pending.exists():
29:         return {'status': 'empty'}
30:     with (directory / 'refresh.lock').open('a') as lock:
31:         try:
32:             fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
33:         except BlockingIOError:
34:             return {'status': 'busy'}
35:         spec = importlib.util.spec_from_file_location('open_book_builder', root / 'knowledge/builders/build-open-book.py')
69:         for path, row in requests:
70:             present = (row['kind'], row['id']) in indexed
71:             found += present
72:             builder.save(receipts / path.name, {**row, 'status': 'available' if present else 'unresolved-in-reviewed-snapshot',
73:                 'source_revision': builder.REV, 'catalog': 'data/external/open-book/catalog/knowledge',
74:                 'retry': '新来源/版本需许可核验；收据按 revision 分目录。未找到不能算补齐。'})
75:         return {'status': 'checked', 'checked': len(requests), 'available': found, 'unresolved': len(requests) - found}
76: 
77: 
78: if __name__ == '__main__':
79:     parser = argparse.ArgumentParser(description=__doc__)
80:     parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
```

## ops/llm_handoff.py

```text
76:         if state["phase"] != "prepared":
77:             return state
78:         # Scheduler dispatch and completion followups hold this same lock.
79:         with locked(self.runtime / "learn.lock"):
80:             # STOP also cancels in-flight brain requests. A drain must never create it.
81:             for relative in ("ops/codex-ops/LLM_DRAIN", "ops/codex-ops/PAUSE"):
82:                 path = self.root / relative
83:                 if path.exists():
84:                     if relative in state["owned_flags"] and path.read_text() == self.ident + "\n":
85:                         continue
86:                     if relative.endswith("LLM_DRAIN"):
87:                         raise ValueError("another transaction owns LLM_DRAIN")
88:                     if relative in state["owned_flags"]:
89:                         raise ValueError("admission flag ownership changed: " + relative)
90:                     if relative not in state["preserved_flags"]:
91:                         state["preserved_flags"].append(relative)
92:                 else:
93:                     if relative not in state["owned_flags"]:
94:                         state["owned_flags"].append(relative)
95:                     # Persist intent before mutation; a crash can be resumed without clearing another owner's flag.
```

## ops/strategy_external_jobs.py

```text
184:                     if old.get("state") not in ("done", "failed") or alive(old.get("pid")):
185:                         return None
186:                     shared.retired(bid, old, directory)
187:             base = subprocess.check_output(["git", "-C", root, "rev-parse", "main"], text=True).strip()
188:             if not re.fullmatch(r"[0-9a-f]{40}", base):
189:                 raise ValueError("invalid external dispatch base")
190:             result = writer(state, root, scripts, "strategy-proposal", character, [],
191:                             "strategy-external:" + ident + ":" + str(generation), "external", alive, stamp, external_source=ident)
192:             if result:
193:                 state["batches"][result[0]].update(external_binding={**binding, "retry_generation": generation, "dispatch_base": base},
194:                                                  external_registered_at=time.time())
```

## ops/worktree_checkout.py

```text
65:     base = retention.git(root, "rev-parse", ref).decode().strip()
66:     record = {"schema": "workspace-allocation-v1", "root": str(root), "worktree": str(tree),
67:               "branch": tree.name, "base": base, "at": retention.stamp(), "state": "allocating", "require_node": require_node,
68:               "excluded_generated_snapshots": list(EXCLUDED), "canonical_history_kept_in_main_and_git": True}
69:     retention.atomic(receipt, record)
70:     created = False
71:     try:
72:         retention.git(root, "worktree", "add", "--no-checkout", "-b", tree.name, str(tree), base)
73:         created = True
74:         set_profile(tree)
75:         retention.git(tree, "read-tree", "-mu", "HEAD")
76:         record["shared_tools"] = attach(root, tree, require_node=require_node)
77:         if retention.git(tree, "status", "--porcelain", "--untracked-files=all"):
78:             raise ValueError("new sparse workspace differs from its recorded base")
79:         record["publication_boundaries"] = worktree_retention.snapshot_publications(root)
80:         record.update(state="allocated", finished_at=retention.stamp())
81:         retention.atomic(receipt, record)
82:         return record
83:     except (OSError, ValueError, subprocess.SubprocessError) as error:
```
