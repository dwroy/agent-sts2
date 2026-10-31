# Silent 单牌第2单元：候选报告

固定20卡完成：新增10个描述性情境、10条文字策略与10条rk标签候选；旧情境更新/逐字节复用均0。两组各100独立局的效果比较0；正式发布、生产读回和自然采用均0，全部仅scratch/pending。

冻结身份全部核同：HEAD=`cf2460be8d7f099875e2a8f4a933045fde6c9da1`；learn.json本批external_source、external_binding、manifest/work_spec大小与SHA相同。#54的3 manifest+129数据文件=132项、原11分片、20卡选择和旧覆盖索引均核SHA。历史材料直接按冻结路径读主项目，未展开额外工作树副本；未读外部原库/玩家数据、未下载、未运行模型/游戏/模拟器。

## 本批产物与计数

固定20卡，10个真实新情境；每个同产文字策略和描述性rk标签。其余10张并入同批情境，不计别名/额外情境。旧211311及090927没有固定20卡交集，正式库的相关战斗/商店/成型条目保留原ID，详见scratch/dedup-audit.json。

每个分层拿/改选效果组均未达到两组各100独立局，允许发布的效果比较为0；侧步外部A1/A2仅两组各≥100取得牌次，独立局并集未知，不能冒称过独立局门。以下为有界的描述性比较候选，不给固定拿牌命令，不作为验证过的卡值/因果收益。

## 逐情境

所有文字以真实奖励牌文、完整备选与已持牌/资源代理为主证据；外部仅作方向对照。正式正文均≤1200 UTF-8字节。

### silent-b002-next-turn-resources

卡：SIDESTEP, PREDATOR。

奖励比较侧步和猎杀者时，先区分延迟能量与延迟抽牌。原牌文侧步0费、下回合得1能；猎杀者2费、15伤并下回合抽2。已有猎杀者仍拿侧步的原例与跳过侧步的原例都存在。把已有来源和费用纳入比较，不把下回合资源当本回合防护；升级及重放按现场牌文另核。

SIDESTEP自有A10无重试证据首机会：拿0/0、改选1/22终胜，差不可算；稀疏未过100门。

外部SIDESTEP v0.111幕2比幕1的终胜关联+17.31pp（59/133 vs 33/122牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-next-turn-resources`；rk `silent-rk-b002-next-turn-resources`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-skill-discount-and-draw-lock

卡：POUNCE, BULLET_TIME。

奖励出现猛扑或子弹时间时，核已有技能费用与抽牌需求。猛扑原文2费14伤、下一张技能变0费；子弹时间3费、本回合手牌免费但不能再抽牌。一次技能减费与全手牌减费的对象及限制不同；尚无未来手牌与出牌线就保留未知，不能只按原费用之和判必拿。

POUNCE自有A10无重试证据首机会：拿0/4、改选1/27终胜，差-3.70pp；稀疏未过100门。

外部POUNCE v0.111幕2比幕1的终胜关联+1.63pp（15/45 vs 52/164牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-skill-discount-and-draw-lock`；rk `silent-rk-b002-skill-discount-and-draw-lock`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-three-count-dependent-attacks

卡：FINISHER, PRECISE_CUT, FLECHETTES。

奖励出现终结技、精确切击或飞镖时，分别检查构筑可能提供的计数。终结技按本回合已打攻击次数、每次6伤；精确切击0费13伤、每张手牌减2；飞镖按手中技能、每张5伤。不能用牌组总张数替代这三种战斗时计数；原例终结技与飞镖同屏，保留跳过及其他备选。

FINISHER自有A10无重试证据首机会：拿0/0、改选0/23终胜，差不可算；稀疏未过100门。

