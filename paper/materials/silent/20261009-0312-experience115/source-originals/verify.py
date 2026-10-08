import collections
import json
from pathlib import Path

O = Path(__file__).parent
P = O / 'P2M3DFJ4DEZ3'
S = [json.loads(l) for l in (P / 'states.jsonl').open()]
D = [json.loads(l) for l in (P / 'decisions.jsonl').open()]
checks = []
def ck(label, value):
    assert value, label
    checks.append(label)
def s(n): return S[n-309026]['state']
def hp(n): return s(n)['run']['current_hp']
def co(n): return s(n)['combat']
def pw(e): return {p['power_id']:p['amount'] for p in e.get('powers',[])}
def inc(n): return sum(i.get('total_damage') or 0 for e in co(n)['enemies'] if e['is_alive'] for i in e['intents'])
ck('角色与帧数', len(S)==1367 and len(D)==1247 and all(x['state']['run']['character_id'].lower()=='silent' and x['state']['run_id']=='P2M3DFJ4DEZ3' for x in S))
ck('双王实血接续', [hp(n) for n in [310195,310196,310197,310198]]==[19,19,19,21])
ck('双王无药接续', all(not any(p['occupied'] for p in s(n)['run']['potions']) for n in [310195,310197,310198,310367]))
ck('步法华彩实建6敏', pw(co(310368)['player'])['DEXTERITY_POWER']==6)
ck('专长科学另增2力2敏', pw(co(310369)['player'])=={'STRENGTH_POWER':3,'DEXTERITY_POWER':8})
ck('步法与科学不补已有挡', co(310368)['player']['block']==co(310369)['player']['block']==0)
ck('重放防御26', co(310372)['player']['block']==26)
ck('能力新建不倒补26', co(310373)['player']['block']==co(310374)['player']['block']==26 and pw(co(310374)['player'])['UNMOVABLE_POWER']==1)
ck('沙漏首牌翻倍28', co(309859)['player']['block']==0 and co(309860)['player']['block']==28)
ck('沙漏完整损25', hp(309858)-hp(309861)==25 and inc(309860)==26 and sum('9点伤害' in c['resolved_rules_text'] for c in co(309860)['hand'] if c['card_id']=='WITHER')==3)
ck('女王次轮首斗篷28', co(310377)['player']['block']==28)
ck('蛇咬升级加10而本体不变', pw(co(310380)['enemies'][0])['POISON_POWER']==2 and pw(co(310381)['enemies'][0])['POISON_POWER']==12 and co(310380)['enemies'][0]['current_hp']==co(310381)['enemies'][0]['current_hp']==132)
ck('普通蛇咬加7', pw(co(310390)['enemies'][1])['POISON_POWER']==7)
ck('未执行中和被弃', any(c['card_id']=='NEUTRALIZE' for c in co(310382)['hand']) and not any(c['card_id']=='NEUTRALIZE' for c in co(310383)['hand']))
ck('首闪躲翻滚21与待结21', co(310391)['player']['block']==21 and pw(co(310391)['player'])['BLOCK_NEXT_TURN_POWER']==21)
for n,value in [(310390,19),(310391,9)]:
    ck('消费翻倍后防御牌面 '+str(n), all(c['dynamic_values'][0]['current_value']==value for c in co(n)['hand'] if c['card_id']=='DEFEND_SILENT'))
ck('翻倍脆弱组合实值', next(c['dynamic_values'][0]['base_value'] for c in co(310390)['hand'] if c['card_id']=='DODGE_AND_ROLL')==6 and int((6+8)*2*.75)==21)
ck('末轮需6且少1血存活', hp(310391)==6 and inc(310391)-co(310391)['player']['block']==6 and hp(310392)==0)
ck('死亡前后毒结17余482', sum(e['current_hp'] for e in co(310391)['enemies'])-sum(e['current_hp'] for e in co(310392)['enemies'])==17 and sum(e['current_hp'] for e in co(310392)['enemies'])==482)
ck('群蛇未实打', not any(d.get('chosen',{}).get('action')=='play_card' and d.get('expect',{}).get('card',{}).get('id')=='SERPENT_FORM' for d in D))
ck('群蛇能力未实建', not any(pw(x['state'].get('combat',{}).get('player',{})).get('SERPENT_FORM_POWER') for x in S if x['state'].get('combat')))
ck('全Codex脑与无DeepSeek推理', len(list((P/'brain.jsonl').open()))==51 and all(json.loads(l)['engine']=='codex' for l in (P/'brain.jsonl').open()) and (P/'deepseek-reasoning.jsonl').stat().st_size==0)
ck('跨幕80%回复', hp(309321)==63 and hp(309559)==57 and 36+int((70-36)*.8)==63 and 8+int((70-8)*.8)==57)
ck('沙漏胜试持牌损34', hp(310181)-hp(310182)==34 and co(310181)['player']['block']==28 and inc(310181)==26 and sum('9点伤害' in c['resolved_rules_text'] for c in co(310181)['hand'] if c['card_id']=='WITHER')==4)
for a,b in [(309804,309805),(309881,309882),(309961,309962),(310043,310044),(310121,310122)]:
    ck('首王SL恢复 '+str(a), hp(b)==77 and sum(p['occupied'] for p in s(b)['run']['potions'])==2)
for a,b in [(310224,310225),(310248,310249),(310273,310274),(310307,310308),(310366,310367)]:
    ck('次王SL恢复 '+str(a), hp(b)==21 and not any(p['occupied'] for p in s(b)['run']['potions']))
result=dict(checks=len(checks),passed=checks,limitations=['未执行替代线无整战胜果','完整dirty源码未知','持牌伤内部全序缺帧','首卡翻倍与脆弱顺序仅本局组合核验'])
(O/'verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('关键实帧核验通过',len(checks))
