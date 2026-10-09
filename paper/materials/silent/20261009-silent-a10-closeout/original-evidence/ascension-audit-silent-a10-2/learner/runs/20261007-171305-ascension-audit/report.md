# 静默猎手 A9 → A10 独立结构审计

已完成以下样本实际观察范围的六项审计。十个来源局均从原始状态重新核为 SILENT、实际 A10、实际已结束；125 场独立战斗、176 次尝试（51 额外）、63 个营火。115 场赢战与10场实际终局败战、51次截断/重启分账。两局实际由 F48 胜出进入 F49，不能把首战胜利当整局胜利。D1/D2 核心已有 live 实现，D3 通用阶段与当前身份字段仍有语义缺口，实际决策损害未知。complete 只表示本次观察范围完成。

## 样本、时间和文件边界

- 开工工作树干净，HEAD=main=`5e2a52ed08499e109c12e21eddfbee1ba63f1f1c`；本轮未移动分支或合源码。只读 live 固定代码 `606855106dfb90ca8ffe27b985ed3c3b3f2424a2`，22个源码/本角色模型文件的 blob/SHA 在 [live-source-manifest.json](live-source-manifest.json)，报告完成时间 2026-10-07T17:36:23+08:00。
- 17:34复核并发live已到05b4f233472928698cd11fee4a8fb182a3da2736：上述22文件中21个blob相同，只有combat-plan新加silent-simulation-reference的导入/展示。已保存该差量与helper，当前阶段/身份/药水谓词未改变，D3仍存在；表格线号统一指固定60685510。边界见 [later-live-boundary.json](later-live-boundary.json) 和 later-live-source-diff.patch；新展示在旧样本中的行为没有测试。
- A10最早原始观察 2026-10-05T20:54:59.385Z，最晚结束 2026-10-06T04:00:23.109Z；北京时间为10-06早晨至12:00:23。按结束顺序前五/后五整局分组，SL留在原局。两条实到F49均在前五，后五没有触达，不把未触达当验证。样本早于当前功能，不能说明上线效果。
- 上一实际观察等级用同角色实际A9三局 HMVJKM56S4Q8、F4QKG4J1AJJZ、G403VCZ3BH1B；原状态逐条核角色与实际等级，不用调度请求或升阶记录替代。对照范围也有限，最后一局F48实际胜利GAME_OVER。
- 新鲜流式取证6877条A10状态、2046条A9状态；只解析上述13个已结束角色局。每个所选states/decisions/SL/brain/runs记录带全局行号、字节偏移和长度，固定读取前缀边界及逐局原字节SHA见 [manifest.json](manifest.json)。18125条所选记录又逐偏移读原文件核相等，未整份输出大日志。
- 旧失败树/报告/提案只读借鉴，原指纹见 [prior-audit-read-only.json](prior-audit-read-only.json)，本轮关键结论全部重新取证；没有删除或修改旧历史。README、最新STATE、decision-log末尾及两份学习协议均已读。当前知识只读silent目录，不读其他角色数据、游戏包、key或.env。
- 本批brain记录engine均为codex（314条）；不把runs旧deepseek_calls字段当实际引擎证据。本轮没有重算生产纳入口径、费用或战绩。

## 六项覆盖表

|项目|本次已观察与对照|未知边界|
|---|---|---|
|floors|十局逐层实际房间序列；F17十局、F33五局、F48三局、F49两局；A9三局实核。|终层之后、F49胜后及其他组合未观察。|
|combat_counts|125独立战斗；176尝试，其中51额外；115赢战、10实死及51截断/重启分账。|TD末次SL汇总缺失；截断不是实际死亡或独立新战。|
|healing|40 HEAL净944；A10九对/A9五对跨幕80%损失生命回复；HP/max/药水/遗物链保留。|初始扣血过程、未触发遗物/复活及休息选择因果未知。|
|campfires|63实际营火：40HEAL、23SMITH；12次羽毛到火独立分账，净152。|未选动作、多动作组合、未来营火未知。|
|rules|6877 A10状态实际SILENT+LEVEL_01—10；2046 A9状态为LEVEL_01—09；两条连战实证。|effect文本不证明数量、频率、相对低等级改变或未来触发。|
|assumptions|固定live逐项源码对照，D1/D2已有实现、D3语义缺口重核并CLI登记。|未运行新模拟/实现测试，参数/上线效果/决策损害未验证。|