外部FINISHER v0.111幕2比幕1的终胜关联+12.97pp（43/96 vs 28/88牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-three-count-dependent-attacks`；rk `silent-rk-b002-three-count-dependent-attacks`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-explicit-keyword-resource-boundary

卡：TACTICIAN, REFLEX, HAND_TRICK。

奖励比较战术大师、本能反应、手上技法时，仅按已核牌文分清资源：前两者印3费和奇巧、分别得1能或抽2；手上技法1费7格挡、给本回合手中一张技能加奇巧。已记录牌文未解释奇巧的触发，本批不补定义、不据弃牌推断免费发动；先核现场关键词说明，再比较实际代价与备选。

TACTICIAN自有A10无重试证据首机会：拿0/0、改选2/24终胜，差不可算；稀疏未过100门。

外部TACTICIAN v0.111幕2比幕1的终胜关联+28.42pp（48/103 vs 10/55牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-explicit-keyword-resource-boundary`；rk `silent-rk-b002-explicit-keyword-resource-boundary`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-draw-and-discard-timing

卡：TOOLS_OF_THE_TRADE, EXPERTISE。

奖励比较必备工具与独门技术时，核所缺的是后续回合整理还是打出时补牌。原文必备工具1费、回合开始抽1弃1；独门技术1费抽2、所抽牌本回合获得保留。两者并非同一净增牌量或同一时间窗，勿把回合开始的效果提前；升级及保留的延续范围按现场文本另核。

TOOLS_OF_THE_TRADE自有A10无重试证据首机会：拿0/7、改选0/5终胜，差+0.00pp；稀疏未过100门。

外部TOOLS_OF_THE_TRADE v0.111幕2比幕1的终胜关联+17.89pp（38/72 vs 30/86牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-draw-and-discard-timing`；rk `silent-rk-b002-draw-and-discard-timing`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-zero-cost-attack-constraints

卡：SLICE, ASSASSINATE。

奖励比较切割与刺杀时，零费只是一项共同事实。原文切割6伤；刺杀10伤并给1易伤，但同时写有固有和消耗。把这些附加条件及现有牌组需求与真实备选一起核，不把两张都归为同样可重复的零费伤害，也不由卡名推定额外机制或固定拿牌顺序。

SLICE自有A10无重试证据首机会：拿0/19、改选3/49终胜，差-6.12pp；稀疏未过100门。

外部SLICE v0.111幕2比幕1的终胜关联+16.10pp（10/24 vs 34/133牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-zero-cost-attack-constraints`；rk `silent-rk-b002-zero-cost-attack-constraints`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-generated-knives-purpose

卡：FAN_OF_KNIVES, UP_MY_SLEEVE。

奖励出现刀扇或袖里乾坤时，区分生成数量和附加效果。原文刀扇2费、加4小刀且小刀攻击所有敌人；袖里乾坤2费、加3小刀且这张牌耗能减1。现有小刀来源只按当时牌组代理核，勿由终局刀牌反推当前；减费持续范围和生成后实际出牌能力本批未验证。

FAN_OF_KNIVES自有A10无重试证据首机会：拿0/7、改选1/5终胜，差-20.00pp；稀疏未过100门。

外部FAN_OF_KNIVES v0.111幕2比幕1的终胜关联+16.17pp（26/49 vs 38/103牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-generated-knives-purpose`；rk `silent-rk-b002-generated-knives-purpose`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-two-power-trigger-conditions

卡：SERPENT_FORM, ENVENOM。

奖励比较群蛇形态与涂毒时，先核当前构筑能提供哪种触发。原文前者3费、每打牌对随机敌人4伤；后者2费、每次攻击造成未格挡伤害才给1毒。出牌次数不等于未格挡攻击次数；先考虑部署费用和实际触发来源，不把毒标签、最终簇或赢家选择当成已成型。

SERPENT_FORM自有A10无重试证据首机会：拿0/3、改选1/4终胜，差-25.00pp；稀疏未过100门。

外部SERPENT_FORM v0.111幕2比幕1的终胜关联+15.07pp（34/64 vs 43/113牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-two-power-trigger-conditions`；rk `silent-rk-b002-two-power-trigger-conditions`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-all-enemy-printed-damage

卡：FLICK_FLACK。

