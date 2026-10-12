import json, re, collections, hashlib
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-171301-postmortem')
def load(n):
    with (p/(n+'.jsonl')).open() as h:return [json.loads(l) for l in h]
ds=load('decisions'); ss=load('states'); bs=load('brain'); sl=load('sl-attempts')
D={x['line']:x['record'] for x in ds}; S={x['line']:x['record'] for x in ss}; ST={x['record']['ts']:x for x in ss}
r=json.loads((p/'XW8B5CHJ814J-resources.json').read_text()); kt=json.loads((p/'key-turns.json').read_text())
names={}; pots={}
for x in ss:
    s=x['record']['state']
    for e in (s.get('combat') or {}).get('enemies',[]): names[e['enemy_id']]=e['name']
    for a in s['run'].get('potions',[]):pots[a['potion_id']]=a['name']
def belt(x):return '空' if not x else '；'.join('槽%d %s（%s）'%(i,pots.get(a,a),a) for i,a in x)
def hp(x):return '%s/%s'%(x['hp'],x['max_hp'])
def ev(x):return 's%s@%s'%(x['line'],x['ts'])
lines=['''
## XW8B5CHJ814J（A10，静默猎手，第49层，死于连续第二boss女王 QUEEN／火炬头聚合体 TORCH_HEAD_AMALGAM：六次7/79血空药进场，前五次T3判死读档，末次T3以1血4挡对9×3＝27攻击阵亡）
- [首boss获胜后的资源必须继续计入第二战；打法（DeepSeek 路线/构筑/休息、Jev 出牌、代码终局价值）] 实验体 #C69（TEST_SUBJECT）第四次73/79血、槽0格挡药水（BLOCK_POTION）进场，T1喝药，T9蜥蜴尾巴（LIZARD_TAIL）实际触发，T17获胜仅剩7/79血、空药栏；F49女王（QUEEN）与火炬头聚合体（TORCH_HEAD_AMALGAM）没有中途回血或补药，且灵动步法（FOOTWORK）、速行者（SPEEDSTER）、毒雾（NOXIOUS_FUMES）须在新战重新建立。F34脑已明确为连续两boss备战，F47也选择回血，不能说它忘记第二boss；本局支持接续HP、槽位药水、已消耗复活与能力启动窗口共同审计，不证明F48留药或少损某个数就能赢F49。证据d317367／317565、s326343→326344／326393→326395、p2919／2922；登记连战资源代码提案，未改变规则。（之前学过：silent-0228，S1.exp131）
- [死亡推演饱和仍要记少挡的即时血价；打法（Jev 出牌、代码 SL）] F49首试与末试T1重问的fingerprint相同，均7血、已有12挡、相同手牌；Jev原选背刺（BACKSTAB）打女王（QUEEN）加两张防御（DEFEND_SILENT），末试信心0.96，代码SL改成背刺、必备工具（TOOLS_OF_THE_TRADE）、一张防御。两方案在末试推演里均24/24最终死，但题面当轮损0→6、直伤都11，实盘首试T1零损、末试损6到1血；第3／4／5试则把一张防御换打击（STRIKE_SILENT），题面多6直伤、同样实损6，仍未胜。不能从“没有更常死亡”推出更安全，也没有原线能通关的受控反事实。d317665／317745与s326400→326401／326480→326481，独立SL代码提案保留当前阈值，先验即时血价与完整后段。（之前学过：silent-0079，S1.exp131）
- [女王后段按已生效减益与可打手牌结算；打法（Jev 出牌、代码）] 女王（QUEEN）末试T2后建立99虚弱／脆弱／易伤（WEAK_POWER／FRAIL_POWER／VULNERABLE_POWER）；T3魂缚（CHAINS_OF_BINDING_POWER）使生存者（SURVIVOR）及打击（STRIKE_SILENT）显示blocked_by_hook，其他牌仍能打。中和（NEUTRALIZE）实际令聚合体（TORCH_HEAD_AMALGAM）意图36→27，后空翻（BACKFLIP）受脆弱只得4挡，最后1血对27仍差23额外血才可完整承受；剩1能量与已建立2层毒雾（NOXIOUS_FUMES_POWER）不能当作当轮挡或已结算毒，两敌尚无毒，死亡后没有T4。least-loss报预测HP−22与1−(27−4)一致；本局没有证明漏读减益或锁牌的纯bug，不规定未实到的牌序必胜。证据s326487—326494、d317758—317761；减益／可用性补证关联代码提案。（之前学过：silent-0069，S1.exp131）
- [记录] runs.jsonl原行654确认SILENT、A10、F49、victory=false、code=c7e1e0ed3+dirty；唯一局报notes/run-1009-1653-XW8B5CHJ814J.md已读。run-config行289记录源码c7e1e0ed360c72903c84fb3791cf66c193c369cd，dirty清单为知识数据和notes/fight-value-backtest-silent.md；本节源码定位按只读live 5957f056390032639e701fde18f74e60b21536ce，不能把运行期后续知识刷新当成本局已学版本。开局知识version=2026-10-09.20，三条标记采用开局前实际shipped版本，旧先验不重写。按局号流式抽出d316540—317762共1223条、s325219—326494共1276帧、p2914—2922共9条及sl1400—1413共14条；deepseek-reasoning在本局决策时间窗内0条，补核brain.jsonl b10140—10185共46条全engine=codex、model=gpt-6.1-sol、accepted=true。“DeepSeek”是任务职责及ds_*兼容字段，本局原话属于Codex，实际DeepSeek调用0。

  实盘资源链：下面逐场保留赢战及每次尝试。血量为进场→退出；退出缺失则仅列判死前最后帧及截至该帧的净变化，不补未执行敌回合。净HP变化包含自损、回血和尾巴，不是敌人总伤害；药水槽位均来自状态。胜由随后奖励状态／SL结果核实，resource_chain不自动判胜。全部入口首帧turn=1；F49首试第一帧还在初始化（0能量、空手牌），以随后稳定帧核手牌，不假定此帧是可选牌盘面。证据s=states.jsonl原行、d=decisions.jsonl原行、p=run-plans.jsonl原行、b=brain.jsonl原行；以下时间为日志UTC。

| 窗口／层／尝试／结果 | 敌人（含本战随后实际召出） | 进场HP→退出／最后HP；净HP变化 | 带槽位药水：进场→退出／最后 | 入场→退出／最后证据 |
|---|---|---|---|---|
''']
for c in r['combats']:
    a=c['entry']; z=c['exit'] or c['last']; floor=c['floor']; seq=c['sequence']
    attempt=seq-22 if floor==48 else seq-26 if floor==49 else 1
    result='胜／奖励退出' if c['exit'] and z['screen']=='REWARD' else '实死' if z['screen']=='GAME_OVER' else '判死，退出未记录'
    lo,hi=a['line'],z['line']; enemyids=[]
    for x in ss:
        if lo<=x['line']<=hi:
            for e in (x['record']['state'].get('combat') or {}).get('enemies',[]):
                if e['enemy_id'] not in enemyids:enemyids.append(e['enemy_id'])
    ens='；'.join('%s（%s）'%(names[e],e) for e in enemyids)
    change=z['hp']-a['hp']; suffix='（截至判死）' if not c['exit'] else ''
    lines.append('| %d／F%d／第%d次／%s | %s | %s→%s；%+d%s | %s→%s | %s→%s |\n'%(seq,floor,attempt,result,ens,hp(a),hp(z),change,suffix,belt(a['potions']),belt(z['potions']),ev(a),ev(z)))