## 逐局实际层数、战斗、SL与营火

独立战斗按实际同层遭遇计；本批没有同层第二独立房间战斗的证据，Boss阶段变化/召唤不另算场。尝试由SL.started_at/attempt和实际T1重启分界核证；JMH F49六次全为T1，不能只凭回合下降。TD的读档timeout/ok=false后另见重启，其第二尝试没有末次SL汇总，仍保留且不冒称读档成功。

|run|实际等级/终层/胜负|states首—末行|独立战斗|尝试/额外|营火HEAL/SMITH|动作HEAL净回|
|---|---|---|---:|---:|---|---:|
|MGA0CZDDKC0P|A10/F17/败|240518—240953|10|15/5|2：2/0|42|
|25226ZFLNR1J|A10/F48/败|240957—241845|16|21/5|9：8/1|162|
|JLN5SK17W4FQ|A10/F33/败|241849—242658|14|20/6|7：6/1|127|
|JMH5C51RLN4E|A10/F49/败|242662—243541|18|27/9|12：1/11|21|
|9TG1RP5LFAAK|A10/F49/败|243545—244467|19|25/6|10：6/4|196|
|JQPT83P8KDSZ|A10/F25/败|244471—244993|10|13/3|4：4/0|84|
|4D4J8USKCPAV|A10/F17/败|244997—245542|11|16/5|4：4/0|84|
|TD1HVGS7H6LB|A10/F17/败|245546—245915|7|8/1|3：3/0|69|
|PJ2LL9KU7FHD|A10/F17/败|245919—246559|6|11/5|4：2/2|42|
|S9UZAK0JP0C0|A10/F33/败|246563—247423|14|20/6|8：4/4|117|
|HMVJKM56S4Q8（对照）|A9/F33/败|238463—239126|16|21/5|6：4/2|87|
|F4QKG4J1AJJZ（对照）|A9/F38/败|239130—239857|17|18/1|6：6/0|126|
|G403VCZ3BH1B（对照）|A9/F48/胜|239861—240514|15|16/1|9：6/3|128|

逐层房间序列如下；括号动作是实选，问号后的战斗/事件是实际屏幕，不把地图问号一律当战斗。每层节点证据、HP、资源及赢战详情见 [resource-chain.md](resource-chain.md) 和 [audit-data.json](audit-data.json)。

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

## 回血、营火与effect触发范围

63火均实选HEAL或SMITH。所有63个HEAL选项的基础文本都与floor(maxHP×30%)一致；实际40次HEAL净回944，观察动作最大HP为64/70/77/80/84/94/97/103，含皇家枕头+15和最大HP截断；23次SMITH即时HP均不变。此处是动作观察范围，不是所有最大HP或遗物验证。
12次永恒羽毛到火另计：JMH 11次合131，包含满血0与F47仅4；9TG F47 36张43→64回21。已见18—36张范围均符合min(HP缺口,3×floor(牌组/5))。9TG HEAL随后64→84另外回20；JMH唯一HEAL另21。未将羽毛回血混进HEAL或SL恢复。分账支持账本0020/0142，不改策略优先级。

