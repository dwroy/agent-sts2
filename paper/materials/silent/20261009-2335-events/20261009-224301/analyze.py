import json,collections,hashlib
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-224302-postmortem')
def rows(name):
    out=[]
    for seq,line in enumerate((P/(name+'.lines')).open(),1):
        n,body=line.split(':',1);r=json.loads(body);r['_line']=int(n);r['_seq']=seq;out.append(r)
    return out
D,S,PL,SL=[rows(x) for x in ('decisions','states','plans','sl')]
for name,r in [('decisions',D),('states',S),('plans',PL),('sl',SL)]:
    with (P/(name+'.jsonl')).open('w') as f:
        for a in r:f.write(json.dumps(a,ensure_ascii=False)+'\n')
print('首末决策',D[0]['ts'],D[-1]['ts'],'首末状态',S[0]['ts'],S[-1]['ts'])
print('决策结构',json.dumps(D[0],ensure_ascii=False))
print('决策类型',collections.Counter((d.get('decider'),d.get('label')) for d in D))
print('状态结构',json.dumps(S[5],ensure_ascii=False)[:7000])
print('计划结构',json.dumps(PL[0],ensure_ascii=False)[:6000])
print('SL结构',json.dumps(SL,ensure_ascii=False)[:12000])
with (P/'脑决定.txt').open('w') as f:
    for d in D:
        if d.get('decider')=='codex':f.write(f"d{d['_seq']}/原行{d['_line']} F{d.get('floor')}T{d.get('turn')} {d.get('label')}\n"+json.dumps(d,ensure_ascii=False)+'\n')
with (P/'终战决定.txt').open('w') as f:
    for d in D:
        if d.get('floor')==48:f.write(f"d{d['_seq']}/原行{d['_line']} T{d.get('turn')} {d.get('label')}\n"+json.dumps(d,ensure_ascii=False)+'\n')
with (P/'资源简表.txt').open('w') as f:
    R=json.loads((P/'Q389KW7SVWKH-resources.json').read_text())
    for c in R['combats']:
        f.write(json.dumps({k:v for k,v in c.items() if k not in ('enemy_hp_audit','changes')},ensure_ascii=False)+'\n')
    f.write('资源变化\n')
    for c in R['resource_changes']:f.write(json.dumps(c,ensure_ascii=False)+'\n')
with (P/'lessons-before.json').open('w') as f:
    q=Path('/home/dw/Projects/agent-sts2/notes/lessons.md');h=hashlib.sha256()
    with q.open('rb') as g:
        for chunk in iter(lambda:g.read(1024*1024),b''):h.update(chunk)
    json.dump({'size':q.stat().st_size,'sha256':h.hexdigest()},f)
