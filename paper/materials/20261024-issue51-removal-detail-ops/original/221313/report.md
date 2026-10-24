# 删牌细化：同屏预算与服务状态（候选交付）

批次 `20261024-221313-strategy-proposal`；plan `issue51-remove-card-detail-002-20261024-r56`；unit `external-remove-card-detail-002-r56`。

交付 **5组文字策略与rk候选：3个新情境、2个原ID更新**。不是5个新情境。知识文字同步保存在 `scratch/knowledge-candidates.json`，一对一映射在 `scratch/mapping.json`。原184318六类规则逐项去重，联合预算和可负担离店沿用原ID及证据。正式发布、生产工具读回、自然查询、实际采用和收益均为0；科学父保持开放。

## 身份、范围与来源

- learn.json本批external_source、external_binding、worktree、dispatch_base与宿主冻结身份一致；input manifest 12097字节/SHA `426e8008f817a745e261cb86124edb9204095c7de0668472bd3f5c89fcc95772`，work_spec 4861字节/SHA `0d0e893822f0623e67eb657de219b971e8d3642d8eb846fee35f27f32ec21adb`。HEAD始终为`522197cfb8b29eea4d640032532731642a223a0d`。
- 冻结#27/#28/#42/#55合同已核。#54三个manifest与129叶共132项均按完整字节核SHA；11片自有只读parquet核大小与SHA。详见`input-verification.json`。材料按精确路径展开，未读取外部原库或玩家身份、未下载或读取后续新局。
- 自有主证据限定原506名单，排除Z2/KF9及BP9和后续局；查询仅内存DuckDB、threads=2、显式11片清单，先过滤506再分析，原六流字节截止保持。没有init/sync共享logdb。所有原始seek在`raw-read-inventory.json`、`reward-prefix-refs.json`和各证据文件后继ref中记录offset/bytes/SHA。自有版本unknown，不冒充v0.111。
- 外部来源仅`external:sts2fun`，采集2026-10-21，公开URL `https://sts2.fun/static/sts2_public.db.zst`，原库SHA `1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5`。聚合输入SHA `4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d`。FAQ未见明确再分发许可，仅署名聚合与已授权匿名代表；玩家分母未知，不以上传行当独立玩家。
- 外部v0.107/108/109/110/111原分母分别2932/683/583/411/1739；按build/act保留361行商店移除统计，不合并未知机制版本。其余版本非反事实对照；缺少机改核对，不能写“机制未改”。
- 本批5个情境主来源均为own；外部缺同屏完整价格、金币、服务used状态和备选货架，对本题只作独立未评估对照，不硬写mixed支持。`runs=[]`为外部派发身份；6个本批抽核自有支持局另列own_support_runs，旧条目另外4局只按继承证据保留，不计本批新局。

## 候选及适用范围

### 1. used — new

策略 `silent-brain-shop-used-removal-service`；rk `silent-rk-shop-used-removal-service`。

本店删牌已用时，把剩余金币用于继续购物或离店，别把price=0当免费再删一次。0CLP F24付100后牌组25→24、金币420→320，服务变used=true/available=false/price=0；随后仍购193遗物及52、51药，余24。A10无重试证据36机会/32局、重试或判死184/148，首个已用状态均未再次删牌。
范围：Silent A10/版本unknown，必须看当前used/available；不把服务未用但付不起混入，也不证明先删更优。

证据：`evidence-used.json`，含当前完整牌文/货架投影、动作、资源后继、原seek引用、奖励已选前缀代理及分层统计。formal_publication=pending；consumer_readback=pending。

### 2. short — new

策略 `silent-brain-shop-removal-unaffordable-stock`；rk `silent-rk-shop-removal-unaffordable-stock`。

未用删牌报价高于现有金币、仍有可付商品时，按现有商品与离店比较，别把此时未删牌记为主动放弃可付删牌。0CLP F42买199遗物后389→190，删牌200不可付，仍买87牌、100药后余3。A10无重试证据157机会/81局中123直接购、33离店、1弃药；重试或判死673/296中524购、138离店、11弃药。
范围：Silent A10/版本unknown；商品可付为价格代理，药栏等合法性另核；实际动作有后继才算执行，不表示购物胜过留金。

证据：`evidence-short.json`，含当前完整牌文/货架投影、动作、资源后继、原seek引用、奖励已选前缀代理及分层统计。formal_publication=pending；consumer_readback=pending。

### 3. later_quote — new

策略 `silent-brain-shop-next-removal-quote`；rk `silent-rk-shop-next-removal-quote`。

