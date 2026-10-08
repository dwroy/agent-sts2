import collections
import copy
import json
from pathlib import Path

O=Path(__file__).parent
P=Path('knowledge/characters/silent/experience.json')
E=json.load((O/'experience-before.json').open())
OLD=copy.deepcopy(E)
RUN='CNKR125PFHJ5'
texts={
'silent-strength-weak-observation': '力量逐击加伤，敏捷逐张加牌挡，弱与易伤另核。机制：基础加现场力敏后核乘区，旧挡不倒补，毒和被动挡分账。搭配：多击/多挡重复收益，不能由加力代替生存。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：LYBHQ1X230ZB四段1力多4伤；CNKR125PFHJ5 A10沙虫T3四敏使防御9＋生存者12共21、仍损2；敌3力两击24，较无力9×2多6，先前虚弱下12不当力的基线。',
'silent-footwork-block':'步法普通/升级建立2/3敏捷，后续每张挡牌兑现。机制：基础挡加现场敏后核脆弱/倍率，旧挡不补，吸取/遗物另核。搭配：多挡重复收益，没打挡牌无收益。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：9R916WW0V65N六敏无挡牌仍死；CNKR125PFHJ5 A10沙虫T2升级建3敏、T3口红再到4，防御9与生存者12合21，比零敏多8，仍对23损2。',
'silent-insatiable-dual-clock':'沙虫沙坑与攻击分别核，延长不等挡攻击，未来毒不预支。机制：逃离已见加1，沙坑归零判死，实结毒与敌剩血另核。搭配：血/真挡及截止前输出共同验收，未饮药交互未验。决定胜负的战斗：{n}支持/0反例，真正重打仍14场58试7赢，本局只首试（n={n}）。典型案例：H1T1F8ML9FUE重试延沙坑后毒胜；CNKR125PFHJ5 A10 T5逃离1→2，T6仍1，27血9挡对24攻账可剩12却截止死，33毒三结96后敌仍121；未测罐装幽灵抵沙坑。',
'silent-route-hp-observation':'观察：胜前战/避可选精英不保证后段血药，问号可战。A10 101局二幕Monster<25%入血仍11房/10局、6死，活损中位6；分阶/幕/房型/血档另列（n=141）。典型案例：CNKR125PFHJ5 A10 F19/21/23三胜耗4/20/36至2，事件消毒药换上限加10到12；两次休息到60，F29/30再胜耗23/8，末火29→53仍败；无同资源替线整场因果对照。',
'silent-rest-buffer-observation':'观察：即时回复不等于后战保证，未到营火不预支。A10 101局575独立火/401回血实回9318，去重372后战55死（14.78%），活损中位22；各阶另列（n=141）。典型案例：CNKR125PFHJ5 A10 F25/28/32实回12→36、36→60、29→53；F29/30赢战仍耗31，末战沙坑死。休息只增血缓冲，未有改锻造/路线的整场对照。',
'silent-deck-burst-observation':'观察：取得能力、实际建立、收益兑现与整战结果分核，不由数量推输出闭环。机制：只计实建增益/已结毒及可活轮，换战重建；截止不能用回血延期。搭配：到手可支付、真挡与药是否建模合核。决定胜负的战斗：{n}支持/0反例，整战单因未控（n={n}）。典型案例：UZ1T7AH49WMB千足虫实建毒雾/触媒即死、无已结毒；CNKR125PFHJ5 A10沙虫末T6才建触媒，直56＋毒146＋轮初被动18共220，341血仍余121；余像未打，不预支其挡。',
'silent-noxious-fumes-growth':'毒雾普通/升级建立2/3层，后续玩家轮初补毒。机制：建层不即时施毒，已结毒减1再按实建量补，可叠加、制品/阶段另核。搭配：必须活到施毒与结算，不能把拥有能力算输出。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：UZ1T7AH49WMB千足虫末T3建3即死、无下轮收益；CNKR125PFHJ5 A10沙虫T2实建3，T3—6轮初毒5/7/16/30，中途其他施毒分源，末结毒仍未在截止前终结。',
'silent-accelerant-triggers':'触媒增加毒结算次数，不倍增毒层；普通/升级建1/2且不即时施毒。机制：k层至多k＋1次，每结减1、零停止；普通p≥2为2p−1，升级p≥3为3p−3，限伤/阶段另核。搭配：先实建毒并活到结算，换战重建。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：CNKR125PFHJ5 A10异鱼T5无实体下17毒普通两结只扣2；沙虫末T6升级当步30毒不变，刺击到33，三结96仍余121，不能预支无实体下理论33或截止后的伤害。',
'silent-orichalcum-zero-block':'奥利哈钢已见结束回合零挡补6，已有挡不另加6。机制：回合末触发与牌挡/敏捷分账，潜在6不保证免死。搭配：当前真挡、攻击与特殊截止分别核。决定胜负的战斗：{n}支持/0反例，遗物单项整战胜因未控（n={n}）。典型案例：KAY522KT5NXR A0实验体已有27挡对27不补；CNKR125PFHJ5 A10棱柱T1零挡对20实损14，沙虫T2零挡对12实损6，T3已有21挡对23实损2；末轮9挡不补且沙坑死。',
'silent-sparkling-rouge-turn-three':'闪亮口红已见第3轮开始加1力1敏，不当开场或每轮成长。机制：与步法/药的净属性分源，攻击逐击、牌挡逐张兑现。搭配：先核弱/易伤/脆弱和独立遗物挡。决定胜负的战斗：{n}支持/0反例，移除遗物整战未控（n={n}）。典型案例：QHK1XQ928TTM双蟹力敏1/1→2/2；CNKR125PFHJ5 A10沙虫T3力0→1、敏3→4，打击6→7、两挡21；T4易伤下翻越撑击实扣12，毒另账。',
'silent-infested-prism-tainted-skill-cost':'棱柱技能收益须合算污染逐击血价，能力不加污染。机制：活力火花N使每技能加N污染、当前每段增对应值，次轮撤；A10已见T1—4为3、T5—8为6、T9为9。搭配：毒/挡/虚弱与攻击段共同核，不一概禁技能。决定胜负的战斗：{n}支持/0反例，整战单步因果未控（n={n}）。典型案例：NEWRFAYKTQHR防御10却污染增3、三击多9；CNKR125PFHJ5 A10 F29T1暴露0→3、意图17→20，T2两技能到6污染；T5三技能到18但37毒在触媒+下结束86血，不承受26攻击，赢战仍净损23。',
'silent-dexterity-potion-card-block':'敏捷药实饮建2敏捷，已有挡不补。机制：后续牌挡加敏后核脆弱，换战撤；步法/口红/吸取另分源。搭配：多挡重复收益，不定喝留门槛。决定胜负的战斗：{n}支持/0反例，单药整战胜因未控（n={n}）。典型案例：QHK1XQ928TTM族母饮后仍被吸取；CNKR125PFHJ5 A10 F23T2实饮2敏、T3口红到3、普通步法到5、T4升级步法到8，来源不混；最后赢战38→2，不等药必保整战。',
'silent-bouncing-flask-poison':'弹跳药瓶按实际次数、分配与毒结算兑现，多敌不保证指定目标收尾。机制：普通3毒×3次、升级3毒×4次；制品逐次阻毒，施毒不即时伤，最高血目标不等最坏随机分配。搭配：触媒增结算次数、毒雾补毒，随机未发生不预定。决定胜负的战斗：{n}支持/0反例，单牌整战胜因未控（n={n}）。典型案例：G8NHLL09DLBX母体漏终结后死；CNKR125PFHJ5 A10 F23T5三份各3落子体，母体67血18毒不变，三结51仅到16，玩家24→2、T6才胜，胜局也不能把T5写保证斩杀。',
'silent-poisoned-stab-components':'带毒刺击直伤、施毒和本方失血分列，尚存毒不当已伤。机制：普通/升级基础6/8伤与3/4毒，力/弱/易伤改攻击，制品可阻毒；触媒/无实体/剩血另核。搭配：真实生存轮限制输出，先前血价不能由后来挡补回。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：G8NHLL09DLBX刺击荆棘先损5；CNKR125PFHJ5 A10沙虫末T6一力量普通刺击敌224→217、毒30→33，当步直7与末96毒分账，敌仍121且截止死。',
'silent-piercing-wail-temporary-strength':'尖啸临时降力按攻击段兑现，次轮恢复须重核。机制：普通/升级减6/8，各段核净力和弱，制品可阻，攻击不降成负伤。搭配：毒终结与技能附带污染另账，不当常驻阻成长。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：UZ1T7AH49WMB千足虫次轮恢复34攻仍死；CNKR125PFHJ5 A10棱柱T2普通建−6力/回力6，但自身技能污染3→6，同轮还要支付这项血价，不能只减6报威胁。',
'silent-act-transition-missing-hp-heal':'已见A9/A10跨幕按缺失HP的80%向下取整回复。机制：同上限⌊(最大HP−当前HP)×0.8⌋，低阶/其他先古未核，连续boss不当跨幕。搭配：营火/事件/药与SL恢复分账，不预支后幕血。决定胜负的战斗：{n}支持/0反例，回复不保证后场胜（n={n}）。典型案例：QHK1XQ928TTM A10 26/70回35到61；CNKR125PFHJ5异鱼胜33/70、回⌊37×0.8⌋=29到62，后三胜仍到2血，不能把这29记营火或SL。',
'silent-deadly-poison-application':'致命毒药普通/升级施5/7毒，不即时扣血。机制：实结按当前毒再减1，制品/头骨/触媒/无实体/阶段另核。搭配：须活到结算，污染技能血价与被动伤独立。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：D4LJ9QMGFB8Q毒受限伤留2；CNKR125PFHJ5 A10沙虫T4升级毒7→14、敌284当步不变，棱柱T5毒9→16同时污染加6，不把未来毒当现在攻击抵销。',
'silent-afterimage-per-card-block':'余像按建立后实际出牌次数补挡，自身首次不触发自己。机制：每1层后续每牌＋1，重放再触发，脆弱不折被动挡，换战重建。搭配：多牌兑现，与牌挡/其他遗物分源，拥有未打不算挡。决定胜负的战斗：{n}支持/0反例，单卡整战胜因未控（n={n}）。典型案例：H1T1F8ML9FUE脆弱下重放被动挡另计；CNKR125PFHJ5 A10 F23T1余像后毒雾/毒药各＋1挡，仍全战损36；沙虫余像+虽在牌组却没建立，末轮不预支。',
'silent-frail-card-block':'脆弱逐张折减牌挡，被动挡另核。机制：基础加敏/牌增量后乘0.75向下取整，不能合挡后折，旧挡不倒补。搭配：多挡逐张、余像/遗物分账。决定胜负的战斗：{n}支持/0反例，单项整战胜因未控（n={n}）。典型案例：UZ1T7AH49WMB两防御各7与偏折6合20；CNKR125PFHJ5 A10虱虫T3三敏脆弱下防御牌面⌊8×0.75⌋=6，整步挡0→13含额外收益、缺独立触发帧，不全归牌；敌七力攻击23经弱到17，13挡仍损4。',
}
changes=[]
for e in E['entries']:
    if e['id'] not in texts:continue
    old=copy.deepcopy(e)
    assert RUN not in e['evidence']
    e['evidence'].append(RUN);e['n_support']=len(e['evidence']);e['last_seen']='2026-10-08'
    n=e['n_support'];e['lesson']=texts[e['id']].replace('{n}',str(n))
    e['confidence']='high' if n>=5 and e['n_contradict']<=n/3 else 'med' if n>=2 else 'low'
    changes.append(dict(id=e['id'],before=old,after=copy.deepcopy(e),new_runs=[RUN],action='updated'))