lines.append('''
  SL单列：F17、F33、F36、F37各第一次胜（sl1400—1403）；F48前三次分别T12在9血11挡对45、T12在31血14挡对45（恰好归零）、T11在17血28挡对45判死，均reload.ok=true，第四次T17胜（sl1404—1407）。F49前两次T3在2血14挡对27判死，第三至第五次T3在1血10挡对27判死，均reload.ok=true；第六次T3实际死亡（sl1408—1413）。F48读档恢复9→73、31→73、17→73并恢复原槽0格挡药水；F49恢复2→7、2→7、1→7、1→7、1→7、药栏均空。这8次是同一存档恢复，均不记回血／新增药水。

  关键进场资源来处（所有中间胜战见上表）：开局56/70，F1营养牡蛎（NUTRITIOUS_OYSTER）使67/81；F2／3／5／6后59，F7休息59→81（+22）；F8／9后57，F11锻造突然一拳（SUCKER_PUNCH）不回血，F12胜仍57，F13休息57→81（+24）；F14赢后66，F16锻造灵动步法（FOOTWORK）仍66进入墨影幻灵（VANTOM），F17胜出35，跨幕实35→71（+36）。F19／20／22胜出71→58→42，F25锻造毒雾（NOXIOUS_FUMES）仍42，F26获皇家枕头（REGAL_PILLOW），F27休息42→81（+39）；F28／29／30／31胜出64→52→52→35，F32休息35→74（+39），知识恶魔（KNOWLEDGE_DEMON）胜出11并耗尽罐装幽灵，跨幕实11→67（+56）。F34取投斧（THROWING_AXE）；F35胜出30/81，F36咬人卷轴（SCROLL_OF_BITING）结束25/79，最大HP少2来源未记录，不归给敌攻击；F37战斗好伙伴（BATTLE_FRIEND_V1）胜仍25/79并补癫狂之触。F38以地精之角（GREMLIN_HORN）换异蛇头骨（SNECKO_SKULL）；F39芳香蘑菇（FRAGRANT_MUSHROOM）事件扣15，25→10，F40休息10→48（+38），F41获蜥蜴尾巴。F42巨斧机器人（AXEBOT）赢后17，F43买速度药水，F44休息17→55（+38）；F45猫头鹰法官（OWL_MAGISTRATE）胜出35，F46买格挡药水，F47休息35→73（+38）；F48第四次73→7、空药、尾巴已触发，然后s326393@08:48:42.036Z→s326395@08:49:21.925Z实7→7进F49，无回血／药水补充。10次营火是7次回血（实际合238）、3次锻造；非战斗回血、事件扣血及药栏变化证据如下，SL已从此表排除。

| 前状态→后状态（原行／UTC） | 层／界面 | HP／最大HP变化 | 药栏变化 |
|---|---|---|---|
''')
for x in r['resource_changes']:
    if x['combat_sequence'] is not None or x['restart_boundary']:continue
    a,z=x['from'],x['to']
    lines.append('| %s→%s | F%s／%s | %s→%s | %s→%s |\n'%(ev(a),ev(z),z['floor'],z['screen'],hp(a),hp(z),belt(a['potions']),belt(z['potions'])))
