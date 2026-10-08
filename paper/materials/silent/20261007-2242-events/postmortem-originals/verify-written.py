import json,re,ast,collections
from pathlib import Path
p=Path('learner/runs/20261007-221303-postmortem')
def rows(n):
 for l in (p/n).open():
  num,s=l.split(':',1);r=json.loads(s);r['_line']=int(num);yield r
S=list(rows('states-lines.jsonl'));D=list(rows('decisions-lines.jsonl'));R=json.loads((p/'WQZVENQ7DTRP-resources.json').read_text())
section=[];active=False
for l in Path('notes/lessons.md').open():
 if l.startswith('## '):
  if active:break
  active=l.startswith('## WQZVENQ7DTRP')
 if active:section.append(l)
txt=''.join(section);errors=[]
rounds=[]
for seq in [8,11,12,13,14,15,16,17,18,19]:
 c=R['combats'][seq-1];frames=[s for s in S if c['entry']['line']<=s['_line']<=(c.get('exit') or c['last'])['line']];groups={}
 for s in frames:
  if s['state']['in_combat']:groups.setdefault(s['state']['turn'],[]).append(s)
 nn=[];dd=[];ll=[]
 for t,g in groups.items():
  f=g[0];last=g[-1];nxt=next((s for s in frames if s['_line']>last['_line']),last)
  n=sum(e['current_hp'] for e in f['state']['combat']['enemies']);end=sum(e['current_hp'] for e in (nxt['state'].get('combat') or {}).get('enemies',[]));nn.append(n);dd.append(n-end);ll.append(f['state']['run']['current_hp']-nxt['state']['run']['current_hp'])
 rounds.extend([nn,dd,ll])
written=[ast.literal_eval(s) for s in re.findall(r'\[[0-9,]+\]',txt)]
print('正文逐轮数组',len(written),'实盘数组',len(rounds))
if written!=rounds:errors.append('逐轮数组不符')
for seq in range(1,14):
 c=R['combats'][seq-1];hp=f"{c['entry']['hp']}→{c['exit']['hp']}/{c['entry']['max_hp']}";line=f"{c['entry']['line']}→{c['exit']['line']}"
 if hp not in txt or line not in txt:errors.append(f'资源链{seq}未匹配')
 print('资源链核对',c['floor'],hp,line)
end=S[-1]['state']['combat'];pre=S[-2]['state']['combat'];print('死亡前',pre['player']['current_hp'],pre['player']['block'],pre['enemies'][0]['intents'][0]['total_damage'],[(x['power_id'],x['amount']) for x in pre['enemies'][0]['powers']]);print('死亡后',end['player']['current_hp'],end['enemies'][0]['current_hp'])
assert pre['player']['current_hp']==9 and pre['player']['block']==9 and pre['enemies'][0]['intents'][0]['total_damage']==27 and end['enemies'][0]['current_hp']==56
# Counts and full-round changes are cross-checked against the run's raw selected records.
assert len(D)==766 and len(S)==798
assert sum(d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35 for d in D)==31
assert sum(d['rollout_best_chosen'] is True for d in D if 'rollout_best_chosen' in d)==236
assert sum(type(d.get('rollout_best_chosen')) is bool for d in D)==242
assert sum(d['chosen']['action']=='use_potion' for d in D)==24
assert not any(d['chosen']['action']=='discard_potion' for d in D)
assert sum('HP guard:' in d.get('rationale','') for d in D)==3
assert sum('SL explore' in d.get('rationale','') for d in D)==4
assert sum(c['entry']['hp']-c['last']['hp'] for c in R['combats'][13:18])==234
print('核对错误',errors)
(p/'verification.json').write_text(json.dumps({'errors':errors,'round_arrays':len(written),'resource_combats_verified':13,'death_frame':282367,'decisions':766,'states':798},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(bool(errors))
