from pathlib import Path
import json,sys
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parent/'kit'))
from test_conversation import Boundaries
rows=[]
def run(name, mutate, expected):
 f=Boundaries('test_shadow_records_decision_and_never_sends_new_even_when_due'); f.setUp()
 try:
  f.d.polling=True; f.row.update(phase='pending',pane=f.agent['pane_id']); f.d.monitor.panes[f.agent['pane_id']]=dict(since=f.now-120)
  mutate(f)
  decision=f.plan();assert decision['would_clear'] is expected, (name,decision)
  assert f.actions()==[]
  rows.append(dict(case=name,would_clear=decision['would_clear'],reasons=decision['reasons'],external_actions=0))
 finally:f.doCleanups();f.tearDown()
run('due-idle-ready',lambda f:None,True)
run('idle-under-two-minutes',lambda f:f.d.monitor.panes[f.agent['pane_id']].update(since=f.now-119),False)
run('same-pane-sending',lambda f:f.row.update(phase='sending'),False)
run('same-pane-uncertain',lambda f:f.row.update(phase='uncertain'),False)
run('done-in-ten-minute-cooldown',lambda f:f.row.update(phase='done',sent_at=f.now-599),False)
run('cooldown-expired-but-no-due-intent',lambda f:f.row.update(phase='done',sent_at=f.now-601),False)
run('pending-different-issue',lambda f:f.row.update(issue=3),False)
run('pending-different-role',lambda f:f.row.update(role='ops'),False)
def recovery(f,disposition):
 f.row['recovery']={'watch':'test'}
 patcher=patch.object(f.d.monitor,'disposition',return_value=disposition);patcher.start();f.addCleanup(patcher.stop)
run('recovery-hold',lambda f:recovery(f,'hold'),False)
run('recovery-due',lambda f:recovery(f,'send'),True)
Path(__file__).with_suffix('.json').write_text(json.dumps(rows,indent=2)+'\n')
print(json.dumps(dict(cases=len(rows),passed=True,external_actions=0)))
