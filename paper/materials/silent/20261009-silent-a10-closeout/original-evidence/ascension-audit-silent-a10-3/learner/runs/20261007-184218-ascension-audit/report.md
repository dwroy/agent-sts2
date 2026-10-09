# 静默猎手 A9 → A10 独立结构审计

完成十个来源局的实际观察范围审计：全部原始状态核为SILENT/实际A10/已结束，125独立战斗、176次尝试（51额外），115场胜战的资源链全部保留。D1/D2核心已有live实现；D3阶段/当前Boss身份仍有语义缺口，实际决策损害未知。complete仅表示以下范围已审完，未知仍列明。

## 样本、时间与文件边界

- 开工git工作树干净，HEAD=main=`4fb90cc25e68e3e804ad15fa4b3931e8a606678f`，没有移动分支或合源码。固定读取live实际源码 `70c8352bc9ea84d18f9bc0f82244b0e1f76405e8`，21个源码/本角色模型及资源工具的blob/SHA见 [live-source-manifest.json](live-source-manifest.json)。
- 本轮独立流式读取原始固定前缀，只解析十局A10与三局本角色A9；18125条所选记录逐原文件offset/bytes/SHA核验成功。每帧均有全局行号和字节偏移；日志边界、逐局原字节SHA见 [manifest.json](manifest.json)。没有整份输出大日志。
- A10首帧实际observed_ts（非延后的写入ts） 2026-10-05T20:54:59.385Z，最晚实际结束 2026-10-06T04:00:23.109Z（UTC；北京时间10-06早晨至12:00:23）。A9对照为此前实际已结束 HMVJKM56S4Q8、F4QKG4J1AJJZ、G403VCZ3BH1B，2026-10-05T18:45:41.543Z 至 2026-10-05T20:51:26.103Z。每条原始状态重新核SILENT/实际A9。
- 前五/后五按实际结束顺序整局切分；SL归原局，两条实到F49均在前五，后五没有F49验证。样本发生在当前实现之前，不能评价当前上线效果或归因A10。
- A10脑日志314条全部engine=codex；不把runs旧deepseek_calls字段当实际引擎证明；本次未重算生产战绩/费用纳入口径。
- 旧失败树/报告只读借鉴，原文件指纹在 [prior-audits-read-only.json](prior-audits-read-only.json)，关键结论全部从原日志重核，旧历史没有删改。已读README、最新STATE、decision-log末尾、两份学习协议。本角色知识只读silent目录，未读其他角色知识、key/.env或游戏包。
- 纯审计只写本scratch并经CLI追加专用账本/提案记录，没有修改源码/策略/ops prompt、启动/暂停对局、派agent、联网、安装依赖、造eval版本或新shipped，也没有提交合入游戏代码。

## 六项覆盖表

|项目|实际观察与对照|未知边界|
|---|---|---|
|floors|十局实际逐层房间序列；F17十局、F33五局、F48三局、F49两局；实际幕初F1/18/34，地图rows16/15/14。A9三局重新核验。|十局各自终层之后、F49胜后、其他首后Boss组合及未来规则未知；不能从LEVEL_10文本补推。|
|combat_counts|125独立战斗，176尝试/51额外；115胜、10实际死亡，51截断重启分列。A9练习事件战单列完成事件战。|TD1HVGS7H6LB F17第1次SL reload.ok=false且超时；后续可见回合重置至T1，末次SL汇总缺失，不能记读档成功。 截断尝试真实退出HP/实际死亡未知；重启资源另列，不当治疗或新增独立战斗。|
|healing|A10九对/A9五对实跨幕回floor(缺失HP×80%)；A10 HEAL40次净944。赢战损血/战内治疗、跨幕/到火/动作/SL分别保存。|初始56/70形成过程、2槽相对更低等级减1、ASCENDERS_BANE首次出现及全部交互未观察。 未选择营火动作、其他最大HP/遗物（含本批未触发的Pantograph/石炉）/复活交互未知；不推休息与锻造胜率因果。|
|campfires|A10实际63火：40HEAL、23SMITH；63HEAL选项基础文本符合floor(maxHP×30%)；12次羽毛到火净152另计。|未选择营火动作、其他最大HP/遗物（含本批未触发的Pantograph/石炉）/复活交互未知；不推休息与锻造胜率因果。|
|rules|6877 A10原始状态全部SILENT+LEVEL_01—10；2046 A9全部SILENT+LEVEL_01—09；两组实际同幕F48胜→F49开战。|十局各自终层之后、F49胜后、其他首后Boss组合及未来规则未知；不能从LEVEL_10文本补推。 LEVEL_01精英密度、LEVEL_03金币减少25%、LEVEL_06移除价格增幅、LEVEL_07稀有/升级频率、LEVEL_08/09相对低等级数值变化只有文本/非受控状态，触发幅度/概率未知。|
|assumptions|固定live结构/幕末/当前Boss、路线、回血、终局/药水/SL逐项静态对照；D1/D2历史差异当前核心已实现，D3仍有语义缺口，CLI登记完整。|后战HP价值曲线、完整药水持有价、后Boss分布/全部复活接续及连战模拟校准未独立验证；具体实现上线效果未知。 D3非空F48战后构筑题、实际决策损害与修后效果未知：本批两次F48奖励均空。|

