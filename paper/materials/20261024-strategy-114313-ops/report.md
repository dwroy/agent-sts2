# 用药决策外部学习：候选1，正式发布0

本批仅处置 `external-decision-potion-001`。新增一条完整 `brain-strategies-v1` 策略候选，不修改代码、正式知识、账本、请求、运行状态或 main/live。候选把备战留药从默认项变为显式比较项；依据是终局保存字段的观察关联，不能称提前用药有收益。精确时机与相邻 Boss 留药收益保留缺证，未扩展到休息/路线、冷启动、旧008/009或旧Boss任务。

## 身份与冻结输入

- batch：`20261024-114313-strategy-proposal`；HEAD/base：`379f6b1b45d0fb7ef0bc1f3ce216ef132f322ed8`。主根 learn.json 本批 external_source、external_binding、entry_ids、当前清单与规格均一致；只读验证，未改登记。
- 清单：`paper/materials/20261024-input-format-r2-ops/issue51-decision-potion-20261024-001-r2.json`，39282 bytes，SHA256 `f7bf170ba222f37e6c10155069eb1ff8c0f6db43256f2bbe33b2fb01ce1cfc50`。
- work_spec：同目录 `issue51-decision-potion-20261024-001-r2.md`，4876 bytes，SHA256 `8e49d57e2873662c28c637aa4eda08eacb57293ce51a4a443e5936d479c40459`。
- #54 三输入冻结：`three-input-freeze.json` SHA256 `b26b7d41ae5c5131da20ba12a99073e895a602169beb2c3fd79155e4c376992c`；来源 main `a5db4d0f9fc1142a4d5a1660b4e2309a8028a26a`。三份包 manifest：外部 builds `ac5f0d359e445d4bf605681d67f403155e84f292bb19872903fa13b7bc3ea852`、外部 decisions `e9d1e6d76e6edc78aee67f451b9691d0f7c4b81d0c8e8c129c21a90351bbe78f`、自有 `a078c592dabf5909473f59967334ccd7ae24166f9f1e74e7140a062282e72e64` 均核一致。
- 当前在树内的 143 份冻结引用核 bytes/SHA 通过。4份未展开历史/重复回执只保留缺件说明，未以缺件推断证据不存在；当前清单、规格、三输入冻结及所用数据均已取得并核验。完整列表见 `scratch/identity-verification.json`。
- 实际输入：`knowledge/external/sts2fun/decision-fields-v1/statistics.json`，41598781 bytes，SHA256 `4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d`。来源 `external:sts2fun`，URL https://sts2.fun/static/sts2_public.db.zst ，采集2026-10-21，原数据库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`；沿原取得回执，本批未重算原库、未访问原库。许可未明确，仅署名聚合统计。
- 外部6348上传行/5版本/8build分别保留；玩家数、同玩家相关性与重复上传独立性未知，不称6348独立玩家。自有506合格终局/114代表文件是冻结包覆盖量，本批没有读完114局，不将其加入外部分母。

## 字段回执与读入边界

第一道入口按指定命令 `eval/build_stats_view.py --root knowledge/external/sts2fun/decision-fields-v1 --kind readiness --limit 3` 读取。readiness、所有版本的104个field_availability单元按有界页落盘，保留offset/total/next_offset/源SHA；每页均≤32768字节。

| 项目 | available / unavailable / unknown 与代理 |
| --- | --- |
| 开局祝福 | available：ancient选择键；首幕开局仅代理，首节点与初始完整性unknown。 |
| 商店 | available：bought_potions/relics/colorless显式条目；bought_cards在207997节点全部缺失，普通购牌unavailable。商店cards_gained只能作取得代理；价格、购买前金币与全货架unavailable。 |
| 删牌 | available：移除ID；付费与来源机制unknown，房间仅代理。 |
| 事件 | available：title定位键；变量、完整备选与动机unavailable。 |
| 药水 | available：候选/was_picked、节点使用与丢弃、显式购买、终局保存数组；即时持有、回合、使用前HP、相邻Boss场间快照unavailable。终局非空仅留存代理，不能当死亡时可用未用。 |
| 休息/锻造 | available：选择与升级ID；选择前真实HP与未走分支unavailable；前节点末HP只是代理。 |

