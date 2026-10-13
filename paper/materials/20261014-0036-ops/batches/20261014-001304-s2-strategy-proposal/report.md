# 静默猎手本批策略消费报告


记录时间：2026-10-14T00:28:26+08:00（写入前已运行date）。批次：20261014-001304-s2-strategy-proposal。


十项均waiting。已核机制子项与原资源事实保留；没有足以完成原宽提案的新策略实现。没有源码/知识/任务模板修改、提交、live合入或行为版本。


report.base：`8c4d23c1813c531944131bbf28c8177d2c44f933`；git status开工干净，git merge --no-edit main返回Already up to date，报告前HEAD仍等于该完整提交。


## 身份及范围


根learn.json本行task=strategy-proposal、character=silent、reason=proposal、running、工作树一致，proposal_ids恰为本报告十项；无research_request、implementation_request或proposal_repair。普通专题文件绑定另一旧批，因此不承接该专题、不读取其他专题输入、不扩展队列。

已读README、STATE-2026-10-12、decision-log末尾、learning-protocol、learning-code-proposals；fix-queue只查本批狡诈子链。全部原提案Markdown存在且SHA256与专用队列相等。

runs为本批十个派发锚点。原提案明确引用的补充局为SADL3CGYTGSR(A7)、K3676LU8B0UH(A1)、1913SE84AXQF(A10)、Q6M2Y34MWKRE(A10)、NHA2KW0RB7VP(A10)，均在runs.jsonl核为SILENT；F4QKG4J1AJJZ为A9，其余九锚点A10。不读取其他角色知识，不把这15局冒称全历史，也不重算旧提案的105/109局统计。


## 证据与实际消费者


直接以时间索引读取只读logs/states.jsonl，共9815个本角色状态；observed-states.json保存原字节偏移和逐帧SHA256。五份原复盘冻结输入共2788个状态与2638个决策逐对象回查原logs一致；排除三条无decision_id元数据，保留真实原行号，见consumer-input-receipt.json和original-decision-verification.json。

固定证据核验129项通过，其中包括狡诈42饮容量、七药消耗跨选牌屏幕、两次休息回复、王室猛毒五次开场、TXZ/WQ成对血价、NHA六试以及原字节SHA读回。这里只核观测和算术，不能填成tsc/vitest或撤源码验证成功。

执行现有learner/audit-selection.ts五次，均返回0，使用冻结局面，不读刷新的知识JSON、不调用LLM或网络。共444个整轮窗口：118个observed_turn_endpoints、326个unknown，未知原因原样保留。

| 局号 | 动作 | 整轮窗口 | 可核端点 | 未知 | 消费器退出码 |
|---|---:|---:|---:|---:|---:|
| TXZ6RVMQA09D | 762 | 135 | 29 | 106 | 0 |
| WQZVENQ7DTRP | 766 | 127 | 63 | 64 | 0 |
| NHA2KW0RB7VP | 584 | 96 | 20 | 76 | 0 |
| Q6M2Y34MWKRE | 130 | 21 | 0 | 21 | 0 |
| 1913SE84AXQF | 396 | 65 | 6 | 59 | 0 |


TXZ F48第二/三试T6与WQ F33第二/三试T9的消费者端点及连续路径已核，完整候选结果仍null。NHA F33六试T1都是turn_opening_unverified；Q6全部21个窗口也是开场未核，不能把命令退出0冒作所有窗口已验证。选择/弃牌/生成/重问后的实际动作需分别追溯，不把整轮净变化都归原候选。

因既有消费者已提供端点审计，本批不重复实现工具；这些读回没有校准SL门槛、持药价或终局权重，也没有证实自然大脑采用/收益。


## 逐项处置


