import collections, hashlib, json, re
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp'
A=json.load(open(O/'audit.json'));C=json.load(open(O/'changes.json'))
N=json.load(open(EXP/'knowledge/characters/silent/experience.json'));B=json.load(open(O/'experience-before.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
E={e['id']:e for e in N['entries']};BE={e['id']:e for e in B['entries']}
assert len(E)==len(N['entries'])
assert all((r.get('character') or '').lower()=='silent' for r in R.values())
assert len(R)==76 and len(A['fights'])==1189 and sum(f['death'] for f in A['fights'])==66
for e in N['entries']:
    assert e['n_support']==len(set(e['evidence']))==len(e['evidence'])
    assert e['n_contradict']==len(set(e.get('contradicting',[])))
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and r in R for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
    assert 0<=e['asc'][0]<=e['asc'][1]<=20
    if e['id'] in BE:
        if e['scope'].startswith('potion:') or e['scope']=='general:potion':assert e==BE[e['id']]
        for sentence in re.split(r'(?<=。)',BE[e['id']]['lesson']):
            if re.search('药水|药瓶|喝药|留药|药栏|用药',sentence):assert sentence in e['lesson'],(e['id'],sentence)
        if e['id'] not in C['updated']:assert e==BE[e['id']]
assert C['chars']==sum(len(e['lesson']) for e in N['entries'] if e['status']=='active')<=60000
assert C['active']==133 and len(C['updated'])==11
matrix=[]
for id in C['added']+C['updated']:
    e=E[id]
    if e['scope'] in ['general:route','general:rest']:continue
    counts=dict(sorted(collections.Counter(R[r]['ascension'] for r in e['evidence']).items()))
    matrix.append(dict(id=id,scope=e['scope'],support=e['n_support'],contradict=e['n_contradict'],asc=counts,evidence=e['evidence'],contradicting=e.get('contradicting',[]),lesson=e['lesson']))
    if e['scope'].startswith('card:'):
        card=e['scope'].split(':')[1]
        observed={x['run'] for x in A['cards'] if x['card']==card}
        assert set(e['evidence'])<=observed,(id,set(e['evidence'])-observed)
(O/'mechanism-facts.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2)+'\n')
groups=collections.defaultdict(list)
for a in A['attempts']:groups[(a['run'],a['floor'])].append(a)
comparisons=[]
for (run,floor),v in groups.items():
    if max(a['attempt'] for a in v)<2:continue
    first,last=v[0],v[-1]
    comparisons.append(dict(run=run,asc=R[run]['ascension'],floor=floor,attempts=len(v),wins=sum(a['result']=='won' for a in v),same_order=(first.get('draws') or {}).get('order')==(last.get('draws') or {}).get('order'),same_turns=(first.get('draws') or {}).get('turns')==(last.get('draws') or {}).get('turns'),cases=v))
assert len(comparisons)==71 and sum(x['attempts'] for x in comparisons)==311 and sum(x['wins'] for x in comparisons)==24
assert not any(x['run']=='QNTW139MGECA' for x in comparisons)
(O/'sl-comparison.json').write_text(json.dumps(comparisons,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted((EXP/'knowledge/characters/silent').glob('*.json')):
    if p.name=='experience.json':continue
    x=json.load(open(p));other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),keys=list(x),meta={k:x[k] for k in ['generated','generated_from','meta','ascensions','note'] if k in x}))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print('JSON/角色/12位证据/n/范围/预算/旧药水分句与其他条目不变校验通过；历史卡牌支持全有实打，SL71场311次24赢不变')
print('定稿',C['version'],C['active'],C['chars'],C['confidence'],C['applicable'])