## 逐局实际层数、战斗与营火

独立战斗按真实同层遭遇计，召唤/阶段变化不另算；本批没有同层另一个独立遭遇的证据。SL.started_at/attempt与实际T1重置共同切尝试，JMH F49六次全T1不能只按回合下降。TD读取超时后另见T1重启，第二次缺SL末汇总，不能冒记reload成功。A9 G403 F38练习事件战从COMBAT退回事件，单列“完成事件战”，没有声称杀敌赢战。

|run|实级/终层/结果|states首—末行|独立战斗|尝试/额外|胜/实际败/完成事件战|营火 HEAL/SMITH|HEAL净回|
|---|---|---|---:|---:|---|---|---:|
|MGA0CZDDKC0P|A10/F17/败|240518—240953|10|15/5|9/1/0|2：2/0|42|
|25226ZFLNR1J|A10/F48/败|240957—241845|16|21/5|15/1/0|9：8/1|162|
|JLN5SK17W4FQ|A10/F33/败|241849—242658|14|20/6|13/1/0|7：6/1|127|
|JMH5C51RLN4E|A10/F49/败|242662—243541|18|27/9|17/1/0|12：1/11|21|
|9TG1RP5LFAAK|A10/F49/败|243545—244467|19|25/6|18/1/0|10：6/4|196|
|JQPT83P8KDSZ|A10/F25/败|244471—244993|10|13/3|9/1/0|4：4/0|84|
|4D4J8USKCPAV|A10/F17/败|244997—245542|11|16/5|10/1/0|4：4/0|84|
|TD1HVGS7H6LB|A10/F17/败|245546—245915|7|8/1|6/1/0|3：3/0|69|
|PJ2LL9KU7FHD|A10/F17/败|245919—246559|6|11/5|5/1/0|4：2/2|42|
|S9UZAK0JP0C0|A10/F33/败|246563—247423|14|20/6|13/1/0|8：4/4|117|
|HMVJKM56S4Q8（A9对照）|A9/F33/败|238463—239126|16|21/5|15/1/0|6：4/2|87|
|F4QKG4J1AJJZ（A9对照）|A9/F38/败|239130—239857|17|18/1|16/1/0|6：6/0|126|
|G403VCZ3BH1B（A9对照）|A9/F48/胜|239861—240514|15|16/1|14/0/1|9：6/3|128|

实际房间序列（每层地图/状态/行动原证据与资源变化见 [resource-chain.md](resource-chain.md)，各局JSON保留HP/max、金、药槽、牌组/遗物和SL）：

