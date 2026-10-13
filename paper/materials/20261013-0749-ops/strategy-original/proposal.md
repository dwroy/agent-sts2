# 本批静默策略提案的证据复核与处置

本批：20261013-070543-s2-strategy-proposal。角色：silent。来源任务：原提案各自的 postmortem / experience-update；本次实现任务：strategy-proposal。本文件是十项已领取提案的补充，原 Markdown、队列 id、账本和失败历史不改写，不重新登记重复 id。

结论：十项均 waiting。确定子公式和本帧诊断已有局部实现；完整后继、主动保留、复合首次触发或阈值校准仍缺本批可复核证据。没有新增生产源码、知识数据、行为参数或架构调整。Roy-2026-10-07-learning 已授权有据修改规则，本次限制来自证据，不来自审批要求。

## 身份、范围与来源

启动 HEAD 为 2cea7fb92747a7733abc64c4479d49a48dda3953，git status 干净。本批 learn.json 的 task / character / worktree / 十个 proposal_ids 与任务相符；reason=proposal，无 research_request、implementation_request 或 proposal_repair。普通专题身份文件绑定另批，不接管专题。按普通任务 fast-forward main 后，本批无改动 base 为 **5cf8cce3cb1465aac2f3a910cc5352696549d8da**。

派发十锚点：KEN58SH9SLZ6、TXZ6RVMQA09D、WQZVENQ7DTRP、02HB4L0C3C67、4D4J8USKCPAV、F4QKG4J1AJJZ、JLN5SK17W4FQ、LS8035TB32P3、NB8KCF6HRGVF、S9UZAK0JP0C0。另核原提案明确引用的五个本角色支持局：K3676LU8B0UH、SADL3CGYTGSR、1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP。runs.jsonl 均为 SILENT；K367 A1、SADL A7、F4 A9，其余 A10，各进阶现场分账。未读取其他角色知识、游戏二进制或网络资料。

流式冻结：9815 状态、9448 决策、78 SL 行、77 计划、15 配置、15 局记录，共 **19448 行**；这不是 19448 个独立样本。十份提案 Markdown 均与登记 SHA256 相符。15 段原复盘保留勘误。每条原日志均保存源行、字节偏移、长度及 SHA256，见 log-manifest.json 和各 *.index.jsonl。当前 silent 经验版本 2026-10-13.4 只作已有结论定位；新增支持局的经验摘要未冒作本批已重新观察的原始对局。

## 逐项提案、反例和缺口

