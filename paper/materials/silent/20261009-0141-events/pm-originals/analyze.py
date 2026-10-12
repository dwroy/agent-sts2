import json, pathlib, collections, sys
P=pathlib.Path('learner/runs/20261009-011302-postmortem')
def rows(name):
 for line in (P/f'HEMND3SMQYB8-{name}.raw').open():
  n,t=line.split(':',1); x=json.loads(t); x['_line']=int(n); yield x
D=list(rows('decisions')); S=list(rows('states')); B=list(rows('brain')); PL=list(rows('run-plans')); SL=list(rows('sl-attempts'))
if __name__=='__main__':
 print('D',len(D), D[0]['ts'],D[-1]['ts'],'S',len(S),S[0]['ts'],S[-1]['ts'])
 print('brain keys',B[0].keys()); print('state combat keys',next(x['state']['combat'].keys() for x in S if x['state'].get('combat')))
 for b in B: print('B',b['_line'],{k:b.get(k) for k in b if k not in ['request','response','prompt','system','state','messages','_line']})
 for p in PL: print('P',p['_line'],p)
 for s in SL: print('SL',s['_line'],s)
 for d in D:
  if d['decider']=='codex' or d['chosen'].get('action') in ['use_potion','discard_potion','drink_potion']: print('D',d['_line'], d['floor'],d['turn'],d['label'],d['chosen'],d['rationale'])
