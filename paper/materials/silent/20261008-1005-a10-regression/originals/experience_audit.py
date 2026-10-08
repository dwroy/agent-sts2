import collections as C
import hashlib
import json
from pathlib import Path
import re
import subprocess

P=Path(__file__).resolve().parent
ROOT=P.parents[2]
LOGS=ROOT.parents[1]/'logs'
def save(n,x): (P/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def git(*a): return subprocess.check_output(['git',*a],cwd=ROOT)
versions=json.loads((ROOT/'eval/versions.json').read_text())['versions']
vs=[v for v in versions if re.fullmatch(r'S1.exp(6[9]|[78]\d|9[012])',v['name'])]
hist={}; manifest=[];changes=[]
snap=P/'scratch/experience-blobs';snap.mkdir(exist_ok=True)
prior={}
rawruns={}
with (LOGS/'runs.jsonl').open() as h:
    for line in h:
        r=json.loads(line)
        if r.get('character')=='SILENT':rawruns[r['run_id']]=r
for v in vs:
    raw=git('show',v['commit']+':knowledge/characters/silent/experience.json')
    x=json.loads(raw);hist[v['name']]=x
    (snap/(v['name']+'.json')).write_bytes(raw)
    blob=git('rev-parse',v['commit']+':knowledge/characters/silent/experience.json').decode().strip()
    at=git('log','-1','--format=%cI',v['commit']).decode().strip()
    entries={e['id']:e for e in x['entries']}
    new=[k for k in entries if k not in prior]
    changed=[k for k in entries if k in prior and entries[k]!=prior[k]]
    semantic=[k for k in changed if any(entries[k].get(f)!=prior[k].get(f) for f in ['lesson','scope','asc','status'])]
    retired=[k for k in prior if k not in entries or entries[k].get('status')=='retired' and prior[k].get('status')!='retired']
    manifest.append({**v,'blob':blob,'sha256':hashlib.sha256(raw).hexdigest(),'data_version':x['version'],'commit_time':at,'active':sum(e.get('status')=='active' for e in entries.values()),'new':new,'changed':changed,'semantic':semantic,'retired':retired})
    if v['name']!='S1.exp69':
        for k in new+changed:
            e=entries[k]
            changes.append({'release':v['name'],'id':k,'scope':e['scope'],'new':k in new,'semantic':k in new or k in semantic,'before':prior.get(k),'after':e,'logged_silent_evidence':[rid for rid in e['evidence'] if rid in rawruns],'missing_or_non_silent_evidence':[rid for rid in e['evidence'] if rid not in rawruns]})
    prior=entries
save('experience-timeline.json',manifest)
save('experience-changes.json',changes)
ids=set(r['run_id'] for r in json.loads((P/'sample-table.json').read_text()))
# Preserve the actual Jev request text; system-prefix hashes alone cannot recover a dirty historical prefix.
target=P/'scratch/frozen-logs/jev-prompts.jsonl'
index=[];off=0;source=LOGS/'jev-prompts.jsonl';bound=source.stat().st_size
scopes={x['scope'] for x in changes}
exposure=[]
with source.open('rb') as h,target.open('wb') as out:
    for line in h:
        if off+len(line)>bound or not line.endswith(b'\n'):break
        x=json.loads(line)
        if x.get('run_id') in ids:
            out.write(line)
            text=json.dumps(x.get('request'),ensure_ascii=False)
            hits=[scope for scope in scopes if '['+scope+' | confidence' in text]
            rec={'run_id':x['run_id'],'decision_id':x.get('decision_id'),'floor':x.get('floor'),'turn':x.get('turn'),'ts':x.get('ts'),'label':x.get('label'),'off':off,'len':len(line),'sha256':hashlib.sha256(line).hexdigest(),'scopes':hits,'answers':x.get('answers')}
            index.append(rec)
            if hits: exposure.append(rec)
        off+=len(line)
save('jev-experience-index.json',index)
save('jev-experience-exposure.json',exposure)
save('experience-summary.json',{'versions':[{'name':m['name'],'blob':m['blob'],'data_version':m['data_version'],'new':len(m['new']),'changed':len(m['changed']),'semantic':len(m['semantic']),'retired':len(m['retired'])} for m in manifest], 'changed_unique_ids':len({x['id'] for x in changes}),'scope_counts':dict(C.Counter(x['scope'] for x in changes)),'missing_evidence':[{k:x[k] for k in ['release','id','missing_or_non_silent_evidence']} for x in changes if x['missing_or_non_silent_evidence']], 'jev_requests':len(index),'jev_experience_requests':len(exposure),'exposed_scope_counts':dict(C.Counter(scope for x in exposure for scope in x['scopes'])),'jev_source_prefix_bytes':off})
print('versions',len(manifest),'changes',len(changes),'Jev',len(index),'experience requests',len(exposure))
