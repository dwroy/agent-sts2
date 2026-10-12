import collections,hashlib,json
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=O.parents[2]
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E=json.load(open(ROOT/'knowledge/characters/silent/experience.json'));B=json.load(open(O/'experience-before.json'))
params=[];checks=0
for c in C:
 e=c['after'];ev=e['evidence'];cv=e.get('contradicting',[])
 assert len(set(ev))==e['n_support'] and len(set(cv))==e['n_contradict'];checks+=1
 for n in ev+cv:
  assert len(n)==12 and R[n]['character'].lower()=='silent' and R[n]['ended']<=A['cutoff'];checks+=1
 typ,key=e['scope'].split(':',1)
 if typ=='card':rows=[x for x in A['cards'] if x['run'] in ev and x['card']==key]
 else:rows=[x for x in A['fights'] if x['run'] in ev and (typ not in ['boss','hallway','elite'] or key in x['enemies'])]
 assert 'R6WDLYS19ZTY' in {x['run'] for x in rows};checks+=1
 params.append(dict(entry=e['id'],support=e['n_support'],contradict=e['n_contradict'],asc=dict(collections.Counter(R[n]['ascension'] for n in ev)),evidence=ev,contradicting=cv,actions_or_rooms=len(rows),parameter_runs=len({x['run'] for x in rows}),limitation='主题支持局数不是每个公式的独立因果分母；正常败局不自动作机制反例；原帧参数见audit.json。'))
assert all(e==next(b for b in B['entries'] if b['id']==e['id']) for e in E['entries'] if e['id'] not in {x['id'] for x in C})
other=[]
for p in sorted((ROOT/'knowledge/characters/silent').glob('*.json')):
 if p.name=='experience.json':continue
 x=json.load(open(p));assert x.get('character','silent').lower()=='silent'
 other.append(dict(file=str(p.relative_to(ROOT)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),metadata={k:v for k,v in x.items() if k in ['character','ascension','generated','schema']},assessment='有各自样本和时间口径的生成数据；本次未发现需纠正的手写规则，未校准预测不当实盘或本次174局统计，不覆盖后台刷新。'))
(O/'mechanism-evidence.json').write_text(json.dumps(params,ensure_ascii=False,indent=2)+'\n')
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
(O/'validation.json').write_text(json.dumps(dict(checks=checks,unchanged_entries=len(E['entries'])-len(C),other_knowledge=len(other)),ensure_ascii=False,indent=2)+'\n')
print('角色/证据/参数核验',checks,'；未改条目全等；其他知识',len(other))
