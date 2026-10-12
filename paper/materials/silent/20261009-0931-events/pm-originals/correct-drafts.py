from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-091302-postmortem')
for r in ['VAC6Z1PZ1QJG','NG1FBJTSRLHS']:
 s=(p/f'{r}-draft-v1.md').read_text()
 if r.startswith('VAC'):
  s=s.replace('F33初始两体HP合计524','F33初始两体HP合计428').replace('[-3,-4,-2,8,5,19,11,10,15,0,0,8]','[-3,-4,10,6,7,7,11,10,15,0,0,8]').replace('8729908 tokens','8719908 tokens')
  s=s.replace('机制：末試T3尖啸将聚合体力量临时降至−6，三击27→6；T4力量恢复并继续成长，T6有3力量，虚弱前48→36，不能把T3六点威胁沿用。','机制：首试T3尖啸将聚合体力量临时降至−6，三击27→6；T4力量恢复并继续成长，T6有3力量，虚弱前48→36，不能把首试T3六点威胁沿用。末试尖啸在T2施放、16攻击变12，T3已没有临时负力量，27攻击没有获得同样的减力保护。')
  s=s.replace('直飞产卵虫 OVICOPTER／结实的卵 TOUGH_EGG','直飞产卵虫 OVICOPTER／结实的卵与幼虫 TOUGH_EGG')
 else:
  s=s.replace('T1安瓿使用当步未立即扣HP，实际置毒并在结束兑现，名称不是直接群伤的证据；具体机理不越过本局观察。','T1安瓿饮用当步本体104→94实扣10，原有4毒不变（s318055→318056）；随后4毒结算至90，不把安瓿伤和毒伤混成同一效果。')
  s=s.replace('扭曲漏斗在已见F8T1首次攻击后给两体各4毒，结束各扣4；F9T1打击后也实见4毒，安瓿饮用当步该毒仍4、HP94不变，此局不隔离安瓿作用于该缓慢目标的准确加毒规则。','扭曲漏斗在F8T1首个可操作帧已给两体各4毒，尚未打出攻击，结束各扣4；F9首个可操作帧本体仍132且已有4毒，安瓿饮用当步该毒仍4、HP104→94，安瓿是当步扣10而不是施毒。')
  s=s.replace('方柱首帧1人工制品 ARTIFACT_POWER阻止开场施毒，饮痊愈后中和消去制品并建虚弱；','方柱未就绪首帧有1人工制品 ARTIFACT_POWER，首个可操作帧已无制品且没有毒；饮痊愈后中和建立虚弱，不把已消失的制品记成中和才消去。')
 s=s.replace('入場','进场').replace('进場','进场').replace('末試','末试')
 (p/f'{r}-draft-v2.md').write_text(s)
(p/'inspection-notes.md').write_text('抽取与复核过程保留：summarize.py初次因一条纯路线记录没有chosen报KeyError，改用get后重跑；details.py初次把sl_attempt整数当字典报AttributeError，改按整数计尝试；查不存在的full-fight.ts失败，改读rollout.ts。draft-v1完整保留，追加前v2更正F33初HP428、末试逐轮HP净损、总token8719908，区分首试T3与末试T2尖啸，并逐帧更正安瓿即扣10、漏斗在首个可操作帧已有毒、方柱制品已于就绪前消失。上述初稿从未写入lessons.md，无须勘误。资源工具重复敌ID的下界不代表零伤害。当前纯bug仅定位末火接续异常，不假定缺资源和非正HP的具体分支。\n')
