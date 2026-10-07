import json, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
N='NHA2KW0RB7VP';C=json.load(open(O/'changes.json'))
mapping={
 'silent-footwork-block':['silent-0005'],
 'silent-strength-weak-observation':['silent-0006'],
 'silent-deck-burst-observation':['silent-0021'],
 'silent-noxious-fumes-growth':['silent-0011'],
 'silent-kaiser-crab-facing-sl':['silent-0065','silent-0264','silent-0079'],
 'silent-ceremonial-beast-threshold-growth-sl':['silent-0133'],
 'silent-precise-cut-hand-count-observation':['silent-0169'],
 'silent-paels-flesh-third-turn-energy':['silent-0189'],
 'silent-frail-card-block':['silent-0013'],
 'silent-malaise-x-debuff':['silent-0053'],
 'silent-mr-struggles-turn-start-damage':['silent-0162'],
 'silent-route-hp-observation':['silent-0019'],
 'silent-rest-buffer-observation':['silent-0020'],
 'silent-unsettling-lamp-first-debuff':['silent-0265']}
L=json.load(open(O/'ledger-fold.json'));L={r['id']:r for r in L}
pre=[]
for change in C['entries']:
 eid=change['id'];e=change['after']
 for lid in mapping[eid]:
  old=L[lid]
  evidence=[dict(run=r,role='support',note='本批重新抽取静默复盘/状态/决策验证；子公式、层/回合和限制见本批report.md及'+eid)
            for r in e['evidence'] if not any(x['run']==r for x in old['evidence'])]
  row=dict(id=lid,by='learner:experience-update',where={'experience':[eid]},note='经验第84批提交前证据/提案关联；首证、先验、claim、旧repeat与上线历史保持，本次尚未登记上线。')
  if evidence:row['evidence']=evidence
  pre.append(row)
(O/'ledger-prelink-input.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in pre))
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=(O/'ledger-prelink-input.jsonl').read_text(),text=True,capture_output=True)
(O/'ledger-prelink.log').write_text(p.stdout+p.stderr);assert p.returncode==0,p.stderr
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')

