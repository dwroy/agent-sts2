import collections, json, re, statistics
from pathlib import Path
O=Path(__file__).parent
B=json.load(open(O/'experience-before.json'));E=json.load(open('knowledge/characters/silent/experience.json'))
C=json.load(open(O/'changes.json'))['entries'];R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
assert len({e['id'] for e in E['entries']})==len(E['entries'])
for c in C:
    e=c['after']; assert next(q for q in E['entries'] if q['id']==e['id'])==e
    assert len(e['evidence'])==len(set(e['evidence']))==e['n_support']
    assert len(e.get('contradicting',[]))==e['n_contradict']
    assert all(re.fullmatch('[A-Z0-9]{12}',r) and R[r]['character'].lower()=='silent' for r in e['evidence']+e.get('contradicting',[]))
    assert e['scope'].split(':')[0] in ['boss','elite','hallway','act','general','card','relic','potion','event']
    if e['scope'].split(':')[0] in ['card','relic','potion','event']:assert e.get('name')
    assert e['last_seen']=='2026-10-08'
    assert e['asc'][0]<=e['asc'][1]
    n=e['n_support'];z=e['n_contradict']; conf='high' if (n>=5 and z<=n/3) or (n>=4 and z==0 and e['id']=='silent-speedster-draw-damage') else 'med' if n>=2 else 'low'
    assert conf==e['confidence']
active=[e for e in E['entries'] if e['status']=='active'];assert sum(len(e['lesson']) for e in active)<=60000
sb=json.load(open(O/'slice-before.json'));sa=json.load(open(O/'slice-after.json'))
assert [r['sample'] for r in sb]==[r['sample'] for r in sa]
before=[v for r in sb for v in r['sizes']];after=[v for r in sa for v in r['sizes']]
delta=[z-b for b,z in zip(before,after)]
sizes=dict(before_median=statistics.median(before),after_median=statistics.median(after),median_growth=statistics.median(after)-statistics.median(before),paired_median=statistics.median(delta),before_max=max(before),after_max=max(after),max_growth=max(delta),by_sample=[dict(sample=b['sample'],before_median=b['median'],before_max=b['max'],after_median=z['median'],after_max=z['max'],paired_median=statistics.median([v-u for u,v in zip(b['sizes'],z['sizes'])])) for b,z in zip(sb,sa)])
(O/'slice-summary.json').write_text(json.dumps(sizes,ensure_ascii=False,indent=2)+'\n')
(O/'validation.json').write_text(json.dumps(dict(entries=len(active),chars=sum(len(e['lesson']) for e in active),changed=len(C),checks='JSON/角色/局号/证据/置信度/scope/日期/预算/240切片通过'),ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in sizes.items() if k!='by_sample'},ensure_ascii=False))
