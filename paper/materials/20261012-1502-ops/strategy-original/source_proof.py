import json,pathlib,subprocess
OUT=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
live=git('-C',str(ROOT/'.worktrees/live'),'rev-parse','HEAD')
commits={'apotheosis_base':'772b839f8ada31664cb764ea9ad3bdb03da27f64','apotheosis_six_pairs':'6e233ede76e5dd849f0d40760be64e7cdacf78b1','apotheosis_malaise':'b2805be4ba44b7375c7908d873889372cc3cfe6c','apotheosis_reference':'f98a929f24901c20efed462b29591e25ebb85451','simulation_reference':'45161a51c2c6b7e4a499b13cf749c4108193bbf5','selection_observation':'dc0e6080cb20c508d94c006648cc3edf0188d306','selection_terminal':'83512ddcd2c70fd9b983dc38524ff25c8970c1d3','hp_guard_audit':'f1542578594462e9f9f4e175488795fc480a8a13'}
proof={}
for label,c in commits.items():
 proof[label]={'commit':c,'live_ancestor':subprocess.run(['git','merge-base','--is-ancestor',c,live]).returncode==0,'subject':git('show','-s','--format=%s',c)}
paths=['agent/src/reflex/silent-apotheosis.ts','agent/src/reflex/silent-apotheosis-reference.ts','agent/src/reflex/silent-simulation-reference.ts','agent/src/reflex/silent-hp-guard-audit.ts','learner/lib/selection-execution.ts','learner/lib/selection-observation.ts','learner/lib/selection-terminal.ts']
blobs={p:{'base':git('rev-parse','HEAD:'+p),'live':git('rev-parse',live+':'+p)} for p in paths}
x={'base':git('rev-parse','HEAD'),'live_head':live,'commits':proof,'blobs':blobs}
(OUT/'live-source-verification.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(x,ensure_ascii=False))
