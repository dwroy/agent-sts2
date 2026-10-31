from pathlib import Path
import sys,json,copy,hashlib
W=Path('/home/dw/Projects/agent-sts2/.worktrees/integrator56-20261024-1948')
sys.path[:0]=[str(W/'ops/tests'),str(W/'ops')]
import test_strategy_external as fixture
import strategy_external_jobs as external
import strategy_backfill_jobs as shared
rows=[]
for status in ('failed','done'):
 c=fixture.External('runTest');c.setUp()
 try:
  c.four_plans();assert len(c.lanes())==4
  old=c.state['batches'][fixture.BID];c.native('ultrafast')
  old.update(state=status,pid=None,rc=1 if status=='failed' else 0)
  original=copy.deepcopy(old)
  try:shared.retired(fixture.BID,old,c.directory);retirement='accepted'
  except Exception as e:retirement=type(e).__name__+': '+str(e)
  before=len(c.calls);new=c.lanes('20260101-000010')
  rows.append(dict(status=status,original_batch=fixture.BID,original_native_task_has_no_terminal=True,
    original_retirement=retirement,old_batch_unchanged=old==original,new_launches=new,
    new_lane=c.state['batches'][new[0][0]]['external_lane'] if new else None,
    new_source=c.state['batches'][new[0][0]]['external_source'] if new else None,
    writer_calls_delta=len(c.calls)-before))
 finally:c.doCleanups()
print(json.dumps(rows,ensure_ascii=False,indent=2))
