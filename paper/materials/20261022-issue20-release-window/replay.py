"""Fixed #33/#36 migration replay. Only a local child exits via stdin, no signals."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'ops/codex-ops/agent-board-kit'))
from test_heavy import Queue

case = Queue(methodName='test_0937_legacy_36_exit_admits_queued_33_instead_of_refusing')
case.setUp()
try:
    case.test_0937_legacy_36_exit_admits_queued_33_instead_of_refusing()
    fixture = json.loads(Path(__file__).with_name('replay-fixture.json').read_text())
    print(json.dumps(dict(sources=fixture['sources'], historical_terminal=fixture['terminal'],
        new_workflow=True, task='#33 ops', existing_test='#36 dev (last remaining after #35)',
        waited_for_kernel_pidfd=True, queued_before_legacy_exit=True, executed_after_legacy_exit=True,
        no_resource_guard_refusal=True, historical_full_started=False,
        signals_sent=0, actual_sessions_modified=0, simulation='own fixed local child only'),
        ensure_ascii=False, indent=2))
finally:
    case.doCleanups()