|run /实际跨幕|HP/max前→后|净回|floor(缺失HP×80%)|states证据|
|---|---|---:|---:|---|
|25226ZFLNR1J F17→F18|22/70→60/70|38|38|L241212 @byte 7358625694→L241213 @byte 7358661439|
|25226ZFLNR1J F33→F34|1/70→56/70|55|55|L241436 @byte 7366498632→L241437 @byte 7366542086|
|JLN5SK17W4FQ F17→F18|14/70→58/70|44|44|L242208 @byte 7394911012→L242209 @byte 7394947595|
|JMH5C51RLN4E F17→F18|46/70→65/70|19|19|L242926 @byte 7419463415→L242927 @byte 7419499187|
|JMH5C51RLN4E F33→F34|49/70→65/70|16|16|L243190 @byte 7428520247→L243191 @byte 7428562916|
|9TG1RP5LFAAK F17→F18|28/70→61/70|33|33|L243774 @byte 7449487641→L243775 @byte 7449524428|
|9TG1RP5LFAAK F33→F34|28/70→61/70|33|33|L244029 @byte 7458232209→L244030 @byte 7458274859|
|JQPT83P8KDSZ F17→F18|1/70→56/70|55|55|L244757 @byte 7485922689→L244758 @byte 7485962762|
|S9UZAK0JP0C0 F17→F18|29/98→84/98|55|55|L246852 @byte 7546408355→L246853 @byte 7546447497|
|HMVJKM56S4Q8 F17→F18|43/77→70/77|27|27|L238741 @byte 7275070236→L238742 @byte 7275113554|
|F4QKG4J1AJJZ F17→F18|1/70→56/70|55|55|L239392 @byte 7296800854→L239393 @byte 7296839709|
|F4QKG4J1AJJZ F33→F34|2/70→56/70|54|54|L239744 @byte 7310217352→L239745 @byte 7310262756|
|G403VCZ3BH1B F17→F18|2/70→56/70|54|54|L240089 @byte 7320999200→L240090 @byte 7321041377|
|G403VCZ3BH1B F33→F34|17/70→59/70|42|42|L240265 @byte 7327584650→L240266 @byte 7327631326|

A10九对与A9五对跨幕实回均符合损失生命80%向下取整，取自真实层数/事件转换而非act_id先更新的中间MAP帧。初始56/70只证实首帧状态，扣血/先古治疗过程未观察，不把文本当过程证据。

|effect|本批触发/状态证据|尚未知|
|---|---|---|
|LEVEL_01 精英蜂拥|全部A10/A9状态均显示；实际房间/战斗表保留|密度差与相对低级增幅未受控验证|
|LEVEL_02 旅途劳顿|上述9+5对实际回复缺失HP的80%，首帧56/70|其他先古/遗物、初始扣血过程|
|LEVEL_03 贫穷|effects文本显示金币减25%，实际奖励/金链保存|无匹配低等级反事实，25%减幅未验证|
|LEVEL_04 收紧腰带|十局A10及三局A9首帧实际均2槽|“减1”的更低等级对照未观察|
|LEVEL_05 进阶之灾|十局A10及A9初始牌组实际有ASCENDERS_BANE|首次出现等级及全部诅咒交互未知|
|LEVEL_06 通货膨胀|effect字段与商店帧保存|移除服务增幅未验证|
|LEVEL_07 稀缺|effect字段与奖励牌面保存|稀有/已升级牌概率未验证|
|LEVEL_08 强韧敌人|effect字段与逐战真实敌人HP保存|与更低等级的匹配差值/机制未知|
|LEVEL_09 致命敌人|effect字段与逐战真实意图保存|与更低等级的匹配差值/机制未知|
|LEVEL_10 双重Boss|A106877帧均有，A92046帧无；JMH/9TG实际F48赢后同幕F49开战|F49胜后、其他组合、未来层数/机制|

只比较实际A9/A10：本批新字段为LEVEL_10，地图可见第二节点仅证明可见结构，只有两条实际链证明触发。effect完整原文字段及证据在各局resource-chain.json.rules，不从级数猜未来。

## 两条连战资源链与A9对照

