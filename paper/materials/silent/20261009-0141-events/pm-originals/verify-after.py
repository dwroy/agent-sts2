import hashlib,json,re
from analyze import P,D,S,B,PL,SL
sm={x['_line']:x for x in S}; dm={x['_line']:x for x in D}
before=json.loads((P/'lessons-before.json').read_text())
h=hashlib.sha256(); remaining=before['bytes']
with open('notes/lessons.md','rb') as f:
 while remaining:
  block=f.read(min(65536,remaining)); assert block; h.update(block); remaining-=len(block)
 suffix=f.read()
assert h.hexdigest()==before['sha256'], '旧内容发生变化'
draft=(P/'lesson-draft.md').read_bytes()
assert suffix.startswith(draft), '追加小节与核验初稿不符'
with open('notes/lessons.md') as f:
 assert sum(line.startswith('## HEMND3SMQYB8') for line in f)==1

def hp(n): return sm[n]['state']['run']['current_hp']
def c(n): return sm[n]['state']['combat']
def eh(n): return sum(e['current_hp'] for e in c(n)['enemies'] if e['is_alive'])
def incoming(n): return sum(i.get('total_damage') or 0 for e in c(n)['enemies'] if e['is_alive'] for i in e.get('intents',[]))
def criteria(n,key):
 v=dm[n]['questions']['plan']['criteria'][key]
 return json.loads(v) if isinstance(v,str) else v
assert [hp(n) for n in [308820,308864,308983,309000,309008,309017,309021,309022]]==[70,25,25,14,10,1,1,0]
assert [eh(n) for n in [308983,309000,309008,309017,309022]]==[630,566,536,533,501]
assert [(e['enemy_id'],e['current_hp']) for e in c(309022)['enemies']]==[('TORCH_HEAD_AMALGAM',153),('QUEEN',348)]
assert c(309021)['player']['block']==11 and incoming(309021)==19
assert [hp(n) for n in [308847,308853]]==[49,28]
assert c(308852)['player']['block']==7 and incoming(308852)==22
w=[x for x in c(308852)['hand'] if x['card_id']=='WITHER']; assert len(w)==1 and '6点伤害' in w[0]['resolved_rules_text']
assert len(c(308992)['hand'])==8 and len(c(308993)['hand'])==7
assert 'CALCULATED_GAMBLE' in [x['card_id'] for x in c(308992)['hand']]
assert 'CALCULATED_GAMBLE' not in [x['card_id'] for x in c(308993)['hand']]
p1=criteria(301349,'plan1'); p2=criteria(301349,'plan2')
assert (p1['block_gained'],p1['hp_lost'],p2['block_gained'],p2['hp_lost'])==(24,3,18,9)
assert '~509' in p1['rollout'] and '~501' in p2['rollout']
assert dm[301349]['confidence']==0.33 and dm[301351]['confidence']==0.41
assert len(D)==850 and len(S)==966 and len(B)==47 and len(PL)==8 and len(SL)==9
plans=[x for x in D if x['decider']=='jev' and x['label'].startswith('combat/plan-choice')]
assert len(plans)==191
assert sum(x.get('rollout_best_chosen') is True for x in plans)==180
assert sum(x.get('rollout_best_chosen') is False for x in plans)==10
assert sum(x['decider']=='jev' and x.get('confidence',1)<0.35 for x in D)==11
assert sum(x['chosen']['action']=='use_potion' for x in D)==25
assert sum(x['chosen']['action']=='discard_potion' for x in D)==1
res=json.loads((P/'HEMND3SMQYB8-resources.json').read_text()); assert len(res['combats'])==26
for combat in res['combats']:
 start=combat['entry']; end=combat['exit'] or combat['last']
 assert hp(start['line'])==start['hp'] and hp(end['line'])==end['hp']
 assert sm[start['line']]['state']['turn']==1
checks={'旧复盘前缀保持':True,'本局仅一次追加且等同核验稿':True,'关键HP及末轮损伤':True,'敌人末血及升级换手':True,'全败候选及真实血价':True,'Jev统计与药水动作':True,'26窗资源与原帧一致':True}
print(json.dumps(checks,ensure_ascii=False,indent=2))
print('关键原帧：')
for n in [308820,308864,308983,309000,309008,309017,309021,309022]:
 print(json.dumps({'状态行':n,'时间':sm[n]['ts'],'回合':sm[n]['state']['turn'],'HP':hp(n),'挡':c(n)['player']['block'],'敌血合计':eh(n),'攻击意图':incoming(n)},ensure_ascii=False))
