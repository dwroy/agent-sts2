import collections,json,re,statistics
from pathlib import Path
O=Path(__file__).parent;E=json.load(open('knowledge/characters/silent/experience.json'))
C=json.load((O/'changes.json').open())['entries'];R={r['run_id']:r for r in json.load((O/'run-metadata.json').open())}
assert len({e['id'] for e in E['entries']})==len(E['entries'])
for c in C:
    e=c['after'];assert e['evidence'] and e['n_support']==len(set(e['evidence']))==len(e['evidence'])
    assert e['n_contradict']==len(e.get('contradicting',[]))
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e['name'] and re.search('[\u4e00-\u9fff]',e['name'])
    n=e['n_support'];z=e['n_contradict'];assert e['confidence']==('high' if n>=5 and z<=n/3 else 'med' if n>=2 else 'low')
    assert e['last_seen']=='2026-10-08'
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
B=json.load((O/'slice-before.json').open());A=json.load((O/'slice-after.json').open());pairs=[];before=[];after=[];diff=[]
for b,a in zip(B,A):
    assert b['sample']==a['sample'] and a['n']==b['n']==20
    d=[z-x for x,z in zip(b['sizes'],a['sizes'])];pairs.append(dict(sample=a['sample'],before_median=b['median'],before_max=b['max'],after_median=a['median'],after_max=a['max'],paired_median=statistics.median(d)))
    before+=b['sizes'];after+=a['sizes'];diff+=d
v=dict(pairs=pairs,before_median=statistics.median(before),after_median=statistics.median(after),median_change=statistics.median(after)-statistics.median(before),paired_median=statistics.median(diff),before_max=max(before),after_max=max(after),max_change=max(diff),confidence=dict(collections.Counter(e['confidence'] for e in active)))
(O/'slice-summary.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:x for k,x in v.items() if k!='pairs'},ensure_ascii=False))
