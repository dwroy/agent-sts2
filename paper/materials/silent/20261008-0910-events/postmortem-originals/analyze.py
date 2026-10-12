import json, pathlib, collections, datetime
P=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-084303-postmortem')
def read(kind):
    out=[]
    for line in (P/(kind+'-lines.txt')).open():
        n,s=line.split(':',1); row=json.loads(s); row['_line']=int(n); out.append(row)
    return out
D=read('decisions'); S=read('states'); L=read('sl'); R=json.loads((P/'ZTRGYYMLR8SC-resources.json').read_text())
for name,rows in [('decisions',D),('states',S),('sl',L)]:
    (P/(name+'.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('窗口',D[0]['ts'],D[-1]['ts'],'decisions',len(D),'states',len(S))
print('决策者',collections.Counter(d['decider'] for d in D))
print('决策键',D[0].keys())
for d in D:
    if d['decider']=='codex':
        print('脑',d['_line'],d['floor'],d['label'],'chosen=',d.get('chosen'),'rationale=',d.get('rationale'),'brain=',d.get('journal',{}).get('brain'))
print('战斗资源')
for c in R['combats']:
    print(c['sequence'],c['floor'],c['enemies'],'entry',c['entry'],'exit',c['exit'],'last',c['last'],'end',c['end'])
print('非战斗资源变化')
for e in R['resource_changes']:
    if e['combat_sequence'] is None: print(e)
print('SL概况')
for l in L: print({k:l.get(k) for k in ['_line','floor','attempt','started_at','ended_at','result','reason','death_turn','hp']},'keys',list(l.keys()))
print('低信心',len([d for d in D if d['decider']=='jev' and (d.get('confidence') or 0)<.35]))
print('HP护栏')
for d in D:
    if 'HP guard' in d.get('rationale',''): print(d['_line'],d['floor'],d['turn'],d['rationale'])
print('药水决策')
for d in D:
    if any(x in json.dumps(d.get('chosen',{}),ensure_ascii=False) for x in ['potion','药水']): print(d['_line'],d['floor'],d['turn'],d['label'],d.get('chosen'),d.get('rationale'))