- JMH5C51RLN4E：F48五尝试，末次60/60、槽0毒药水入场（L243459）；T13前10/60，胜后8/60、金119、空药（L243532），地图仅F49出口（L243533）；F49 T1仍8/60、金119、空药，实际AEONGLASS（L243534 @7443430835），六尝试末次实际败。不能把首战赢当终局；截断的四次首战药水在SL后恢复，恢复另列。
- 9TG1RP5LFAAK：F48两尝试，末次84/84、毒药水和液态记忆入场（L244290）；T16前19/84，胜后17/84、金177、槽0毒药水（L244372），仅F49出口（L244373）；F49 T1仍17/84、同金同槽药，实际TORCH_HEAD_AMALGAM/QUEEN（L244374 @7473672603）。F48 winning attempt中液态记忆用药指令与药栏减少单列；F49六尝试最终实际败。
- A9 G403VCZ3BH1B：同角色实核A9，F48第二尝试90/90入场，T11后18/90，随后GAME_OVER/is_victory=true（L240514）；三幕地图没有second_boss_node。A10结论不能扩展到A9或其他角色。
- 每局包括前面赢战的完整资源链：独立房间、各次进出HP/max与药栏、药水指令/弃药、奖励取得、营火/羽毛/跨幕回血、SL重置分列于附录及JSON。净损血含自伤和回血；缺退出帧写未知，不据未选药/路线推断“本可赢”。

## 差异、证据、学习账本与代码提案

|差异|当前结论|账本|CLI id /状态|
|---|---|---|---|
|D1|旧后场路线HP沿用首战入口；当前live已传播null/未知，不能登记成修后回归。|silent-0163|silent-proposal-aab73fcff1c56b8e / 已有implemented、后续duplicate|
|D2|F48实际胜后仍用余HP/同槽余药进入F49；当前live已接续核心资源和估值，更多参数未核。|silent-0228|silent-proposal-09d5c7776e88d756 / 已有implemented、后续duplicate|
|D3|F48战后阶段说明与同幕第二节点不符；F49通用事实复制stale首Boss身份，静态Boss距离为null。|silent-0228|silent-proposal-4cc200cc9747f4a8 / pending|

### D1

旧后场路线HP沿用首战入口；当前live已传播null/未知，不能登记成修后回归。 旧题面高估后战资源；当前已保持未知。本样本不证明修后路线或胜率提升。
证据：25226ZFLNR1J F35 brain.jsonl L6149 @byte 195801544；JMH5C51RLN4E F44 brain.jsonl L6246 @byte 199438941；JMH5C51RLN4E F48 T1 states.jsonl L243459 @byte 7439906621；JMH5C51RLN4E F48 T13 states.jsonl L243532 @byte 7443348142；JMH5C51RLN4E F49 T1 states.jsonl L243534 @byte 7443430835。
当前源码：agent/src/sim/route-projection.ts:188；agent/src/sim/route-map.ts:340。
独立提案详见 [proposal-route-unknown.md](proposal-route-unknown.md)，含旧/新行为、反例、样本切分、验证、影响及回退。

### D2

F48实际胜后仍用余HP/同槽余药进入F49；当前live已接续核心资源和估值，更多参数未核。 单场终局价值不适用首战；本轮只核连续约束，未检验HP曲线、药水价、所有复活或后战分布，也未证明策略转胜。
证据：JMH5C51RLN4E F48 T13 states.jsonl L243532 @byte 7443348142；JMH5C51RLN4E F49 T1 states.jsonl L243534 @byte 7443430835；9TG1RP5LFAAK F48 T16 states.jsonl L244372 @byte 7473583198；9TG1RP5LFAAK F49 T1 states.jsonl L244374 @byte 7473672603。
当前源码：agent/src/knowledge/double-boss.ts:46；agent/src/reflex/combat-plan.ts:3038；agent/src/reflex/combat-plan.ts:3180；agent/src/reflex/potion-cost.ts:59；agent/src/reflex/turn-solver.ts:3112；agent/src/sim/boss-sim.ts:310；agent/src/sim/boss-lines.ts:787。
独立提案详见 [proposal-continuation.md](proposal-continuation.md)，含旧/新行为、反例、样本切分、验证、影响及回退。

### D3