lines.append('''
  药水取得15瓶：11次领取奖励／事件装瓶与4次商店购买，均有槽位增量；饮用动作18次，额外3次是F48读档恢复同一瓶后再喝；丢弃0次，战斗内额外生成／补充0瓶。不能把十八次饮用当十八瓶新取得，或把pending选择界面当丢弃。以下从饮用前槽位到后续该槽药消失帧逐项核对，能力药／癫狂之触在后续选择完毕后离槽；获得来源与时间在上一表，领取／购买决策依次为d316589／316595／316639／316681／316787／316840／316857／316886／316923／316972／317032／317150／317236／317315／317363。尚无前场保留药水让后场获胜的控制试验；任何留药建议均另附证据、账本和策略提案，不改现行饮药规则。

| 饮用决策／UTC | 层／尝试／回合 | 饮用前槽位与药水 | 后续槽内药消失证据 |
|---|---|---|---|
''')
for x in ds:
    d=x['record']; a=d['chosen']
    if a.get('action')!='use_potion':continue
    pre=ST[d['ts']]; st=pre['record']['state']; slot=a['option_index']; po=next(v for v in st['run']['potions'] if v['index']==slot)
    post=next(v for v in ss if v['line']>pre['line'] and not any(q['index']==slot and q['potion_id']==po['potion_id'] for q in v['record']['state']['run'].get('potions',[])))
    lines.append('| d%d@%s | F%d／第%d次／T%d | 槽%d %s（%s），s%d | s%d@%s |\n'%(x['line'],d['ts'],d['floor'],d.get('sl_attempt') or 1,d['turn'],slot,po['name'],po['potion_id'],pre['line'],post['line'],post['record']['ts']))
