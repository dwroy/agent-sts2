import bisect, collections, json
from pathlib import Path
O=Path(__file__).parent
P=O/'HEMND3SMQYB8'
S=[json.loads(l) for l in (P/'states.jsonl').open()]
D=[json.loads(l) for l in (P/'decisions.jsonl').open()]
T=[x['ts'] for x in S]
assert len(S)==966 and len(D)==850
assert all(x['state']['run_id']=='HEMND3SMQYB8' and x['state']['run']['character_id'].lower()=='silent' for x in S)
def s(n):return S[n-308057]['state']
def hp(n):return s(n)['run']['current_hp']
def co(n):return s(n)['combat']
def pw(entity):return {p['power_id']:p['amount'] for p in entity.get('powers',[])}
def eh(n):return sum(e['current_hp'] for e in co(n)['enemies'] if e['is_alive'])
def inc(n):return sum(i.get('total_damage') or 0 for e in co(n)['enemies'] if e['is_alive'] for i in e.get('intents',[]))
checks=[]
def ck(label,condition):
 assert condition,label
 checks.append(label)
ck('双boss实血接续和末战净清',[hp(n) for n in [308820,308864,308983,309000,309008,309017,309022]]==[70,25,25,14,10,1,0])
ck('终战四轮敌血',[eh(n) for n in [308983,309000,309008,309017,309022]]==[630,566,536,533,501])
ck('末轮完整需损8而实死仅扣1',hp(309021)==1 and co(309021)['player']['block']==11 and inc(309021)==19)
ck('凋萎6与完整损21',hp(308847)==49 and hp(308853)==28 and co(308852)['player']['block']==7 and inc(308852)==22 and any(c['card_id']=='WITHER' and '6点伤害' in c['resolved_rules_text'] for c in co(308852)['hand']))
ck('升级全弃7换7',len(co(308992)['hand'])==8 and len(co(308993)['hand'])==7 and all(c['card_id'] not in ['ADRENALINE','NEUTRALIZE','STRANGLE','LEG_SWEEP'] for c in co(308993)['hand']))
ck('全弃不再保留自身',all(c['card_id']!='CALCULATED_GAMBLE' for c in co(308993)['hand']))
x=next(d for d in D if d['ts']==S[309010-308057]['ts']) if False else D[301349-300509]
plans=x['questions']['plan']['criteria']
a,b=[json.loads(plans[k]) if isinstance(plans[k],str) else plans[k] for k in ['plan1','plan2']]
ck('全败方案仍付6血价',(a['block_gained'],a['hp_lost'],b['block_gained'],b['hp_lost'])==(24,3,18,9) and '24/24' in a['rollout'] and '24/24' in b['rollout'])
ck('末试毒雾次轮才补毒',pw(co(309017)['player']).get('NOXIOUS_FUMES_POWER')==3 and all(pw(e).get('POISON_POWER')==3 for e in co(309017)['enemies']))
ck('五次读档恢复同一血药',all(hp(a)==9 and hp(b)==25 and any(p.get('potion_id')=='ENTROPIC_BREW' for p in s(b)['run']['potions']) for a,b in [(308889,308890),(308912,308913),(308935,308936),(308958,308959),(308982,308983)]))
ck('大脑和SL数量',sum(1 for l in (P/'brain.jsonl').open())==47 and sum(1 for l in (P/'sl-attempts.jsonl').open())==9 and not (P/'deepseek-reasoning.jsonl').read_text())
for d in D:
 if not (d.get('chosen') or {}).get('action')=='play_card':continue
 card=(d.get('expect') or {}).get('card',{}).get('id')
 if card not in ['FOOTWORK','NOXIOUS_FUMES','ACCELERANT','CALCULATED_GAMBLE','OUTBREAK']:continue
 i=bisect.bisect_right(T,d['ts'])-1;before=S[i]['state'];after=S[i+1]['state']
 c=next(c for c in before['combat']['hand'] if c['card_id']==card)
 p,q=pw(before['combat']['player']),pw(after['combat']['player'])
 if card=='FOOTWORK':ck('步法增敏 '+d['ts'],q.get('DEXTERITY_POWER',0)-p.get('DEXTERITY_POWER',0)==(3 if c['upgraded'] else 2))
 if card in ['NOXIOUS_FUMES','ACCELERANT']:
  key=card+'_POWER';gain=(3 if c['upgraded'] else 2) if card=='NOXIOUS_FUMES' else (2 if c['upgraded'] else 1)
  ck('能力建层 '+d['ts'],q.get(key,0)-p.get(key,0)==gain)
 if card=='CALCULATED_GAMBLE':ck('全弃等量抽 '+d['ts'],c['upgraded'] and '保留' in c['resolved_rules_text'] and len(after['combat']['hand'])==len(before['combat']['hand'])-1)
 if card=='OUTBREAK' and d['floor']==48:
  e=before['combat']['enemies'][0];f=after['combat']['enemies'][0]
  ck('已有22加9三结90余28',pw(e)['POISON_POWER']==22 and pw(f)['POISON_POWER']==28 and e['current_hp']-f['current_hp']==31+30+29==90)
result=dict(checks=len(checks),passed=checks,limitations=['未执行替代线没有胜局对照','完整dirty源码未知','凋萎内部结算次序缺独立帧','升级紧勒只限新局局部子集'])
(O/'verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('原始帧核验',len(checks),'项通过')