同局前店已确证付费删牌，到后店用当前报价重新比较删牌、购物和留金，别沿用旧价或固定涨幅。0CLP先100删牌，后店报价150，再后200；9TG则50→75。A10无重试证据38后店机会/20局均比最近确证付费价高50；重试或判死213/102中201高50，另有0、25、40、100差值。
范围：Silent A10/版本unknown、仅已记录后店；遗物/未观测动作可改价，不建立统一涨价公式，报价变化不证明该删哪张。

证据：`evidence-later_quote.json`，含当前完整牌文/货架投影、动作、资源后继、原seek引用、奖励已选前缀代理及分层统计。formal_publication=pending；consumer_readback=pending。

### 4. fit — updated

策略 `silent-brain-shop-joint-budget`；rk `silent-rk-shop-joint-budget`。

购买与删牌共用金币时，既比较互斥方案，也核能一起完成的整套清单。保留旧例100买51后只余49、删100不可付；新例0CLP F37从1080依次付228、257、150删牌、36买牌、74买药，实余335，删牌后牌组28→27再→28。A10无重试证据120机会/80局、重试或判死531/286满足删牌加最便宜商品可付的价格代理。
范围：Silent A10/版本unknown；代理不表示任意组合都可买，药栏/库存与实付仍逐步核；不固定先买或先删，不证明整套收益。

证据：`evidence-fit.json`，含当前完整牌文/货架投影、动作、资源后继、原seek引用、奖励已选前缀代理及分层统计。formal_publication=pending；consumer_readback=pending。

### 5. stop_selected — updated

策略 `silent-brain-shop-affordable-stop`；rk `silent-rk-shop-affordable-stop`。

计划购物结束后若删牌仍可付，把继续删牌与离店留金再比较，不因刚买了牌就补一个删牌。VX6 F5买90牌和49、48药，289→102后面对100删牌仍离店；CESK F11余112面对100删牌也停。A10无重试证据2/165个曾满足删牌和商品都可付的店出现该停法，涉及2/97局；重试或判死22/730店、18/323局。
范围：Silent A10/版本unknown；保留旧可负担离店原则，本次细化购物后剩余预算；两见证终败，未证明留金更优或102为阈值。

证据：`evidence-stop_selected.json`，含当前完整牌文/货架投影、动作、资源后继、原seek引用、奖励已选前缀代理及分层统计。formal_publication=pending；consumer_readback=pending。

## 分母、反例和可见性

统计以每情境每`run_id/floor`首个合格状态为一次店机会；只在该情境内去重，跨情境、跨商店的局数不能相加。精确匹配`fingerprint + observed_ts`，不把重复状态匹配到未来决策。4,237对开放商店状态含2个无有效chosen的记录；有效4,235对，涉及459个合格局。原506中未进入此配对集的局不补零、不当拒选。`statistics.json`逐进阶、重试/预判必死与无重试证据、unknown版本分账。

“无重试证据”不是已证绝无重试；原预测必死、SL和真实死亡不合并成首次死亡，机会沿原实际日志，未冒称首试反事实。232次删牌启动满足后继used、金币减少等于当时报价、牌组恰少1张三个条件，才作“已确认付费删牌”。后店报价统计只追溯这些已确认动作，固定+50的推断被0/25/40/100差值限制。新价差不能直接解释为删除造成的因果变化。

奖励前缀从5,862条实际choose_reward_card的expect.option.id及先前时间计算，只算当前商店时间前的记录；它是“已选奖励前缀代理”，不保证派发完成，不能补齐初始/事件/商店牌与删改，也不重置为虚构首试前缀。各情境按0–4/5–9/10+代理张数的分层见`statistics.json.prefix_proxy_strata`；实际牌组可见时以当前原牌组为准。未以终局牌组、外部簇号或未来拿牌作为触发。

短预算情境中的“商品可付”仅价格代理；满药栏、实际合法性仍看原状态/动作，不用enough_gold单标志推断可买。留金条目的24次停店是895个曾满足双方价格条件店的子集，A10两重试层分母165/730分列，不能把24例当独立验证总样本，也不把后期状态选中率当初始决策概率。

外部v0.111商店移除打击，按上传去重分别一幕97/300胜、二幕208/439胜、三幕174/263胜；按条目计数是99/304、226/470、216/315。各幕/卡可重叠，不能加成独立局，不能与未删牌组作缺字段比较，也不能从后幕较高胜率推断晚删更优。完整原统计和反向/稀疏行保存在`external-contrast.json`，未从预训练补机制。

外部有界reader按manifest核SHA读取c0/v0.111一对一页，页面`external-representative-c0-page0.json`保留完整节点。模型实际通读赢家49节点与失败者49节点。赢家shop4/21/23/38消费100/100/282/150，只有21/38记录移除；失败者shop7/25/43消费100/505/217，7/25移除，非商店也多次移除。双方都有移除仍结局不同，支持保留混杂，不证明删牌收益。c0只作匿名页定位，没有命名流派或部署archetype条件。