lines.append('''
  每回合核对表（关键胜战及终局）：每格依次是“轮初HP→结束动作时HP→下一轮／退出HP；结束动作时总攻击意图/挡；该轮敌可见HP减少下界；轮初存活敌尚需本体血”。攻击意图减挡只是完整预算，毒杀中断、过量、复活和自损都可能使它不同于净HP变化；敌血下界只累加同一实体的已见减少，不补缺失归零、不把下一阶段新HP当负伤害，也不是单张牌直伤。每回合需伤按轮初实见存活实体列，未出现阶段不预支；完整逐次毛伤未记录。

| 战斗／回合 | HP（轮初→末动作→下轮／退出） | 攻击意图／末挡 | 敌HP减少下界 | 轮初存活敌需血 | 证据（首／末动作／下轮或退出） |
|---|---|---|---|---|---|
''')
for c in kt:
    for t in c['turns']:
        s=S[t['start_line']]['state']; es=[e for e in (s.get('combat') or {}).get('enemies',[]) if e.get('is_alive')]
        need='＋'.join(str(e['current_hp']) for e in es) or '0（阶段等待）'
        lines.append('| F%d%s／T%d | %s→%s→%s | %s／%s | %s | %s | s%s／s%s／s%s |\n'%(c['floor'],'第4次' if c['floor']==48 else '第6次' if c['floor']==49 else '',t['turn'],t['hp_start'],t['hp_end_turn'],t['hp_next'],t['attack_budget'],t['block'],t['visible_enemy_hp_loss_lower_bound'],need,t['start_line'],t['end_turn_line'],t['next_line']))
