import json,pathlib,hashlib,datetime
p=pathlib.Path(__file__).parent;root=p.parents[2];checks=[]
def ck(name,condition):
 assert condition,name
 checks.append(name)
for name in ['runs','decisions','states','run-plans','sl-attempts','brain','run-config']:
 with (root/'logs'/f'{name}.jsonl').open('rb') as src:
  for l in (p/f'{name}.jsonl').open():
   r=json.loads(l);src.seek(r['_offset']);raw=src.read(r['_bytes']);ck(f"{name}:{r['_line']}",hashlib.sha256(raw).hexdigest()==r['_sha256'])
ss=[json.loads(l) for l in (p/'states.jsonl').open()];s={r['_line']:r['state'] for r in ss};ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];d={r['_line']:r for r in ds}
for n,hp,cap in [(323499,65,89),(323524,22,77),(323525,22,77),(323609,45,87),(323652,23,87),(323654,23,87),(323750,18,87),(323769,18,87),(323788,18,87),(323807,18,87),(323808,43,87),(323826,12,87),(323827,0,87)]:ck(f'HP s{n}',s[n]['run']['current_hp']==hp and s[n]['run']['max_hp']==cap)
for n in [323750,323769,323788]:ck(f'同盘{n}',next(r for r in ss if r['_line']==n)['fingerprint']==next(r for r in ss if r['_line']==323807)['fingerprint'])
ck('尾巴反证',s[323524]['run']['current_hp']==s[323525]['run']['current_hp']==22)
ck('卷轴15需伤',[e['current_hp'] for e in s[323524]['combat']['enemies']]==[3,8,4])
ck('末挡24',s[323826]['combat']['player']['block']==24)
ck('致死40',sum(i.get('total_damage') or 0 for i in s[323826]['combat']['enemies'][0]['intents'])==40)
ck('死后敌血76',s[323827]['combat']['enemies'][0]['current_hp']==76)
ck('三毒48',s[323826]['combat']['enemies'][0]['current_hp']-s[323827]['combat']['enemies'][0]['current_hp']==48)
ck('药九饮零弃',sum(r.get('chosen',{}).get('action')=='use_potion' for r in ds)==9 and not any(r.get('chosen',{}).get('action')=='discard_potion' for r in ds))
ck('两次护栏',[r['_line'] for r in ds if 'HP guard:' in r['rationale']]==[315045,315073])
ck('局角色结束',json.loads((p/'runs.jsonl').read_text())['character'].lower()=='silent' and json.loads((p/'runs.jsonl').read_text())['victory'] is False)
ck('两张带毒刺击奖励',[r['floor'] for r in ds if r['label']=='reward/card' and r.get('journal',{}).get('choice')=='带毒刺击']==[2,6])
ck('时间秒',(datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['ts'])).total_seconds()==2636.013)
ck('六火净补',27+29+30+30+28+29==173)
ck('tokens',972842+6406793+12743==7392378)
if not (p/'appended.json').exists():
 count=0
 with (root/'notes/lessons.md').open() as f:
  for l in f:count+=l.startswith('## 833ZM0MJGWHC')
 ck('追加前标题无',count==0)
else:
 before=json.load((p/'append-before.json').open());h=hashlib.sha256()
 with (root/'notes/lessons.md').open('rb') as f:
  remaining=before['bytes']
  while remaining:
   b=f.read(min(1048576,remaining));h.update(b);remaining-=len(b)
  actual=f.read(before['draft_bytes'])
 ck('旧前缀未改',h.hexdigest()==before['sha256']);ck('追加与草稿相等',hashlib.sha256(actual).hexdigest()==before['draft_sha256'])
 ck('追加标题恰一次',actual.count(b'## 833ZM0MJGWHC')==1)
(p/('verify-after.json' if (p/'appended.json').exists() else 'verify-before.json')).write_text(json.dumps({'checks':len(checks),'passed':True,'items':checks},ensure_ascii=False,indent=2));print('核验通过',len(checks))