- **MGA0CZDDKC0P**：F1 远古；F2 普通战；F3 普通战；F4 问号→战；F5 普通战；F6 问号→事件；F7 营火(HEAL)；F8 普通战；F9 问号→战；F10 宝箱；F11 商店；F12 问号→事件；F13 普通战；F14 问号→战；F15 普通战；F16 营火(HEAL)；F17 Boss。
- **25226ZFLNR1J**：F1 远古；F2 普通战；F3 商店；F4 普通战；F5 问号→事件；F6 问号→事件；F7 问号→事件；F8 普通战；F9 营火(SMITH)；F10 宝箱；F11 营火(HEAL)；F12 精英；F13 营火(HEAL)；F14 问号→事件；F15 精英；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 问号→事件；F21 问号→事件；F22 问号→事件；F23 问号→事件；F24 商店；F25 问号→战；F26 宝箱；F27 营火(HEAL)；F28 问号→事件；F29 普通战；F30 问号→事件；F31 商店；F32 营火(HEAL)；F33 Boss；F34 远古；F35 普通战；F36 普通战；F37 商店；F38 问号→事件；F39 问号→事件；F40 营火(HEAL)；F41 宝箱；F42 问号→战；F43 营火(HEAL)；F44 精英；F45 商店；F46 普通战；F47 营火(HEAL)；F48 Boss。
- **JLN5SK17W4FQ**：F1 远古；F2 普通战；F3 问号→事件；F4 普通战；F5 普通战；F6 普通战；F7 营火(HEAL)；F8 精英；F9 问号→事件；F10 宝箱；F11 营火(HEAL)；F12 问号→事件；F13 营火(HEAL)；F14 精英；F15 普通战；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 普通战；F21 商店；F22 普通战；F23 问号→事件；F24 营火(HEAL)；F25 精英；F26 宝箱；F27 营火(SMITH)；F28 商店；F29 问号→事件；F30 精英；F31 问号→事件；F32 营火(HEAL)；F33 Boss。
- **JMH5C51RLN4E**：F1 远古；F2 普通战；F3 普通战；F4 普通战；F5 问号→事件；F6 问号→战；F7 问号→事件；F8 营火(SMITH)；F9 精英；F10 宝箱；F11 营火(HEAL)；F12 营火(SMITH)；F13 商店；F14 普通战；F15 问号→事件；F16 营火(SMITH)；F17 Boss；F18 远古；F19 普通战；F20 普通战；F21 商店；F22 问号→事件；F23 问号→事件；F24 营火(SMITH)；F25 普通战；F26 宝箱；F27 营火(SMITH)；F28 问号→战；F29 营火(SMITH)；F30 商店；F31 普通战；F32 营火(SMITH)；F33 Boss；F34 远古；F35 普通战；F36 问号→事件；F37 问号→事件；F38 问号→事件；F39 商店；F40 营火(SMITH)；F41 宝箱；F42 营火(SMITH)；F43 普通战；F44 营火(SMITH)；F45 普通战；F46 问号→事件；F47 营火(SMITH)；F48 Boss；F49 Boss。
- **9TG1RP5LFAAK**：F1 远古；F2 普通战；F3 商店；F4 普通战；F5 问号→事件；F6 普通战；F7 营火(SMITH)；F8 普通战；F9 问号→事件；F10 宝箱；F11 营火(HEAL)；F12 精英；F13 营火(SMITH)；F14 普通战；F15 商店；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 商店；F21 问号→事件；F22 问号→事件；F23 商店；F24 营火(SMITH)；F25 普通战；F26 宝箱；F27 营火(HEAL)；F28 精英；F29 营火(SMITH)；F30 普通战；F31 普通战；F32 营火(HEAL)；F33 Boss；F34 远古；F35 普通战；F36 问号→事件；F37 商店；F38 普通战；F39 普通战；F40 营火(HEAL)；F41 宝箱；F42 普通战；F43 问号→事件；F44 商店；F45 问号→事件；F46 问号→事件；F47 营火(HEAL)；F48 Boss；F49 Boss。
- **JQPT83P8KDSZ**：F1 远古；F2 普通战；F3 商店；F4 问号→事件；F5 问号→事件；F6 问号→事件；F7 普通战；F8 营火(HEAL)；F9 问号→事件；F10 宝箱；F11 精英；F12 营火(HEAL)；F13 普通战；F14 商店；F15 精英；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 普通战；F21 普通战；F22 问号→事件；F23 问号→事件；F24 营火(HEAL)；F25 精英。
- **4D4J8USKCPAV**：F1 远古；F2 普通战；F3 普通战；F4 普通战；F5 普通战；F6 普通战；F7 营火(HEAL)；F8 普通战；F9 营火(HEAL)；F10 宝箱；F11 精英；F12 普通战；F13 营火(HEAL)；F14 普通战；F15 普通战；F16 营火(HEAL)；F17 Boss。
- **TD1HVGS7H6LB**：F1 远古；F2 普通战；F3 问号→事件；F4 普通战；F5 普通战；F6 问号→事件；F7 普通战；F8 营火(HEAL)；F9 商店；F10 宝箱；F11 问号→战；F12 精英；F13 营火(HEAL)；F14 商店；F15 问号→事件；F16 营火(HEAL)；F17 Boss。
- **PJ2LL9KU7FHD**：F1 远古；F2 普通战；F3 问号→战；F4 问号→事件；F5 普通战；F6 问号→事件；F7 营火(SMITH)；F8 商店；F9 普通战；F10 宝箱；F11 营火(HEAL)；F12 精英；F13 营火(HEAL)；F14 问号→事件；F15 商店；F16 营火(SMITH)；F17 Boss。
- **S9UZAK0JP0C0**：F1 远古；F2 普通战；F3 普通战；F4 商店；F5 问号→事件；F6 普通战；F7 营火(SMITH)；F8 问号→事件；F9 问号→事件；F10 宝箱；F11 营火(HEAL)；F12 精英；F13 营火(SMITH)；F14 普通战；F15 问号→战；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 商店；F21 普通战；F22 普通战；F23 普通战；F24 营火(SMITH)；F25 普通战；F26 宝箱；F27 营火(HEAL)；F28 问号→事件；F29 营火(HEAL)；F30 精英；F31 商店；F32 营火(SMITH)；F33 Boss。
- **HMVJKM56S4Q8**：F1 远古；F2 普通战；F3 普通战；F4 普通战；F5 商店；F6 问号→事件；F7 营火(HEAL)；F8 精英；F9 普通战；F10 宝箱；F11 问号→事件；F12 营火(HEAL)；F13 普通战；F14 商店；F15 问号→事件；F16 营火(SMITH)；F17 Boss；F18 远古；F19 普通战；F20 问号→事件；F21 普通战；F22 问号→事件；F23 普通战；F24 营火(SMITH)；F25 精英；F26 宝箱；F27 普通战；F28 营火(HEAL)；F29 普通战；F30 普通战；F31 问号→战；F32 营火(HEAL)；F33 Boss。
- **F4QKG4J1AJJZ**：F1 远古；F2 普通战；F3 普通战；F4 普通战；F5 普通战；F6 问号→事件；F7 商店；F8 营火(HEAL)；F9 问号→战；F10 宝箱；F11 问号→事件；F12 普通战；F13 营火(HEAL)；F14 精英；F15 问号→事件；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 商店；F21 问号→事件；F22 普通战；F23 普通战；F24 商店；F25 问号→事件；F26 宝箱；F27 营火(HEAL)；F28 问号→事件；F29 营火(HEAL)；F30 精英；F31 普通战；F32 营火(HEAL)；F33 Boss；F34 远古；F35 普通战；F36 问号→事件；F37 普通战；F38 普通战。
- **G403VCZ3BH1B**：F1 远古；F2 普通战；F3 问号→事件；F4 问号→事件；F5 普通战；F6 普通战；F7 营火(SMITH)；F8 问号→事件；F9 营火(HEAL)；F10 宝箱；F11 商店；F12 精英；F13 营火(HEAL)；F14 精英；F15 商店；F16 营火(HEAL)；F17 Boss；F18 远古；F19 普通战；F20 普通战；F21 问号→事件；F22 商店；F23 问号→事件；F24 问号→事件；F25 营火(SMITH)；F26 宝箱；F27 问号→事件；F28 普通战；F29 营火(HEAL)；F30 精英；F31 商店；F32 营火(HEAL)；F33 Boss；F34 远古；F35 普通战；F36 问号→事件；F37 问号→事件；F38 问号→战；F39 问号→事件；F40 商店；F41 宝箱；F42 普通战；F43 问号→事件；F44 营火(SMITH)；F45 商店；F46 问号→事件；F47 营火(HEAL)；F48 Boss。

