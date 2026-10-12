from pathlib import Path
import collections,csv,datetime as dt,importlib.util,json,sys
code=Path('/home/dw/Projects/agent-sts2/.worktrees/codex-only-brain')
root=Path('/home/dw/Projects/agent-sts2')
out=root/'learner/runs/20261007-091119-codex-only-brain'
sys.path.insert(0,str(code/'eval'))
sys.path.insert(0,str(code/'knowledge/builders'))
import brain_source,metrics
from characters import run_character
cuts={k:v['bytes'] for k,v in json.loads((out/'before/cuts.json').read_text()).items()}
runs=list(brain_source.jsonl(root/'logs/runs.jsonl',cuts['runs.jsonl']))
sources=brain_source.load_sources(root/'logs',[r['run_id'] for r in runs],cuts['brain.jsonl'])
brain_source.annotate(runs,sources)
sl=collections.defaultdict(list)
for row in brain_source.jsonl(root/'logs/sl-attempts.jsonl',cuts['sl-attempts.jsonl']): sl[row.get('run_id')].append(row)
for r in runs:r['first_attempt']=metrics.first_attempt(sl[r['run_id']],r.get('floor'),r.get('victory'),{1:False,2:False},{})
def group(rows):
 return {'runs':len(rows),'wins':sum(r.get('victory') is True for r in rows),'first_try_wins':sum(r['first_attempt']['victory'] for r in rows),'sl_wins':sum(r.get('victory') is True and not r['first_attempt']['victory'] for r in rows),'mean_floor':round(sum(r.get('floor') or 0 for r in rows)/len(rows),3) if rows else None,'highest_won':max((r.get('ascension',0) for r in rows if r.get('victory') is True),default=None)}
diff={}
for character in sorted({run_character(r) for r in runs}):
 mine=[r for r in runs if run_character(r)==character]
 clean=[r for r in mine if brain_source.eligible(r)]
 diff[character]={'old_all':group(mine),'codex_default':group(clean),'cohorts':{s:group([r for r in mine if r['brain_source']['source']==s]) for s in ['codex','deepseek','mixed','unknown','other']},'ascensions':{str(a):{'old_all':group([r for r in mine if r.get('ascension')==a]),'codex_default':group([r for r in clean if r.get('ascension')==a])} for a in sorted({r.get('ascension') for r in mine if isinstance(r.get('ascension'),int)})}}
write=lambda n,v:(out/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
write('provenance.json',{'policy':brain_source.POLICY,'cuts':cuts,'runs':runs,'sources_including_unfinished':sources})
write('statistics-diff.json',diff)
fields=['run_id','character','ascension','floor','victory','first_try_victory','ended','source','included','reason','codex','deepseek','unknown','unresolved','first_success','last_success','by_label']
with (out/'run-classification.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fields);w.writeheader()
 for r in runs:
  s=r['brain_source'];counts=s['successful_answers']
  w.writerow({**{k:r.get(k) for k in ['run_id','ascension','floor','victory','ended']},'character':run_character(r),'first_try_victory':r['first_attempt']['victory'],'source':s['source'],'included':s['eligible'],'reason':s['exclusion_reason'],'codex':counts.get('codex',0),'deepseek':counts.get('deepseek',0),'unknown':counts.get('unknown',0),'unresolved':s['unresolved_questions'],'first_success':s['first_success'],'last_success':s['last_success'],'by_label':json.dumps(s['successful_by_label'],ensure_ascii=False,sort_keys=True)})
quota=[];oct7=set();usage=collections.defaultdict(lambda:collections.Counter())
start=dt.datetime(2026,10,7,tzinfo=dt.timezone(dt.timedelta(hours=8)))
for row in brain_source.jsonl(root/'logs/brain.jsonl',cuts['brain.jsonl']):
 try:t=dt.datetime.fromisoformat(row['ts'].replace('Z','+00:00'))
 except (KeyError,ValueError):continue
 rid=row.get('run_id')
 if t>=start:
  oct7.add(rid)
  if row.get('error_kind')=='quota' or row.get('fell_back_from',{}).get('kind')=='quota':
   quota.append({k:row.get(k) for k in ['ts','run_id','label','engine','question_id','error_kind']}|{'fell_back_kind':row.get('fell_back_from',{}).get('kind'),'accepted':brain_source.successful(row)})
 eng=row.get('engine') or 'unknown'
 u=row.get('usage') or {}
 for k in ['inputTokens','outputTokens','cacheHitTokens','costUsd']:usage[(rid,eng)][k]+=u.get(k) or 0
for r in runs:
 try:t=dt.datetime.fromisoformat(r.get('ended','').replace('Z','+00:00'))
 except ValueError:continue
 if t>=start:oct7.add(r['run_id'])
window=[{'run_id':r['run_id'],'character':run_character(r),'ascension':r.get('ascension'),'floor':r.get('floor'),'victory':r.get('victory'),'ended':r.get('ended'),'brain_source':r['brain_source']} for r in runs if r['run_id'] in oct7]
write('oct7-quota-period.json',{'local_start':start.isoformat(),'quota_events':quota,'all_oct7_runs':window,'unfinished_run_ids':sorted(r for r in oct7 if r and r not in {x['run_id'] for x in runs})})
write('brain-usage-all-engines.json',[{'run_id':r,'engine':e,'usage':dict(u)} for (r,e),u in sorted(usage.items(),key=lambda x:str(x[0]))])
print({c:{k:v[k] for k in ['old_all','codex_default']} for c,v in diff.items()})
print('named:',{r['run_id']:r['brain_source']['source'] for r in runs if r['run_id'] in ['MCCK2602T1SR','UJ0K3G10609Y','U8K28UUGYP3U','L9SGRBB5R698','D4LJ9QMGFB8Q']})
print('Oct7:',len(window),'quota events:',len(quota),'unfinished:',sorted(r for r in oct7 if r and r not in {x['run_id'] for x in runs}))
print('source cohorts:',{c:{s:g['runs'] for s,g in v['cohorts'].items()} for c,v in diff.items()})
