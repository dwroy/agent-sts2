# 策略学习报告

本批10项完整提案均保留waiting。确定子项已有真实live祖先源码；其余范围缺首次消费状态、完整受控后继或独立验证，未改策略。

## 身份、材料与限制

时间：2026-10-13T04:32:33+08:00。批次20261013-041242-s2-strategy-proposal，角色silent，reason=proposal；只处理派来的10个id，不带research_request、implementation_request或proposal_repair。普通专题请求绑定另一旧批/树，不承接、不读其他专题。启动树干净，初始HEAD39f5d913477d2d3ec1834388f66c1793c3feb48b；按普通任务要求merge main成功快进，完整工作基线/report.base为`6a4a4e1f171df830903d5fe60b6511ff11983e3b`。之后没有源码、知识或跟踪记录提交，HEAD保持此base。

锚点仅本批10局；另5局K3676LU8B0UH、SADL3CGYTGSR、1913SE84AXQF、Q6M2Y34MWKRE、NHA2KW0RB7VP均来自本批提案保存的证据链接。15局均核runs.jsonl为silent，各自已观察进阶保留。只分析这些局，本批不声称覆盖全部历史、量化父要求完成、已学习入库或大脑自然采用。

原始材料共19433行：states9815、decisions9448、sl-attempts78、run-plans77、run-config15。raw-evidence-index.json包含每行源文件、字节偏移/长度及SHA256；19433行均已从只读logs按偏移重读核验。状态按6局已有冻结起止范围（计数精确相同）及其余9局决策时间界限±300秒抽取，保留角色检查。26项关联经验从本树knowledge/characters/silent/experience.json只读保存，版本2026-10-13.3；不读别的角色经验。

初轮run-plans筛选用了run_id，0行；识别该文件字段为run后补核77行，原evidence-collection.log保留。油灯初筛4/5毒及X1只得到16窗；扩筛含7毒得到18窗，两次预期17断言失败，随后按原可识别范围17窗加1个制品/前序负面排除保存，原稿/失败保留。临时审计错误不记作生产代码失败，旧报告/旧提案/旧复盘没有重写。

固定数值复算与原日志SHA核验已完成；源码撤除失败/恢复通过不适用。tsc/vitest/cases均null（未运行），没有新commit、live合入、eval版本或shipped。gitleaks已对本批材料实际扫描通过，见gitleaks.log/gitleaks-report.json；不将密钥扫描称作玩法测试。

## 逐项结果

| 提案 id | 原证据局 | 既有账本 | 整项处置与具体缺口 |
|---|---|---|---|
| silent-proposal-08eaa60bcc449852 | KEN58SH9SLZ6 | silent-0019、silent-0020 | waiting：KEN F15零损已花两药；缺同入口不饮药及留药到boss的完整后继对照，不能校准持有价或统一留药阈值。 |
| silent-proposal-92920295a648b540 | TXZ6RVMQA09D | silent-0228、silent-0255 | waiting：已有连战与候选资源审计；TXZ F48 T6少损3同时少伤9，后续抽序/动作改变，首胜4血仍F49开场死亡；缺受控连续通关对照。 |
| silent-proposal-a327449c331efbc1 | WQZVENQ7DTRP | silent-0079、silent-0018 | waiting：已有血价/伤害/沙坑预测比较；WQ同盘多15伤付9血，延长沙坑一轮另付4血，六尝试皆未通关；缺完整受控后继及独立后移验证。 |
| silent-proposal-a099e89437e942bb | 02HB4L0C3C67、4D4J8USKCPAV、F4QKG4J1AJJZ、JLN5SK17W4FQ、LS8035TB32P3、NB8KCF6HRGVF、S9UZAK0JP0C0、SADL3CGYTGSR、WQZVENQ7DTRP | silent-0030、silent-0257、silent-0258 | waiting：狡诈药水同轮3/2/0生成与出刀穿插已有live实现；完整提案仍缺计划妥当跨轮主动保留选择、复合饮药触发与完整后继验证。 |
| silent-proposal-47910f82a1fdd98f | TXZ6RVMQA09D、WQZVENQ7DTRP | silent-0018、silent-0019、silent-0020、silent-0021、silent-0025、silent-0079、silent-0198、silent-0228、silent-0255 | waiting：王室猛毒已观察组合开场4血子项已有live实现；缺未知回复/复活组合中间相位及SL血价、留药的完整后继，不能关闭资源/SL整项。 |
| silent-proposal-f1374df72d8e6a25 | 1913SE84AXQF、Q6M2Y34MWKRE | silent-0019、silent-0020、silent-0050、silent-0253 | waiting：1913和Q6实际资源链已核；缺同入口早饮/留药及相同营火条件下的整战对照，不能调整高血护栏、持药价或终局权重。 |
| silent-proposal-38a49e6c97f31eea | 1913SE84AXQF、Q6M2Y34MWKRE | silent-0006、silent-0011、silent-0025、silent-0044、silent-0050、silent-0064、silent-0133、silent-0253、silent-0259、silent-0261、silent-0262 | waiting：普通紧勒确定子项已有live实现；机制整包仍缺致死轮逐击/反伤复活中间帧、叠层重放及阈值SL组合的完整验证。 |
| silent-proposal-ef0e38a5dbd3bc07 | 1913SE84AXQF、Q6M2Y34MWKRE | silent-0019、silent-0020、silent-0021 | waiting：Q6休21后精英胜留2血仍下战死，1913锻造条件改变、F31实入46；缺同入口换线/休息锻造/用药的完整后继对照，不能拟统一血价。 |
| silent-proposal-7f820c02d39bfaea | NHA2KW0RB7VP | silent-0079 | waiting：SL候选资源审计已存在；NHA替线多损6血、多16净伤且未杀一侧，六尝试全败；缺同抽序受控后继、击杀/存活推进及独立胜负样本。 |
| silent-proposal-04b6b430759815ed | NHA2KW0RB7VP、K3676LU8B0UH、SADL3CGYTGSR | silent-0005、silent-0006、silent-0021、silent-0011、silent-0065、silent-0264、silent-0079、silent-0133、silent-0169、silent-0189、silent-0013、silent-0053、silent-0162、silent-0265 | waiting：七手精确切击和限定蟹取整已有live源码；油灯17直接窗口stack均null，另1制品/前序负面窗口不能确定消费时点；缺跨重规划/SL恢复可识别首次消费状态及能力兑现组合。 |

