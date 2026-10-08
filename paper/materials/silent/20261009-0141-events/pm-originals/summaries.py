from analyze import *
print('BRAIN')
for b in B: print('b'+str(b['_line']),b['ts'],b['label'],b['engine'],b['answer'],'accepted',b['accepted'])
print('PLANS')
for p in PL: print('p'+str(p['_line']),{k:v for k,v in p.items() if k not in ['state','facts','memory','payload','_line']})
print('SL')
for s in SL: print('sl'+str(s['_line']),{k:v for k,v in s.items() if k not in ['steps','history','_line']})
print('BRAIN DECISIONS/POTIONS')
for d in D:
 if d['decider']=='codex' or d['chosen'].get('action') in ['use_potion','discard_potion','drink_potion']: print('d'+str(d['_line']), d['floor'],d['turn'],d['label'],d['chosen'],d['rationale'])
