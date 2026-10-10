import collections
import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
DEST=ROOT/'paper/materials/experience-changelog-silent.md'
C=json.load(open(O/'changes.json'))
A=json.load(open(O/'audit.json'))
L=json.load(open(O/'ledger-result.json'))
M=json.load(open(O/'live-merge.json'))
S=json.load(open(O/'slice-summary.json'))
F=json.load(open(O/'mechanism-facts.json'))
RS=json.load(open(O/'rest-summary.json'))
SL=json.load(open(O/'sl-summary.json'))
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
title=(O/'changelog-title.txt').read_text().strip()
assert M['merged'] and M['test_rc']==0 and M.get('eval_version')=='S1.exp60'
assert ('## '+title) not in DEST.read_text()
def pct(n,d):return f'{100*n/d:.2f}%' if d else '无样本'
out=['## '+title,'','### 来源','',
f'- 记录时间{stamp}。只读notes/lessons.md:5229/5240的TU3XB4CAEDAW、V0383V5S9BCQ及04:23:18勘误；TU F39是笨拙换节日拉炮，石头在F10已得；雕刻师T5首题少报6伤/T6首题少报1损血，后续结束题已一致，差额来源未核；专长为制作疯狂科学选项名，不引用无日志支持的MASTERY ID。两局runs.character均SILENT、A10、分别F40/F11败，没有跳过。唯一run-1007-0350/0401局报定位确认，last_seen=2026-10-07。',
'- 开工exp-silent干净，git merge --no-edit main由23080aa4快进cfa54538，无冲突；已读README/最新STATE/decision-log末尾/学习协议、铁甲首次及末两节方法、静默第58/59节。独立执行，无下级agent；抽取/复算nice19单进程，不运行boss模拟池。',
'- 截止V0383V5S9BCQ结束2026-10-06T20:01:20.463Z，74静默完局，A0—A10各7/3/2/1/4/1/11/7/1/3/34局。旧1138房62实死＋新25房2实死＝1163房64实死；A10三十四局449房34死。MCCK2602T1SR仅进数字；无character旧局/进行中/后续局不计。没有阅读或移植其他角色知识。',
'- 从原日志按12位局号rg重新分流943 decisions/50实际Codex请求/8 run-plans/11 SL行；states时间seek流式抽TU 791帧、V0 191帧，决策observed_ts/指纹943条全部匹配。TU seek8068626103、首8068682494/末8096635996；V0 seek8096635996、首8096687463/末8101072988，同窗DeepSeek0，旧ds_*只是兼容字段。不声称复原0068600d+dirty或3ac2445a+dirty完整树。',
'- 口径沿第59节：战内净损＝首COMBAT帧HP−同房最终尝试末结算HP，实死单列，回复负值保留；获胜末结算包含芝士恢复，纯战损另外注明。Monster走廊与Unknown问号分开，血档<25%、[25%,40%)、[40%,60%)、≥60%。REST/SHOP/普通EVENT按源入血关联下一更高层第一战，Ancient排除，多源可指同战；回血后按run/floor去重，TD1重启仍一房，SL读档回复不算回血，未派发结束不补毒/未来伤。',
'- 先对旧72局保存的原始日志片段逐局重新执行各自分析脚本，再加局；七数组逐行、血档/源节点/回血/SL与第59节全部一致。fights1138→1163、nexts1073→1092、rests512→518、cards26168→26623、ends7198→7348、attempts442→453、growth2347→2347；历史静默机制复盘237段过滤复核。全部脚本/原始新片段/基线/机制/样本/检查在learner/runs/20261007-042707-experience-update。',
f'- 开工130 active/50696字<55000，不需强制开工压缩；11补证更新以新案例替换重复叙述，旧完整文字保存在experience-before.json，压短条目逐条列于更新表。增1改11、纯数字0、退0，active131/{C["chars"]}字，高62中40低29；未改60000测试预算。',
'- potion:*与general:potion逐对象不变，其他旧含药分句全部逐字保留，新证据只非药水部分；无新增或加强喝药规则。机制沿[0,20]，统计沿[8,20]；新增弃牌观察按已见A6/A10写[6,20]，A0保留中和只用于先验判断。没有高阶新反例推翻低阶公式；机制真实不因代码已实现而退役。',
'','### 对照数据检查的主题','',
'| 主题 | 数据 | 结论 |','| --- | --- | --- |',
'| 角色/旧基线 | 74静默局；旧72局七数组/血档/转移/回复/SL一致，新25房2实死 | 仅静默、房/尝试和判死/实死分账 |',
'| 敏捷/步法/族母 | TU石头1＋步法+3=4敏、防御5→9，吸取后2/0敏、−2/−4力；T10已有13毒而仅2敌血 | 逐牌挡可被削减，负力不减已施毒 |',
'| 仪式/力量/临时减力 | TU雕刻师仪式9、力9/18/27/36/45，T6尖啸36→30，弱后38→33；双防御18损15 | 当前减伤不停止成长 |',
'| 尖啸非攻击轮 | V0雕像T2苏醒来袭0，尖啸0→−6，T3仍10力/25斩击 | 临时减力不抵后轮永久增长 |',
'| 虚弱消失 | V0 T3突然一拳25→18、10挡损8；T4弱消失18挡对25损7 | 逐轮现场核攻击，别沿用旧弱 |',
'| 群蛇敌挡 | TU末青蛙T5建群蛇4；毒雾/触媒两次各4只使挡16→12→8，实体161不变 | 触发不等穿挡血伤，F33 T8曾实建，不能写整局未用 |',
'| 毒雾/触媒结算 | TU末已有22毒/1触媒实际22＋21=43，161→118、毒余20；毒雾4未到T6轮初；雕刻师T7两触媒32＋30清62 | 已施/建立/当前结算/未来轮初分核，死亡轮后毒不补 |',
'| 生存者弃中和 | 53FL A6 F2 T4弃中和预计损0→1/55→54；V0蛮兽T5初题零损/扣9，弃中和留切割后18挡对24实损6/扣6；LRN A0和UAC A6保留中和零损 | 新登记旧现象，prior=partly，未实打完整保留线，不定整局转胜 |',
'| 精英爆发/死亡截断 | V0雕像首扣44后9/10/0/22合85，剩47/132；末22血无挡对25，需25差3，实际归零22 | 首轮资源不等后段输出，实际死亡截断不替代完整来袭 |',
'| 路线/恢复机会 | TU F38后8血换问号，下火F40→F42，F39笨拙换拉炮仍8，F40四败 | 原线未执行，投影耗尽不证明两线实打必死 |',
'| 回血/未来节点 | TU四回血94＋V0一次21=115；V0精英投影入39/p75为34、实入37死，boss54依赖未到F12/F16火 | 已回复确有缓冲，未来火不当已恢复 |',
'| SL同抽与行动变化 | TU啃咬机两试20/84、初序30项及到手轮同、一判死一胜；猎人两试14/85、初序31项同但到手轮不同、一判死一胜；青蛙四试8/89、0赢，首末初序32/34项不同 | 前者可排除记录内抽序差别但多动作同变，其余不称同抽单变量实验 |',
'| 模拟/时钟 | TU族母赢样本损29.5/约12轮，实际纯损29/10轮；知识恶魔入39校准46%、赢损31/约10轮，实际纯损11/10轮；V0 boss模拟入54/校准5%但未实打 | 赢样本不是保证，未抵达不写实到0或54，无逐轮时钟校准 |',
'| 最优标记/药水事实 | TU有效原选160/170=94.12%、末青蛙41/44=93.18%；V0为16/17=94.12%；独立取得9＋4瓶、显式使用12＋4次 | 重问/SL后完整原线执行率未知，药水只事实/不补药水条目证据 |',
'',
'死亡率分母为战斗房，局数另列；活场净损中位排除实际死亡并保留负回复。A0—A9各格均与第59节一致，所有局号/损值保留audit.json；A10全部非空格：','',
'| 幕 | 房型 | 血档 | 房/局 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['bands']:
    if r['asc']==10 and r['n']:out.append(f'| {r["act"]} | {r["type"]} | {r["band"]} | {r["n"]}/{r["runs"]} | {r["deaths"]}/{pct(r["deaths"],r["n"])} | {r["median_win"]} |')
out+=['','REST/SHOP/EVENT按源入血关联下一更高层第一战，多源可指同战；各进阶局数见下表，节点关联率不当选择因果：','',
'| 幕 | 源界面 | 血档 | 节点/不同战 | 死/率 | 活场净损中位 |','| --- | --- | --- | --- | --- | --- |']
for r in A['transfers']:
    if r['asc']==10 and r['n']:out.append(f'| {r["act"]} | {r["screen"]} | {r["band"]} | {r["n"]}/{r["unique_fights"]} | {r["deaths"]}/{pct(r["deaths"],r["n"])} | {r["median_win"]} |')
out+=['','| 进阶 | 局 | 房/死 | 火/回血/非回血动作 | 回血合计 | 回血后战/死/活损中位 | 真正重打场/试/赢 |','| --- | --- | --- | --- | --- | --- | --- |']
for r,sl in zip(RS,SL):
    ff=[x for x in A['fights'] if x['asc']==r['asc']]
    out.append(f'| A{r["asc"]} | {r["runs"]} | {len(ff)}/{sum(x["death"] for x in ff)} | {r["rests"]}/{r["heal"]}/{r["smith"]} | {sum(r["gains"])} | {r["nexts"]}/{r["deaths"]}/{r["median"]} | {sl["fights"]}/{sl["attempts"]}/{sl["wins"]} |')
out+=['',
'- 历史真正重打69场307次22赢，A10为36场166次10赢；本次TU三场8次2赢，族母/知识恶魔/盾炮首试胜不加真正重打分母，V0无SL。F30首胜对照同初序与到手轮，T4胜试少建一次触媒，T6由双防御改防御＋打击、T7目标改变、T8才打药瓶/扫腿；多个变化一起发生，不能命名单一卡为胜因。F31胜试T1多施毒、触媒延T3、T4防御/攻击变化，到手轮也变；F40第三/末次SL删除T4触媒，末T4实扣15比第二次29少14，后续敏捷/抽牌亦变，四败不证明哪条线可转胜。详细explore/sl_attempt/抽序及每次动作见sl-comparison.json。',
'- 低血不同节点旧例继续逐数据核：MGA0CZDDKC0P A10 REST22→43后Monster损17活，4D4J8USKCPAV REST1→22后损1活；D4LJ9QMGFB8Q EVENT13、BVF22RSFVBS9 EVENT21后走廊死。新TU问号未回血后青蛙死、V0回血21后精英仍死；敌/构筑/回复等混杂，均观察，无未选路线/休息的受控胜负，不规定固定血线或优节点因果。',
'','### 经验库自己带偏或写了没被执行的地方','',
'- 本次50次实际大脑请求全为Codex、DeepSeek0，没有直接引用经验id却反向执行的日志原话，不倒算本版已作用于两局。TU F38原话“Both routes project death; the question mark offers a chance of recovery before forced combat.”（中文：两路都预测死亡，问号提供强制战前恢复机会）；实改线延火而问号未回血。V0 F8原话“Healing provides essential survival buffer before the mandatory elite; upgrading leaves dangerously low HP. Keep the route with an immediate post-elite campfire.”（中文：强制精英前回血补缓冲，保留精英后紧接营火的路线）；当下回21兑现，精英后营火没有到达。未选原线与锻造未实打，不能据终局败证明当下选择错误。',
'- V0 F5 T5代码初题“hp -0, dmg 9”，Jev信心0.27“Jev chose 中和”，弃牌后重算“hp -6, dmg 6”，实际29→23；预估更新与真实机制分开，不当成已定位代码bug。53FL先前已见同现象，新增账本0205是首次登记，保留首证A6/prior=partly；没有确认已上线同项老错repeat。TU F40撤触媒是SL动作来源，不写成Jev主动弃毒。',
'','### 机制推理','',
'| 机制 | 推理 | 证据（支持/反例局数、进阶） | 典型案例 | 进了哪个条目 |','| --- | --- | --- | --- | --- |']
mechanisms={
 'silent-footwork-block':('步法逐牌敏捷','基础挡加现场敏捷，每张重复收益；吸取可削已有敏捷，未打挡牌不兑现','TU3XB4CAEDAW A10族母4敏防御9、吸取后2/0；雕刻师18挡对33损15'),
 'silent-strength-weak-observation':('力量/虚弱/敏捷','力逐击、弱逐击取整、敏逐挡牌；临时减力不关永久成长','V0383V5S9BCQ A10雕像25弱到18、10挡损8，下一轮18挡对25损7'),
 'silent-noxious-fumes-growth':('毒雾未来轮初','能力建立不立即补毒；无其他修正的单结算净增a−1，必须活到后续轮初','TU3XB4CAEDAW A10青蛙末4层却没有T6轮初，43来自当前已施毒'),
 'silent-accelerant-triggers':('触媒逐次毒','k层至多k+1次、每次减1，毒本身和剩血分别核','TU3XB4CAEDAW A10青蛙22＋21=43仍余118；雕刻师32＋30清62'),
 'silent-piercing-wail-temporary-strength':('尖啸临时减力','只改当前逐击威胁，非攻击轮来袭0无当轮减伤，撤回后重新核增长','TU3XB4CAEDAW A10雕刻师36→30/38→33；V0383V5S9BCQ雕像苏醒后仍10力25攻'),
 'silent-lagavulin-siphon-poison-sl':('族母削益与毒','吸取我方力/敏各−2、敌力+2；已有毒与负力独立结算，收尾核剩血','TU3XB4CAEDAW A10族母两次吸取后力−4敏0，T10敌2而已有13毒首试过'),
 'silent-devoted-sculptor-ritual-growth':('仪式成长','仪式每轮加9，基础按进阶占位、加现场力核弱；当前减力/弱不关后轮增长','TU3XB4CAEDAW A10力9/18/27/36/45，T7毒62杀敌但纯损61；HUVEPWQAHWFU末51死'),
 'silent-serpent-form-per-card-damage':('群蛇触发与敌挡','建立后实出牌随机伤4/6，先扣挡才扣血；未派发和未触发不预支','TU3XB4CAEDAW A10末两触发只扣8敌挡，实体161不变'),
 'silent-survivor-neutralize-discard':('弃牌与当前虚弱观察','中和未实打即无其虚弱；生存者牌挡与后续保留牌的减伤分别核，整战替线未知','53FLQ68CETW0 A6弃中和0→1损；V0383V5S9BCQ A10同弃牌损6'),
 'silent-deck-burst-observation':('能力/输出兑现观察','取得/建立/触发/穿挡/足量输出分别核；同抽但多动作变化不定单卡因果','V0383V5S9BCQ A10雕像首44、全85仍缺47；TU3XB4CAEDAW啃咬机两试一胜'),
}
for id,(label,reason,case) in mechanisms.items():
    f=next(x for x in F if x['id']==id)
    counts='、'.join(f'A{a}:{n}局' for a,n in sorted(f['asc_counts'].items(),key=lambda x:int(x[0])))
    out.append(f'| {label} | {reason} | {len(f["supports"])}/{len(f["contradicting"])}；{counts} | {case} | {id} |')
out+=['',
'- 完整12位支持/反例在experience.json和mechanism-facts.json；步法/毒雾/尖啸/触媒/群蛇全部历史支持局均有实际施放窗口。新减力、双牌挡、群蛇扣挡、43毒伤、死亡截断和弃中和6血逐帧断言通过；综合支持不代表每个子公式均在每局独立验证。机制成立的败局不当反例；整战胜因未隔离者明确写观察，不写喝药规则。',
'','### 新增','',
'- silent-survivor-neutralize-discard：card:SURVIVOR/生存者/[6,20]/med，53FLQ68CETW0 A6及V0383V5S9BCQ A10两支持零反例；LRN0HPZ0FZS1 A0/UACFSW4VDDLD A6保留中和零损作更早先验依据，不把不同场当受控替线。复盘已登记silent-0205，首次观察53FL/A6/prior=partly保持，账本不重复add。',
'','### 更新','',
'| 条目 | 支持局数 | 字符改前→后 | 变化 |','| --- | --- | --- | --- |']
for r in C['details']:out.append(f'| {r["id"]} | {r["old_n"]}→{r["new_n"]} | {r["old_chars"]}→{r["new_chars"]} | 补新局非药水支持，替换重复案例 |')
out+=['',
'- 11条全部加证据，纯数字0；没有合并退役腾位。压短条目及长度均在上表，不独立重复计为更新；同主题只留一条。群蛇五支持无反例维持high；新增弃牌观察两支持为med。',
'','### 退役','',
'- 无。没有新反例多过支持，或把纯代码缺口留在active的条目；真实机制与内部模型是否已实现分账。',
'','### 和手写知识及代码冲突','',
'- knowledge/characters/silent/除experience外六文件boss-damage/monster-records/room-costs/outcome-stats/fight-value/fight-value-gates均生成数据，无手写知识需改/删，不新建。逐文件hash/元数据在other-knowledge.json。outcome-stats A10为33局、room-costs 73局截至TU F38，落后V0一个完局；room-costs用MAP→下一MAP、与本节净损口径不同。monster-records截至TU为1157开窗/A10443，而本节同截止1156房/A10442，TD1 F17重启两次开窗同一房的旧差1保持，原因沿第58/59节；不是新增战斗/数据无效，不覆盖刷新数据。boss-damage族母历史A10六场5过、与原日志房结果一致。',
'- common三敌按A10实测表与当前帧核对：雕刻师HP172、仪式9、猛烈攻击基础15；雕像HP132、10力加基础15=25；青蛙HP199、当前5力加基础23=28。共用事实不增加静默支持局数。fight-value/gates仍两局40战/223行，只题面事实，不据两新局判整个表无效；元数据及口径明确，六文件没有要改的手写结论。代码里的手写知识未改，没有定位到与本轮新增结论冲突的明确手写规则。',
'','### 代码问题（不给 DS）','',
'- 两局没有新确定纯bug。TU雕刻师T5首题少报6伤、T6首题少报1损，末结束题一致；V0雕像T3预计扣8/实扣10，分项未核；TU F38 mod判死与求解器存活差额未核。不拿脏版本当当前代码，不由整战失败推断代码缺陷。',
'- 临时离线初稿更正留draft-corrections.md及任务转录：青蛙末帧误筛首轮后加turn=5；模板N替换误及占位英文后限定仅计数变量；common初稿漏monsters层后补正确字段；切片在样本未生成时空返回，审计后重跑并断言240片。全部定稿验证通过，非生产代码/自测失败，不抹去历史。',
'- 未记录：保留中和/替构筑/路线/未选休息的受控整场代价、重问/SL后完整原线执行率、知识恶魔毛伤与回血分项、推演差额来源、逐轮boss时钟需/估伤和可活轮、三幕boss实到/实打及Jev缓存命中，不补造。',
'','### 测试','',
f'- 源固定沙箱tsc0/vitest0、{M["source_tests"]["files"]}文件/{M["source_tests"]["cases"]}用例；合后tsc0/vitest0、{M["live_tests"]["files"]}文件/{M["live_tests"]["cases"]}用例。'+('合后首轮失败后重跑通过；' if M.get('test_first_rc') else '源与合后首轮通过，无失败/超时重跑；')+'固定数据/nice19/固定排除名单不变，完整外部套件交调度器。',
f'- JSON/证据角色/12位id/n/范围/预算/旧药水分句/原始机制/git diff --check/gitleaks通过。源{M["source_commit"]}只改静默experience.json，英文提交写版本/增1改11退0、带Co-Authored-By。',
'- 仅learner/ledger.py/by=learner:experience-update将'+','.join(L['proposed'])+'改proposed，覆盖12经验条目；新增/退役无、check0，首证/先验/claim/旧version/repeat保持，不写accepted/shipped。未纳入经验库的既有复盘条目不动。主目录本节/账本只追加不提交。',
'','### 切片大小','',
'- 固定种子20260929，从截至本局53,787个静默原始状态样本池抽最高A9/A10各20状态×COMBAT/REWARD/MAP/EVENT/REST/SHOP＝240配对，按state.run.character_id=SILENT过滤。官方knowledge-slice.ts/CHARACTER=silent/setExperienceForTests；结果表和其他知识固定，只替换经验，manifest及逐片原文保留，不冒充V4完整前缀。','',
'| 进阶/界面 | 改前中位/最大（字） | 改后中位/最大（字） | 配对增量中位 |','| --- | --- | --- | --- |']
for r in S['rows']:out.append(f'| {r["sample"].removeprefix("sample-")} | {r["before_median"]}/{r["before_max"]} | {r["after_median"]}/{r["after_max"]} | {r["delta_median"]} |')
out+=['',f'- 配对增量中位{S["median_delta"]}、最大增量{S["max_delta"]}；总体中位{S["before_median"]}→{S["after_median"]}，最大{S["before_max"]}→{S["after_max"]}字。active130→131、50696→{C["chars"]}字，高62中40低29；'+ '、'.join(f'A{a} {r["entries"]}条{r["chars"]}字' for a,r in C['applicable'].items())+'。需要Roy定：无。','',
f'本节收尾：源{M["source_commit"]}，实际live合入{M["merged"]}，上线登记{M["release_commit"]}/eval {M["eval_version"]}；刷新{M.get("refresh_commit")}、合前{M["base"]}，不同知识blob冲突0，其他知识blob保持。无源码/生成器/手写知识/其他角色/新用药规则改动，不重建；主目录本节/账本由调用方提交。运维交接learner/runs/20261007-042707-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后仅CLI登记13项shipped，完整沙箱外交调度器；不停对局、不运行play、不推送。','']
section='\n'.join(out)
(O/'changelog-section.md').write_text(section)
with (O/'gitleaks-changelog.log').open('w') as h:
    subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/'changelog-section.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
before=DEST.read_bytes()
(O/'changelog-before.json').write_text(json.dumps(dict(bytes=len(before),sha256=hashlib.sha256(before).hexdigest()))+'\n')
with DEST.open('ab') as h:h.write(('\n'+section).encode())
assert DEST.read_bytes()[:len(before)]==before
print(title,'已追加，旧内容逐字保持')
