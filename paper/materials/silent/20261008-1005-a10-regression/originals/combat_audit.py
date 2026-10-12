import collections as C
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

P=Path(__file__).resolve().parent
ROOT=P.parents[2]
sys.path[:0]=[str(ROOT/'eval'),str(ROOT/'agent/tools/logdb')]
import calibration
import metrics
import query

def read(n): return json.loads((P/n).read_text())
def save(n,x): (P/n).write_text(json.dumps(x,ensure_ascii=False,indent=2,default=str)+'\n')
runs=read('sample-table.json'); by={r['run_id']:r for r in runs}; ids=list(by)
con=query.connect(str(P/'scratch/frozen-db'),threads=2)
pred,coverage=calibration.collect_rollout(con,ids,str(ROOT.parents[1]/'logs'))
save('combat-predictions.json',{'rows':pred,'coverage':coverage})
route,rooms,rcov=calibration.collect_route(con,by,str(ROOT.parents[1]/'logs'))
save('route-predictions.json',{'rows':route,'rooms':rooms,'coverage':rcov})
group=C.defaultdict(list)
for row in pred:
    r=by[row['run_id']]
    phase='post-double' if r['exposures']['S1.double-boss1'] else 'pre-double'
    if row['act']==2 and row['room'] in ['hallway','unknown_room']:
        group[(phase,r['brain_source']['source'])].append(row)
save('combat-prediction-summary.json',{str(k):{'rows':len(v),'run_ids':sorted(set(x['run_id'] for x in v)),'turn':calibration.error_stats([x['err_turn'] for x in v]),'window':calibration.error_stats([x['err_window'] for x in v]),'end':calibration.error_stats([x['err_end'] for x in v]),'worst_under':sorted(v,key=lambda x:x['err_turn'])[:12]} for k,v in group.items()})
logroot=ROOT.parents[1]/'logs'
console=logroot/'console'
logs=[]
for f in console.glob('*.log'):
    m=re.match(r'(\d{8}-\d{6})-',f.name)
    if m:
        logs.append((dt.datetime.strptime(m[1],'%Y%m%d-%H%M%S').replace(tzinfo=dt.timezone(dt.timedelta(hours=8))),f))
configs=[json.loads(s) for s in (P/'scratch/frozen-logs/run-config.jsonl').read_text().splitlines()]
index=[]
output=P/'scratch/console';output.mkdir(exist_ok=True)
pattern=re.compile(r'gate|refus|reject|solver.*(fail|error)|plan.*(fail|error)|failed|fallback|unmodel|error|timed? ?out|pause|resum',re.I)
for cfg in configs:
    start=dt.datetime.fromisoformat(cfg['process']['started'].replace('Z','+00:00'))
    candidates=[(abs((start-ts).total_seconds()),f) for ts,f in logs if 0<=(start-ts).total_seconds()<90]
    if not candidates:
        index.append({'run_id':cfg['run_id'],'process_started':cfg['process']['started'],'missing_console':True});continue
    delta,f=min(candidates,key=lambda x:x[0])
    dst=output/f.name
    if not dst.exists(): shutil.copyfile(f,dst)
    raw=dst.read_bytes()
    evidence=[]
    for i,line in enumerate(raw.decode(errors='replace').splitlines(),1):
        if pattern.search(line): evidence.append({'line':i,'text':line})
    index.append({'run_id':cfg['run_id'],'process_started':cfg['process']['started'],'start_commit':cfg['code']['commit'],'path':str(f),'fixed_path':str(dst),'sha256':hashlib.sha256(raw).hexdigest(),'delta_seconds':delta,'evidence':evidence})
save('console-audit.json',index)
print('prediction coverage',coverage,'route',rcov,'consoles',len(index),'matched',sum(not x.get('missing_console') for x in index))
