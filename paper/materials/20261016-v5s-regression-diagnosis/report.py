#!/usr/bin/env python3
"""Render the frozen descriptive report and an unexecuted, explicitly limited comparison design."""
import csv
import datetime as dt
import json
from math import comb
from pathlib import Path

BASE=Path(__file__).resolve().parent


def table(name):return list(csv.DictReader((BASE/name).open()))
def pct(v):return '—' if v is None else f'{100*v:.1f}%'
def frac(r):return f"{r['n']}/{r['d']}（{pct(r['rate'])}）"
def number(v):return '—' if v is None else f'{v:.3f}'
def local(t):return dt.datetime.fromisoformat(t.replace('Z','+00:00')).astimezone(dt.timezone(dt.timedelta(hours=8))).strftime('%m-%d %H:%M')


def main():
    a=json.loads((BASE/'analysis.json').read_bytes());d=json.loads((BASE/'details.json').read_bytes());f=json.loads((BASE/'freeze.json').read_bytes())
    execution=json.loads((BASE/'execution-sensitivity.json').read_bytes())
    bosses=table('bosses.csv');runs=table('runs.csv');releases=table('releases.csv')
    pre,post=a['summaries']['pre'],a['summaries']['post']
    recovery=[]
    for group in ('pre','post'):
        for floor in (None,'17','33','48','49'):
            rows=[r for r in bosses if r['cohort']==group and (floor is None or r['floor']==floor)]
            failed=[r for r in rows if r['first_completed_win']=='0'];rescued=[r for r in failed if r['final_outcome']=='won']
            recovery.append({'cohort':group,'floor':floor,'bosses':len(rows),'first_wins':sum(r['first_completed_win']=='1' for r in rows),
                             'initial_noncompletion':len(failed),'rescued_after_initial_noncompletion':len(rescued)})
    (BASE/'SL-recovery.json').write_text(json.dumps(recovery,ensure_ascii=False,indent=2)+'\n')
    text=['# V5-S 上线后连败：离线系统健康诊断','',
        f'原父 `roy-20261016-global-build`；watcher codex1。数据冻结于 **{local(f["at"])} CST**（原始UTC `{f["at"]}`），仅含已结束的静默A10。没有开局、模型/API调用、模拟重跑或线上配置修改。', '',
        '**结论：连败信号真实，但本窗口不能把它归因于单一 V5-S 开关。最强的变化是 Boss 首试未通关后的救回率下降、最终连战入口血量很低；其次是新构筑提示/排序与选择变化。Jev偏离更多，但已观察结果不支持把偏离认定为败因。**', '',
        '## 1. 窗口与复核口径','',
        '按每局实际首个run-config开局时间排序：首个P1on/P3on进程是WJ0LTVSSDY61（10-15 11:07 CST），取它之前25局和它以后已结束24局。UPAB虽在发布之后的10:59结束，开局08:40仍是旧配置，留在前组；不按结束时间把它移到新版。原始来源和纯Codex成功大脑来源分列。', '',
        '|口径|前组最终通关|后组最终通关|前组Boss最终过关|后组Boss最终过关|',
        '|---|---:|---:|---:|---:|',
        f'|同开局边界、原始全部来源|3/25|0/24|{frac(pre["boss_final"])}|{frac(post["boss_final"])}|']
    en=a['engine_sensitivity']
    text += [f'|同一窗口、仅成功来源纯Codex|{en["pre"]["wins"]}/{en["pre"]["runs"]}|{en["post"]["wins"]}/{en["post"]["runs"]}|{frac(en["pre"]["boss_final"])}|{frac(en["post"]["boss_final"])}|','',
        '原转达的3/25、0/24、后组33/46与最终Boss0/5复现；**前组43/51未在此明确窗口复现，实际为44/52**。剔除W1YY8PEWGUF9这个来源unknown局后是42/50、24局，不能静默改分母凑43/51。后组HLAWCGM3KHVB为混合账号接续且成功大脑来源unknown，单列排除后为23局0胜、Boss30/42。本报告保留原事实主张、全部49局ID与config/源行SHA，便于对齐Claude原查询。', '',
        f'独立整局单侧Fisher精确检验 `C(25,3)/C(49,3)={a["single_sided_fisher_pre_higher_win_rate"]:.6f}`，未达到0.05。Boss、题目和SL尝试不是独立局，不拿它们扩充胜率检验分母。', '',
        '## 2. 损失在哪里：首试、SL与最终连战','',
        '|指标|前25局|后24局|', '|---|---:|---:|',
        '|死于Boss|8|13|','|死于路上|14（走廊6、精英7、unknown房1）|11（走廊5、精英4、unknown房2）|',
        '|Boss首试完成通关|33/52（63.5%）|30/46（65.2%）|',
        '|首试未通关后最终救回|11/19（57.9%）|3/16（18.8%）|',
        '|最终Boss F49|3/6|0/5|','',
        '“首试未通关”严格分开：前组19次预测死后实际SL退出；后组13次此类退出、3次实际死亡。预测死仅在有reload.ok或后继尝试时记为首试未完成，绝不冒称实际被打死；原始first_result均保留。Boss最终结果来自fights，首试来自sl-attempts。逐层救回数量见SL-recovery.json。首试没有变差，最终救回变差；这提示进房资源/可救回程度、SL探索/候选兑现应优先观察，不证明SL规则本身回归。', '',
        '### 后24局的13个Boss死亡','',
        '|局号|层|敌人|入口HP|牌组张数|首试记录|首个T1选线模拟率|低可信|', '|---|---:|---|---:|---:|---|---:|---|']
    for r in bosses:
        if r['cohort']=='post' and r['final_outcome']=='died':
            text.append(f"|{r['run_id']}|{r['floor']}|{r['encounter']}|{r['entry_hp']}|{r['deck_size']}|{r['first_result']}|{pct(float(r['p_chosen'])) if r['p_chosen'] else '缺失'}|{r['low_trust'] or '未知'}|")
    text += ['', '### 路上死亡的11局','', '|局号|层|房型|原终局敌人|','|---|---:|---|---|']
    for r in runs:
        if r['cohort']=='post' and r['death_room']!='boss':
            text.append(f"|{r['run_id']}|{r['floor']}|{r['death_room']}|{'、'.join(json.loads(r['death_fight']))}|")
    text += ['', '不把房型unknown推定为走廊或精英，不把一局内的六次SL当六局。24局完整清单在runs.csv；前后各Boss的首试、最终结果与引用在bosses.csv。', '',
        '## 3. 开战预测、低可信与R362/R366','',
        '只能对齐原日志里首个T1 B2题：前37/52场、后42/46场有Jev答选候选概率。selection_audit显示前6、后2个初始请求线与Jev答案不同，主表排除它们，得到前31/后40场。T1可能已有代码自主动作，因此是“首个已记录T1题”的条件率，并非严格入场前概率；后续实际Jev/SL政策也不同于模拟器政策。未记录的15/4场不填0，初始请求线一致也不能证明整条候选完整兑现。', '',
        '|分组|可匹配Boss|平均预测|首试完成率|Brier|常数基线|偏差（预测−实际）|', '|---|---:|---:|---:|---:|---:|---:|']
    for name,key,field in [('前组初始线一致','pre','all'),('后组初始线一致','post','all'),('前组线一致且可信','pre','trusted'),('后组线一致且可信','post','trusted')]:
        s=execution['cohorts'][key][field]
        text.append(f'|{name}|{s["n"]}|{pct(s["mean_prediction"])}|{pct(s["first_completed_win_rate"])}|{number(s["brier"])}|{number(s["constant_baseline_brier"])}|{pct(s["bias"])}|')
    text += ['', '整体不是普遍高估，反而低估实际首试完成率。保留全部Jev答选37/42场作为敏感性时，平均预测61.3%/49.5%、实际首试完成70.3%/66.7%，方向相同；后组可信子集Brier不优于该小样本的常数基线，说明“可信”标签不是当前生产准确性保证。只留下真的打死/打赢、删除SL退出，会严重选择性偏向胜局（前组可匹配的严格实际结局全胜），故该敏感性单列在analysis.json，不当作主要校准结论。这里未重新拟合模型或门槛。', '',
        '|实际消费者阶段|局数|Boss最终|B2低可信题/全部B2题|B3低可信诊断/全部已产诊断|首T1低可信Boss/有预测Boss|', '|---|---:|---:|---:|---:|---:|']
    for k in ('pre','P1P3_before_R362','R362_before_R366','R366_before_R369','R369+'):
        s=a['summaries'][k];on=next(x for x in d['boss_onset_low_trust'] if x['epoch']==k)
        text.append(f'|{k}|{s["runs"]}|{frac(s["boss_final"])}|{frac(s["low_trust"]["b2"])}|{frac(s["low_trust"]["b3"])}|{on["low_trust"]}/{on["observed_T1_bosses"]}|')
    text += ['', 'B2题级低可信总体43.8%→49.3%，B3为50.5%→36.2%；分母和遭遇/幕次/SL次数不同。R362后到R366前B2为37.1%，R366后、R369前53.1%，R369后85.6%，不能把这些组合变化当成刷新单独造成的效果。', '',
        '直接读取发布提交的boss-trust.json：R362仅将THE_INSATIABLE从B2整体低可信表移出，R366又移回；B3六个低可信Boss表不变，F49阶段闸持续低可信。**三份Platt参数完全相同**：T1 a=2.0844/b=0.4502/c=0，pre a=2.2754/b=0.5047/c=0。本窗口R362期间记录到的该Boss B2题5道全部在F49，仍低可信；没有实际F33 B2题可证明该次解禁影响了选择。变化的不是新拟合的胜率映射。', '',
        '原校准ops回执已明确：验证冻结模型7e1193，生产对应输入另有70项差异，不能称当前生产重新校准通过。本轮只引用该已核边界，没有重新校准。trust.csv按原题保存低可信标记；calibration-version-data.json保存提交字节SHA、系数和门槛。boss-trust在进程加载/角色切换时读取，所以按实际run-config提交分段，不能按发布消息时刻热切分一局。', '',
        '## 4. Jev选线、P3与真实执行范围','',
        '|口径|前组遵从代码第一名|后组遵从代码第一名|', '|---|---:|---:|',
        f'|首试Boss题|{frac(pre["jev_exact_first"])}|{frac(post["jev_exact_first"])}|',
        f'|全部Boss题，含SL|{frac(pre["jev_exact_all"])}|{frac(post["jev_exact_all"])}|','',
        '偏离率从6.5%升到11.0%（首试7.7%→13.0%）。这是Jev答案与原rollout.best的严格比较；最佳组判定与2457条Boss题原rollout_best_chosen逐条一致。另有402/2457题的resolver最终请求线与Jev答案不同，包含guard/SL探索，不能把这些改线归咎Jev；也不能把一次已完成首动作当整条候选线全部兑现。真实完整逐牌兑现率本轮未知，补充selection_audit及请求线验证保留在inputs/selection-fields-supplement.jsonl.gz、checks/final-validation.json。', '',
        '按Boss首问是否偏离分组，后组偏离的8场中首试完成7/8、最终7/8；未偏离37场首试23/37、最终26/37。更宽的“首试曾偏离”也没有表现更差。难度、重规划与长战斗选择偏差很强，因此既不能说偏离导致连败，也不能反过来说Jev偏离有收益。1场无可比较Jev题，保留缺失。', '',
        'P3共1235个已产记录，used=true 457个，但**真正更换旧第一名只有53个**，其中PTGQF9BEQ6G1有27个、0BHQCPAF33N6有19个；53不是53场独立战斗。最初仅P1/P3的4局里P3未更换过第一名、Boss7/8通过。R369后S排序已shadow，4局仍0胜但只有4场Boss/未到F49，不足以证明退shadow无效或恢复有效。', '',
        '## 5. P2最佳组、理由契约和P1送达后的选择','',
        '前25局没有已记录P2排行可比，不能把缺日志写成0%服从。可比较的是后组最初4局shadow与随后20局on；on与C2/R362同批进入下一自然进程，无法分开归因。', '',
        '|P2口径|shadow|on（含R369后仍保留表和理由）|', '|---|---:|---:|',
        '|可判定选择落在最佳组|88/115（76.5%）|413/507（81.5%）|',
        '|至少两个已模拟候选|81/103（78.6%）|401/464（86.4%）|',
        '|rest/plan|23/30（76.7%）|105/118（89.0%）|',
        '|reward/card|49/58（84.5%）|229/252（90.9%）|',
        '|无法判定/目标待定|5/120|42/549|','',
        'on中94次可判定偏离均有理由，未观察到明确因ranking_override_reason失败的脑日志；不能据此声称内部没有补问，因为原brain日志的problems/reasks明细覆盖有限。最佳组只覆盖已模拟候选，未模拟的遗物/购买计划等仍未知。win_saturated标记shadow61/120、on308/549，并不等于全部0%，也不能把“模型内近似无胜率区分”当成真实等价。', '',
        '|构筑选择|前组|后组全部|后组确实收到P1|后组未收到P1|', '|---|---:|---:|---:|---:|',
        '|休息选回血|101/172（58.7%）|101/151（66.9%）|43/61（70.5%）|58/90（64.4%）|',
        '|卡牌奖励选择跳过|51/389（13.1%）|43/341（12.6%）|10/145（6.9%）|33/196（16.8%）|','',
        '1053个休息/拿牌题与accepted脑行按同run、label、原reason逐一匹配，P1暴露依据实际payload.facts.boss_readiness，全部匹配；不拿配置on代替送达。选项类别按原criteria.kind判HEAL/SMITH，不能把o0固定当休息。', '',
        '休息时HP占比分层：低于50%时回血47/55→47/57；50%–80%为49/78→50/74；至少80%为5/39→4/20。总体回血比例增加部分来自高血休息点样本更少。P1送达的61个休息题仅在一/二幕（50/11），145个拿牌题也是107/38，第三幕均未送达；与未送达组的可信度、幕次和HP不同。可怀疑提示/理由约束让选择更贴近模型，但不能据此称它们导致构筑变差。', '',
        '## 6. C1故障出口与C2采样淘汰','',
        '按completion.attempt_id去重，后组有87个degraded记录：78个Boss战B2、9个面向Boss的构筑B3；71个不同输入key，集中于RQ（3）、DHY（6）、TCD（78）。TCD单局F48占70个B2降级记录；不是87局或87种根因。前组只在较晚版本有374个结构化complete记录、未见degraded，早期缺此字段不能称服务无故障。', '',
        'RQ、DHY及TCD的nonpositive-hp/首战资源契约错误，沿原学习者已登记silent-0332链；TCD F40–47的8个构筑降级尝试、F48多题明确可见。其中86个不足300样本或无数字，退回旧rollout/无P1P2事实；另1个TCD F48T8实际522/1200样本，按原>=300规则保留参考率，六个题面选项都明确标“不完整、低可信、原始未校准”，completion仍degraded，并非完整计算。该例原行与文本见C1-522-partial-evidence.json；没有据此认定故障数字冒充完整率。C1是暴露并兜住已有计算故障，不能把关闭出口当修复，也没有本轮定位完整机制根因。', '',
        '|C2实际on，按run/lane/input_key去重|完整按需计算|发生候选采样淘汰的计算|被淘汰候选前缀|', '|---|---:|---:|---:|',
        '|Boss B2|968|346|1036|','|构筑B3|505|409|2832|','',
        '早停不等于删除合法动作。数据中没有on模式同输入全量最终组，不能据早停数量断言误淘汰或正确。shadow的旧完整对照、源码检查和当前on局的不同输入不能替代这个反事实。C2与P2/R362同时进入RQ进程，是待隔离假设；未在本轮重跑全量或模拟。', '',
        '## 7. 入场HP与牌组规模：只描述','',
        '|Boss层|前组入口HP中位|后组入口HP中位|前组HP比例中位|后组HP比例中位|前组牌组中位|后组牌组中位|', '|---|---:|---:|---:|---:|---:|---:|']
    for floor in ('17','33','48','49'):
        x=pre['boss_by_floor'][floor];y=post['boss_by_floor'][floor]
        text.append(f'|{floor}|{x["entry_hp"]["median"]}|{y["entry_hp"]["median"]}|{pct(x["hp_fraction"]["median"])}|{pct(y["hp_fraction"]["median"])}|{x["deck_size"]["median"]}|{y["deck_size"]["median"]}|')
    text += ['', '后组到F17/F33/F48的入口HP没有普遍下降，牌组也没有普遍变大；不支持“整体路上失血更多”或“整体拿牌膨胀”这种简单解释。最终F49则不同：前中位29血、后6血；后组5次是HLAW77、RQ4、VNS11、9KP3、TCD6。剔除混合账号HLAW后4次全≤11。F48→F49原入口逐局列在F48-F49-transition.csv；不把入口差额自动解释为某张牌/药的因果成本。', '',
        '## 8. 同期发布R354–R370与时间吻合','',
        '以下是实际提交祖先首次出现在冻结run-config进程段的时间，非把编号当时间顺序；HLAW重启段单列实际配置时间。完整source原文、commit、实际覆盖局见releases.csv。持续自动知识刷新/经验prefix、dirty输入另有变化，不能把每局唯一归因于一个编号。G1a连续接口和G2 shadow不造行为号，也在窗口内变化；源码full通过不能证明这些运行输入已重新校准。', '',
        '|发布|内容|首个实际进程段（CST）|与诊断变化的关系|', '|---|---|---|---|']
    brief={354:('斗篷匕首生成接线','仅已见模板；不能排除模型变动混杂，无单独收益/回归证据'),
        355:('codex1 credits受控接续','HLAW跨账号/重启边界；属于来源与运维混杂'),356:('Serpent+蜃景重放窄接线','与DUB进入窗口重合，非S开关'),
        357:('弹跳药瓶随机毒不预支确定斩杀','候选模型/覆盖边界变更，未做单独对照'),358:('已见遗物组合开场扣血','资源开场模型变动；不代表所有组合已覆盖'),
        359:('P2表/偏离理由on','最佳组服从率提高，与C2/R362无法拆开'),360:('C2按需采样on','同RQ进程，淘汰/样本减少无同期全量反事实'),
        361:('神化后致命毒药5→7窄修复','同RQ首进程的模型修复混杂'),362:('固定模型校准验证415→438','THE_INSATIABLE B2整体解禁；Platt不变，与P2/C2同进程'),
        363:('受控开场未建模控制权披露','增加未知提示，不重拟合模拟数值'),364:('飞扑免费技能覆盖未知标记','信任/覆盖提示变化，不称完整费用实现'),
        365:('纸鹤/聚合体已见多击窄修复','同原HLAW有限证据，不能外推整体误差已修'),366:('固定模型校准438→460','THE_INSATIABLE B2移回低可信；Platt不变'),
        367:('G4核心资格/持有与兑现边界经验','脑知识文本变化；模板仍candidate，非核心合格认证'),368:('G1a校准边界/资源承接经验','脑知识与诊断边界变化，同FGK首次采用'),
        369:('P2/P3的S排序退shadow','随后4局0胜、未到F49；P2表/理由和P1/C2仍on'),370:('生存者/沙坑已见窗口事实','只补原窄事实，后0YQ的旧0308末轮漏接仍有原学习者复现')}
    for r in releases:
        n=int(r['release_id'].split('-R')[1]);x,y=brief[n]
        text.append(f'|{r["release_id"]}|{x}|{local(r["first_frozen_process_start"])} / {r["first_frozen_process_run"]}|{y}|')
    text += ['', '## 9. 按证据强弱排序的可能原因','',
        '1. **连战资源状态与SL可救回程度不足，是最强的直接症状。** 首试完成率未降，但救回11/19→3/16；F49后4个纯Codex样本进场只3–11血。当前连续Boss资源契约0332及最终阶段可信度未知与此吻合，不能进一步区分模拟、构筑、具体打法和未选线路，也不证明新接口制造了旧0332。',
        '2. **模型指导构筑的反馈可能改变取舍。** P2服从率增加、实际P1送达后的回血/拿牌更积极；当前生产未重新校准，模型内饱和比较很多。这是P1/P2信息消费的合理对照对象；HP分层和幕次选择偏差削弱因果证据，第三幕P1实际未送达，不能说它直接指挥最终Boss。',
        '3. **战斗模型/候选兑现的已知缺口与降级，能解释部分局部失效。** C1集中三局，TCD占大头；原学习者0YQ F33T7的silent-0308漏接、0332等已有链仍open。这里只引用原学习者/ops已核记录，不新增游戏机制、参数、缺陷任务或重复派发。它们不能单独解释所有24局。',
        '4. **C2样本缩减或P3改第一名可能影响少量决策，现证据弱。** C2发生大量真实采样淘汰，却无同输入全量对照；P3真正改第一名53题且集中两局，最初P1/P3-only阶段改名0题，不能把日志used数当独立干预数。需要独立对照，不据此自行回滚。',
        '5. **小样本、Boss遭遇构成和同期发布仍是完整替代解释。** 独立整局p≈0.125，前25局的12%也不是稳定真值；17项发布、知识刷新、账号接续与开关共线。不是“已证明系统退化”，也不能因未显著而忽略持续信号。', '',
        '目前不支持的简单归因：Jev偏离本身、普遍过高的开战胜率、牌组普遍膨胀、R362/R366重新拟合映射变坏。观测分别不吻合或缺必要对照。', '',
        '## 10. 建议的对照实验：只设计，未执行','',
        '优先做 **40局、两组各20个完整自然局** 的构筑信息消费对照。A保当前P1/P2 on；B只把`S_READINESS=shadow`、`S_BUILD_RANK=shadow`，不向大脑发送其新信息/不执行偏离理由契约，计算与日志继续。两组都保持现有`S_BUILD_SORT=shadow`、`S_COMBAT_RANK=shadow`，保胜率/HP排序、C1出口、原SL/药价/样本上限、原账号模型home。**C2两组均on**，避免同时增加全量计算负载而混淆信息效应；此实验只识别P1/P2组合，不能拆开两者或排除C2。', '',
        '按预登记的随机平衡小块交替分配下一自然局（每块4局、A/B各2），分组在看到牌/种子/结局前冻结；不挑局或开额外模拟。两组使用同一批准代码、信任表与知识输入快照；任何必要热修/知识发布跨界则记录为协议偏离并分段报告，不能静默混成同组或靠排除输局修数据。每次行为配置边界仍由原ops单独编号/双通知/精确树检查，未变树不重复全检。涉及冻结自动学习发布的安排须Roy/Claude另行批准，本轮未要求ops执行。', '',
        '主要结果是独立整局最终通关；次要为Boss首试完成、实际死亡/SL退出分列、救回率、F48→F49入口HP、上述P1/P2实际消费、C1/C2健康。保留分配后的全部原始局及来源异常的意向分配结果，同时另列严格模型/账号/版本合规子集；不以Boss题数扩大独立局分母。', '',
        '停止条件：固定各20局或事先批准的credit/墙钟上限到达即停，未结束局留待自然结局，不补挑局。若出现<300样本仍给整场数字、故障参考率未按原规则标不完整/低可信、意外引擎/账号/配置，或日志身份无法核验，停止新试验局分配并交原ops处理，保留现局和全部记录；不把合规522样本参考率误作完整计算或违规，不靠“几连败”或中途p值决定提前成功/失败。20/组是费用受限探索：若真实A=0%、B=12%，这个固定Fisher单侧方案只有约8.3%的概率达到0.05，不能承诺40局定论。若要约86%的理想化检测概率需约60/组；是否追加必须Roy/Claude另派，不自动扩样。', '',
        '若首轮无明确恢复，后续可另设计P1/P2均shadow时C2 on对shadow的等量自然局对照，沿用同一完整计算门槛和故障出口；这不属于本轮执行。当前不改任何开关、不开G2自然或G3b后续，不关闭原量化/0332/学习宽父。', '',
        '## 11. 证据与复现','',
        '`freeze.json`包含各源完整行字节截点、49局原run/config行及SHA；`inputs/manifest.json`记录原logdb查询和33177/33177决策覆盖；`inputs-lean/`为与分析相关字段的压缩投影，保全部原行引用。大体积完整投影留在本目录inputs/本地，不重复提交原日志。字段裁剪不重算预测或结局。', '',
        '已有归档直接复现：', '',
        '```bash',
        'nice -n 19 python3 paper/materials/20261016-v5s-regression-diagnosis/analyze.py',
        'nice -n 19 python3 paper/materials/20261016-v5s-regression-diagnosis/details.py',
        'nice -n 19 python3 paper/materials/20261016-v5s-regression-diagnosis/provenance.py',
        'nice -n 19 python3 paper/materials/20261016-v5s-regression-diagnosis/execution_sensitivity.py',
        'nice -n 19 python3 paper/materials/20261016-v5s-regression-diagnosis/report.py',
        '```', '',
        '如需从原JSONL重新导出，在新的输出副本使用原freeze.json、原source完整行边界和extract_inputs.py（logdb Python、2线程），然后compact_inputs.py。不要重新freeze或拿新的窗口覆盖原件。原生成脚本只在本材料目录读写，未修改agent/ops/eval生产脚本。解析C2淘汰项首次把对象当字符串的失败保存在history/，已按原key字段修正，不当作生产故障。', '',
        '原学习者/ops局部诊断及生产校准边界的路径/SHA列在source-provenance.json。全部概率都来自原运行记录；未知未补0，未执行候选后继、逐牌全线兑现和因果收益未补造。计划/STATE/checkpoint按限定交付维护；报告完成后停。','']
    (BASE/'report.md').write_text('\n'.join(text))
    design={'schema':'v5s-regression-unexecuted-comparison-v1','executed':False,'parent':'roy-20261016-global-build',
        'primary':'independent natural-run final victory including SL','sample_size':{'A':20,'B':20},
        'A':{'S_READINESS':'on','S_BUILD_RANK':'on'},'B':{'S_READINESS':'shadow','S_BUILD_RANK':'shadow'},
        'both':{'S_BUILD_SORT':'shadow','S_COMBAT_RANK':'shadow','SIM_ADAPTIVE':'on','C1':'retain existing fault exit'},
        'allocation':'precommitted balanced random blocks of4; natural runs only; no selection based on cards, seed or outcomes',
        'independent_counterfactual':'P1/P2 information-and-reason bundle only; cannot identify components separately',
        'stop':'20 finished assigned natural runs/arm or preapproved budget limit; protocol integrity failure stops new allocation, not current games; no efficacy peeking',
        'requires_separate_decision':['Whether to run at all and approve cost/scheduling','Pinned code/trust/knowledge and automatic publication handling','Any subsequent C2-only comparison or extension to60/arm'],
        'idealized_fixed_design_power_A0_B012':{str(n):sum(comb(n,k)*(.12**k)*(.88**(n-k)) for k in range(next(k for k in range(1,n+1) if comb(n,k)/comb(2*n,k)<.05),n+1)) for n in (20,40,60)}}
    (BASE/'experiment-design.json').write_text(json.dumps(design,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'report':str(BASE/'report.md'),'bosses':len(bosses),'runs':len(runs),'experiment_executed':False}))


if __name__=='__main__':main()