## 已核对局证据与反例

1. **赢战与真实回血**：KEN58SH9SLZ6 A10 F2/3/4/5/11/15六个赢战净损0/3/0/37/6/0，共46。F15零损对应T1两次实际饮药，不能作未饮也零损。F12由26/76→53/81实补27，F16由46/81→75/86实补29，HP与上限分别记。F17六次入口与药栏、SL复原独立保存，不把复原当路线回复。账本silent-0019/0020。证据文件：ken-winning-resources.json、resource-chains.json、原始decisions/states/sl-attempts。
2. **首boss胜与连续通关**：TXZ6RVMQA09D A10 F48第2/3次T6均48血、敌460；随后分别45血/敌424及48血/敌433，实际损3/0、扣36/27。第3次T10首胜4血，F49出牌前4→0、敌111未受伤、cards_played=0、无可操作帧。F43/45/46/48/49五次开场70→66、52→48、62→58、60→56、4→0均已核。后轮抽牌和生成不同，三试算同一局；不认为多保3血已使整局更好。账本silent-0228/0255及相关资源账本。
3. **SL血价的两侧边界**：WQZVENQ7DTRP A10 F33第2/3次T9均26血、敌184，同题指纹；T10分别13/4血、敌160/145，即损13/22、扣24/39，多15伤付9血。末次T7与第2/3次均同扣24，但从0损变4损，沙坑末值4→5；延时和承伤不能互相抹掉。六试全败，末T11攻击和沙坑的内部致死先后未知。账本silent-0079/0018。验证只核实差额，不从全败、五轮饱和或1200样本0胜拟固定血价或放宽必死/SL。
4. **狡诈容量**：本批逐动作复核9局42饮，37次足够空位各添3、两次八手添2、三次十手添0，新增均升级小刀/基础Damage6。WQ第5/6次F33 T11分别2/0/0和3/2/0；满手仍耗药，生成前后HP/能量不变。实际12/30刀伤与整战胜负分开。各局实际进阶已按runs.jsonl核对：SAD为A7、F4QKG4J1AJJZ为A9，其余相关容量局A10；不把F4旧说明中的A10写法带入本批。账本silent-0030/0257/0258，cunning-verified.json保存42个前后帧与原日志偏移/SHA。没有跨轮主动保留、所有复合药效及穿插后完整胜局，仍不关闭整项。
5. **饱和SL替线**：NHA2KW0RB7VP A10 F33第1—4次T1到T2为30→29、敌总408→400；第5/6次30→23、敌408→384，即多损6血、多16净扣，两侧仍活。抱抱先生次轮自动伤和牌伤不能混成单卡实伤。六试全败；第5/6次重放不是两个独立成功样本。账本silent-0079。
6. **普通紧勒与兑现时点**：Q6M2Y34MWKRE A10 F8 T4敌103→95→85→85（弃牌未完成）→83→80（轮间毒），完整扣23、玩家34→33。ordinary STRANGLE/后续技能触发的确定子项已有源码；升级、叠层、重放、有挡/反伤等仍未据这些帧外推。1913SE84AXQF F31 T4毒雾3已建，玩家死亡，无下一轮补毒；能力拥有/已建/实际兑现分列。账本silent-0261及宽机制包账本。
7. **实际下一战入口**：1913 A10 F17胜后14，F24锻造保持40、F28实际休21至61、F29胜后46、F31入口46；Q6 A10 F2胜56→44、F3事件付8、F5/F6零损、F7休21至57、F8赢后2、F9入口2并T2死。Q6已喝药/休息，不用败局倒推它拒绝回血；1913计划后来改锻造，不能当同条件预测误差。账本silent-0019/0020/0021/0050/0253。路线源码把未来营火回复标为条件投影且注明锻造无回复；缺实际未走路线或未执行用药的后继对照。
8. **油灯及条件范围**：K3676LU8B0UH A1 F30 T2带毒刺击4→8、SADL3CGYTGSR A7 F45 T1毒药5→10、NHA A10 F17 T1毒药5→10、F33六次T1普通X1萎靡−2力/2弱等17直接窗口（3独立局），触发前后relic.stack均null。NHA F15 T2升级毒药7→14也在17窗内。另保存SAD F48 T2升级毒药7→14窗口：此前已有突然一拳、萎靡、中和等及制品互作，不能由倍数推定首次消费顺序；不当独立首次机制支持或反例，保留为条件限制。83个候选动作窗不等于83个支持窗或83局。账本silent-0265。七手精确切击和蟹−2力/弱下朝向1→2取整已由既有live实现；本批不重复发布。