全体节点中药水使用33908个非空节点/42521条目、丢弃6815/7097、获得候选64292/97542、显式购买3219/3869；这是节点与条目覆盖，不能相加为独立局或用药机会。v0.111对应使用字段59587节点中9793个非空/12152条目，49794 missing_or_null；缺失不是没喝或拒用。缺失计数键保持缺失，不补零。详 `scratch/field-coverage.json`。

共保存61个有界reader页（外部31、自有30）；外部decisions仅每版本四个药水field前2行及两条支持度示例，未遍读84691条决策cell。脚本对冻结聚合计算终局全表与Boss/精英支持度，模型读取有界页、派生摘要与选中原始聚合条目，不把41MB整份交给模型。页索引为 `scratch/page-index.json`。
自有索引初步定位曾直接解析冻结JSON；随后用有界reader逐页重核A10/no_retry_evidence簇1/4/5及三条选中索引。另直接检查过02HB4L0C3C67的冻结头部/首层结构，未用于候选。实际对照结论只引用reader已核SHA的五条完整战斗记录；该初步结构检查不计完整局阅读。
外部完整代表轨迹0局；自有完整局0局。没有读取外部representative-timelines节点或四表做流派解释；没有读完自有snapshots/questions/plans，不称三输入完整流派剧本，不由簇号预设玩法。三份manifest冻结存在不等于三输入内容已全部读完。

## 新候选：终局保存药水代理

目标ID：`silent-brain-potion-reserve-terminal-proxy-context`；候选文件：`scratch/strategy-candidates.json`；source=external:sts2fun，confidence=0.30，formal_publication=pending，consumer_readback=pending。

**方向与幅度：** 备战实际持药时，逐瓶比较本战可兑现用途与留药理由，把留药列为待比较选择；v0.111.0非胜上传终局数组非空447/1247（35.85%），胜局166/492（33.74%），差+2.1062百分点。

**适用范围：** 仅Silent A10/v0.111.0幕初或备战规划；这是事后终局保存字段代理。不能从终局记录判漏喝致死，不能推出提前喝药或省药的因果收益，不给药水/回合/HP安全阈值/后场瓶数。当前持药、用途和风险须另据现场；不知道则保留。终局结果绝不写进当前trigger。

两组在本build按whole_run_win互斥，终局数组均存在且合法。分母为上传行，各组一行计一次；schema的denominator.unit=runs只承载来源上传记录，不保证独立玩家/真实去重运行。非胜类型未进一步核死因，终局保存相对奖励/死亡的时点未知，早终止/幸存及上传自选保留；不计算名义显著性或因果区间。

反例与异质性：胜局也有166条终局非空，直接限制“留药必坏”；其他build差值可反向。版本机制对照没有冻结依据，保持unknown，各build分别列出，未强并：

| build | 非胜非空/上传行 | 胜局非空/上传行 | 比例差（百分点） | 两组均≥100 |
| --- | ---: | ---: | ---: | --- |
| v0.107.0 | 250/788 | 89/270 | -1.2371 | 是 |
| v0.107.1 | 473/1411 | 160/463 | -1.0349 | 是 |
| v0.108.0 | 139/481 | 66/202 | -3.7751 | 是 |
| v0.109.0 | 107/326 | 42/125 | -0.7779 | 是 |
| v0.109.1 | 23/88 | 9/44 | +5.6818 | 否，仅保留原表，不作门槛合格比较 |
| v0.110.0 | 3/11 | 0/1 | +27.2727 | 否，仅保留原表，不作门槛合格比较 |
| v0.110.1 | 90/292 | 32/107 | +0.9154 | 是 |
| v0.111.0 | 447/1247 | 166/492 | +2.1062 | 是 |

