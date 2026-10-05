# 静默猎手策略提案：未校准时钟先给可观察的 boss 事实

记录时间：2026-10-05 13:22 CST（写入前已执行 date）。基线 main；合入 main 后的工作树基线 1b5e17305ab061296268defa5ba4dd24c3b0aa7e。十个指定来源局的 runs.jsonl 均为 SILENT：E6AVMMVCSRPC、XYYQYBRM2A01、K3676LU8B0UH 为 A1；CSBR5CRDWQNB、ZZMYZ5UBCG72 为 A2；10GPK5XGHCK3 为 A3；1NZ8FE5F34R9、F9PP859XZ3RJ、9YBKCNBFP0X5、1LMBFGSMCWKU 为 A4。没有借用其他角色知识，没有派下级 agent。

## 选择与范围

选择 fix-queue-v4.md 第284—285行的「boss 时钟校准与样本门槛」中的事实供给子项。既有账本 silent-0003 已确立本角色尚未校准，不能借用旧角色构筑拟合；本项不恢复拟合，而是让构筑、路线和休息题可以先比较已观察的本体血量和攻击参考。所有选项保留，取舍仍交大脑，战斗仍交 Jev。

当前 bossClockJson 的未校准分支调用 bossHp，女王有数据时把数据库400加旧补量60、无数据时回退手设460，并把结果命名为 boss_hp。未校准分支同时不输出已有的数据库攻击。旧补量不是本角色当前进阶的本体血量，不应成为构筑参考中的既定需伤。

## 证据与既有账本

| 局号 | 层 / 回合 | 证据 | 关联账本 |
|---|---|---|---|
| ZZMYZ5UBCG72 A2 | F34，路线题无战斗回合；F48 T1 | brain.jsonl 2026-10-04T23:22:47.131Z event/act-plan 的 act_boss_clock 为 QUEEN、boss_hp=460、来源hand-set；复盘记录实战女王400、聚合体199。 | silent-0003（既有角色时钟隔离） |
| 9YBKCNBFP0X5 A4 | F34，路线题无战斗回合；F48 T1 | brain.jsonl 2026-10-05T02:29:43.981Z 的 act_boss_clock 为460，标记A4未记录而借A2；复盘记录实战女王400、聚合体199。 | silent-0003；silent-0079仅涉及另一个未实现的饱和死亡问题 |
| 1LMBFGSMCWKU A4 | F48 T1 / T6 / T9 | states.jsonl 03:33:25.613Z 两敌max_hp为400/199；聚合体 STRONG_TACKLE_MOVE 为26×1、身上只有爪牙；T6女王现场5×5=25，T9现场10×5=50。同名招式现场伤害不能当成不受增减益影响的基础伤害。 | silent-0003（事实/构筑估值边界）；本次另登记独立 proposed 条目 |
| CSBR5CRDWQNB A2 | F33 T1 | 复盘首段及记录：火箭199、碾碎爪209，两个本体。固定夹具验证完整时408，缺任一已观测部位时不把剩余部位冒充整体。 | silent-0098（本次提案） |

原始结构化证据节选保存于本目录 clock-evidence.json、queen-state-evidence.json；只抽取指定静默局。共同怪物数据库仅读取已观测数值，不修改数据，不使用预训练游戏知识补规则。

## 反例与限制

ZZMYZ5UBCG72 在聚合体仍活着时毒杀女王；1LMBFGSMCWKU 先杀聚合体再毒杀女王。两种均获胜，9YBKCNBFP0X5 两敌未死而失败，没有同盘面顺序对照，不能规定固定先杀谁。因此本体400与聚合体199分列，不把599当作每条线必需的总伤害，也不声称400是含回血、格挡及阶段转换的完整战斗代价。

女王T6的25与T9的50是不同增减益下的现场攻击；缺基础样本时以 shown 标识，不能冒充base。攻击列表不是招式顺序预测，不计算存活回合。未观测进阶仍沿用现有数据库的邻近进阶估计，显式标来源与estimated；完全无观测时未知。实验体只使用本角色已观测、已去SL重复的阶段，不用第一阶段血量代替总血量。

## 预期行为与实现

只改变 silent 的未校准时钟事实：从共同怪物数据库按当前进阶读本体血量与每个敌人的攻击，第一样本即启用，标进阶、样本、估计及base/shown。女王有400样本时显示400；没有任何观测时显示null，而非460。缺本体的多部位boss不把已知部分冒充完整血量。实验体显示已观测阶段的总和。回血、格挡和未验证旧补量不加在 boss_hp 上。

当前进阶有base时优先base；只观测到shown时，优先该当前样本而非旧进阶base。当前进阶都没有时借用距离较近的进阶，明确来源及估计；来源距离相同才优先base。复查固定夹具加入数据库已观测的A2女王base3后，首版有2例失败，修正后通过，保留 asc-priority-red.log，未将首版结果冒充最终验证。

构筑输出、玩家掉血、存活回合及缺口继续为null。没有改牌值、排名、选项、药水代价或使用规则，没有改SL、保血、休息与路线策略。房间代价仍保留5样本门槛。改动位于 agent/src/sim/boss-clock.ts；铁甲及其他角色代码分支保持等价。没有新增架构或生成脚本改动，无需重建数据。

## 验证

