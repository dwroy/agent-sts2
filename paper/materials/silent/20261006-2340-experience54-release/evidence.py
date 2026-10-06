import collections,json
from pathlib import Path
O=Path(__file__).parent
ROOT=O.parents[2]
RUN='BVF22RSFVBS9'
A=json.load(open(O/'audit.json'))
R={r['run_id']:r for r in json.load(open(O/RUN/'completed-runs.json'))}
new=[c for c in A['cards'] if c['run']==RUN]
ends=[c for c in A['ends'] if c['run']==RUN]
def en(b,ident):return next(e for e in b['enemies'] if e['id']==ident)
def power(b,p):return b['powers'].get(p,0)
def card(f,t,c,att=1):return next(x for x in new if (x['floor'],x['turn'],x['card'],x['attempt'])==(f,t,c,att))
def end(f,t,att=1):return next(x for x in ends if (x['floor'],x['turn'],x['attempt'])==(f,t,att))
b=card(17,3,'BUBBLE_BUBBLE')
assert power(en(b['before'],'CEREMONIAL_BEAST'),'POISON_POWER')==10
assert power(en(b['after'],'CEREMONIAL_BEAST'),'POISON_POWER')==19
assert en(b['before'],'CEREMONIAL_BEAST')['hp']==en(b['after'],'CEREMONIAL_BEAST')['hp']
c=card(17,3,'ACCELERANT'); assert power(c['after'],'ACCELERANT_POWER')==1
x=end(17,3); assert en(x['before'],'CEREMONIAL_BEAST')['hp']-en(x['after'],'CEREMONIAL_BEAST')['hp']==37
x=end(17,4); assert (en(x['before'],'CEREMONIAL_BEAST')['hp'],en(x['after'],'CEREMONIAL_BEAST')['hp'])==(176,129)
assert x['before']['hp']==x['after']['hp']==31
assert power(en(x['before'],'CEREMONIAL_BEAST'),'POISON_POWER')==24
assert power(en(x['after'],'CEREMONIAL_BEAST'),'STRENGTH_POWER')==0
assert power(en(x['after'],'CEREMONIAL_BEAST'),'PLOW_POWER')==0
c=card(23,1,'ACCELERANT',4); assert power(c['after'],'ACCELERANT_POWER')==1
assert all(power(e,'POISON_POWER')==0 for e in c['after']['enemies'])
c=card(23,5,'NOXIOUS_FUMES',4); assert power(c['after'],'NOXIOUS_FUMES_POWER')==2
x=end(23,3,4);stone=en(x['before'],'BOWLBUG_ROCK')
assert x['before']['block']==10 and sum(i.get('total_damage') or 0 for i in stone['intents'])==8
assert power(stone,'STRENGTH_POWER')==-8 and en(x['after'],'BOWLBUG_ROCK')['move']=='STUNNED'
x=end(23,4,4);assert x['before']['block']==11 and x['before']['hp']-x['after']['hp']==12
x=end(23,5,4); assert (x['before']['hp'],x['before']['block'],x['after']['hp'])==(4,0,0)
assert en(x['before'],'BOWLBUG_ROCK')['hp']==9 and not any(e['id']=='BOWLBUG_ROCK' and e['hp']>0 for e in x['after']['enemies'])
assert en(x['after'],'BOWLBUG_SILK')['hp']==23 and en(x['after'],'SLUMBERING_BEETLE')['hp']==71
stone_rows=[]
for x in A['ends']:
 e=next((e for e in x['before']['enemies'] if e['id']=='BOWLBUG_ROCK' and e['alive']),None)
 if not e or power(e,'IMBALANCED_POWER')!=1:continue
 hit=sum(i.get('total_damage') or 0 for i in e['intents'])
 z=next((e for e in x['after']['enemies'] if e['id']=='BOWLBUG_ROCK' and e['alive']),None)
 # Restrict to observed full block, first attacker, and surviving target; passive block is not inferred.
 if not hit or e['index']!=0 or not z or x['after']['hp']<=0:continue
 if x['before']['block']<hit:continue
 stone_rows.append(dict(run=x['run'],floor=x['floor'],turn=x['turn'],attempt=x['attempt'],block=x['before']['block'],hit=hit,before_hp=x['before']['hp'],after_hp=x['after']['hp'],move=z['move'],support=z['move']=='STUNNED'))
support=[r for r in A['runs'] if any(x['run']==r and x['support'] for x in stone_rows)]
counter=[r for r in A['runs'] if any(x['run']==r and not x['support'] for x in stone_rows)]
assert not counter and support[0]=='LRN0HPZ0FZS1' and RUN in support
sl=[x for x in A['attempts'] if x['run']==RUN and x['floor']==23]
assert [x['result'] for x in sl]==['predicted_death']*3+['died']
assert all(x['reload']['ok'] and x['reload']['resumed_turn']==1 for x in sl[:3])
seq=[x['draws']['order'] for x in sl]; arrival=[x['draws']['turns'] for x in sl]
def prefix(xs):
 i=0
 while i<min(map(len,xs)) and len({str(x[i]) for x in xs})==1:i+=1
 return i
assert prefix(seq)==24
# Only completed plays count as establishment evidence.
played={c:sorted({x['run'] for x in A['cards'] if x['card']==c}) for c in ['NOXIOUS_FUMES','ACCELERANT','BUBBLE_BUBBLE','DEADLY_POISON','POISONED_STAB','PIERCING_WAIL']}
beetle=[x for x in A['fights'] if 'SLUMBERING_BEETLE' in x['enemies']]
beast=[x for x in A['fights'] if 'CEREMONIAL_BEAST' in x['enemies']]
first=x=end(23,1,4)
assert first['before']['hp']==21 and first['before']['energy']>=0
sources=[]
for path in sorted((ROOT/'.worktrees/exp/knowledge/characters/silent').glob('*.json')):
 if path.name=='experience.json':continue
 d=json.load(open(path));sources.append(dict(file=path.name,keys=list(d)[:8],metadata={k:d[k] for k in ['meta','generated_from','generated','_about','runs'] if k in d}))
output=dict(stone=dict(rows=stone_rows,supports=support,contradicting=counter,n=len(support),windows=len(stone_rows),asc=dict(collections.Counter(R[r]['ascension'] for r in support))),played=played,sl=sl,sl_common_order=prefix(seq),sl_common_turns=prefix(arrival),beetle_fights=beetle,beast_fights=beast,new_cards=new,new_ends=ends,other_knowledge=sources)
(O/'mechanisms.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print('石虫完整挡窗口',len(stone_rows),'支持局',len(support),'反例局',len(counter),'进阶',output['stone']['asc'])
print('甲虫全遭遇',len(beetle),'死亡',sum(x['death'] for x in beetle),'仪式兽全遭遇',len(beast),'死亡',sum(x['death'] for x in beast))
print('SL共同抽序',prefix(seq),'共同到手轮',prefix(arrival))