该表是同一问题的版本分层，不拆成8条策略。当前新候选只纳v0.111.0两项external_aggregate证据；其他版本留原分母与反向结果，不冒当前版本验证。原计数与可复算输出分别为 `scratch/terminal-potions.json`、`scratch/terminal-summary.json`；`scratch/derive.py`以冻结JSON复算，不连接数据库。

## 其余子项的处置与自有旁账

- Boss/精英节点代理：程序筛出v0.111、单房间、potion_used的1107个cell，最大支持60上传行，≥100的cell为0；没有可计算的去重并集，未把重叠cell加成独立局。保留原top12，已用有界页核同药POWER_POTION的Boss与精英示例，作为证据附属，不另造时机策略。
- AEONGLASS_BOSS/幕3/POWER_POTION：60条涉及上传、63次记录使用；其中45条上传最终胜、48次条目属最终胜，两个口径不混用。ENTOMANCER_ELITE/幕2同药为35条上传/35次，17条最终胜。不能把前者45/60与后者17/35当用药增益，幕深度、到达选择、牌组、HP和上传人群不同；也不能相加成95条独立局。前节点末HP均值53.10、47.40只保留代理，非真实入场或用药前HP。
- 精确回合/HP：waiting。外部无动作顺序、可用机会与使用前HP，自有fights汇总也不能补这几个窗口；不以无使用记录判有机会未用。
- 相邻Boss留药收益：waiting。外部没有可链接的场间持药快照；旧代表节点也没有本次新增药水字段，不能把两份独立聚合伪装成同局联表。自有仅三个目的性对照，无同起点用/留反事实，不能给留药瓶数或收益。
- rk：waiting。已核#28来源与回放合同，缺原planner capture、逐候选上下文/完整结果与预注册留出回放，不造机制/数值条目，不开模型/MC/开关。

自有来源 `self:agent-sts2`，game_version=unknown，均A10/no_retry_evidence；absence of retry evidence不证明没SL，三局不进入external分母或candidate evidence，own_support_runs=[]。仅作不同条件反例，evidence_status=unassessed：

| 自有局 | 核过的战斗记录 | 结论边界 |
| --- | --- | --- |
| HLAWCGM3KHVB | floor48 TEST_SUBJECT首记录84HP，REGEN_POTION/WEAK_POTION均列used，post77；floor49 QUEEN+TORCH_HEAD_AMALGAM首记录77HP、无药、死亡。 | 前场用药后后场死亡的实例，不能推断保留任一瓶会赢。 |
| 0CLP16ZR4ZZC | floor48 AEONGLASS与49 TEST_SUBJECT首记录均无药，两战胜；前战post51，后战首记录76。 | 反例：后场无药不必然失败；场间HP变化未核，不归因特定回血机制。 |
| 6321RUR647FH | floor48 AEONGLASS首记录53HP，LIQUID_BRONZE列used，死亡。 | 反例：用药不保证获胜；缺回合窗口，不判断早/晚。 |

三局fights程序分页覆盖20/24/24条，模型核五条完整选中记录及其余筛选摘要；不是三份完整整局。首记录帧未保证动作前，potions_used沿原视图，不推断饮用顺序。引用及源SHA：`scratch/own-contrast.json`；HLAW `53cc04b9922fb27fa7c6f7ff9c8586f26e13c254cf372ac1672d30d3b03c2096`、0CLP `2e5c94b212cc8b748c013aed4477192af0d6ff4fb20e8a4f979180871706a377`、6321 `19bc2803b78c4c1f2360a4b5d4b7bef1cc1cd74fdf4804fda397bb9788043afc`。

## 既有ID、校验与闭环计数