## 回血、营火与已观察规则

A10的63个营火HEAL基础文本均与floor(maxHP×30%)相符；40次实选HEAL净回944，含皇家枕头+15及满血上限，已见动作maxHP64/70/77/80/84/94/97/103；23次SMITH即时HP与maxHP均不变。这里只核已见值，没有与锻造的受控胜率比较。0020仅CLI补support，保持原proposed/旧版本历史。
12次永恒羽毛到火净回152另计：JMH11次131（含满血0、末火只回4），9TG F47牌组36张43→64回21，再HEAL64→84另20；已见18—36张满足min(缺口,3×floor(deck/5))。支持0142，不据此改变选牌或路线优先级。
A10九对及A9五对跨幕回复均符合floor(缺失HP×80%)，新CLI观察账本 silent-0243。用实际F17→18/F33→34转换帧，避免act_id先更新的MAP中间帧。首帧56/70只证实该值，不证明扣血过程。

|run/实跨幕|HP/max前→后|净回/缺口80%向下取整|states行/偏移|
|---|---|---|---|
|25226ZFLNR1J F17→F18|22/70→60/70|38/38|L241212 @7358625694→L241213 @7358661439|
|25226ZFLNR1J F33→F34|1/70→56/70|55/55|L241436 @7366498632→L241437 @7366542086|
|JLN5SK17W4FQ F17→F18|14/70→58/70|44/44|L242208 @7394911012→L242209 @7394947595|
|JMH5C51RLN4E F17→F18|46/70→65/70|19/19|L242926 @7419463415→L242927 @7419499187|
|JMH5C51RLN4E F33→F34|49/70→65/70|16/16|L243190 @7428520247→L243191 @7428562916|
|9TG1RP5LFAAK F17→F18|28/70→61/70|33/33|L243774 @7449487641→L243775 @7449524428|
|9TG1RP5LFAAK F33→F34|28/70→61/70|33/33|L244029 @7458232209→L244030 @7458274859|
|JQPT83P8KDSZ F17→F18|1/70→56/70|55/55|L244757 @7485922689→L244758 @7485962762|
|S9UZAK0JP0C0 F17→F18|29/98→84/98|55/55|L246852 @7546408355→L246853 @7546447497|
|HMVJKM56S4Q8 F17→F18|43/77→70/77|27/27|L238741 @7275070236→L238742 @7275113554|
|F4QKG4J1AJJZ F17→F18|1/70→56/70|55/55|L239392 @7296800854→L239393 @7296839709|
|F4QKG4J1AJJZ F33→F34|2/70→56/70|54/54|L239744 @7310217352→L239745 @7310262756|
|G403VCZ3BH1B F17→F18|2/70→56/70|54/54|L240089 @7320999200→L240090 @7321041377|
|G403VCZ3BH1B F33→F34|17/70→59/70|42/42|L240265 @7327584650→L240266 @7327631326|

