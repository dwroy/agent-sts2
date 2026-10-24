from pathlib import Path
import sys,json,subprocess
R=Path('/home/dw/Projects/agent-sts2');W=R/'.worktrees/integrator20-publication-history-20261024-1623';M=R/'paper/materials/20261024-issue20-history-integrator';sys.path.insert(0,str(W/'ops/tests'));from test_worktree_retention import WorkspaceRetention,resource
case=WorkspaceRetention('test_retirement_keeps_sources_original_events_and_restores_workspace');case.setUp()
try:
 name='agent/src/example.ts'
 # This live value exists before the task allocation, on the already-diverged live channel.
 old_live=case.published_leaf(case.live,name,'export const fixed = 2;\n','live value before allocation')
 base=case.published_leaf(case.root,name,'export const fixed = 0;\n','new main allocation baseline')
 case.git('merge','--ff-only','main',tree=case.tree)
 source=case.source_leaf(name,'export const fixed = 2;\n')
 main_adoption=case.published_leaf(case.root,name,'export const fixed = 2;\n','actual new main adoption')
 main=case.published_leaf(case.root,name,'export const fixed = 3;\n','later main evolution')
 live=case.published_leaf(case.live,name,'export const fixed = 3;\n','later live evolution without task adoption')
 result=resource.acceptance(case.root,case.tree,source,main,live,base)
 witnesses=result['publication_witnesses'];bad=next(r for r in witnesses if r['publication']==live)
 assert bad['commit']==old_live
 out=dict(kind='fixed temporary repository only; no production changes',scenario='diverged live contains matching leaf only before task allocation; new task adopted only main',base=base,source=source,old_live_before_allocation=old_live,main_adoption=main_adoption,main=main,live=live,expected='retain: no post-allocation live adoption witness',actual='accepted',proof=result)
 (M/'preallocation-diverged-live-counterexample.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
finally:case.doCleanups()
