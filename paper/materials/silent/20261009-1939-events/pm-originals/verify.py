import json,hashlib,collections
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-191302-postmortem');root=Path('/home/dw/Projects/agent-sts2')
D=[json.loads(x) for x in (p/'decisions.jsonl').open()];S=[json.loads(x) for x in (p/'states.jsonl').open()];byline={x['_line']:x for x in S};R=json.loads((p/'HNX4A2WBC34W-resources.json').read_text())
for x in S:
 s=x['state'];c=s.get('combat') or {}
 if x['_line'] in [327655,327939,327940,328036,328246]:print('CRITICAL',x['_line'],s['run']['current_hp'],c.get('player',{}).get('block'),[(e['current_hp'],[(v['power_id'],v['amount']) for v in e['powers']]) for e in c['enemies']])
last=None
for x in S:
 s=x['state'];c=s.get('combat') or {}
 if s['run']['floor']==2 and c:
  ids=[e['enemy_id'] for e in c['enemies'] if e['is_alive']]
  if ids!=last:print('F2',x['_line'],s['turn'],ids)
  last=ids
assert all(d['deepseek']['brain']['engine']=='codex' for d in D if (d.get('deepseek') or {}).get('brain'))
assert len(D)==850 and len(S)==912 and len(R['combats'])==23
assert sum(d.get('chosen',{}).get('action')=='use_potion' for d in D)==17
assert sum(d.get('chosen',{}).get('action')=='discard_potion' for d in D)==0
for c in R['combats']:
 ready=next(x for x in S if c['entry']['line']<=x['_line']<=c['last']['line'] and x['state'].get('combat',{}).get('action_readiness',{}).get('can_use_combat_actions'))
 run=ready['state']['run'];assert ready['state']['turn']==1
 assert run['current_hp']==c['entry']['hp'] and run['max_hp']==c['entry']['max_hp']
 assert sorted([[v['index'],v['potion_id']] for v in run['potions'] if v.get('occupied')])==c['entry']['potions']
for n,hp,block,enemy in [(328248,38,7,301),(328249,2,0,214),(328254,2,17,214),(328255,0,0,130)]:
 s=byline[n]['state'];assert(s['run']['current_hp'],s['combat']['player']['block'],s['combat']['enemies'][0]['current_hp'])==(hp,block,enemy)
m=json.loads((p/'source-manifest.json').read_text());handles={}
try:
 for x in m:
  f=handles.setdefault(x['source'],open(x['source'],'rb'));f.seek(x['offset']);b=f.read(x['bytes']);assert hashlib.sha256(b).hexdigest()==x['sha256']
finally:
 for f in handles.values():f.close()
a=p/'lesson-draft.md';body=a.read_text().replace('三场缺归零出口及两个判死沙漏、一个判死沙虫均保留缺证','上述缺归零中间帧及两个判死沙漏、一个判死沙虫均保留缺证').replace('末敵6','末敌6');a.write_text(body);(p/'append-lesson.sh').write_text("cat >> /home/dw/Projects/agent-sts2/notes/lessons.md <<'EOF'\n"+body+"EOF\n")
print('verified original byte records',len(m),'entries',len(R['combats']))
(p/'verification.json').write_text(json.dumps({'source_records_verified':len(m),'resource_entries_verified':len(R['combats']),'decisions':len(D),'states':len(S),'checks':'通过'},ensure_ascii=False,indent=2)+'\n')