|effect|本批实际字段/触发范围|未验证范围|
|---|---|---|
|LEVEL_01 精英蜂拥|A10/A9全部状态均显示；真实房间数保留|相对低等级精英密度增幅|
|LEVEL_02 旅途劳顿|A10九对/A9五对实跨幕回复缺失HP的80%；首帧56/70|初始扣血过程、其他先古/遗物|
|LEVEL_03 贫穷|文本金币减25%；实际奖励/金链保留|匹配低等级减幅|
|LEVEL_04 收紧腰带|十局A10/三局A9首帧真实2槽|低等级“减1”对照|
|LEVEL_05 进阶之灾|A10/A9初始牌组有ASCENDERS_BANE|首次等级/全部诅咒交互|
|LEVEL_06 通货膨胀|effect与商店帧保留|移除价格增幅|
|LEVEL_07 稀缺|effect与奖励帧保留|稀有/升级概率|
|LEVEL_08 强韧敌人|effect与各次战斗真实敌HP保留|相对低等级匹配改变|
|LEVEL_09 致命敌人|effect与真实敌意图保留|相对低等级匹配改变|
|LEVEL_10 双重Boss|A106877帧全有/A92046帧全无；两条实际F48胜后同幕F49开战|F49胜后、其他组合及未来|

只比较这次重新核证的实际A9/A10，新增字段是LEVEL_10；地图第二节点是可见结构，只有两条真实到场链证明触发，不从等级/文字猜未走到的后场。完整effect原文本及首帧证据保留在逐局JSON。

