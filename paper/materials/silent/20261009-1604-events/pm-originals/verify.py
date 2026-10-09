import json,hashlib,collections,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-154302-postmortem';run='64R0P0MTZWAX';checks=[]
def ck(name,value):
    assert value,name
    checks.append(name)
rows={}
for name in ['states','decisions','run-plans','sl-attempts','run-config']:
    rows[name]=[json.loads(l) for l in (p/(name+'.jsonl')).open()]
    with (root/'logs'/f'{name}.jsonl').open('rb') as src:
        for x in rows[name]:
            src.seek(x['_offset']);actual=json.loads(src.readline());ck(f'{name}:{x["_line"]}:源字节核对',actual=={k:v for k,v in x.items() if k not in ['_offset','_line']})
ss={s['_line']:s for s in rows['states']};ds={d['_line']:d for d in rows['decisions']}
def st(n):return ss[n]['state']
def pl(n):return st(n)['combat']['player']
def en(n):return st(n)['combat']['enemies'][0]
def pw(x,key):return next((v['amount'] for v in x['powers'] if v['power_id']==key),0)
ck('末次入场',st(324725)['run']['current_hp']==43 and st(324725)['run']['max_hp']==81)
ck('末次致死完整预算',pl(324784)['current_hp']==34 and pl(324784)['block']==11 and en(324784)['intents'][0]['total_damage']==45)
ck('末次死亡与敌残血',st(324785)['screen']=='GAME_OVER' and st(324785)['run']['current_hp']==0 and en(324785)['current_hp']==121)
ck('毒药水施6与不当步伤敌',pw(en(324783),'POISON_POWER')==39 and pw(en(324784),'POISON_POWER')==45 and en(324783)['current_hp']==en(324784)['current_hp']==166)
ck('毒实际扣45',166-en(324785)['current_hp']==45)
ck('棱柱T7逐技能污染',pw(pl(324263),'TAINTED_POWER')==6 and pw(pl(324265),'TAINTED_POWER')==12)
ck('棱柱T7血价',pl(324266)['block']==24 and en(324266)['intents'][0]['total_damage']==54 and st(324262)['run']['current_hp']==47 and st(324267)['run']['current_hp']==17)
ck('棱柱T7两题参考最优',ds[315664]['rollout_best_chosen'] and ds[315665]['rollout_best_chosen'])
ck('四护栏',sum('HP guard:' in d.get('rationale','') for d in ds.values())==4)
ck('18诅咒两步动作',sum(d['label']=='selection/curse' for d in ds.values())==36)
ck('六次药水均加6',all(pw(en(a+1),'POISON_POWER')-pw(en(a),'POISON_POWER')==6 for a in [324434,324506,324577,324649,324712,324783]))
r=json.load((p/(run+'-resources.json')).open());ck('21窗口',len(r['combats'])==21)
for c in r['combats']:
    e=c['entry'];end=c['exit'] or c['last'];ck('窗口首帧T1:'+str(c['sequence']),e['turn']==1)
    ck('首末资源:'+str(c['sequence']),st(e['line'])['run']['current_hp']==e['hp'] and st(end['line'])['run']['current_hp']==end['hp'])
for n in [324003,324062,324231,324284,324370]:ck('营火24:'+str(n),st(n)['run']['current_hp']-st(n-1)['run']['current_hp']==24)
ck('跨幕58',st(324124)['run']['current_hp']-st(324123)['run']['current_hp']==58)
rounds=json.load((p/'round-tables.json').open())
ck('墨影净扣183',sum(x['damage'] for x in rounds['9'])==183)
ck('棱柱净扣171',sum(x['damage'] for x in rounds['13'])==171)
ck('末次伤害338与回血60',sum(x['damage'] for x in rounds['21'])==338 and sum(x['heal'] for x in rounds['21'])==60)
ck('末次T4回30',en(324743)['current_hp']-pw(en(324743),'POISON_POWER')+30==en(324744)['current_hp'])
ck('末次T8回30',en(324765)['current_hp']-pw(en(324765),'POISON_POWER')+30==en(324766)['current_hp'])
m=json.load((p/'metrics.json').open());jev=[d for d in ds.values() if d['decider']=='jev'];rb=[d for d in jev if isinstance(d.get('rollout_best_chosen'),bool)]
ck('61低信心',sum(d['confidence']<.35 for d in jev if isinstance(d.get('confidence'),(float,int)))==61)
ck('225/240',len(rb)==240 and sum(d['rollout_best_chosen'] for d in rb)==225)
ck('主动饮用13',sum((d.get('chosen') or {}).get('action')=='use_potion' for d in ds.values())==13)
ck('丢弃0',sum((d.get('chosen') or {}).get('action')=='discard_potion' for d in ds.values())==0)
ck('31脑请求均Codex',len([json.loads(l) for l in (p/'brain.jsonl').open()])==31 and all(json.loads(l)['engine']=='codex' for l in (p/'brain.jsonl').open()))
ck('DeepSeek推理窗为空',(p/'deepseek-window.jsonl').stat().st_size==0)
b=json.load((p/'append-baseline.json').open());h=hashlib.sha256()
with (root/'notes/lessons.md').open('rb') as f:
    rest=b['size']
    while rest:
        x=f.read(min(rest,1048576));h.update(x);rest-=len(x)
ck('旧复盘前缀保留',h.hexdigest()==b['sha256'])
draft=(p/'draft-v2.md').read_text();ck('草稿三经验',sum(l.startswith('- [') and not l.startswith('- [记录]') for l in draft.splitlines())==3)
(p/'verification.json').write_text(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'通过':len(checks),'局号':run},ensure_ascii=False))
