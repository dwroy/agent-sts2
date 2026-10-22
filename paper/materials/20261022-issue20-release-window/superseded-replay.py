"""Replay the original #33 resource gate using only fixed fake APIs/processes."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'ops/codex-ops/agent-board-kit'))
from test_release_window import ReleaseWindow
import release_window

fixture = json.loads(Path(__file__).with_name('replay-fixture.json').read_text())
case = ReleaseWindow(methodName='test_0937_queue_pauses_35_36_and_integrator_release_once_then_review')
case.setUp()
try:
    case.tick()
    assert not case.notices(release_window.PAUSE) and not case.notices(release_window.FREE)
    (case.root / '.state/board.json').unlink()
    case.calls.clear()
    case.queued(fixture['queued_state'])
    value = json.loads(case.receipt.read_text())
    for key in ('runner_pid', 'runner_start', 'queued_at'):
        value[key] = fixture['terminal'][key]
    case.receipt.write_text(json.dumps(value))
    case.tick(); case.tick()
    assert len(case.notices(release_window.PAUSE)) == 3
    assert not any(a[4] == '#37 轮到你' for a in case.actions())
    case.queued(fixture['terminal']['state']); case.tick(); case.tick(); case.tick()
    assert len(case.notices(release_window.FREE)) == 3
    assert any(a[4] == '#37 轮到你' for a in case.actions())
    print(json.dumps(dict(fixed_replay=True, gh_herdr_and_kernel_reads='fake',
        source=fixture['sources'], historical_full_started=False,
        pause_recipients=[a[3] for a in case.notices(release_window.PAUSE)],
        release_recipients=[a[3] for a in case.notices(release_window.FREE)],
        integrator_review_held_then_delivered=True, no_queue_no_window_notice=True,
        signals_sent=0, actual_sessions_modified=0), ensure_ascii=False, indent=2))
finally:
    case.doCleanups()