## 连战与药水/SL资源链

- JMH：F48五次尝试，末次60/60、槽0毒药水入场 L243459 @7439906621；T13前10/60，胜后8/60、金119、空药 L243532 @7443348142；MAP L243533仅F49出口；F49首T1仍8/60、同金空药 L243534 @7443430835，六尝试最后实际败。前四次截断及SL恢复不混进末次损血。
- 9TG：F48两次尝试，末次84/84、毒药水/液态记忆 L244290；T16前19/84，胜后17/84、金177、仅槽0毒药水 L244372 @7473583198；MAP L244373仅F49出口；F49首T1仍17/84、同金同槽余药 L244374 @7473672603，六次最后实际败。末次F48实际喝液态记忆与药栏变化已单列。
- A9 G403：F48第二尝试90/90入场，胜后18/90（L240512），随后事件与GAME_OVER/is_victory=true（L240514）；三幕地图无第二Boss节点。胜利GAME_OVER的run.current_hp=0是终局序列字段，不能算成胜战损18血或死亡。
- A10共111条use_potion指令有相邻实际槽身份消失/替换证据，1条discard_potion另计；不同尝试中重复使用是SL恢复后再喝。JQ F11 T3 decisions L239565 @573586158：使用槽0 ENTROPIC_BREW；states L244572 @7480713116为混沌药水/空槽，L244573 @7480734739变毒药水/无色药水。该一次指令同时消费原药与获得新药，不能只按空槽数下降算未喝；这里只列该资源事件，不拟合新药水策略或外推F48机制。
- 所有胜战、实际败战、截断尝试、到火/动作/跨幕治疗、用药/弃药/奖励、HP/max与遗物变化完整串接；缺退出帧保持未知，不把未喝另一药或另一条路线写成本可赢。首次审计校验对喝药后空槽的断言过窄，已按原状态修正并保留 [首次校验记录](verification-initial-failure.json)；这不是游戏代码失败。

## 差异、账本与提案CLI闭环

|差异|当前结论/影响|账本|CLI id/队列状态|
|---|---|---|
|D1|旧后战投影高估资源；当前null/未知传播已实现，本轮不是回归或上线效果评估。|silent-0163|silent-proposal-aab73fcff1c56b8e / implemented（原实现/后续duplicate）|
|D2|F48首战胜不等于终局，后战消耗余HP/同槽余药；当前已实现核心，参数/全交互与实盘收益未知。|silent-0228|silent-proposal-09d5c7776e88d756 / implemented（原实现/后续duplicate）|
|D3|F48战后说明错误宣称本幕结束；F49通用事实/工作记忆复制首Boss且静态距离null；空奖励帧不能证明选牌误导或导致失败。|silent-0228|silent-proposal-4cc200cc9747f4a8 / pending（实际策略修复另任务）|

### D1

旧后战投影高估资源；当前null/未知传播已实现，本轮不是回归或上线效果评估。

证据：JMH5C51RLN4E F48 T13 states.jsonl:L243532 @byte 7443348142；JMH5C51RLN4E F49 T1 states.jsonl:L243534 @byte 7443430835。

固定live代码：agent/src/sim/route-projection.ts:188；agent/src/sim/route-map.ts:340。

本轮独立提案：[详细旧/新行为、反例、验证、预期影响、回退与任务链接](proposal-route-unknown.md)。

### D2

F48首战胜不等于终局，后战消耗余HP/同槽余药；当前已实现核心，参数/全交互与实盘收益未知。

证据：JMH5C51RLN4E F48 T13 states.jsonl:L243532 @byte 7443348142；JMH5C51RLN4E F49 T1 states.jsonl:L243534 @byte 7443430835；9TG1RP5LFAAK F48 T16 states.jsonl:L244372 @byte 7473583198；9TG1RP5LFAAK F49 T1 states.jsonl:L244374 @byte 7473672603。

