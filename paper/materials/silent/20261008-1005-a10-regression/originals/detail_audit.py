import collections as C
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess

P=Path(__file__).resolve().parent
WT=P.parents[2]
ROOT=WT.parents[1]
def read(n):return json.loads((P/n).read_text())
def save(n,x):(P/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def jsonl(n):return [json.loads(s) for s in (P/'scratch/frozen-logs'/n).read_text().splitlines()]
def pct(k,n):return {'k':k,'n':n,'p':k/n if n else None}
rs=read('sample-table.json');by={r['run_id']:r for r in rs}
ds=read('decision-index.json');fs=read('frame-index.json');fights=read('fights.json');sl=read('sl.json')
bra=jsonl('brain.jsonl');trace=jsonl('codex-calls.jsonl');configs=jsonl('run-config.jsonl')
out={}
for name in ['all','codex']:
    rows=[r for r in rs if name=='all' or r['brain_source']['source']==name]
    for post in [False,True]:
        rr=[r for r in rows if r['exposures']['S1.double-boss1']==post];ids={r['run_id'] for r in rr}
        choices=[]
        for b in bra:
            if b['run_id'] not in ids or not b.get('answer') or b.get('error'):continue
            if b['label'] not in ['rest/plan','reward/card']:continue
            payload=b.get('payload') or {};facts=payload.get('facts') or {};brief=payload.get('run_brief') or {};situ=payload.get('situation') or {}
            floor=facts.get('floor',situ.get('floor',brief.get('floor')))
            act=facts.get('act',situ.get('act',brief.get('act')))
            answer=b['answer'];choice=answer.get('choice'); option=b.get('options',{}).get(choice)
            try:option=json.loads(option)
            except (ValueError,TypeError):option={'text':option}
            choices.append({'run_id':b['run_id'],'floor':floor,'act':act,'label':b['label'],'choice':choice,'option':option,'reason':answer.get('reason'),'question_id':b.get('question_id')})
        won=[f for f in fights if f['run_id'] in ids and f['act']==2 and f['room'] in ['hallway','unknown_room'] and f['outcome']=='won']
        out[f'{name}/{"post" if post else "pre"}']={'choices':choices,'rest_kinds_by_act':{str(a):dict(C.Counter(c['option'].get('kind','unknown') for c in choices if c['label']=='rest/plan' and int(c['act'] or 0)==a)) for a in [1,2,3]},'card_picks_by_act':{str(a):dict(C.Counter('skip' if c['choice']=='skip' else 'take' for c in choices if c['label']=='reward/card' and int(c['act'] or 0)==a)) for a in [1,2,3]},'won_act2_hallways':{'fights':len(won),'runs':len(set(f['run_id'] for f in won)),'mean_hp_loss':sum(f['hp_loss'] or 0 for f in won)/len(won) if won else None,'potions_drunk':sum(f['potions_n'] or 0 for f in won)}}
save('route-build-resources.json',out)
chains=[]
for r in rs:
    if not r['act2_road_death']:continue
    rid=r['run_id']
    chain=[{k:f[k] for k in ['fight_no','act','floor','room','encounter','entry_hp','last_hp','post_hp','hp_loss','net_hp_loss','outcome','potions_in','potions_used','potions_n','first_off','last_off']} for f in fights if f['run_id']==rid]
    rests=[d for d in ds if d['run_id']==rid and d['label']=='rest/plan']
    chains.append({'run_id':rid,'post_double':r['exposures']['S1.double-boss1'],'source':r['brain_source']['source'],'entry2':r['entry2'],'fights':chain,'rest_decisions':rests,'sl':[s for s in sl if s['run_id']==rid],'limitation':'fights view combines uninterrupted SL repeats; entry/last/post can cross attempts. Raw frames and SL attempts are retained; winning pre-death hallway floors do not imply a counterfactual win.'})
save('resource-chains.json',chains)
brainout={}
for post in [False,True]:
    ids={r['run_id'] for r in rs if r['exposures']['V4.codex-only1']==post}
    bb=[b for b in bra if b['run_id'] in ids]; tt=[t for t in trace if t['run_id'] in ids]
    bad=[t for t in tt if t.get('outcome')!='answered']
    brainout['post' if post else 'pre']={'run_ids':sorted(ids),'brain_rows':len(bb),'successful_by_engine':dict(C.Counter(b['engine'] for b in bb if b.get('answer') and not b.get('error') and not b.get('problems'))),'failed_brain_rows':[{k:b.get(k) for k in ['run_id','ts','question_id','label','error','problems']} for b in bb if not b.get('answer') or b.get('error') or b.get('problems')],'codex_trace_rows':len(tt),'trace_outcomes':dict(C.Counter(t.get('outcome') for t in tt)),'failed_trace_rows':bad,'distinct_failed_trace_questions':len({t.get('question_id') for t in bad}),'failed_by_label':dict(C.Counter(t['label'] for t in bad)),'brain_substitutions_after_failure':0,'substitution_basis':'All logged failed brain questions resolve in Codex; preflight DeepSeek runs separately excluded. Code/Jev combat, forced choices and stored one-shot follow-ups are execution roles.'}
save('engine-audit.json',brainout)
# Standard calibration merges turns across uninterrupted SL. Exclude repeated-SL fights from aggregate errors.
pred=read('combat-predictions.json')['rows']; repeated={(s['run_id'],s['floor']) for s in sl if s['attempt']>1}
summary={}
for post in [False,True]:
    rows=[x for x in pred if x['act']==2 and x['room'] in ['hallway','unknown_room'] and by[x['run_id']]['brain_source']['source']=='codex' and by[x['run_id']]['exposures']['S1.double-boss1']==post and (x['run_id'],x['floor']) not in repeated]
    errs=[x['err_turn'] for x in rows]
    summary['post' if post else 'pre']={'rows':len(rows),'runs':len({x['run_id'] for x in rows}),'within2':pct(sum(abs(x)<=2 for x in errs),len(errs)),'mean_abs':sum(abs(x) for x in errs)/len(errs) if errs else None,'mean':sum(errs)/len(errs) if errs else None,'worst':sorted(rows,key=lambda x:x['err_turn'])[:10],'excluded_repeat_sl_run_floors':sorted([list(k) for k in repeated if by[k[0]]['exposures']['S1.double-boss1']==post])}
save('combat-nonrepeat-summary.json',summary)
# Freeze source blobs and diffs relevant to this investigation; historical dirty knowledge trees are not invented.
src=P/'scratch/source-trees';src.mkdir(exist_ok=True)
versions=json.loads((WT/'eval/versions.json').read_text())['versions']
names=['S1.double-boss1','V4.codex-only1','S1.fix45','S1.mirage-poison1','S1.sloth-replay1','S1.bullet-time1','S1.fix41','S1.fix42']
files=['agent/src/knowledge/double-boss.ts','agent/src/brain/brain.ts','agent/src/brain/router.ts','agent/src/hand/loop.ts','agent/src/reflex/card-model.ts','agent/src/reflex/combat-plan.ts','agent/src/reflex/turn-solver.ts','agent/src/reflex/rollout.ts','agent/src/reflex/potion-cost.ts','agent/src/reflex/continuation-value.ts','agent/src/sim/build-sim-facts.ts','agent/src/sim/boss-lines.ts','agent/src/sim/boss-sim.ts']
source=[]
for v in versions:
    if v['name'] not in names:continue
    folder=src/v['name'];folder.mkdir(exist_ok=True)
    rec={'release':v['name'],'commit':v['commit'],'tree':subprocess.check_output(['git','rev-parse',v['commit']+'^{tree}'],cwd=WT).decode().strip(),'files':[]}
    for f in files:
        x=subprocess.run(['git','show',v['commit']+':'+f],cwd=WT,capture_output=True)
        if x.returncode:continue
        target=folder/(f+".txt");target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(x.stdout)
        rec['files'].append({'path':f,'blob':subprocess.check_output(['git','rev-parse',v['commit']+':'+f],cwd=WT).decode().strip(),'sha256':hashlib.sha256(x.stdout).hexdigest()})
    source.append(rec)
save('source-tree-manifest.json',source)
print('resources',[(k,{z:v[z] for z in ['rest_kinds_by_act','card_picks_by_act','won_act2_hallways']}) for k,v in out.items() if k.startswith('codex')])
print('engine',[(k,v['brain_rows'],v['successful_by_engine'],v['codex_trace_rows'],v['trace_outcomes'],v['failed_by_label']) for k,v in brainout.items()])
print('nonrepeat',[(k,v['rows'],v['within2'],v['mean_abs']) for k,v in summary.items()])