agent/tests/silent-boss-facts.test.ts 用固定观测夹具，显式 setMonsterDbForTests，完全不读刷新知识JSON、不调LLM或网络。验证女王400/聚合体199分列、当前A4一条观测优先于旧A2遭遇记录、base26与shown10×5区分、借进阶显式标估计、无数据为未知、实验体阶段600、房间4样本拒绝而5样本接受、原校准角色仍返回460。

首轮撤源码：回到合并main后原 boss-clock.ts，新测试5失败/1通过，退出1（facts-red.log、facts-red.exit）。恢复源码：6通过，退出0（facts-restored.log、facts-restored.exit）。相关旧时钟/阶段回归连同新测试3文件13例通过（facts-green.log）。首轮完整沙箱tsc0、vitest169文件1960例及单fork paths 11例通过，总1971例、入口退出0，无超时重跑。

最终增加旧进阶base与当前shown优先级、完整/缺失双部位夹具。撤最终源码：新测试7失败/1通过，退出1（facts-final-red.log/.exit）；恢复后新测试8例与旧回归7例共3文件15例通过、退出0（facts-final-restored.log/.exit）。本轮源码发生修正，重新跑提交前固定沙箱，不沿用首轮结果；最终结果待回填。

## 未实现项

保血/全死排序/SL饱和换线：silent-0079 的1NZ8FE5F34R9 F29 T1和9YBKCNBFP0X5 F48第4/6次T7确认多损8血的真实代价，但两条线都失败；不足以指定新的全局保血/进攻权重。

巨兽拖延、路线/休息取舍、固定击杀顺序、SL范围：现有复盘保留观察，缺少同局面受控胜负对照或新阈值依据，本批不写代码规则。完整boss构筑输出/玩家损血校准：本次指定局面没有可用的时钟估伤与实打受控对照，不从净扣血总量回填构筑模型。留药/提前喝药与药水过滤不符合本任务边界，不实现。

## 登记与上线

独立提案 silent-0098 已经项目根 learner/ledger.py add 登记，status=proposed、by=learner:strategy-proposal；源码提交、合入与版本以及完整检查结果将在完成后追加。实际上线后由运维核实再登记shipped。关联 silent-0003 的历史状态不改，不将本项称为完整boss时钟校准。

### 完成回报（2026-10-05 13:33 CST，写入前已执行 date）

独立源码提交：79f7579e29e39e1dcae9e1ea3bdceb53bf9a734b，英文提交信息列明四个证据局与 silent-0098、既有 silent-0003。最终提交前沙箱入口退出0：tsc0、vitest169文件1962例，单fork paths1文件11例，共170文件1973例通过；日志 source-final-suite.log/.exit。没有高负载超时重跑；重新跑完整检查是因为修正了当前进阶shown优先级。gitleaks两次staged扫描均无泄露，日志 gitleaks-source-final.log。

合入受阻：在 flock ops/live-merge.lock 锁内等待构建器后检查，live无未提交刷新数据，知识重叠4个路径、内容不同0个，保留live独有的outcome-stats/room-costs刷新。固定源码 merge-tree 预检只有 paper/materials/decision-log.md 内容冲突（main侧追加运维归档历史、live侧追加事件传输上线记录）。按任务冲突停止要求停止，live-merge.sh退出23；没有运行实际git merge，没有MERGE_HEAD、没有回退或覆盖刷新数据。详情 live-knowledge-overlap.json、live-merge-preview.log、live-merge.log/.exit。

本项未合入live，合后检查未运行；未新增eval版本或上线记录，也不登记shipped。固定代码与 proposal.md 路径交运维兜底合入；交接见 handoff-ops.md。实际上线后再记录版本、补合后沙箱和外部完整套件，并由运维登记silent-0098 shipped。


## 运维兜底上线归档（2026-10-05 13:40 CST）

strategy-done 批次20261005-131301，学习者预检decision-log冲突而未合入。固定源码79f7579e29e39e1dcae9e1ea3bdceb53bf9a734b，live合前42ac6c1d52b8909b9ae292a7d236ffd80351614c、实际合入76c82f8dc87e8f0fdd2bc822b18b5d2f5052b6bc、发布6a16980e431c72529c909a5314e0da3172835d1e、eval S1.strategy1，固定发布树b23dc85fd612cd2ee1e4526953b795d58176f05b。锁内仅解双方记录冲突，保留所有知识刷新blob；无生成器改动，不重建。合后固定沙箱tsc0、170文件1973例通过，日志/tmp/sts2-1335-live-sandbox.log，未超时或重跑。源撤最终源码7失败/恢复15通过，源码最终沙箱170文件1973例通过；只转录学习者证据和限制，不另设审核或新增玩法。

main同步固定已测发布，代码/版本/知识逐路径一致；经learner/ledger.py/by=ops登记silent-0098 shipped，归档本条3行proposed历史及1行shipped，98项0问题。既有0003不重复登记，完整时钟构筑/损血/存活回合校准仍未知。完整沙箱外检查通过learner-recheck 20261005-131301-strategy-proposal动作请求，结果待后续learner-checks事件核实，不在本轮等待结果、不改原回报merged=null。

原始提案、交接和失败预检保留在learner/runs/20261005-131301-strategy-proposal/；无新的Dai待定事项，不改对局配置或停止对局。