| 原 CLI id | 账本 id | 本批核实的证据（局/层/回合） | 处置与需要的新数据 |
|---|---|---|---|
| silent-proposal-08eaa60bcc449852 | silent-0019、silent-0020 | KEN58SH9SLZ6 A10 F3 T2、F4 T1、F5 T2、F11 T1/T2、F15 T1共7次饮用；六胜战净损0/3/0/37/6/0，F17六试空药栏 | waiting。胜战耗药/资源链已复现；缺同入口不饮、提前饮或留到boss的完整后继，不能校准持药价。反例：F15零损仍已花两药；无药线零损未被观察。 |
| silent-proposal-92920295a648b540 | silent-0228、silent-0255 | TXZ6RVMQA09D A10 F48第2/3次T6同指纹，原线损3/扣36，替线损0/扣27；第3次首胜余4，F49开场4→0 | waiting。现行已区分首胜与续战。缺相同牌序和后继动作的连续通关对照。反例：多留3血同时少9输出，首胜也未连胜；1200模拟样本不等独立实盘或严格SL资格。 |
| silent-proposal-a327449c331efbc1 | silent-0079、silent-0018 | WQZVENQ7DTRP A10 F33第2/3次T9同指纹，损13/扣24→损22/扣39；第2/末次T7同指纹，末次少一防御、多损4且沙坑末值多1 | waiting。两线当前HP、输出、沙坑比较已有诊断。缺固定抽序/生成/后续动作的完整受控反事实及独立后移验证，不能拟伤害/血价/沙坑交换阈值。反例：多损血也可能换来额外时钟，不能统一禁攻或禁逃离。 |
| silent-proposal-a099e89437e942bb | silent-0030、silent-0257、silent-0258 | 原提案九静默局42饮：37次添3、2次添2、3次添0；WQ F33第5次T11手8→10→10→10、第6次5→8→10→10，新增均升级小刀基础6；NB8KCF6HRGVF F31 T5手5→8、SADL F8 T1手3→6 | waiting。确定生成、剩余手位和同轮穿插已有源码；原实盘也有饮药—出刀—再饮的局部序列，不能称完全没有穿插记录。仍缺计划妥当主动保留的跨轮消费者回放、复合饮药触发及完整后继收益。反例：满手续喝耗瓶却不添刀；已有同轮穿插没有本批受控整战胜线。 |
| silent-proposal-47910f82a1fdd98f | silent-0018、silent-0019、silent-0020、silent-0021、silent-0025、silent-0079、silent-0198、silent-0228、silent-0255 | TXZ A10 F43/45/46/48/49分别70→66、52→48、62→58、60→56、4→0且出牌数0；WQ F33 T7/T9双向血价见前项 | waiting。已观察组合的开场4血已有 live 实现且只对新模拟战斗扣费，不对SL恢复重复扣。整包仍缺未知回复/复活组合的中间相位和留药/SL后继对照；本批未重验旧小血瓶组合的内部顺序，不外推。 |
| silent-proposal-f1374df72d8e6a25 | silent-0019、silent-0020、silent-0050、silent-0253 | Q6M2Y34MWKRE A10 F2 T1原攻线完整损12、T3才喝敏捷；F8 T1速度建5临时敏捷，后轮不沿用；F8胜57→2、F9 T2恰耗2死；1913SE84AXQF F29胜61→46、F31入口46 | waiting。缺相同入口、相同休息/锻造及后继动作的早饮/留药整战对照，不能改HP护栏、药价或终局权重。反例：Q6 F5/F6零损留药，后来确已喝药而未弃；不能从F2未执行候选推出全局早喝必优。 |
| silent-proposal-38a49e6c97f31eea | silent-0006、silent-0011、silent-0025、silent-0044、silent-0050、silent-0064、silent-0133、silent-0253、silent-0259、silent-0261、silent-0262 | Q6 A10 F8 T4敌103→95→85→83→80，普通紧勒后攻击/完成技能各扣2；1913 F31 T2弃磨蚀建1敏/4荆棘、T3两防御12仍损5、T4三段32对6挡/20HP死亡且前段反伤后才归零；中段此前恢复25另计 | waiting。普通无挡紧勒已有源码；速度/再生等模型也不是空白。整包仍缺致死轮逐击与反伤复活中间帧、升级/重放/叠层及阈值/SL组合验证。反例：反杀不能取消已发动攻击，死前建毒雾3层没有下一轮兑现；局部贡献不证明整战得救。 |
| silent-proposal-ef0e38a5dbd3bc07 | silent-0019、silent-0020、silent-0021 | 1913 A10 F17胜余14、幕间补至58、F24实际锻造、F28回21至61、F29胜余46、F31死；Q6 F7休至57、F8胜余2、F9死 | waiting。实际节点血链已复现。缺同入口换线/休息/锻造/用药的完整后继和早建能力的兑现归属，不能拟统一血价或认定改线更优。反例：1913原计划F24回血而实际锻造，投影差额不是同条件预测误差；未来第三火未抵达。 |
| silent-proposal-7f820c02d39bfaea | silent-0079 | NHA2KW0RB7VP A10 F33首试T1损1/跨轮净扣8，第5/6次损7/净扣24，均从30血同底板出发、无一侧击杀，六试全败 | waiting。已提供预测两线和首动作回执，完整跨重规划归属仍不由单动作证明。缺同抽序受控后继及独立击杀/存活验证，不能从多16净扣、额外损6重定SL筛选门槛。反例：初案精确切击被弃后重规划，不能把第一题整线视作完整派发。 |
| silent-proposal-04b6b430759815ed | silent-0005、silent-0006、silent-0021、silent-0011、silent-0065、silent-0264、silent-0079、silent-0133、silent-0169、silent-0189、silent-0013、silent-0053、silent-0162、silent-0265 | NHA A10 F17 T1精确切击七/六/五手牌面1/3/5且实扣5，首毒5建10；F33 T1 X1萎靡建−2力/2弱，T2限定爪意图1→2；K367 A1 F30 T2首带毒刺击4→8 | waiting。限定蟹朝向取整和七手精确切击已有实现。油灯当前原始对象stack=null、无首次使用计数，本批缺首次吸收/前序负面/重规划/SL恢复消费链；其他负面、零X和升级萎靡未证。能力实际兑现组合也未整体验收。反例/边界：油灯首毒额外量不当即时血伤，旧显示1再乘1.5取整不能代实际2；不把后续每次都翻倍。 |

