import json, pathlib, collections
P=pathlib.Path(__file__).parent

def rows(name):
    out=[]
    for line in (P/(name+'.match')).open():
        n,b,s=line.split(':',2)
        d=json.loads(s); d['_line']=int(n);d['_offset']=int(b);out.append(d)
    return out
D=rows('decisions');S=rows('states');A=rows('sl-attempts');R=json.loads((P/'JBX9JLH46KVN-resources.json').read_text())
if __name__=='__main__':
    print('决策窗口',D[0]['ts'],D[-1]['ts']);print('决策字段',list(D[0]));print('状态字段',list(S[0]),list(S[0]['state']));print('decision样例',json.dumps(D[-12],ensure_ascii=False)[:8000]);print('state样例',json.dumps(S[-10],ensure_ascii=False)[:10000])
    print('各战斗资源')
    for c in R['combats']:
        print(c['sequence'],c['floor'],c['enemies'],'首',c['entry'],'末',c['last'],'退出',c['exit'],'净损',c['observed_net_hp_loss'])
    print('SL')
    for a in A: print({k:v for k,v in a.items() if k not in ('plan','snapshot','known','replay','questions')})
    print('counts',collections.Counter((d['label'],d['decider']) for d in D))