自有只抽核9个局部商店及相邻资源/动作投影；没有通读114份自有整局四section，因此**不声称完整流派剧本**。程序读全页/全记录与模型通读范围分开记在`coverage.json`。不将旧理由中的模拟收益或牌组解释作为本批新知识。

## 未完成子项与发布边界

- 零个配对机会满足“删牌可付而全部其他库存报价不可付”，该子项waiting，不能制造唯一可买服务的例子。
- 固定删牌排序、安全阈值、删牌因果收益、删除与不删除的100/100独立局对照均未知。5个主要候选各有至少一个重试层机会分母≥100局；这不是5个达标双组比较，双组≥100计数为0。
- rk已配对落盘，但现白名单不能表达card_removal.used/available、跨字段金币比较或前店历史。候选用已有shop用途与粗粒度可见字段，标签带条件；它们是描述检索候选，精确选项求值仍waiting。没有伪造自动命中、扩大schema、开#28开关或两臂/A-B。
- 文字库可用shop题型加正文条件；未写archetype触发，未使用#55测试几何。knowledge/strategy/rk正式消费者均pending，生产kb_strategies/kb_reflex读回、自然采用/收益独立验。
- 3新+2同ID更新满足5组交付；**真实新增仅3**。不拆泛句计数，不把361统计行、5知识投影、5rk标签或旧成果算成额外新情境。未触发连续两批0新增停止条件，也不自行派下个单元。

## 验证与产物

`scratch/strategy-candidates.json`、`reflex-candidates.json`、`reflex-vocab-candidates.json`通过现有严格格式解析，隔离loadV6Knowledge读取5条；每个rk来源文件哈希核同。该离线候选检查不等于生产工具读回。tsx CLI首次因沙箱IPC EPERM未启动校验，改用node --import loader；随后修正英文标签12词限制，最终通过。见`candidate-validation.json`与`validation-attempts.json`。未改源码，tsc/vitest/cases均null，不运行full/游戏/Jev/MC或新模型。

learn.json的ultrafast/weekly67只是请求参数，本会话未读取原生回执，实际模型档位和service tier均不在此确认，耗时/用量沿启动器原记录；没有改账号/config/权限或在途档位。

除scratch和本报告/result外无提交、合并、正式知识/代码/共享账本改动；HEAD保持dispatch_base。精确SHA、逐情境mapping、来源账本、全部局限与pending状态已落盘。发布仍交原锁和原owner，本批不登记已发布、不关闭科学父。

## 最终结果（与result.json及最终回复逐字段相同）

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-221313-strategy-proposal",
  "base": "522197cfb8b29eea4d640032532731642a223a0d",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/report.md",
  "external_source": "issue51-remove-card-detail-002-20261024-r56",
  "input_sha256": "426e8008f817a745e261cb86124edb9204095c7de0668472bd3f5c89fcc95772",
  "own_support_runs": [
    "0CLP16ZR4ZZC",
    "9TG1RP5LFAAK",
    "CESK0EFSJ2C4",
    "JLN5SK17W4FQ",
    "JMH5C51RLN4E",
    "VX6RJ608LR5F"
  ],
  "decision_output_counts": {
    "new_contexts": 3,
    "updated_contexts": 2,
    "verbatim_reuse": 0,
    "aliases": 0,
    "knowledge_candidates": 5,
    "strategy_candidates": 5,
    "rk_candidates": 5,
    "external_statistic_rows": 361,
    "comparisons_with_both_groups_at_least100": 0,
    "formal_publications": 0,
    "production_readbacks": 0,
    "natural_queries": 0,
    "actual_adoptions": 0,
    "measured_benefits": 0
  },
  "external_results": [
    {
      "id": "external-remove-card-detail-002-r56",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-shop-used-removal-service",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-used-removal-service",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/reflex-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-removal-unaffordable-stock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-removal-unaffordable-stock",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/reflex-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-next-removal-quote",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-next-removal-quote",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/reflex-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-joint-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-joint-budget",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/reflex-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-shop-affordable-stop",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-shop-affordable-stop",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-221313/learner/runs/20261024-221830-807aeefb-685c-45a9-a594-31fdd3ec69d9-strategy-proposal/scratch/reflex-candidates.json"
        }
      ],
      "reason": "已核冻结绑定、132项输入及11片自有证据；交付5组文字/rk候选，3新情境、2旧ID更新。自有为主证据，外部361统计行和完整赢家/失败轨迹另账；精确rk触发、正式发布、生产读回及收益仍待。"
    }
  ]
}
```