固定live代码：agent/src/knowledge/double-boss.ts:46；agent/src/reflex/combat-plan.ts:3039；agent/src/reflex/combat-plan.ts:3181；agent/src/reflex/potion-cost.ts:59；agent/src/reflex/turn-solver.ts:3112；agent/src/sim/boss-sim.ts:310；agent/src/sim/boss-lines.ts:787。

本轮独立提案：[详细旧/新行为、反例、验证、预期影响、回退与任务链接](proposal-continuation.md)。

### D3

F48战后说明错误宣称本幕结束；F49通用事实/工作记忆复制首Boss且静态距离null；空奖励帧不能证明选牌误导或导致失败。

证据：JMH5C51RLN4E F48 T13 states.jsonl:L243532 @byte 7443348142；JMH5C51RLN4E F48 T13 states.jsonl:L243533 @byte 7443380878；JMH5C51RLN4E F49 T1 states.jsonl:L243534 @byte 7443430835；9TG1RP5LFAAK F48 T16 states.jsonl:L244372 @byte 7473583198；9TG1RP5LFAAK F48 T16 states.jsonl:L244373 @byte 7473619437；9TG1RP5LFAAK F49 T1 states.jsonl:L244374 @byte 7473672603。

固定live代码：agent/src/sim/build-sim-facts.ts:444；agent/src/sim/build-sim-facts.ts:475；agent/src/brain/build-facts.ts:44；agent/src/brain/build-facts.ts:48；agent/src/brain/build-facts.ts:52；agent/src/memory/run-plan.ts:138。

本轮独立提案：[详细旧/新行为、反例、验证、预期影响、回退与任务链接](proposal-boss-phase-facts.md)。

D3真实帧代入当前谓词的结果见 [static-facts-evaluation.json](static-facts-evaluation.json)：两组F48战后actBossDefeated=true，说明称本幕已经打完；实际同幕还有第二节点。F49通用floors_to_act_boss=null、act_boss=TEST_SUBJECT_BOSS，当前enemies实际为沙漏或女王。药水combat-plan.ts:500在实际Boss战写this fight，不能把该项误报成null错误。未执行TS或证明实际决策损害，尤其本批两次F48奖励均空。
- 三项均通过项目根CLI add重新登记，输入与原队列条目完全相同，CLI去重返回原id。原Markdown路径/SHA与pending/implemented状态保持；自己的独立提案/报告另经ledger CLI追加where/support，没有造重复队列、implemented或shipped。D1/D2所记实现commit均重新核为live祖先。
- 新增观察 silent-0243 为mechanic/observed，证据含本角色原帧；更新 silent-0163, silent-0228, silent-0020, silent-0142 只追加support及本轮链接，保留claim/kind/first_run/prior/status/version。0163原bug-infra分类仅保留历史，没有新建bug-infra。账本check退出0，实际回执见 [ledger-check.txt](ledger-check.txt)。运维只核实登记，D3交后续策略任务沿既有授权实施。

## live代码假设逐项对照

