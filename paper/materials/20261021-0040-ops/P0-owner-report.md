# R405 奖励候选同值缺陷：牌面物化与未建模保护

2026-10-21，原 owner v6-w4w6 / codex1 / native thread `01a15382-68eb-7093-b677-040c9b45767f`。源码 `70f3ec976b5f8fa91dc7647dcc3858997c401e7a`，base `64cc0f8d7fe2294f5fafad56481db3f6095dc4fc`，tree `b9c11802b9e06638d6b1f598e60e994e336202b4`。本项接 Claude 00:1x 的 P0；未启动模型/API 请求、play 或完整检查，未修改 live、知识、配置、STOP 或对局。当前 R406 的 CARD=brain 保持，由 ops 核实际组合、完整检查与开局边界发布。

## 结论与改动

这是代码缺陷：候选身份已经加入牌组，缓存键也包含候选状态；新增牌却以 `{card_id, upgraded, index}` 的身份占位对象进入模拟。`offHandCardModel` 的 `own ?? catalogueFace` 逻辑把这个非空占位对象视为实际牌面，绕过牌库回退，结果费用与效果为空。原始实现可追至 `79dc02307` 的 `v6ProjectionStart`；本次不修改 V5 全局牌模型、出牌策略或学习知识。

`sim/v6-start.ts` 现在补全身份占位：优先采用本题实际可见奖励牌面，再用现有已发布牌面/牌库；升级只沿用现有实测升级定义与数值转换，未观察的文本升级仍不可用。保留已有实例计数、附魔与修改值守卫，不用基础牌面冒充升级牌面。

`sim/v6-card-results.ts` 对可打出但 `known=false` 的牌标注 `unmodelled_card:<id>`，不把空白牌送进模拟，不发布其数值；即使调用方递入旧样本，也不能覆盖此保护。基线未建模时不提供伪配对差。此类选项计为未知，安全门阈值保持不变。不可打出的诅咒不因 `known=false` 被误判为这一缺口。

## 原始输入与真实循环回归

固定输入见 `agent/tests/v6-fixtures/v6-r405-card-options.json`；包含两局四个真实帧、原文件 offset/字节数/SHA、现有牌面及敌人模型快照。夹具位于 `v6-fixtures/`，不进入旧单状态 `logged-states/*.json` 扫描。

| 原局面 | 候选牌 | 修前 | 修后 |
|---|---|---|---|
| T0TP8S9MMU9Q F2 | DODGE_AND_ROLL | cost=0, known=false | cost=1, known=true, block=4 |
| 同上 | ESCAPE_PLAN | cost=0, known=false | cost=0, known=true, block=3, draw=1 |
| 同上 | ANTICIPATE | cost=0, known=false | cost=0, known=true，既有专用效果 |
| RBMEQGXPE9Z2 F3 | PREPARED | cost=0, known=false | cost=0, known=true, draw=1 |
| 同上 | POISONED_STAB | cost=0, known=false | cost=1, known=true, damage=6 |
| 同上 | SUCKER_PUNCH | cost=0, known=false | cost=1, known=true, damage=8 |

上述数值均由既有观测牌面/模型读取，不是本次新增知识。完整前后模型见 `replay/diagnostic-summary.json`。

新回归从本地 HTTP 夹具依次返回真实 COMBAT 和 REWARD 帧，调用生产 `runLoop → v6ProjectionInputs → factory/context → V6CardResultsEngine → SerialDeckRunner → 题面 → Jev 桩 → 本地夹具动作`。不连接游戏，不执行实际动作，Jev 不发网络请求。使用实际模拟器、固定共享种子，每选项本幕 Boss 均为 n=8；两题四选项均已知，三张候选各得到三组不同的指标及配对差，无 unknown_to_brain。专门检查六张实际进入 runner 的牌都有正确费用及 known=true。

同一测试换回原两份生产文件后，两题均红灯：三张候选只有一组结果（期望 3，实际 1）。原失败及恢复 SHA 在 `checks/red-original-input/`。这不是仅检查不同缓存键，也没有人为扰动结果；不同牌在其他样本下仍可能偶然同值，不建立任意牌对必不同的全局假设。

基线 main 的 factory 与 oneshot-support 比实际 R406 更新；不能把它们暗作运输依赖。故另在自己的树暂时覆盖这两份为实际 R406 原字节，保持修复及固定回归，重跑核心 4 文件 / 18 例全过（14.66 秒），finally 恢复并核 SHA。记录在 `checks/live-context-v1/`；factory 的旧供给源与新 A 无关，此处不运输 factory、供给表或旧 805。其余所列主要上下文依赖与实际 live 原字节相同。仍不冒充完整实际 live 联合检查。

