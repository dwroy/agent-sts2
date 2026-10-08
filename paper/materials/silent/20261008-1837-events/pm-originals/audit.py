import json,pathlib,collections,re
P=pathlib.Path(__file__).parent
def rows(kind):
 with (P/(kind+'-lines.jsonl')).open() as h:
  for l in h:
   n,v=l.split(':',1);r=json.loads(v);r['_line']=int(n);yield r
D=list(rows('decisions'));S=list(rows('states'))
def short(r):return {'行':r['_line'],'F':r.get('floor'),'T':r.get('turn'),'尝试':r.get('sl_attempt'),'题':r.get('label'),'选择':r.get('chosen'),'理由':r.get('rationale'),'信心':r.get('confidence')}
with (P/'brain.txt').open('w') as h:
 for r in D:
  if r.get('decider')=='codex':h.write(json.dumps(short(r),ensure_ascii=False)+'\n')
 for r in rows('plans'):h.write(json.dumps({k:r.get(k) for k in ['_line','floor','ts','plan']},ensure_ascii=False)+'\n')
with (P/'key-decisions.txt').open('w') as h:
 for r in D:
  if r.get('floor')>=29 or re.search('guard|护栏|HP preservation',r.get('rationale',''),re.I):
   h.write(json.dumps(short(r),ensure_ascii=False)+'\n')
   if re.search('guard|护栏',r.get('rationale',''),re.I):h.write(json.dumps(r.get('questions'),ensure_ascii=False)+'\n')
with (P/'combat-frames.txt').open('w') as h:
 for r in S:
  s=r['state'];c=s.get('combat')
  if not c:continue
  if s['run']['floor'] not in [17,29,30,31,33]:continue
  out={'s行':r['_line'],'ts':r['ts'],'F':s['run']['floor'],'T':s.get('turn'),'屏':s['screen'],'HP':s['run']['current_hp'],'战斗':c}
  out['战斗']={k:v for k,v in c.items() if k not in ['draw_pile','discard_pile','exhaust_pile']}
  h.write(json.dumps(out,ensure_ascii=False)+'\n')
print('已保存紧凑抽取')
for r in D:
 if re.search('guard|护栏',r.get('rationale',''),re.I):print(json.dumps(short(r),ensure_ascii=False))
print('药水动作')
for r in D:
 if 'potion' in str(r.get('chosen')) or '药水' in str(r.get('expect')):print(json.dumps(short(r),ensure_ascii=False))
