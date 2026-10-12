import collections, hashlib, json
from pathlib import Path
O=Path(__file__).parent.resolve();A=json.load(open(O/'audit.json'));groups=collections.defaultdict(list)
for x in A['attempts']:groups[(x['run'],x['floor'])].append(x)
records=[]
for (run,floor),rows in groups.items():
    if max(x['attempt'] for x in rows)<=1:continue
    orders=[(x.get('draws') or {}).get('order',[]) for x in rows];prefix=0
    for xs in zip(*orders):
        if all(x==xs[0] for x in xs):prefix+=1
        else:break
    analysis=json.load(open(O/run/'analysis.json'))
    turns={k:v for k,v in analysis['turns'].items() if k.startswith(str(floor)+'/')}
    records.append(dict(run=run,floor=floor,attempts=len(rows),wins=sum(x['result']=='won' for x in rows),common_draw_prefix=prefix,rows=rows,turns=turns,limitation='同抽前缀不是整场受控；explore与实际牌序分开，未执行候选和判死截断不作实际结算。'))
(O/'sl-comparisons.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
B=O/'slice-knowledge-before';E=O/'slice-knowledge-after';rows=[]
for p in sorted(B.rglob('*.json')):
    if p.name=='experience.json':continue
    q=E/p.relative_to(B);assert q.read_bytes()==p.read_bytes()
    rows.append(dict(path=str(p.relative_to(B)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(O/'slice-other-data-verification.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('多试战斗',len(records),'；切片其他JSON相同',len(rows))