直接消费端诊断的两题总耗时约 4.70/4.77 秒；引擎 telemetry 为 4641.744/4727.853 ms，其中 preparation 580.876/527.408 ms，simulation 4054.634/4195.439 ms。该诊断受预算限制，各行 n 不同，不能把不同 n 的均值差当作配对证据。固定循环回归则各选项同为 8 样本。正式吞吐与真实 Jev 选择质量仍须上线后按原 P0 标准核验。

## 100% 死亡率的定位边界

本次已排除“起始牌组全部空白”：基线的可用起始牌费用、伤害与格挡实际存在，逐回合轨迹也有造成伤害、格挡及存活多回合。修复候选后，本幕 Boss 的这两题依然可能 death_rate=1，不能把候选物化修复称为预测质量验收通过。

这里比较的是 T0 F2 当前 56/70 HP、RBME F3 当前 47/70 HP 的当前牌组，直接打完整 F17 Boss；A 不补理想牌、不补未来成长/治疗，符合 Roy 的眼前强度定义。这不是实际 F17 完整牌组的胜负预测，也不是匹配过入口条件的 V5 精英对照。

另有明确的既存限制：合成开场把所持蛇之戒指列为 `unmodelled_relic:蛇之戒指`，其开场未进入 `FIGHT_START_RELICS`/`MODELLED_ELSEWHERE`；冻结轨迹抽牌数为 5。此处仅报告实际标签，不从游戏常识编补效果。模拟使用既有快速出牌策略（policyNodes=1500、damageScale=0.5、30 回合上限），并非实战 Jev；轨迹中还出现 Survivor 的“弃牌选择未确定”标签。上述限制可能影响结果，尚不能量化各自贡献。

例如 T0 的 TERROR_EEL 单样本并非每回合不出牌：10 回合 damage=[15,6,6,6,15,0,0,9,0,9]，hp_loss=[8,0,14,0,0,9,0,17,3,14]，最终死亡。两局实际 F8 死亡是四个 PHANTASMAL_GARDENER，不是 TERROR_EEL。Claude 所述 V5 TERROR 中位掉 21 血尚未在本项匹配同牌组/HP/进阶/开场逐回合重放，不能据此归因某一条机制。

建议 watcher 沿既有学习链核实际起手、遗物开场和弃牌选择的证据；再对同一真实入口逐回合比较模拟与实战策略。开发端本次不调整这些机制/数值，不派新学习批次，不关闭原缺口。完整轨迹保存在 `replay/outcomes-after-1.json.gz`。

## 检查与交付边界

- tsc 退出 0；最后一轮正式源码核心定向 4 文件 / 18 例通过（22.38 秒）；实际 live 两份上下文依赖定向同为 18 例通过（14.66 秒）；外围消费者定向 8 文件 / 99 例通过（12.50 秒）。均 nice19/ionice3、单 worker、主盘短 TMPDIR，无自行完整检查。
- 保留初轮夹具范围错误/升级兼容错误、修前两例红灯与所有原日志，后续绿灯不改写旧结果。`checks/` 有原日志和退出码。
- gitleaks 初轮仅误报四个冻结帧元数据 `key`（值为 run/floor/screen）；将该元数据名改为 `frame_ref`，状态与模型未改，之后重跑核心定向。原扫描保留；正式源码扫描为 0。
- 原 ops 的 RBME 旧 DPR 健康告警独立：4 个严格奖励已完成 A/B，原实耗 4255.3–4260.1 ms、本幕 Boss 每选项 n=34/26/26/42。不能称这些题未计算，不能与前台准备时间、本文固定 n=8 或 V5 n=100/request=300/minimum=300 混算；有 DPR 数值也不证明内容正确。参考主树 `paper/materials/20261021-0007-ops/` 原件。
- 正式运输只有两份运行时代码、三个测试文件与一个冻结夹具。既有 fixture-http 等依赖已在 R406；不运整 main、旧 805、知识或配置。由 ops 冻最新 live 知识和实际组合后做唯一完整检查，按原授权开局边界发布；在此前 R406 CARD=brain 不变，P0 两局稳定与 P2 前提均未满足。

原始诊断压缩包、未压缩 SHA、源脚本、帧来源与检查记录均随材料保留。`prepared-before.json.gz` 名字来自中途脚本，但实际是修后牌面；修前权威件为 `prepared-original.json.gz`，不倒填或重命名历史。
