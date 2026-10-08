import json,collections
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-034303-postmortem')
def rows(name):
    out=[]
    with (P/(name+'.lines')).open() as h:
        for line in h:
            n,raw=line.split(':',1); d=json.loads(raw); d['_line']=int(n); out.append(d)
    return out
S=rows('states'); D=rows('decisions'); R=json.loads((P/'456MRNGCPD8E-resources.json').read_text())
with (P/'resources-summary.txt').open('w') as o:
    for c in R['combats']:
        a,b=c['entry'],c['exit'];print('战斗',c['floor'],c['enemies'],'进',a,'离',b,'末',c['last'],'净损',c['observed_net_hp_loss'],file=o)
    for v in R['resource_changes']:
        a,b=v['from'],v['to'];print('资源',a['floor'],a['turn'],a['line'],a['hp'],a['potions'],'→',b['floor'],b['turn'],b['line'],b['hp'],b['potions'],b['ts'],'场次',v['combat_sequence'],'重启',v['restart_boundary'],file=o)
with (P/'states-summary.txt').open('w') as o:
    print('总帧',len(S),'首末',S[0]['_line'],S[-1]['_line'],file=o)
    def compact(x):
        s=x['state']; run=s.get('run') or {}; combat=s.get('combat') or {}
        return {'s':x['_line'],'ts':x['ts'],'floor':run.get('floor'),'turn':s.get('turn'),'screen':s.get('screen'),'hp':run.get('current_hp'),'max':run.get('max_hp'),'potions':[(p.get('index'),p.get('potion_id')) for p in run.get('potions',[]) if p.get('occupied')],'player':combat.get('player'),'enemies':combat.get('enemies'),'hand':[(c.get('index'),c.get('card_id'),c.get('cost')) for c in combat.get('hand',[])]}
    for floor in [17,29,30,31]:
        xs=[x for x in S if x['state'].get('run',{}).get('floor')==floor and x['state'].get('in_combat')]
        turns=collections.defaultdict(list)
        for x in xs: turns[x['state'].get('turn')].append(x)
        for t,arr in turns.items():
            print('首',json.dumps(compact(arr[0]),ensure_ascii=False),file=o)
            print('末',json.dumps(compact(arr[-1]),ensure_ascii=False),file=o)
    print('终帧',json.dumps(compact(S[-1]),ensure_ascii=False),file=o)
    print('牌组',json.dumps(S[-1]['state'].get('run'),ensure_ascii=False),file=o)
with (P/'brain-summary.txt').open('w') as o:
    for x in rows('brain'):
        print('b'+str(x['_line']),list(x),file=o)
        for k in ['label','ts','reason','choice','answer','run_id','boss_sim']: 
            if k in x: print(k,json.dumps(x[k],ensure_ascii=False),file=o)
        st=x.get('state',{}); print('state_keys',list(st) if isinstance(st,dict) else type(st).__name__,file=o)
        if isinstance(st,dict):
            for k in ['act_boss_clock','route_map','memory','facts','route_review']:
                if k in st: print(k,json.dumps(st[k],ensure_ascii=False),file=o)
print('状态帧',len(S),'大脑条数',len(rows('brain')))