mechanisms=[e for e in mapping if e not in ['silent-route-hp-observation','silent-rest-buffer-observation']]
groups=[('mechanisms',mechanisms,['combat','terminal'],
 '按静默实帧核油灯首次放大、当前手数/脆弱/能量、蟹朝向取整及能力兑现；只修已观察子公式和估值窗口',
 f'''# 静默机制与实际兑现代码提案

来源任务 experience-update，第84批；实现任务 strategy-proposal；授权 Roy-2026-10-07-learning。
仅静默已观察的A1/A7/A10现场与各关联经验原有进阶；别的角色和未观察组合保持等价。来源账本：{{ledger}}。关联经验：{{experience}}。

旧行为与新行为：经验已列正常萎靡X/X+1、牌挡敏捷/脆弱、毒雾轮初、第三轮能量和朝向，但油灯特定首次负面放大与显示意图再次取整缺少联合验证。独立实现任务先核当前源码及实际live祖先；已正确的子公式给duplicate与真实源码commit，有缺口才基于冻结实帧实现。禁止把拥有能力、模拟零胜率或预期下一轮伤害计成已兑现。

证据：{N} A10 F33 T1首次普通X1萎靡实−2力/2弱，六试一致；F17首毒5→10。K3676LU8B0UH A1 F30 T2带毒刺击4→8，SADL3CGYTGSR A7 F45毒药5→10；五持有局中三局17直接窗口，0反例；目标退场重排排除、不当反例，其他状态/零X/叠层不外推。{N} F33 T2同ENLARGING_STRIKE_MOVE、−2力/1弱，爪正面1→后方2，火箭30→20；首试15挡损7，原预测6；第二试16挡损6，原预测5，只一局六窗口，不推通用取整顺序。F17 T1精确切击七/六/五手1/3/5，实5，原四攻估27实31差4；不把额外施毒10全归本牌。

兑现边界：{N} F19 T1步法+2敏、防御5→7；F30 T6建敏前后已有8挡不变。蟹六试无步法施放、毒雾均T4才建而无T5；末轮两毒药实结12，329→317。F33末T4残影+基础8/脆弱0.75实6挡，4能量已支付五张牌仍死；不得预支常驻能力/格挡。佩尔之肉本局六房11尝试窗口T1/2/3为3/3/4、加旧七局33共44，SL不是多局。抱抱先生首试T1小刀后敌404、T2两侧各扣2到400；开场20缺分项帧，不拆成伪精确值。仪式兽T4攻击165→159跨160阈值停攻、九轮赢损40；后段仍须实际挡与存活。

拟合：不引入经验阈值或自由拟合参数。逐帧验证算术/时点，窗口分母与独立局分母分开；先用旧历史局冻结机制，再留新{N}作样本外数值回放。输入来自本批states/decisions及lamp-history.json，不跑boss模拟池。

缺数据：原运行树b8ca9311+dirty不可还原；油灯其他负面/零X/升级萎靡/叠层、朝向其他力量/招式/取整顺序无足够对照。缺完整早建能力、提前留药/喝药的整战胜线。保留现有生产规则，未证实项目waiting；无独立胜因，不因局部多4/少1伤宣称救局。

验证与预期影响：按run/floor/turn保存固定夹具，联合核目标当前力量、虚弱、后方状态、费用、实际HP/挡/毒。核失败方已取整显示1不能再floor(1×1.5)冒充实际2。新增可复现夹具而不改测试预算，原沙箱tsc/vitest通过；各子项给实际处置，非静默和未观察进阶回归等价。

回退：独立源码commit可按文件恢复到实现前live基线，保留当前经验/账本/原失败历史。实现和合入由strategy-proposal完成；本任务仅改经验，提案pending，不冒报implemented或shipped。
'''),
 ('resources',['silent-route-hp-observation','silent-rest-buffer-observation','silent-kaiser-crab-facing-sl'],['combat','sl','terminal'],
 'SL零胜率换线须显式核即时血价和击杀推进，路线/营火实际回复与存档恢复分账；证据不足保留门槛',
 f'''# 静默SL换线与连续资源兑现代码提案

来源任务experience-update，第84批；实现任务strategy-proposal；授权Roy-2026-10-07-learning。仅静默已观察A10，账本：{{ledger}}；经验：{{experience}}。

旧规则：SL换线以模拟全零胜且未更常死亡为“不更差”；路线投影假设后续回血与平均血价，未来能力/营火可能作为缓冲。新行为建议：饱和死亡统计之外核同首手当前一轮实际血价、已结输出、是否杀敌和剩血可活窗口；路线按实际已完成回血与下一场入口验收，SL恢复不算回血。不能凭本败局新增路线禁令、药水阈值、必死推测或强制优先斗篷。

证据：{N} A10 F33前四次T1同30血、同首手/底板，斗篷线14挡、损1、净扣8；第5次代码SL改回响，第6次重放8挡、损7、净扣24，多16伤多损6血，六试0赢且都无击杀。Jev原答仍为斗篷，覆盖来自SL。第3/6试T2改冲刺目标后小刀转回，完整轮仍损6；第4试T3集火爪，T4仍判死。前五次T4未执行毒/攻击，末试16血/6挡对38需损32、存活差17；不是只需损16。本批支持蟹16房8活8死、8场44重试1赢，A9两场8试1赢，不以胜者未控的抽弃/后轮动作归单因。既有silent-0079的repeat保留，不将SL覆盖算HP护栏。

资源链：本局6火，1锻造5回血各24共120；二幕F24 18→42、F25小血瓶补2仍44→21；F27回45、F28事件付5至40；F30补2后损38余4，F32回28、boss开场补2到30。二幕三火72都已兑现、0精英仍消耗，不能归为贪锻造。存档恢复9+8+8+8+14=47另列；七次实际饮药、0弃药、boss空药，没有提前留药/喝药胜线。A10 70局381火/262回血，实回6204、244去重后战38死，活损中位24；按进阶/幕/房型/血档完整表在audit.json。

拟合与时间切分：重算旧109局七数组/分档/下一战/回血/SL均一致，新增本局仅作样本外局部核算。以同首手T1对照验证即时差额，不将后轮不同抽弃混为完全受控整战。历史低血改路线比较只是观察，敌/牌/间隔不同，不估因果改善。无自由参数拟合、不跑模拟池。

验证与预期影响：固定该同盘面两线的HP/挡/净伤与SL主体，确保“零胜率”不被解释为等价血价；对回复、开场遗物、战内药水、事件付血、存档恢复分别记账，下一场入血与当前条件变化可审计。独立任务可先只补验证/可见差额；若无胜线/完整反事实支撑改变生产SL/终局门槛，waiting并保留旧行为。新增事实不提供通用喝药/留药规则。

反例与缺数据：没有本局胜利替代线、无未走路线反事实、无保留药水/少付事件5血的实打胜局；模拟饱和也未证明换线不会赢。典型旧低血休MGA0CZDDKC0P和事件D4LJ9QMGFB8Q对比条件不同。保留这些限制，禁止把死亡当机制失效。

回退：独立实现commit按文件恢复旧live行为，经验/账本/原失败历史保留。自测后由strategy-proposal合入并记录实际祖先源码；本任务未改打法，不写implemented/shipped。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
 lids=list(dict.fromkeys(lid for eid in eids for lid in mapping[eid]))
 md=O/f'proposal-{name}.md';md.write_text(body.replace('{ledger}',','.join(lids)).replace('{experience}',','.join(eids)))
 item=dict(character='silent',ledger=lids,runs=[N,'K3676LU8B0UH','SADL3CGYTGSR'] if name=='mechanisms' else [N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(md),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
 inp=O/f'proposal-{name}.json';inp.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
 p=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=inp.read_text(),text=True,capture_output=True)
 (O/f'proposal-{name}-cli.log').write_text(p.stdout+p.stderr);assert p.returncode==0,p.stderr
 ids.append(p.stdout.strip())
(O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
print(ids)