奖励出现翻越撑击时，将原文1费、所有敌人7伤、奇巧，与同屏牌逐项比较。原例同屏还有匕首雨1费全体4伤两次和突然一拳1费单体8伤虚弱；曾选择匕首雨，也有选择翻越撑击的记录。保留单次与多次、全体与单体区别，不猜奇巧触发或据7与8直接排名。

FLICK_FLACK自有A10无重试证据首机会：拿0/16、改选1/47终胜，差-2.13pp；稀疏未过100门。

外部FLICK_FLACK v0.111幕2比幕1的终胜关联+6.79pp（9/32 vs 48/225牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-all-enemy-printed-damage`；rk `silent-rk-b002-all-enemy-printed-damage`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

### silent-b002-conditional-extra-reward

卡：THE_HUNT。

奖励出现狩猎时，把直接伤害与附带奖励分开。原文1费10伤，只有斩杀才额外得一次卡牌奖励，并消耗。原例有拿狩猎及改拿毒性爆发；本批未核后续斩杀兑现率和额外奖励质量，不能把每次打出都记作稳定加一张牌，或用未来取得牌数触发当前拿牌建议。

THE_HUNT自有A10无重试证据首机会：拿0/2、改选1/7终胜，差-14.29pp；稀疏未过100门。

外部THE_HUNT v0.111幕2比幕1的终胜关联+21.51pp（25/43 vs 37/101牌次）；不是拿牌效果。

范围：仅Silent A10奖励且现场牌文吻合；当前信息用已记牌组代理。自有版本unknown，效果未证，不给固定拿牌命令。

策略 `silent-brain-b002-conditional-extra-reward`；rk `silent-rk-b002-conditional-extra-reward`。selected/alternative原题完整选项及代理牌组在scenario-examples.json；所有牌逐版本/幕的原cells、反向率和缺失并集在external-directional-comparisons.json。

## 逐卡处置与分母

| 卡 | 处置 | 情境 | 自有首次同牌机会分母（独立局） | v0.111 A1→A2取得牌次 |
|---|---|---|---|---|
| SIDESTEP | new-context | silent-b002-next-turn-resources | 171（各进阶/重试组另账） | 122→133 |
| PREDATOR | merged-into-new-context | silent-b002-next-turn-resources | 325（各进阶/重试组另账） | 186→45 |
| FLICK_FLACK | new-context | silent-b002-all-enemy-printed-damage | 323（各进阶/重试组另账） | 225→32 |
| FINISHER | new-context | silent-b002-three-count-dependent-attacks | 152（各进阶/重试组另账） | 88→96 |
| POUNCE | new-context | silent-b002-skill-discount-and-draw-lock | 151（各进阶/重试组另账） | 164→45 |
| TACTICIAN | new-context | silent-b002-explicit-keyword-resource-boundary | 148（各进阶/重试组另账） | 55→103 |
| PRECISE_CUT | merged-into-new-context | silent-b002-three-count-dependent-attacks | 159（各进阶/重试组另账） | 176→35 |
| REFLEX | merged-into-new-context | silent-b002-explicit-keyword-resource-boundary | 149（各进阶/重试组另账） | 48→83 |
| SERPENT_FORM | new-context | silent-b002-two-power-trigger-conditions | 82（各进阶/重试组另账） | 113→64 |
| HAND_TRICK | merged-into-new-context | silent-b002-explicit-keyword-resource-boundary | 148（各进阶/重试组另账） | 72→64 |
| TOOLS_OF_THE_TRADE | new-context | silent-b002-draw-and-discard-timing | 77（各进阶/重试组另账） | 86→72 |
| SLICE | new-context | silent-b002-zero-cost-attack-constraints | 345（各进阶/重试组另账） | 133→24 |
| FLECHETTES | merged-into-new-context | silent-b002-three-count-dependent-attacks | 145（各进阶/重试组另账） | 96→57 |
| ASSASSINATE | merged-into-new-context | silent-b002-zero-cost-attack-constraints | 76（各进阶/重试组另账） | 103→54 |
| FAN_OF_KNIVES | new-context | silent-b002-generated-knives-purpose | 66（各进阶/重试组另账） | 103→49 |
| EXPERTISE | merged-into-new-context | silent-b002-draw-and-discard-timing | 162（各进阶/重试组另账） | 46→62 |
| UP_MY_SLEEVE | merged-into-new-context | silent-b002-generated-knives-purpose | 177（各进阶/重试组另账） | 84→49 |
| ENVENOM | merged-into-new-context | silent-b002-two-power-trigger-conditions | 80（各进阶/重试组另账） | 82→55 |
| BULLET_TIME | merged-into-new-context | silent-b002-skill-discount-and-draw-lock | 68（各进阶/重试组另账） | 60→80 |
| THE_HUNT | new-context | silent-b002-conditional-extra-reward | 83（各进阶/重试组另账） | 101→43 |

具体缺证：20卡都缺各层两组≥100独立局的拿/改选效果比较；外部取得记录缺真实拒选备选与跨cell独立局并集；奇巧、固有等词的完整机制不由名字补齐；没有未来手牌、稳定斩杀奖励兑现率或版本机制等价证明。每卡均完成描述候选或并入候选，未把不合格效果子组算成已发布。

## 覆盖、反例和边界

程序核6854个pick奖励问题，保存涉及20卡的3376机会/497局，完成且选择可识别的统计集合为497局；44个同层前置帧选项不符排除、6个未执行/未知选择保留原记录但不进统计。每卡只取每局首个完成且选择已知机会用于率分母，后续拿牌例子可核机制但不混成该首机会分母。不同卡/行仍重叠，不能相加成局数。

模型实际通读20卡全部牌文变体和40条完整投影奖励例子（含所有备选、实际选择、同层前置REWARD牌组与资源代理）；抽核全部20卡v0.111汇总及相关旧条目。程序读取的全部统计cells/3376机会并未逐行经模型通读。外部完整代表时间线、自有完整四section剧本读取均0；本单元不声称完整流派剧本。

自有版本unknown，A10/其他逐进阶、重试或判死/无重试证据分层保留。后者不是严格无SL；终胜是原最终记录结果，不冒首次尝试。外部v0.107–v0.111分账，不同build原cell保留；机制未改证据不足，合池0。全部来源日期、输入SHA、分母、反向结果及混杂见source-ledger.json与候选详情。

模型没有用旧大脑理由、outcome_stats、模拟值或预训练机制填入结论。确定性最早offset取例没有按胜负挑例；例中选中后仍失败及改选记录同时保留。外部v0.111猎杀者幕2/幕1终胜关联为负，其他版本反向结果也不删除；与自有率比较因题目和分母不同保持unassessed，不冒同向复现。

跨版本异质性：侧步v0.110为-2.86pp、v0.111为+17.31pp；v0.109翻越撑击、猛扑、刀扇、袖里乾坤也有反向。完整值与各自原分母见version-heterogeneity.json。侧步v0.107–109无相应取得行，仅记缺失，不能推出那些版本无此牌。

## 验证和待闭环

生产parseStrategyLibrary核10条候选格式通过；validateReflexEntry核10条、词表核验通过。首次tsx CLI因沙箱禁止IPC listen返回EPERM，随后用node --import同库完成校验；不是源码失败。没有运行tsc/vitest/full、没有改源码，tests各null。rk是card_pick描述tag，当前数值拿牌消费者只接收合格contrast，故本批不能被称为已接入数值建议；没有完整候选反事实矩阵或回放。

正式knowledge/strategy/rk发布、生产工具读回、自然查询、实际采用与收益计数分别均0。父要求保持开放；所有候选formal_publication=pending、consumer_readback=pending。源码/正式库/学习共享账本未改，source_commit=null。未提交或合入，HEAD不变。实际模型/档位/用量未读取原生回执，本报告不把启动参数当实际采用证据。

后续沿原发布owner逐项确认描述候选、样本门与消费范围；对有时机/机制缺口的子项补原窗口证据或合法反事实输入，不自动扩卡、派下一批或重开Boss。安全扫描及最终字节完整性结果见scratch/；完整JSON如下。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-214315-strategy-proposal",
  "base": "cf2460be8d7f099875e2a8f4a933045fde6c9da1",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/report.md",
  "external_source": "issue51-single-card-002-20261024-r56",
  "input_sha256": "3afff54624bc677981c3f34a24d48b52b24307277363f962dcca52cdc6c881f7",
  "external_results": [
    {
      "id": "external-single-card-002-r56",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-b002-single-card-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-next-turn-resources",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-next-turn-resources",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-skill-discount-and-draw-lock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-skill-discount-and-draw-lock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-three-count-dependent-attacks",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-three-count-dependent-attacks",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-explicit-keyword-resource-boundary",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-explicit-keyword-resource-boundary",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-draw-and-discard-timing",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-draw-and-discard-timing",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-zero-cost-attack-constraints",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-zero-cost-attack-constraints",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-generated-knives-purpose",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-generated-knives-purpose",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-two-power-trigger-conditions",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-two-power-trigger-conditions",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-all-enemy-printed-damage",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-all-enemy-printed-damage",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-b002-conditional-extra-reward",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-b002-conditional-extra-reward",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/rk-candidates.json"
        }
      ],
      "reason": "固定20卡完成：新增10个描述性情境、10条文字策略与10条rk标签候选；旧情境更新/逐字节复用均0。两组各100独立局的效果比较0；正式发布、生产读回和自然采用均0，全部仅scratch/pending。"
    }
  ],
  "source": "mixed",
  "own_support_runs": [
    "1913SE84AXQF",
    "456MRNGCPD8E",
    "5X2GHKJ89PN1",
    "7X0W3U8TVA2A",
    "833ZM0MJGWHC",
    "AF76L5UTPP8U",
    "CA5KE8GFJ9X2",
    "CNKR125PFHJ5",
    "F6XY4QJMS5RC",
    "G3TD6JEN47KT",
    "HLAWCGM3KHVB",
    "MCCK2602T1SR",
    "NB8KCF6HRGVF",
    "PYE4VXNSLGSS",
    "Q3R929GHT14R",
    "QNTW139MGECA",
    "TKXQ6L4N9A6U",
    "U8K28UUGYP3U",
    "V0383V5S9BCQ",
    "V3PJA3FV92BG",
    "VGNDNGPFYRE3",
    "VLZ6CCT8AQ0A",
    "VPW8YH7A4QFM",
    "X4M1GPAJGAB9",
    "YLYLZWHA0GKU",
    "YXY2RL1E83HM"
  ],
  "own_statistical_runs_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/own-statistical-runs.json",
  "decision_output_counts": {
    "fixed_cards": 20,
    "cards_disposed": 20,
    "new_contexts": 10,
    "updated_contexts": 0,
    "verbatim_reused_contexts": 0,
    "aliases": 0,
    "cards_merged_into_new_contexts": 10,
    "knowledge_candidate_entries": 10,
    "strategy_candidates": 10,
    "rk_descriptive_tag_candidates": 10,
    "own_effect_comparisons_passing_100_independent_runs_per_group": 0,
    "external_effect_comparisons_passing_100_independent_runs_per_group": 0,
    "external_act_comparisons_passing_100_acquisition_occurrences_per_group": 1,
    "formal_publications": 0,
    "production_consumer_readbacks": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "benefit_observations": 0,
    "complete_playbooks": 0
  },
  "card_dispositions_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/card-dispositions.json",
  "scenario_mapping_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/scenario-mapping.json",
  "coverage_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/coverage.json",
  "source_ledger_path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-214315/learner/runs/20261024-214947-204072d6-db59-4625-a932-711753eba9f6-strategy-proposal/scratch/source-ledger.json",
  "formal_publication": "pending",
  "consumer_readback": "pending",
  "reason": "固定20卡完成：新增10个描述性情境、10条文字策略与10条rk标签候选；旧情境更新/逐字节复用均0。两组各100独立局的效果比较0；正式发布、生产读回和自然采用均0，全部仅scratch/pending。"
}
```
