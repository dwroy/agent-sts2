import json,subprocess
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem');res=json.load((p/'ledger-results.json').open());a=res['added'];ids=[]
common='''\n角色为silent，仅扩展本任务实际核对的现场／A10范围；其他角色、未观察进阶和组合保持等价。来源任务：postmortem（learner/runs/20261007-234302-postmortem，NHA2KW0RB7VP）；实现任务：独立strategy-proposal。Roy-2026-10-07-learning是学习授权，不提供游戏事实。本任务只写复盘／CLI账本／提案，未改源码、未测试代码或合入，没有implemented_commit。\n验证使用保存的固定输入，按agent/tools/test-sandbox.sh及项目live流程自行测试、合前检查知识刷新、gitleaks和唯一版本；实际发布后date及双通知沿既有授权。失败、缺数据、旧方案和冻结输入保留，回退只撤实际实现提交对应角色分支，不改原日志和已学其他机制。\n'''
def proposal(key,summary,ledger,runs,domains,body,rule=False):
 md=p/f'proposal-{key}.md';md.write_text('# '+summary+'\n\n'+body+common)
 item={'character':'silent','source_task':'postmortem','target_task':'strategy-proposal','domains':domains,'summary':summary,'ledger':ledger,'runs':runs,'proposal':str(md),'rule_changes':rule}
 if rule:item['authorization']='Roy-2026-10-07-learning'
 inp=p/f'proposal-{key}.json';inp.write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
 r=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/code_proposals.py','add','--character','silent'],input=json.dumps(item,ensure_ascii=False),text=True,capture_output=True)
 (p/f'proposal-{key}.out').write_text(r.stdout);(p/f'proposal-{key}.err').write_text(r.stderr)
 print(key,r.returncode,r.stdout.strip(),r.stderr.strip(),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
 ids.append(r.stdout.strip())
proposal('back-attack-rounding','已有虚弱的取整意图转向后少算1伤，按已核底值联合重算或明示未精确',[a['rounding-bug'],a['rounding-mechanic'],a['lamp-mechanic']],['NHA2KW0RB7VP','K3676LU8B0UH'],['combat'],'''证据与账本：本局F33 T2、silent-0263/0264；油灯建立−2力量及2虚弱的来源另关联silent-0265。首战states283398→283399，碾碎爪CRUSHER相同ENLARGING_STRIKE_MOVE、STRENGTH_POWER−2、WEAK_POWER1，转向后1→2，火箭ROCKET30→20，防御＋冲刺15挡，decisions277167报损6、实际29→22损7。第二次283418—283422冲刺／斗篷16挡，原277188报5、实29→23损6；小刀打火箭前后两意图仍2＋20，该1差不是额外打刀造成。六个同局同招1→2转换保存在prior-rounding.json；此前已结束silent流式同条件检查无更早匹配，不把六次当六局独立样本。

旧行为：只读live fd4c8e52341c31cad606c0a4b96a43663843e201 的agent/src/reflex/turn-solver.ts:2493把已取整shown乘1.5再floor；:2546、:2585传入逐击。显示1因此仍算1。运行code为b8ca9311+dirty，实际dirty树未存，不能用当前版本替代原树；原题面可复现预测差。

新行为候选：在本角色已核招式底值可追溯时，按原始伤害、当前力量／虚弱与新朝向联合计算并最后取整，或保留未取整中间值；底值不可追溯时显式标未精确并保留约束范围，不将floor全改ceil、凭显示1猜底值或推广所有敌人。第一步用固定现场验证预测1与实际2的接线，再确定有证据的实现分支；无足够底值则保留生产并回报waiting，仍保留提案。油灯只用于核实该−2力量／2弱现场，不新增泛化的所有减益规则：更早K367 A1 F30 T2带毒刺击升级PoisonPower4→实际8（212867、217009→217010），本局普通毒药5→10及X1萎靡−2／弱2另列。

反例／限制：没有别的力量、虚弱层、增益组合和招式的同条件取整公式，也没有修正后胜利对照。当前末次T4死亡38−6=32与真实一致，不能说这1伤是整局死因。

拟合与时间切分：不拟合全局系数，首战T2用于定位、第二次至末次同场固定帧用于保留核验；只能评价该输入的数值一致性，未来新silent完成局另作时间后移验证。保存的fixed输入包含旧意图1、转向后2、不同15/16挡，以及力量／弱层没有变化的证据。

验证与预期影响：固定15挡须预测损7、16挡须6；正面不转向保持1、火箭30→20与T4末38/6保持，正负力量、已剥弱、单部件和其他角色未知分支按旧行为留存。旧计划被抽牌／选牌截断的部分不得当作完整实打预测。只能预期少一类乐观低估，不预期已证胜率提升。''')
proposal('saturated-sl','死亡统计饱和的SL替换须显式比较即时血价与击杀、存活推进，门槛等待固定验证',['silent-0079'],['NHA2KW0RB7VP'],['combat','sl'],'''证据与账本：silent-0079 repeat，NHA F33第5/6次T1。第1—4次原线生存者／斗篷与匕首／萎靡／小刀14挡、实损1、跨轮净扣敌8；第5次277248/277250从Jev原答斗篷线换回响斩击，末次277272/277274重放，8挡、实损7、跨轮净扣24，多16伤且多损6。原始可操作30血、手牌与底板一致；初案的精确切击都被生存者弃掉后重新规划。两种整轮均无击杀，T4仍判死或死亡。第五次16血回存档30、恢复14不是回血。

旧规则：agent/src/sl/explore.ts:1420、:1505、:1520按B2 notWorse或rollout deathShare筛候选；全零胜／全死没有区分时仍取未试线，并可能重放。该现有门槛的行为不是纯代码bug，记录为已学习血价问题的重复；本局开打前最后已上线经验为S1.exp79，复盘期间最新S1.exp82晚于本局，不倒记为开打前版本。

新行为候选：独立策略任务先在已列同盘面候选中同时记录原答和替换的完整计划即时净损血差、对应敌人及两侧本体剩血、是否实际可击杀、可追溯的存活轮推进、未知抽牌／范围；让饱和notWorse和这些差额同时可核查。若后续固定验证能支持筛选，仅在本角色已观察进阶使用即时存活和击杀推进条件约束换线；不从这一败局定全局固定血价阈值，不关闭探索或声明原答必胜。没有足够实盘／后移胜负样本时保持生产门槛，诊断先行并报告waiting理由。Roy授权允许证据充分后的规则更改，但不替代证据。

反例与限制：第3次T2改冲刺打碾碎爪后小刀转回火箭，完整轮仍损6；第4次T3改集中碾碎爪而T4仍死。临时朝向／初题15损不能冒当最终6损，显示更多输出不能冒当过关；第5和第6不是独立成功样本，本局所有六次均失败。没有保留能量药水、不同前战或不换线可赢的反事实。

拟合／切分：首战与第5次同盘面作资源代价审计，第6次固定重放只核数值复现，不充当独立胜率测试。未来新silent完局按任务时间后移收集、原答与覆盖分账；任何候选选择需要本角色数据校验，不借其他角色阈值。

验证：冻结277248/277250/277272/277274及对应states，确认可见即时14→8挡、1→7损、跨轮8→24敌净扣，分开抱抱先生次轮自动扣4和卡牌伤，且未杀一侧。覆盖／原答／实际执行三者分别输出，HP护栏仍0次，SL恢复单列；固定检查不能只镜像实现。预期先消除“全死意味着额外付血无代价”的解释错误，胜率提升未证。''',True)
proposal('precise-cut-seven-hand','扩展既有精确切击模型到本局已观察的七手1伤起步，修同线1到5漏重算',['silent-0166','silent-0169'],['NHA2KW0RB7VP'],['combat'],'''证据与账本：silent-0166/S1.fix30同类repeat；silent-0169机制support扩展。NHA A10 F17 T1仪式兽CEREMONIAL_BEAST，原方案切割／打击／精确切击／猛扑（276921）预测27。states283142—283145没有力量／虚弱：七手PRECISE_CUT CalculatedDamage1，切割离手六手3，打击离手五手5，实精确切击扣5；四攻击实际6＋6＋5＋14=31，原方案独立少4。随后276925因猛扑FREE_SKILL给予普通毒药免费，油灯使5毒实建10、轮末扣10，完整41；这后续10不是精确切击缺口。

旧／新行为：当前card-model.ts:1035只在初值3/5/7/11标记，turn-solver.ts:2074 recordedShown在无力量时又仅3/5；旧S1.fix30五／六手和已观察力量分支保持。新增固定可追溯七手1→六手3→五手5的无力量、无虚弱、无缩小普通牌分支，让本局相同四攻击计划预测31。不要从一组新输入放开所有手数的通式，不把升级、抽牌、能力混合与其他力量组合写成已知。起始1目前是显式未扩展的观测范围，属于旧同类漏重算，不宣称已修全部行为发生回归。

样本／时间切分与反例：本局T1逐牌固定帧定位，既有0169的五／六手及0166已发布的力量分支作保留回归输入；新完成silent局作后移验证。没有修前/修后的整场胜负，仪式兽本局本就赢，不能把4伤推为整局救命或先打精确切击策略。缺失升级牌、新手数及其他力量组合均保持原行为。

验证与影响：固定计划27→31；后续另一次毒药方案10及完整41分开，净损0保持。测试七手起始1后两张牌离手至5，以及原3/5/7/11已验证分支、另一角色等价；有额外抽牌或未知选择时重规划，不能读取尚未发生手牌。预期只扩已核固定输入，未证胜率改进。回退撤新七手范围，不撤旧S1.fix30修复。''')
(p/'proposal-results.json').write_text(json.dumps({'code_proposals':ids,'implementation_domains':['combat','sl']},ensure_ascii=False,indent=2)+'\n')