assert len(changes)==19
e=dict(id='silent-mercury-hourglass-start-observation',scope='relic:MERCURY_HOURGLASS',name='水银沙漏',asc=[0,20],lesson='观察：持有水银沙漏时，已见两场单敌在首次可行动前净扣3血，不能外推所有敌人每轮固定净伤。机制：F29获胜奖励后才取得，随后两场入场未就绪→可行动间无牌药、玩家HP不变；仅与轮初伤害文本相符，其他被动交互未隔离。搭配：被动实扣与直伤/毒分账，不由持有推独立胜因。决定胜负的战斗：1支持/0反例，A10虱虫胜、沙虫败，遗物移除整战未控（n=1）。典型案例：CNKR125PFHJ5 F30 T1敌138→135、F33 T1敌341→338；沙虫六轮被动合18仍余121。F29棱柱战尚未持有，不当抵消反例。',evidence=[RUN],n_support=1,n_contradict=0,confidence='low',last_seen='2026-10-08',status='active')
E['entries'].append(e);changes.append(dict(id=e['id'],before=None,after=copy.deepcopy(e),new_runs=[RUN],action='added'))
E['version']='2026-10-08.24'
E['_about']='静默经验只来自本角色实盘与复盘。第107次增量合并CNKR125PFHJ5 A10；截至2026-10-08T11:38:44.123Z共141完局，旧140局七数组/血档/节点后战/休息/SL复算一致。新水银沙漏仅单局两场首行动前净扣3观察；日志更正F26得音叉、F29胜后才得沙漏，棱柱零净损不是抵消反例。力量敏捷/实结毒/被动挡与沙坑独立截止分账，胜前战及回血不保证后战；本局无SL重打。相关经验、账本与代码提案交独立strategy-proposal，不改打法源码/其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
active=lambda p:[e for e in p['entries'] if e['status']=='active']
stats=lambda p:dict(active=len(active(p)),chars=sum(len(e['lesson']) for e in active(p)),confidence=dict(collections.Counter(e['confidence'] for e in active(p))),asc={str(a):dict(entries=len([e for e in active(p) if e['asc'][0]<=a<=e['asc'][1]]),chars=sum(len(e['lesson']) for e in active(p) if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
(O/'changes.json').write_text(json.dumps(dict(old_version=OLD['version'],version=E['version'],added=1,updated=19,retired=0,before=stats(OLD),after=stats(E),entries=changes),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(before=stats(OLD),after=stats(E)),ensure_ascii=False))