## 已存在子项的真实live源码与消费者

核验现场live HEAD：`9a411a54cfad66e4abdea2df71877e73b9e2c924`。下列三个提交都已核为该HEAD祖先；仅列已有子项，不给完整宽提案登记duplicate/implemented：

- `beaff15009b254fbc86b026be2fbe050226d56d5`：silent-opening.ts按已观察伴生组合返回开场4血；boss-start.ts和double-boss-start.ts接到新战/连战入口，实时T1及SL存档不重复扣。未知回复/复活或其他组合保留未知路径。
- `a8b1f8be153fe4f3a34146117546c2178f2e446b`：card-model/combat-plan/turn-solver的静默狡诈生成/容量、普通紧勒、七手精确切击，以及silent-sl-comparison和silent-sl-resource-comparison；combat-plan在新替线和重放路径调用比较，明确预测/实际执行边界。已有固定测试源码仅作覆盖审阅，本批未运行测试。
- `f2c7cc1a7288893bceae0f0b20304a2b1fae5f57`：silent-crusher-facing.ts与combat-plan/turn-solver/rollout的限定朝向取整接线，按当前进阶数据库读基础值，从已观察分支首样本使用；不推广其他进阶/力量/招式。

source-audit.json逐文件保存本批基线/live SHA与历史。部分大文件的main/live全文不同，未冒称整树相同；只读live原文保存在live-*.source.txt，并核上述实际子项。新合入、消费者自然采用和收益均不由这次源码审阅证明。

## 预期行为、验证方法与后续样本

保持既有确定子项和未证分支。已存在的SL比较仅是同题模型预测，原答取护栏之后/SL之前；随机药中位线、缺线、抽牌和重新规划均有不确定说明，不等于完整实际执行或收益。未来验证分别保存原答、替线、执行与退出帧。

机制缺口先用固定本角色帧核公式与逐步时点；首次消费状态需要在实际重规划、换战及SL恢复时可识别，不以持有油灯或stack=null猜已消费/未消费。资源价/SL阈值/终局权重若继续研究，需较早独立局训练、较晚本角色完局留出，并按run分组，不能把SL尝试、相关帧或rollout样本拆成独立验证。至少补同入口、同后继条件的早饮/留药或攻防选择全链；没有这些对照，就保留waiting及本批具体缺口。

本批没有拟合新阈值、规则或代码实现。预期影响为证据与提案可追溯，未证明提高胜率；没有新实现需回退。以后实现按独立提交、撤源码失败/恢复通过、沙箱检查、live刷新冲突预检及实际发布双通知执行；不提前记成功。

## 运维交付

提案：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-041242-s2/learner/runs/20261013-041303-strategy-proposal/proposal.md`。报告：`/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261013-041242-s2/learner/runs/20261013-041303-strategy-proposal/report.md`。逐项机器结果见result.json/proposal-results.json。31条既有账本仅通过根ledger CLI补本批报告链接和waiting说明；不降级旧经验shipped、不改claim、不重复追加复盘、不另建提案id。CLI执行原输入及回执保留ledger-updates.jsonl/ledger-update.log，最终状态核验见final-verification.json。完整提案继续等待后续本角色完局重派，局部已实现不关闭父项。