## 已有实现的 live 源码核验

捕获 live 为 e39ced86de2566780e324e5a2a000664dba2cb6c。以下均核 merge-base --is-ancestor 返回0，并保存该提交的实际源码字节与 SHA；这是既有子项来源，不是本批新提交，也不能代替十项整包验收。

| 子项 | 实际 live 祖先源码提交 | 核实范围 |
|---|---|---|
| 狡诈生成/手位截断、新战开场4血 | c09762601e54bfc1ef7a1a8ee50e3285a4fd1e5c | card-model限定silent A7/A9/A10；turn-solver逐步手位；silent-opening限定A10已观察组合 |
| 普通紧勒、七手精确切击、SL两线快照 | a8b1f8be153fe4f3a34146117546c2178f2e446b | 普通模板/无挡已证分支；紧勒未知升级/叠层/重放保持未知；candidate_comparison 明示 actual_turn_result=null |
| 蟹朝向取整 | f2c7cc1a7288893bceae0f0b20304a2b1fae5f57 | 当前进阶数据库第一样本起取值，A10限定增益/力量/招式窗口；不推广其他组合 |
| 首动作派发回执 | bade647f9fe4c9103b40e2f26b26296692ad24b7 | single_action_receipt；state_effect_verified=false、whole_plan_executed=null，不能当整轮执行证明 |

17份相关源码分别保存 base/live .txt；9份字节相同，8份差异仅注释署名 Roy→Dai，经逐条改行核实，原补丁保留。未宣称整个 main/live 树等价，未用当前源码还原历史 dirty 运行树。见 source-manifest.json、source-difference-classification.json、feature-ancestry.json。

## 预期行为、校准和验证方法

当前生产行为保持；本次作用是将已观察事实与未实现范围分清。后续证据必须能关联原答、覆盖、首次实际动作、重规划、整轮实际状态和下一战入口；SL恢复、真实回复、药水新获/饮用/弃置分别登记。不把候选或MC样本当受控实打，不将多次SL拆成独立局。

确定机制用这些冻结原帧及原决策作固定夹具；若仍有源码缺口，只在本角色已证分支实现、未知组合保持未知。价值参数须先隔离机制误差，较早独立局拟合，较晚独立局按时间留出验证；本批仅是发现/复核集，不同时用它拟合又报样本外收益。需要完整后继的项目等可比较新局再派，零反例或高n本身不补齐缺失消费/反事实。

预期影响：仅提高本批提案与证据/源码范围的可追溯性，没有已测胜率或行为收益。没有源码可回退；如后续实现，再以各单项提交回退，不改原日志、旧经验或并行刷新。铁甲和其他角色未作任何行为改动。

## 验证与历史保留

未改生产源码，不运行 tsc/vitest、未做撤源码负对照；三项 tests 均 null。原日志算术核验与SHA核验不计为生产测试。工具初读队列仅取末行update的错误已改用原生fold；不存在的 sim/rollout*.ts 和 src/loop.ts 定位失败保留。证据验证初版因端点切片未含T7而StopIteration，改为读取完整冻结状态；第二、三版注释分类分别未涵盖行末注释和单行块注释而失败，最后逐改行核注释部分。三版源码材料及失败日志均保留，不作为生产bug。全文总结与CLI链接见 report.md；十项最终处置由本批 JSON 逐项回报，队列仍等新证据。