|代码假设|固定源码file:line|观察范围与结论|
|---|---|---|
|幕初/层号与Boss节点|sim/route-map.ts:17/107；hand/screens/route-plan.ts:99|实幕初F1/18/34、地图rows16/15/14，首Boss F17/33/48；A10二节点F49仅两局实际到，A9对照无第二节点。|
|幕末/当前Boss身份|sim/build-sim-facts.ts:444/475；brain/build-facts.ts:44/52；memory/run-plan.ts:138|D3仍有语义不一致，不能将首战败敌等同幕结束或沿用stale首Boss身份。|
|Boss后路线血量|sim/route-projection.ts:188；sim/route-map.ts:340|D1现有null/未知传播符合样本，不拟合固定Boss成本。|
|房间代价/战斗计数|sim/route-projection.ts:148/158；sim/route-map.ts:357|统计中位/p75与fallback是估计；真实125战/176尝试分列，逐战损血偏差不能直接判机制bug，未重新拟合精度。|
|营火与到火回血|sim/route-projection.ts:22/82/105；hand/screens/rest.ts:344|已见63火文本/40HEAL/23SMITH、12羽毛到火符合实际值；未见遗物不验证。|
|预首Boss营火/时钟|hand/screens/rest.ts:50/101；sim/boss-clock.ts:1713/1737|实际F16/32/47火与首Boss对得上，F48/F49之间两组无营火；silent角色守卫禁用旧通用bossClock分支，不能把其常量当已验证静默时钟。|
|跨幕回复|hand/loop.ts:540；hand/screens/route-plan.ts:99/113|14实际对符合缺失HP80%；本幕路径不投影跨幕，未发现所读代码存在100%幕间回血硬编码，不宣称全源码排除。|
|真实终局控制|hand/loop.ts:556/563|GAME_OVER/is_victory确认终局；A9F48胜终局，A10两局F48后F49实际败，控制器没有在F48自动停局。|
|终局HP/药水持有价值|knowledge/double-boss.ts:46/53；reflex/potion-cost.ts:59；reflex/turn-solver.ts:3112|D2核心门控/接续已有；两实链支持余HP/余药约束，曲线/全药价与效果未知。|
|连续两战模拟|sim/double-boss-start.ts:20/59；sim/boss-sim.ts:310/335；sim/boss-lines.ts:787|同样本剩余资源接续、低可信限制保持；未运行或校准新模拟，不证明提升。|
|SL门槛/身份/重启|sl/controller.ts:224/1251/1252/1259；sl/reload.ts:36|floor+真实enemy IDs区分F48/F49；SL.started_at和实际T1重置分尝试。低可信连战不等于必死；TD失败读档与缺汇总保留，不改SL规则。|

表中源码路径均相对agent/src；snapshot行号/源码SHA固定在manifest。没有借本批未读的其他角色知识验证。

## 限制、未做事项与核验

- 十局各自终层之后、F49胜后、其他首后Boss组合及未来规则未知；不能从LEVEL_10文本补推。
- LEVEL_01精英密度、LEVEL_03金币减少25%、LEVEL_06移除价格增幅、LEVEL_07稀有/升级频率、LEVEL_08/09相对低等级数值变化只有文本/非受控状态，触发幅度/概率未知。
- 初始56/70形成过程、2槽相对更低等级减1、ASCENDERS_BANE首次出现及全部交互未观察。
- 未选择营火动作、其他最大HP/遗物（含本批未触发的Pantograph/石炉）/复活交互未知；不推休息与锻造胜率因果。
- TD1HVGS7H6LB F17第1次SL reload.ok=false且超时；后续可见回合重置至T1，末次SL汇总缺失，不能记读档成功。
- 截断尝试真实退出HP/实际死亡未知；重启资源另列，不当治疗或新增独立战斗。
- 后战HP价值曲线、完整药水持有价、后Boss分布/全部复活接续及连战模拟校准未独立验证；具体实现上线效果未知。
- D3非空F48战后构筑题、实际决策损害与修后效果未知：本批两次F48奖励均空。
- 本批两个F49样本都在前五局，后五没有F49留出验证；代码版本/牌组/进场HP不同，无受控升阶或策略比较。
- 路线预测精度、部分非战斗资源变化原因、未选路线/未喝药反事实未知；未拟合新参数。
- 原字节18125条、84营火选项（含A9）、56HEAL/28SMITH、14跨幕、12羽毛到火及全部145用药+1弃药槽身份证据验证通过。A10与A9计数分开报告，详细核验见 [verification.json](verification.json)。这是取证/公式/静态谓词核验，纯审计未跑tsc/vitest或游戏模拟。
- 没有改游戏源码、角色知识、ops prompt、eval版本或运维循环，没有提交/合入源码；纯审计不要求源码自测/发布。已保存所有证据、原失败记录和CLI输入/回执；本轮审计规则实现留strategy-proposal。
- 审计产物与所读旧历史/当前live源码完整性、专用CLI链接检查及gitleaks结果由 [final-artifact-check.json](final-artifact-check.json) 保存。最终时间 2026-10-07T19:04:26.651859+08:00。