核过现有策略库30条ID及相关策略内容，无同语义的终局留药代理条目。`silent-brain-knowledge-demon-external-tail-budget`、`silent-brain-test-subject-external-tail-budget`仅引用保留，原gross_damage尾部预算与本批终局药水字段不同，不改旧证据、不把两个既有ID计为已更新或已复用策略。#27/#28/#42合同与SHA见 `scratch/contract-review.json`、`scratch/existing-id-review.json`。

| 实际项目 | 数量 |
| --- | ---: |
| 新策略候选 | 1 |
| 更新 / 已复用策略 | 0 / 0 |
| 既有ID参考链接 | 2（不计复用产出） |
| 新rk / 完整流派剧本 | 0 / 0 |
| 新候选两比较组均≥100 | 1条 |
| 原终局表两组均≥100 | 6个build比较（不计6条策略） |
| 精确时机 / 场间留药收益 / rk缺证 | 3个子项 |
| 正式发布 / 真实消费者读回 / 自然采用 | 0 / 0 / 0 |

冻结work_spec未提供历史连续零新增计数，本批新增1，不推造历史基线或扩批。候选、账本正式登记、发布、固定生产消费者读回、自然采用与收益保持分账，科学父不关闭。只有scratch来源账本 `scratch/source-ledger.json`，没有写正式学习账本或代码提案队列。此候选是低可信规划提示，不修改药水执行/持有价值规则、经验库或代码；本批code_proposals/implementation_domains/proposal_results均为空。

现有parseStrategyLibrary解析1条通过，离线幕初/备战注入均为3594字节≤4096；普通拿牌/战斗题不命中，派生own_runs/own_support_runs均0。见 `scratch/candidate-validation.json`。这是scratch数据格式与检索检查，consumer_readback仍pending。当前schema不能在trigger表达版本/进阶/持药，正文保留明确范围，不扩schema、不把终局事实硬触发。

未改源码，不跑tsc/vitest，最终tests全部null；未运行游戏、MC、Jev或在线模型；未下载、读玩家标识、原数据库、原日志库或游戏二进制。原生模型档位/用量回执未在本批核验，不把启动参数当已生效，也不报告估算耗时/usage。

HEAD保持dispatch_base，tracked diff为空，无提交/合入。`scratch/source.diff`为空，`scratch/workspace-check.json`记录检查，产物SHA清单见 `scratch/artifacts.json`。产物与报告均经gitleaks扫描无泄漏；报告末尾JSON与result.json已核逐字节及解析对象一致，最终回复沿用同一原文。

后续由原发布通道核本候选与观察性局限，再按原发布锁/正式账本/通知链推进；发布后查真实消费者ID/version/证据并追踪自然采用。精确用药或场间收益需原owner另冻逐回合持药、合法机会、当前HP、动作与后果及相同起点候选/结果；本批不扩读、不续派、不关闭父要求。

## 最终机器回报

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-114313-strategy-proposal",
  "base": "379f6b1b45d0fb7ef0bc1f3ce216ef132f322ed8",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-114313/learner/runs/20261024-114408-b7f86bda-9c64-4dc0-86c0-b82d95de2cb4-strategy-proposal/report.md",
  "external_source": "issue51-decision-potion-20261024-001",
  "input_sha256": "f7bf170ba222f37e6c10155069eb1ff8c0f6db43256f2bbe33b2fb01ce1cfc50",
  "external_results": [
    {
      "id": "external-decision-potion-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-potion-reserve-terminal-proxy-context",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-114313/learner/runs/20261024-114408-b7f86bda-9c64-4dc0-86c0-b82d95de2cb4-strategy-proposal/scratch/strategy-candidates.json"
        }
      ],
      "reason": "新增1条Silent A10/v0.111.0终局持药代理策略：非胜447/1247、胜166/492，差+2.11百分点；精确用药时机、相邻Boss留药收益及rk仍缺证。仅scratch候选，正式发布与消费者读回pending。"
    }
  ]
}
```
