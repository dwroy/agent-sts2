import json,subprocess,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-234302-postmortem');run='NHA2KW0RB7VP'
added={};updated=[];repeats=[]
def call(op,row,key):
 (p/f'ledger-input-{key}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
 r=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/ledger.py',op],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True)
 (p/f'ledger-{key}.out').write_text(r.stdout);(p/f'ledger-{key}.err').write_text(r.stderr)
 print(key,r.returncode,r.stdout.strip(),r.stderr.strip(),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
 return re.search(r'silent-\d+',r.stdout).group(0)
def add(key,kind,claim,evidence,first=run,prior='unknown',prior_runs=None,prior_note=''):
 row={'by':'learner:postmortem','character':'silent','kind':kind,'claim':claim,'evidence':evidence,'first_run':first,'prior':prior,'prior_runs':prior_runs or [],'prior_note':prior_note,'status':'observed','where':{'lessons':[run]}}
 added[key]=call('add',row,key)
def ev(f,t,n,role='support',rid=run):return {'run':rid,'floor':f,'turn':t,'note':n,'role':role}
def update(ident,items,note=''):
 row={'id':ident,'by':'learner:postmortem','evidence':items,'where':{'lessons':[run]},'note':note or '本次只追加已核本角色对局证据，不改变首证、先验、claim或上线历史。'}
 call('update',row,ident);updated.append(ident)
 if any(x['role']=='repeat' for x in items):repeats.append(ident)
update('silent-0020',[ev(24,None,'实际休息18→42，随后棘刺蟾蜍小血瓶补至44、胜后21；F27回至45，F28事件失5至40，F30双异螨补至42后胜至4，F32实回24至28。三次二幕回血都兑现，无精英路线仍低血到boss；保留回血正确选择support。'),ev(33,1,'入房28/80，小血瓶补至30、空药；六次boss尝试，不把SL恢复47算回血，也不宣称前战留药或别线可赢。')])
update('silent-0079',[ev(33,1,'第1—4次14挡、实损1、跨轮净扣8；第5/6次SL把斗篷与匕首换回响斩击，8挡、实损7、跨轮净扣24，多16伤且多损6。Jev仍选斗篷，代码覆盖/重放；模拟均零胜，六次无击杀、T4仍败。decisions277248/277250/277272/277274，states283391—283397、283478—283483、283502—283507。','repeat')])
add('rounding-bug','bug-infra','碾碎爪已有虚弱的取整意图被后方攻击转换再次取整，当前backAttack对显示1算floor(1×1.5)=1，而本局相同力量−2、虚弱1、同招转向后实际2。首战T2防御＋冲刺预测损6，实际2＋20−15=7；第2次斗篷线报5实6。定位当前live agent/src/reflex/turn-solver.ts:2493/2546/2585，只确认该现场输入，不把1点差额归为整场死因。',[ev(33,2,'首战states283398→283399意图1→2、火箭30→20，15挡29→22；decisions277167报6。第2次283418—283422同增益、16挡29→23，277188报5。notes/fix-queue.md及角色账本无此项。')],prior_note='按取整、朝向、后方攻击查角色账本及更早静默复盘；流式扫描此前已结束silent的同ENLARGING_STRIKE_MOVE、同增益1→2转换，只匹配本局六次，没有学习前的可比状态，不借其他角色判断。')
add('rounding-mechanic','mechanic','本局帝王蟹两部件都活着时，碾碎爪同ENLARGING_STRIKE_MOVE、力量−2和虚弱1保持不变，正面显示1，转向火箭后显示2；火箭同轮30变20。不能把已有虚弱下已取整的显示1再乘后方系数1.5当作实际2。仅记录六次同一局现场，不推通用取整顺序或其他力量/招式。',[ev(33,2,'首战283398—283400实际2＋20、15挡损7；第二次283418—283422实际2＋20、16挡损6；六次1→2同增益转换的源行/时间保存prior-rounding.json。')],prior_note='与纯bug同一冻结证据；此前同角色账本0065只有其他数字的朝向机制，未有该1/2取整现场，流式检查无更早可比转换。')
add('lamp-mechanic','mechanic','静默持有不安油灯时已观察第一次施加负面状态的数值翻倍：更早K367 A1 F30 T2升级带毒刺击牌面4毒实际从0建8毒；本局NHA A10 F17 T1普通毒药5毒实际建10、F33 T1 X1萎靡实际给−2力量和2虚弱。只确认这些现场首次施用，不推广所有负面状态或一战后续再翻倍；它与转向及后续虚弱、实际格挡分账，14挡/8挡对15攻击分别损1/7。',[ev(30,2,'升级带毒刺击POISONED_STAB的PoisonPower4，盛碗虫蜜BOWLBUG_NECTAR从无毒变8毒，decisions212867、states217009→217010，2026-10-04T21:37:15.142Z。',rid='K3676LU8B0UH'),ev(17,1,'states283146→283147普通致命毒药牌面5、实建10，轮末结算10；此前没有其他施负面牌。'),ev(33,1,'首战X1萎靡后states283395为力量−2/虚弱2、两意图9＋6，14挡实损1；末次283506相同减益、8挡实损7。')],first='K3676LU8B0UH',prior='yes',prior_runs=['K3676LU8B0UH'],prior_note='该机制首次独立入账之前，同角色A1已经出升级带毒刺击并实际兑现4→8；只据自动数值与出牌行为判此前已正确执行，不宣称模型主动理解了遗物或其胜负贡献。')
update('silent-0166',[ev(17,1,'原四攻击切割/打击/精确切击/猛扑报27，实6＋6＋5＋14=31；起手七张CalculatedDamage1，两牌离手变3/5，精确切击实扣5，原计划固定1独立漏4。当前card-model.ts1035拒绝初始1、turn-solver.ts2074 recordedShown仍限3/5，旧S1.fix30局部已观察范围不覆盖此次七手起步。另加毒药10是后续重规划，不算本项漏模。decisions276921—276925、states283142—283148。','repeat')],note='旧bug的局部覆盖限制再次显现；保留S1.fix30与旧已修分支，不宣称所有精确切击失效或本次整局可救。新增冻结七手1→六手3→五手5的扩展提案。')
update('silent-0169',[ev(17,1,'无力量/虚弱的七手显示1，切割离手六手显示3，打击离手五手显示5，实际精确切击扣5（283142—283145）；补新的七手起步数值，不外推升级或所有手数。')])
update('silent-0133',[ev(17,4,'仪式兽165血、横冲直撞160/4力量/24攻击，冲刺伤10后155、横冲直撞和力量消失、转0攻击（283156→283157），本轮零损；后段重新4力量、T9跺地21，毒收24剩血免攻击，不称跨阶段即击杀。')])
update('silent-0011',[ev(17,9,'毒雾T5建2层，T6—T9轮初毒19/20/28/29，T9毒29截断收24血；其他毒牌另计。'),ev(33,4,'六次毒雾直到T4才建立2层，前五次结算前重载、末次死亡，没有T5补毒；末次实际7＋5毒伤12来自两毒药，不给新毒雾提前记伤。')])
update('silent-0005',[ev(17,8,'普通步法建立2敏捷，T9昏眩状态下仅结束，零格挡，无后续格挡牌收益；F30 T6生存者先给8挡、后出步法建2，不能倒补；boss六次未打步法。')])
update('silent-0065',[ev(33,4,'末次火箭蓄力后3力量，背向激光57，普通致命毒药转向火箭后38，期间没有给火箭新虚弱（283520—283525）；降19与朝向同帧，6挡+16血仍死。')])
update('silent-0189',[ev(33,4,'二幕六尝试T1/2起始3能量、T3/4起始4，末次T4支付延伸/残影+/两毒药/毒雾；脆弱下残影+实际6挡，额外能量不能保证存活。')])
result={'added':added,'updated':updated,'repeats':repeats}
(p/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