F48战后阶段说明与同幕第二节点不符；F49通用事实复制stale首Boss身份，静态Boss距离为null。 字段语义可静态复现；本批两次战后奖励为空，尚未证明出现非空构筑题或导致失败。保留跳过未知模拟和原SL门槛。
证据：JMH5C51RLN4E F48 T13 states.jsonl L243532 @byte 7443348142；JMH5C51RLN4E F48 T13 states.jsonl L243533 @byte 7443380878；JMH5C51RLN4E F49 T1 states.jsonl L243534 @byte 7443430835；9TG1RP5LFAAK F48 T16 states.jsonl L244372 @byte 7473583198；9TG1RP5LFAAK F48 T16 states.jsonl L244373 @byte 7473619437；9TG1RP5LFAAK F49 T1 states.jsonl L244374 @byte 7473672603。
当前源码：agent/src/sim/build-sim-facts.ts:446；agent/src/sim/build-sim-facts.ts:475；agent/src/brain/build-facts.ts:44；agent/src/brain/build-facts.ts:52；agent/src/memory/run-plan.ts:138。
独立提案详见 [proposal-boss-phase-facts.md](proposal-boss-phase-facts.md)，含旧/新行为、反例、样本切分、验证、影响及回退。

D3按真实帧代入现有谓词的结果在 [static-facts-evaluation.json](static-facts-evaluation.json)：两组F48战后actBossDefeated=true、说明称本幕boss已打完；实际同幕仍有第二节点。F49通用floors_to_act_boss=null、act_boss=TEST_SUBJECT_BOSS，而当前enemies分别为沙漏/女王。药水语境combat-plan.ts:499在boss战写“this fight”，本轮没有把它误报成必然null。这是字段语义对照，未执行TS、未证明实盘损害；F48空奖励尤其不能冒称选牌误导。
三项均经项目根CLI add重新登记，输入与已有条目完全相同，CLI去重返回原id，保留原Markdown路径/指纹及状态，不新建重复策略队列。各自本轮独立提案/报告则由ledger CLI追加where链接和重新核证support。输入与回执在 D1/D2/D3.proposal-input.json/.proposal-receipt.txt；D1/D2实现源再核为实际live祖先，D3保持pending，原shipped不代表D3已实现。
本轮added=[]，updated=[silent-0163,silent-0228,silent-0020,silent-0142]，保留原claim、kind、first_run、prior、status、version与所有历史。0163原bug-infra分类仅留史，没有新造基础设施项；0020当前proposed也未擅自改回shipped。学习账本check退出0（240 items、0 problems）。运维只核实登记；实际规则实现交后续策略任务，证据足够时沿Roy既有授权，不重复申请。

## live代码假设逐项对照

