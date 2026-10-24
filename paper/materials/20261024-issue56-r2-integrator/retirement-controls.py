from pathlib import Path
import sys,json,copy
W=Path('/home/dw/Projects/agent-sts2/.worktrees/integrator56-r2-20261024-2026')
sys.path[:0]=[str(W/'ops/tests'),str(W/'ops')]
import test_strategy_external as f
import strategy_external_jobs as e
import strategy_backfill_jobs as shared
rows=[]
for status,rc in (('failed',1),('done',0)):
 c=f.External('runTest');c.setUp()
 try:
  c.four_plans();assert len(c.lanes())==4;c.native('ultrafast')
  old=c.state['batches'][f.BID];old.update(state=status,rc=rc,pid=None);original=copy.deepcopy(old)
  try:shared.retired(f.BID,old,c.directory)
  except ValueError:pass
  else:raise AssertionError('open native accepted')
  blocked=c.lanes('20260101-000010');assert blocked==[] and old==original
  c.retire_native(rc);shared.retired(f.BID,old,c.directory)
  resumed=c.lanes('20260101-000011');assert len(resumed)==1
  new=c.state['batches'][resumed[0][0]]
  assert new['external_source']=='lane-unit-4' and new['external_lane']=='A' and old==original
  rows.append(dict(status=status,rc=rc,unverified_blocked=True,actual_original_retirement_accepted=True,
    successor_plan=new['external_source'],successor_lane=new['external_lane'],successor_count=len(resumed),old_batch_unchanged=True))
 finally:c.doCleanups()
c=f.External('runTest');c.setUp()
try:
 c.test_terminal_unknown_owner_keeps_its_lane_and_other_lanes_and_own_slot_continue()
 rows.append(dict(control='unknown A; other B and own slot continue; downgrade retains reservation',passed=True))
finally:c.doCleanups()
print(json.dumps(rows,ensure_ascii=False,indent=2))