| 原提案ID | 状态 | 具体原因 |
|---|---|---|
| silent-proposal-08eaa60bcc449852 | waiting | KEN七次实饮、两次真实回复已核；缺同入口同后继的不饮/早饮/留至boss整战对照，不能校准持药价值。 |
| silent-proposal-92920295a648b540 | waiting | TXZ T6整轮端点已读回为损3/伤36与损0/伤27；后续牌序改变，缺两战通关对照，完整候选因果仍未知，不能改SL或终局权重。 |
| silent-proposal-a327449c331efbc1 | waiting | WQ同盘多15伤付9血及T7付4血延长沙坑一轮已核；缺固定后继和独立存活验证，不能拟统一交换阈值或放宽必死SL。 |
| silent-proposal-a099e89437e942bb | waiting | 狡诈42次容量及现有live子项已核；计划妥当主动选留、复合生成/弃牌/重问和SL恢复后的完整消费者未验收，不能将子项当整包完成。 |
| silent-proposal-47910f82a1fdd98f | waiting | 王室猛毒五次开场扣4及连战入口已有live实现；仍缺留药整战对照、受控SL后继和未知回血/复活组合相位证据。 |
| silent-proposal-f1374df72d8e6a25 | waiting | Q6早饮候选没有完整实打对照，原审计整轮边界全部unknown；1913实际锻造改变路线条件，缺同入口后继对照，不能改药价或HP护栏。 |
| silent-proposal-38a49e6c97f31eea | waiting | 普通紧勒限定公式已有live；再生/荆棘/重接/阈值与SL联合后继尚无本包完整消费者验收和受控比较，不能整包关闭。 |
| silent-proposal-ef0e38a5dbd3bc07 | waiting | 1913锻造/休息与Q6胜后2血接走廊资源链已核；缺受控换线/休息/用药完整后继及能力收益归属，两条失败链不能拟统一血价。 |
| silent-proposal-7f820c02d39bfaea | waiting | 现有SL候选与动作/整轮审计已读回，但NHA六试T1均turn_opening_unverified，完整候选结果为null；缺固定后继和独立存活验证，不改饱和筛选门槛。 |
| silent-proposal-04b6b430759815ed | waiting | 精确切击与蟹朝向限定子项已有live；油灯缺可靠首次使用状态及制品吸收/前序负面/重问/SL恢复联合消费者验证，未知不能当首次。 |


逐项局号/层/回合、账本、原文SHA、反例、旧规则、新行为限制、验证/时间切分及回退在proposal.md完整保存。


## 已有live覆盖及未实现边界


实际只读live截点：`7e04d9a42dd6080a8d3716dd165e44d4b30c458d`。以下均核为该HEAD祖先，代码直接读回；只说明已有子项，不能关闭整个原ID：

- 狡诈模型与容量：6403fdcdadc803a092beb5165a068e22bf51c412。另一路15ea09ad75a421d4bd65a820c187c8ee188186c8不是该live祖先，不用于实现证明。

- 普通紧勒限定链：5c7105ff0294466da8319f2934beda05c6040794。

- 无小血瓶王室猛毒限定开场：e8b4bb320ae3068db5ebb6ce8c6fa91a9689178a。旧fc7042d1df0626e9e726f4bc912d9c6f626d908f不是该live祖先，不作证明。

- SL候选资源预测/比较/动作回执：5604982e13890e0e2bc8bf8246272e8267321c0b、c769739b97389fdc978b6515b83a38e3cd900f67、fdaf787a372880b0438e73bcac7e6d2168b038ed。整轮离线审计：c719bc048fa848119f217ba0e966aac7e2671ddf。源码分别明确预测、单动作回执和端点，不认证完整候选因果。

- 七手精确切击：75a27fb2c230dc552761b2ad9da4be8a9a35dec3；蟹朝向限定取整：ec29ea34b919344b707e57ba472ea210f9c39d62。油灯首次/未知组合仍不补规则。

live-coverage.json保存祖先检查和文件SHA。主树与live的card-model/combat-plan整文件SHA不同，不声称全树等价；已核开场、朝向和SL比较专用模块SHA相同。铁甲及所有角色的行为本批均未改变。


## 账本与验证口径


仅经根learner/ledger.py update为31个既有silent账本追加by/where/note追溯链接；未新建提案或账本ID，不改已有claim/evidence/first_run/status/version/effect，不把shipped降级为proposed，不代运维登记shipped。CLI输入和回执保留在本批目录。

无生产代码修改：tsc=null、vitest=null、cases=null；未执行撤源码/恢复测试、源码提交、gitleaks提交前扫描或合入测试，不制造成功0、merged或eval版本。129项固定观测核验及五次消费者退出0单独列明。所有临时脚本只在本批ignored材料目录，工作树保持干净。

初次读取WQ带原行号前缀的抽取文件时发生JSON Extra data格式错误，随后按冒号拆出原行号并读取；没有写生产文件，失败说明保留inspection-format-error.txt。没有把它当源码失败，也没有删除原失败/原日志。


## 后续缺数据


继续保留这十个原ID等待本角色新局：需要相同入口和后继的用药/留药完整对照、SL替线后的完整两战/存活证据、跨主动选留/复合触发消费者、油灯首次与未知回血/复活相位。按独立run和时间向前验证；失败尝试仍留同组，不用饱和模拟、候选数字或局部已修机械关闭父要求。经验入库与大脑采用交原后续流程，本批没有新入库声明。