|假设|固定live代码位置|本次结论及观察范围|
|---|---|---|
|实际幕初与地图层号|agent/src/sim/route-map.ts:17/107；agent/src/hand/screens/route-plan.ts:99|观察幕初F1/18/34、地图rows=16/15/14。A9三幕至F48；A10第二节点row15仅两局实际到F49。|
|幕末/当前Boss事实|agent/src/sim/build-sim-facts.ts:446/475；agent/src/brain/build-facts.ts:44/52；agent/src/memory/run-plan.ts:138|D3仍pending，F48首战胜不等于本幕结束，F49 enemies与stale boss_id不同；决策影响未知。|
|后场路线HP|agent/src/sim/route-projection.ts:188；agent/src/sim/route-map.ts:340|D1历史不一致，当前Boss后null保持未知；不拟合固定损血。|
|路线代价与战斗计数|agent/src/sim/route-projection.ts:148/158；agent/src/sim/route-map.ts:357|当前房间代价为统计估计/fallback，不能将逐场偏差作机制bug；本批完整资源链保存，未重新拟合预测精度。|
|营火回血/到火分账|agent/src/sim/route-projection.ts:22/82/105；agent/src/hand/screens/rest.ts:344|63火HEAL基础文本与floor(max×30%)相符；40实选HEAL含枕头/上限，23SMITH即时0；12羽毛到火独立。仅已见值。|
|静态预Boss营火|agent/src/hand/screens/rest.ts:50/101；agent/src/sim/boss-clock.ts:1562/1585/1604|本批已到F16/32/47的预首Boss营火；F48/F49间无营火帧。未证明未来位置或Pantograph在F49行为。bossClock的角色守卫对silent返回null，不能扩写成已验证静默时钟；未读默认角色知识。|
|跨幕回血|agent/src/hand/loop.ts:540；agent/src/hand/screens/route-plan.ts:99/113|A10九对及A9五对实际先古回复损失HP的80%向下取整；act_id可先于floor更新，本轮用真实F17→18/F33→34帧分账。本幕路线代码未投影跨幕，未发现需修的100%回血硬编码，不宣称全源码已排除。|
|实际终局控制|agent/src/hand/loop.ts:556/563|以GAME_OVER/is_victory确认终局；A9 G403在F48胜，A10两局F48后继续F49并败。控制器没有因F48直接停局。|
|终局HP/药水持有价值|agent/src/knowledge/double-boss.ts:46/53；agent/src/reflex/potion-cost.ts:59；agent/src/reflex/turn-solver.ts:3112|D2当前核心已实现，只在本角色实际A10+LEVEL_10第三幕首战门控；HP/同槽余药约束有证据，具体曲线与全药价未验证。|
|连续两战模拟|agent/src/sim/double-boss-start.ts:20/59；agent/src/sim/boss-sim.ts:310/335；agent/src/sim/boss-lines.ts:787|现有样本余资源接续和低可信提示保留；两条实链支持连续约束，不支持参数拟合或真实通关提升。|
|SL门控与遭遇身份|agent/src/sl/controller.ts:1251/1252/1259；agent/src/sl/reload.ts:36|floor+实际enemy IDs区分F48/F49，同场尝试另列；JMH F49六次T1必须用SL.start/attempt，不只看turn下降。低可信连战不是必死/SL判据；本轮不重新证明所有必死门槛。|

## 限制与未做事项

- A10 F49胜后的状态、其后层数、其他首后Boss组合、其他角色/未观察进阶未知；每局终层之后均未观察。
- LEVEL_01精英密度、LEVEL_03减金25%、LEVEL_06移除价格增幅、LEVEL_07稀有/升级频率、LEVEL_08/09相对低等级改变只有文本或非受控状态，未验证触发数量/概率。
- 初始56/70扣血过程、药槽减1的低等级对照、全部诅咒交互未观察；有实际2槽及ASCENDERS_BANE，不以A10数字补推。
- 未选营火动作/多动作组合、未见最大HP与回血遗物（含本批未触发的石炉/Pantograph等）交互未知；回血与锻造没有受控整战比较。
- TD1HVGS7H6LB F17读档超时失败，后续重启尝试可见而末次SL汇总缺失；不记读档成功，截断战斗不当实际死亡。
- 完整后战HP价值曲线、其他药水价、复活/遗物接续和二Boss分布未独立验证；当前模型另含未在本任务取证的局，连战模拟未校准。
- D3非空F48战后构筑题、实盘决策损害及修后效果未知；样本早于当前live，两个实到F49证据均在前五，后五未触达。
- 路线代价预测精度、未分类非战斗资源变化的全部因果、未选路线/未喝药的反事实未知；本次未拟合、模拟、改源码、策略知识、ops prompt或发布版本。

- 只写本scratch审计产物和经CLI追加专用学习记录；游戏源码、角色知识、ops prompt均只读。不启动/暂停对局、不派agent、不联网、不安装依赖、不合游戏代码、不造eval版本或新shipped。报告未提交游戏代码，git tracked工作树保持原状。
- 纯审计没有运行tsc/vitest或新游戏模拟，不以源码静态对照宣称游戏实现测试通过；原字节取证、公式/边界、现有CLI链接和源码/旧历史指纹核验见 [verification.json](verification.json)。本scratch gitleaks扫描约515MB退出0、no leaks，日志与JSON保留；保留未见字段和样本边界。

