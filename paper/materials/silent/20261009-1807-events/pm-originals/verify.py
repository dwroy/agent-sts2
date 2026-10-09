import json, re, hashlib, collections, datetime
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2'); p=root/'learner/runs/20261009-171301-postmortem'
def load(n):
    with (p/(n+'.jsonl')).open() as f:return [json.loads(l) for l in f]
checks={}; items={n:load(n) for n in ['runs','decisions','states','run-plans','sl-attempts','brain','run-config','codex-calls']}
for n,xs in items.items():
    digest=hashlib.sha256()
    with (root/'logs'/(n+'.jsonl')).open('rb') as src:
        for x in xs:
            src.seek(x['offset']); raw=src.readline(); assert json.loads(raw)==x['record'],(n,x['line'])
            digest.update(raw)
    checks[n]={'原始偏移逐条一致':len(xs),'局内原文sha256':digest.hexdigest()}
R=items['runs'][0]['record']; assert R['character'].lower()=='silent' and R['ended'] and R['floor']==49 and not R['victory'] and R['code']=='c7e1e0ed3+dirty'
D={x['line']:x['record'] for x in items['decisions']}; S={x['line']:x['record'] for x in items['states']}; byts={x['ts']:x for x in S.values()}; ds=list(D.values())
assert all(x['ts'] in byts for x in ds)
r=json.loads((p/'XW8B5CHJ814J-resources.json').read_text()); assert len(r['combats'])==32
for c in r['combats']:
    for key in ['entry','last','exit']:
        x=c.get(key)
        if not x:continue
        y=S[x['line']]; s=y['state']; assert x['ts']==y['ts']; assert (x['hp'],x['max_hp'])==(s['run']['current_hp'],s['run']['max_hp'])
        assert x['potions']==[[v['index'],v['potion_id']] for v in s['run'].get('potions',[]) if v.get('occupied')]
    assert c['entry']['turn']==1
kt=json.loads((p/'key-turns.json').read_text()); total=0
for c in kt:
    for t in c['turns']:
        a,z,n=[S[t[k]]['state'] for k in ['start_line','end_turn_line','next_line']]
        assert (t['hp_start'],t['hp_end_turn'],t['hp_next'])==(a['run']['current_hp'],z['run']['current_hp'],n['run']['current_hp'])
        assert z['combat']['player']['block']==t['block']
        atk=sum(i['total_damage'] for e in z['combat']['enemies'] if e['is_alive'] for i in e.get('intents',[]) if i['intent_type']=='Attack')
        assert atk==t['attack_budget']; total+=1
assert total==67
jev=[d for d in ds if d['decider']=='jev']; assert len(jev)==359; assert sum(isinstance(d.get('confidence'),(float,int)) and d['confidence']<.35 for d in jev)==46
answers=[]; focus=[]
for d in jev:
    if 'plan-choice' not in d['label']:continue
    m=re.search(r'Jev chose plan (\d+)/(\d+)',d['rationale'])
    if not m:continue
    key='plan'+m.group(1); q=next(q for q in d['questions'].values() if key in q.get('criteria',{})); v=json.loads(q['criteria'][key]); answers.append(v)
    if any('focus' in json.loads(x) for x in q.get('criteria',{}).values()):focus.append(d)
assert len(answers)==274 and sum(bool(v.get('rollout_best')) for v in answers)==230
assert len(focus)==41; assert dict(collections.Counter(d['floor'] for d in focus))=={6:6,20:6,28:9,49:20}
def assigned(d):return 'jev-plan' if d['decider']=='code' and d['rationale'].startswith('continuing the Jev-chosen plan:') else d['decider']
assert dict(collections.Counter(assigned(d) for d in ds))==R['deciders']
aut=[d for d in ds if assigned(d)=='code' and d['label'].startswith('combat/')]; turns={(d['floor'],d.get('sl_attempt'),d['turn']) for d in aut}
assert len(aut)==337 and len(turns)==143; assert sum(t[0]==48 for t in turns)==47 and sum(t[0]==49 for t in turns)==18
assert not any(d.get('fallback') for d in ds); assert len([d for d in ds if 'HP guard:' in d['rationale']])==4
use=[d for d in ds if d['chosen'].get('action')=='use_potion']; assert len(use)==18; assert not any(d['chosen'].get('action')=='discard_potion' for d in ds)
gains=sum(1 for x in r['resource_changes'] if not x['restart_boundary'] for v in x['to']['potions'] if v not in x['from']['potions']);assert gains==15
assert len([x for x in r['resource_changes'] if x['restart_boundary']])==8
assert D[317665]['fingerprint']==D[317745]['fingerprint']
def gethp(line):return S[line]['state']['run']['current_hp']
assert (gethp(326400),gethp(326401),gethp(326480),gethp(326481))==(7,7,7,1)
assert (gethp(326393),gethp(326395),gethp(326493),gethp(326494))==(7,7,1,0)
assert (gethp(326343),gethp(326344))==(5,31)
def enemy(line,ident):return next(e for e in S[line]['state']['combat']['enemies'] if e['enemy_id']==ident)
assert [enemy(i,'TEST_SUBJECT')['current_hp'] for i in [326296,326297,326298]]==[87,87,79]
assert (enemy(326494,'QUEEN')['current_hp'],enemy(326494,'TORCH_HEAD_AMALGAM')['current_hp'])==(393,200)
assert sum(t['visible_enemy_hp_loss_lower_bound'] for t in kt[-2]['turns'])==606
assert sum(t['visible_enemy_hp_loss_lower_bound'] for t in kt[-1]['turns'])==37
U={k:sum(x['record']['usage'].get(k,0) for x in items['brain']) for k in ['inputTokens','outputTokens','cacheHitTokens']};assert U=={'inputTokens':6275040,'outputTokens':12815,'cacheHitTokens':3348224}
JU={k:sum(d.get('usage',{}).get(k,0) for d in jev) for k in ['input_tokens','output_tokens']};assert JU=={'input_tokens':1781867,'output_tokens':18630}
assert sum(U[k] for k in ['inputTokens','outputTokens'])+sum(JU.values())==8088352
secs=(datetime.datetime.fromisoformat(ds[-1]['ts'])-datetime.datetime.fromisoformat(ds[0]['ts'])).total_seconds();assert secs==3500.542
clock=[]
def scan(v):
    if isinstance(v,dict):
        for k,x in v.items():
            if k=='act_boss_clock':clock.append(x)
            scan(x)
    elif isinstance(v,list):
        for x in v:scan(x)
for x in items['brain']:scan(x['record']['payload'])
assert clock
for c in clock:
    if isinstance(c,dict):
        for k in ['deck_damage_per_turn_estimate','hp_loss_per_turn_estimate','survivable_turns_estimate','damage_gap']:
            assert c.get(k) is None,(k,c)
checks['汇总']={'战斗窗口':32,'关键回合':67,'Jev低信心':46,'推演最优原答':[230,274],'focus题数':41,'代码自主动作':337,'有自主动作回合':143,'饮用':18,'新取得':15,'读档恢复':8,'决策用时秒':secs,'脑用量':U,'Jev用量':JU,'脑时钟条数':len(clock),'source_first_t1':'s326400→s326401'}
(p/'verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('核验通过：原偏移对应、32场资源、67轮、主结论、归属／药水／token均一致。')