lines.append('''
  表中缺帧／阶段限制：墨影幻灵（VANTOM）初183，末仍3后直接奖励退出，终击归零未见；知识恶魔（KNOWLEDGE_DEMON）初399，T4／8／12各见净回血27／12／4，合43为“可见净回升”而非完整回血毛量，末30后退出、零血中间帧未记录，不能把399当含回血的完整输出需求。虔诚雕刻师（DEVOTED_SCULPTOR）T7与巨斧机器人（AXEBOT）T9有末前意图但毒先结束战斗，玩家未承受该完整预算；机器人T3／7有同ID最大HP改变，未确认实体变形细节，不把跨变形差额当完整伤害。猫头鹰法官T7终击零血帧缺。实验体第四次三阶段111／212／313实见，本体总636；T6末敌1血后新阶段212，末T17敌29后直接奖励，缺失这两次归零的中间帧；可见减少下界合606，不冒充全伤606。T9蜥蜴尾巴实际5→31，净+26，不猜中间回血39是否曾出现；T10第二阶段23血、19毒与荆棘在连击间结束敌人，玩家仅31→29，不把意图48−挡14＝34写成实损。T11敌已死而第三体未出现，代码phase-setup／end_turn等待；T12才见313第三体。

  F49末试初敌419＋211＝630，T1／2／3敌可见减少14／7／16、合37，末女王393/419及聚合体200/211、仍需593且无一击杀；T1背刺女王11＋一次铜质鳞片（BRONZE_SCALES）反伤3，T2小刀（SHIV）女王4＋反伤3，T3突然一拳+（SUCKER_PUNCH）女王7、切割（SLICE）女王4、中和聚合体2，再反伤3，合16。最后完整预算27−4＝23，1血需至少再多23血才能承受全部攻击；真实死亡帧只扣剩1到0，首击9−4＝5已足够致死，不将23预算等同实际扣23。女王未被杀，T3建立的毒雾没有T4可补毒，末仍无POISON_POWER。

  构筑／路线／休息原话与兑现：p2914开局希望刀刃之舞（BLADE_DANCE）、匕首雨（DAGGER_SPRAY）、灵动步法、尖啸（PIERCING_WAIL）、毒雾、触媒（ACCELERANT），走多击＋敏捷＋毒；d316542原话“两精英四营火，兼顾成长与血量，后期商店补强。”F11锻造突然一拳、F16锻造灵动步法，F17取得群蛇形态（SERPENT_FORM）；d316845 F18取佩尔之肉（PAELS_FLESH），原话“第三轮增能支撑攻防，三火一精英路线保血成长。”F25锻造毒雾，F27与F32实回血；p2918已纠正群蛇升级是加伤而非减费，不把此前误记继续当机制。d317155 F34取投斧原话“投斧复制核心能力；走双商店三营火，避精英。”p2919也明写第二boss前无中间回血，不能指责未识别连战。F35取第三后空翻，F36猎杀者（PREDATOR），F42速行者+，F43滚石（ROLLING_BOULDER）170金＋速度药水49金，F45第二张普通毒雾，F46灵动步法74金＋格挡药水49金＝123；F47选HEAL实回38到73，d317367理由强调连续boss需要启动窗口和资源（原英文在日志，本节中文转述）。p2922是F48胜后独立计划，仍要求7血保护与核尾巴可用性；未执行的升级／购买／路线／留药整场反事实未记录，不由本局定卡牌泛用排序。

  Jev与代码归属：359次Jev回答中confidence<0.35有46次（F49 20、F48 10、F33及F35各3、F22及F45各2、F2／6／28／30／31／36各1）。278道战斗选线题内274次给数字方案、4次直接饮药；解析原回答所选criteria.rollout_best=true共230/274＝83.94%（含并列最优），不是HP护栏／SL之后的实际贯彻比例，该比例未记录。focus字段有41道数字方案题（F6 6、F20 6、F28 9、F49 20），其中候选有单敌与混合focus，F49提供女王／聚合体集中目标；最终实际先背刺女王、T2小刀女王，T3拳和切割女王、中和聚合体，无实际击杀，不把focus当已完成击杀顺序。全局fallback=0；归属code504、jev-plan299、jev359、codex61。排除299条“continuing the Jev-chosen plan”后，code自主战斗动作337，按（floor,sl_attempt,turn）去重143轮（F48 47、F49 18），内含自选线续步91条、plan148、lethal41、least-loss26、end_turn25、mod-lethal4、potion-now1、phase-setup1；这不是143轮完全无Jev的轮数，其他同轮重问可交回Jev。F49首试与末试T1同fingerprint的0／6血价已用实到T2核对；末试SL的两条方案T2起known-draw推演不同于首试样本，不能拿相同盘面宣称整场单变量。F49第3／4试额外打击指向女王，第5试指向聚合体，都未击杀。F20／F28等多敌战的逐体归零中间帧未记录，完整击杀顺序不猜。

  HP护栏4条：d317278 F42T5把Jev刀刃之舞＋两带毒刺击（POISONED_STAB）题面损22／伤15换为突然一拳+＋后空翻＋两带毒刺击题面损10／伤15，单轮预测省12血、不少伤，实际40→30、敌可见扣18含荆棘，不把15／18差当单一bug。d317442／317512／317567 F48第2／3／4次T2均把打击＋必备工具的损16／伤9换必备工具＋后空翻的损13／伤3，每条模型省3血／少6伤；第3次随后被SL再改成打击＋后空翻＋打击，故4条护栏只有3条进入护栏所选首段。四条题面合21血／18伤代价，不是实际共救21血或实际少打18伤；抽牌后另问／续打还会改变全轮。F48第四次T2实际69→56损13，整轮敌可见少20，与护栏候选的单轮3不能直接相减归因。

  路线投影／boss时钟：b10142 F2投影F17进81/81，实66/81（少15），后续F11／F16实际锻造，须同时记选择变化；F27回血选项模拟boss进63、实F33进74（多11），F32回血模拟74、实74。b10179 F42后投影F45进55、实55，F48进79、实73（少6），F49明确“前场boss损血未建模／未知”；F44回血题面同样投影79，实73。F16升级灵动步法选项992样本，题面胜率0.994／赢局损32／11轮，F17实际11轮、净损31；F32回血选项840样本胜率0.6952／赢局损54／13轮，F33实际13轮、净损63。F47连续F48→F49模拟312/1000样本、timed_out=true，所选回血输入73、联合win=0、turns=7、boss_left=423.734；该7轮是联合采样输出，不与单场F48实际17轮作同口径比，未校准win=0也不证必死；F44仅跑240未达最低300而不报模拟数的说明在题面，非已定位纯bug。所有静默act_boss_clock的每轮估伤、预计损血、可活轮与缺口为null；本体需求VANTOM183、KNOWLEDGE_DEMON399、TEST_SUBJECT636（111＋212＋313），需要／估计及实打／时钟估值比未记录，不套铁甲常量；F49实际新敌630另计。

  机制：本局能力、增益均按现场而非牌组持有计。F48第四次升级／普通灵动步法（FOOTWORK）使开场意外光滑的石头（ODDLY_SMOOTH_STONE）的1敏捷先1→4再→6（DEXTERITY_POWER），T13后空翻11＋防御11＝22挡，较无敏捷的5＋5＝10多12，仍对33损11；新战F49又只从意外光滑的石头1敏捷开始，首试T2才建立普通步法到3、仍仅17挡对22损5，末试T2未建步法，以斗篷与匕首（CLOAK_AND_DAGGER）7＋后空翻6＋防御+9＝22刚好零损。末试女王T3的99脆弱令后空翻6→4（少2），魂缚锁住的生存者9→6（少3但未执行不能预支）；99虚弱令拳11→7、中和3→2、切割6→4，99易伤按现场意图处理，已经含在27里，不能再乘。F48第一阶段激怒（ENRAGE_POWER）现场3层，T2必备工具能力不加敌力、后空翻技能使敌力0→3，T3后空翻3→6、灵动步法+仍6、生存者技能6→9；技能加力与能力不加力同轮对照，T5实见60攻击，不套旧低阶2层。跨实验体阶段玩家常驻能力保留，但敌力／旧毒重置，F49新战能力重建；本局没触媒，不能补它的额外毒结算。头骨（SNECKO_SKULL）在毒雾能力5层时每次现场补毒6，与能力层数分开，普通毒雾2层在F49T3刚建立仍没有下轮毒；铜质鳞片开场3荆棘，全挡仍能反伤，最后死亡攻击也实扣聚合体3。

  速行者（SPEEDSTER）由投斧首张能力重放建立4层SPEEDSTER_POWER。F48第四次T2必备工具前后敌均87，随后后空翻抽两张，s326297→326298敌87→79、孤立实扣8；同一题护栏候选plan3“必备工具＋后空翻”只列cards_drawn=2、damage_dealt=3、enemies_after=84，未消费这8点已建立抽牌伤。续问又打击79→73、敌方阶段毒与荆棘后67，不能把整轮20−3＝17全算速行者。当前live agent/src/reflex/combat-plan.ts:2854起的PlayerSim映射未接SPEEDSTER_POWER，agent/src/reflex/turn-solver.ts:2379／2506抽牌只调用poisonDraws，:2513函数只处理CORROSIVE_WAVE式施毒、未处理速行者直接伤；这是已有机制silent-0045的模型消费缺口，独立combat／structure提案先保存这一固定输入重放，未知多目标／满手／无实体／回合开场抽牌等范围保留限制，不作为新的纯基础设施bug登记。更早静默4XLZURXMD872已记类似8估／14实、额外6来自速行者三抽但未完整配对模型输入，本次补齐局部直接证据，不标“第一次遇到”。敏捷、毒雾、换体、激怒、速行者、头骨与荆棘分别补silent-0005／0011／0027／0028／0045／0087／0129，均support；只把SL即时血价记silent-0079 repeat，其余主条为support，不将输局本身当同一决策错误重犯。

  用时及成本口径：首末决策2026-10-09T07:55:01.218Z—08:53:21.760Z，3500.542秒＝58.34分钟；Jev输入1781867／输出18630，合runs.tokens=1800497。runs兼容脑45次输入6140406／输出12127／命中3348224，输入命中54.53%（局报四舍五入55%）；另外F48胜后独立run-plan b10185／p2922输入134634／输出688／缓存0／37323毫秒，不在runs总计中。46次物理脑合输入6275040／输出12815／命中3348224，命中53.36%，加Jev总token8088352；未把兼容ds_cache_hit称为DeepSeek真实调用缓存。Jev缓存命中、实际费用账单、未执行方案的整场胜负、完整敌／玩家逐击毛伤、缺失归零与复活中间帧、F36最大HP−2来源、护栏后最优线实际贯彻比例、未实到的毒伤／减益后续、静默boss时钟估伤与两个比值均未记录。原局报费用约值不是实际账单。本节只追加记录；源码、知识、旧复盘与旧先验不改，独立strategy-proposal实现任务另登记。
''')
text=''.join(lines)
(p/'lesson-draft.md').write_text(text)
(p/'append-section.sh').write_text("cat >> /home/dw/Projects/agent-sts2/notes/lessons.md <<'EOF'\n"+text+'EOF\n')
print('草稿字节',len(text.encode()),'表中战斗',len(r['combats']),'关键回合',sum(len(x['turns']) for x in kt))
