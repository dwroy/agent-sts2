import json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];CLI=['python3',str(ROOT/'learner/ledger.py')];RUN='BVF22RSFVBS9'
C=json.load(open(O/'changes.json'));M=json.load(open(O/'mechanisms.json'));commit=(O/'commit.txt').read_text().strip()
stamp=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()
title=f'{stamp} 静默猎手 第五十四次增量：1 局 A10（version 2026-10-06.29，分支 exp-silent，{commit[:8]}）'
(O/'changelog-title.txt').write_text(title+'\n')
mapping={'silent-0006':['silent-strength-weak-observation'],'silent-0007':['silent-deadly-poison-application'],'silent-0010':['silent-bubble-bubble-condition'],'silent-0011':['silent-noxious-fumes-growth'],'silent-0019':['silent-route-hp-observation'],'silent-0020':['silent-rest-buffer-observation'],'silent-0021':['silent-deck-burst-observation'],'silent-0027':['silent-accelerant-triggers'],'silent-0030':['silent-poisoned-stab-components'],'silent-0046':['silent-piercing-wail-temporary-strength'],'silent-0128':['silent-slumbering-beetle-wake-growth'],'silent-0133':['silent-ceremonial-beast-threshold-growth-sl'],'silent-0196':['silent-bowlbug-rock-full-block-stun']}
assert {e for es in mapping.values() for e in es}==set(C['updated']+C['added'])
notes={
'silent-0005':'死亡战无玩家力敏/步法，不补该牌证据；非药水部分只补敌力量与尖啸临时减力到综合plan。',
'silent-0006':'A10三虫末T3尖啸+令石虫0→−8力、16→8，T4临时恢复；甲虫醒后18、T5力2弱后15、第3次T6力4无弱22。',
'silent-0007':'A10仪式兽T4毒雾轮初到19，普通毒药再加5至24、敌血不即时变；触媒1使结束毒47，176→129跨160。',
'silent-0010':'A10仪式兽T3已有10毒，普通冒泡实加9到19、敌血不即时变；随后触媒1结算19+18=37。只补正条件分支，没有新空打。',
'silent-0011':'A10仪式兽T1建2、后续补毒兑现，三虫末T5才建2随即死、无后续玩家轮補毒；前战能力不能预支新战输出。',
'silent-0019':'旧65局明细全部一致；66局1040房56实死，A10二十六局326房26死；本局59→21后改无精英四营火，F23仍先21血死亡，F24未到，无替路线因果。',
'silent-0020':'A10三火各回血21合63、锻造0；F16回血42→63后仪式兽损44过关；二幕计划四火均未到。A10累计157火101回血2340，去重后战94/16死。',
'silent-0021':'A10终24张四打击五防御、无步法/后空翻；仪式兽毒启动七轮扣262胜，新战T1七能建触媒却前三轮仅36/180、毒雾T5才建后死。',
'silent-0027':'A10仪式兽T3触媒建1使19毒扣19+18=37，三虫T1建1无初毒不会即时群伤；持有/建立/触发分账。',
'silent-0030':'A10 F14 T1普通刺击直6使缩小甲虫40→34、另施3毒；F19 T4直伤被挡敌50不变仍把5毒加到8，攻击/施毒分核。',
'silent-0046':'A10三虫末T3尖啸+临时−8使石虫16→8，双防御10盖住且T4眩晕；甲虫仍醒并成长，T5力2弱后15杀4血0挡。',
'silent-0128':'A10三虫末T4甲虫睡/覆甲消失但当前16挡仍在，回响仅少7挡；T5力2弱后15，第三次T6力4无弱22，四尝试0赢不定击杀顺序。',
'silent-0133':'A10仪式兽首试63→19七轮扣262，T4毒24+23=47使176→129跨160清4力/横冲且31血零损，T6仍损12；首胜不加真正重打4场20次1赢分母。',
}
rows=[];before={}
for ident,entries in mapping.items():
 old=json.loads(subprocess.check_output(CLI+['show',ident],text=True));assert old['character']=='silent' and old['kind']!='bug-infra';before[ident]=old
 row=dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[title]),note='静默经验2026-10-06.29：BVF22RSFVBS9 A10与本角色历史；机制/启动/SL血价/路线和恢复观察分账；无新用药规则、无代码变更。仅proposed，first_run/prior/claim/旧version/repeat保持，交运维核实际合入后CLI登记shipped。')
 if ident=='silent-0196':
  row['evidence']=[]
  for r in M['stone']['supports']:
   if not any(e['run']==r and e.get('role','support')=='support' for e in old['evidence']):
    x=next(x for x in M['stone']['rows'] if x['run']==r and x['support']);row['evidence'].append(dict(run=r,floor=x['floor'],turn=x['turn'],role='support',note=f'实际结束前挡{x["block"]}覆盖石虫{x["hit"]}，下一轮STUNNED；玩家血{x["before_hp"]}→{x["after_hp"]}，只证本敌完整挡窗口。'))
  if not row['evidence']:del row['evidence']
  row['note']+=' 石虫32支持局59完整挡窗口0反例，首证LRN0HPZ0FZS1/A0、prior=yes原登记保持，不记成本局失败后首次学会。'
 elif not any(e['run']==RUN for e in old['evidence']):row['evidence']=[dict(run=RUN,role='support',note=notes[ident])]
 rows.append(row)
(O/'ledger-fold-before-update.json').write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n')
payload=''.join(json.dumps(row,ensure_ascii=False)+'\n' for row in rows);(O/'ledger-updates.jsonl').write_text(payload)
subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
r=subprocess.run(CLI+['update'],input=payload,text=True,capture_output=True);(O/'ledger-update.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stdout+r.stderr
r=subprocess.run(CLI+['check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(r.stdout+r.stderr);assert r.returncode==0,r.stdout+r.stderr
for ident,old in before.items():
 now=json.loads(subprocess.check_output(CLI+['show',ident],text=True))
 for field in ['first_run','prior','prior_runs','prior_note','claim','version']:assert now.get(field)==old.get(field),(ident,field)
 assert now['evidence'][:len(old['evidence'])]==old['evidence']
 assert [e for e in now['evidence'] if e.get('role')=='repeat']==[e for e in old['evidence'] if e.get('role')=='repeat']
result=dict(added=[],proposed=list(mapping),retired=[],check=0);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
