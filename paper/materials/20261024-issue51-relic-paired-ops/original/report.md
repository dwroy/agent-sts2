# 遗物决策独立单元：20261024-191311-strategy-proposal

已落盘7个遗物决策情境：6个购买情境有文字策略/rk配对；1个真实交换情境有knowledge与文字，rk因冻结合同缺event题型waiting。100门槛比较0个；均为稀疏观察候选，未正式发布或读回。

本单元完成目标5–10条中的6条完整文字/rk配对，另有1条交换文字/knowledge及明确rk缺口。7个情境不是20个独立发现：20为7 knowledge、7 strategy、6合法rk的数据表现形式。新建情境7、同ID更新0、逐字节复用0、别名0；统计行单列。外部身份runs=[]；自有支持另列23局，不混外部分母。

## 冻结身份与边界

- learn.json本批external_source、external_binding、worktree、key与宿主本次plan核同；HEAD=efc1a53795e5e13be1b89453659562b0d9cfcb20，开始及收尾均一致，无提交、无tracked/cached差异。
- input_manifest=0f219b1d35390d0ba8076e591b71fbee12c8ec0ff438e79680b4357b42c1fb14，14113字节；work_spec=d943bb127f9dcd43ffba2fbda33039de11caca5b8c1a4069f7a1caf8a4cdfc5d，4492字节。缺失历史输入通过原materialize逐精确路径恢复，返回HEAD和blob核同，不改注册/请求。
- #54原冻结清单实际为3 manifest+129数据叶=132项，另核11个只读自有分片；任务简称“132叶”没有另造3个数据文件。全部大小/SHA通过，分片读完后再核同；nlink变化不当坏字节。详见scratch/input-verification.json、closing-verification.json。
- 已核并读取#27/#28/#42/#55冻结合同；当前候选只用已支持shop/event题型和正文当前条件，不用终局聚类、archetype绑定或测试几何。HEAD保持dispatch_base；源码/正式知识/共享统计/main/live未改，无学习正式账本登记或上线通知。
- 原请求参数gpt-6.1-sol/high/fast来自tui.sh；未核原生turn_context/服务回执，实际模型/档位/用量/耗时未知。没有修改启动、账号/home/config、权限或在途线程，没有模型/MC/Jev/游戏/full/强制tick。

## 情境与逐项去向

每条均formal_publication=pending、consumer_readback=pending；rk严格对象的逐ID状态另存candidate-status.json。以下是本批完整方向、幅度、样本与范围，来源完整事实另附可核文件。

### 1. 已有施毒牌时比较头骨的增量与生存预算

货架有异蛇头骨、当前已有能施毒的牌时，比较增强现有施毒与另买毒源/防御，并核剩余金币。自有A10版本unknown：10局10次购买均见头骨入栏、牌组张数不变，花95–197金；9局重试/判死、1局无重试证据，均终败。
范围：按当时牌文和牌组判断；增毒数占位未知，本批未核战斗兑现或对照收益。C7LERZPCRFZ1购买时仅3HP，不能以有毒源证明启动安全或必买。

disposition=new_candidate；knowledge=silent-relic-skull-existing-poison；strategy=silent-brain-relic-skull-existing-poison；rk=silent-rk-relic-skull-existing-poison。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/skull-existing-poison-evidence.json；SHA=45f54024bed694ee763d350135cc52ff6df3be7f924119415b62af848de7f588。既有条目是战斗施毒机制；本条是具名货架、当前施毒牌与金币的购买情境，不重写或重复计旧9局机制证据。

### 2. 已有刀源/低费攻击时比较折扇与直接防御

货架有精致折扇、当前有刀源或低费攻击时，比较同轮攻击换挡与直接补防；先核攻击能否同轮兑现。G3TD6JEN47KT F12已有刀刃之舞和两张切割，花208金买折扇，258→50；当时斗篷与匕首标价49。1局1次购买，牌组不变，终F24败。
范围：Silent A10/版本unknown/无重试证据；原牌文次数和挡量占位未知，本批不重验旧机制，不保证触发、挡够或购买更优。

disposition=new_candidate；knowledge=silent-relic-fan-current-attack-supply；strategy=silent-brain-relic-fan-current-attack-supply；rk=silent-rk-relic-fan-current-attack-supply。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/fan-current-attack-supply-evidence.json；SHA=bf4012b9bfbf998fb9ae72866ed353bda511fe157f80a0a22f04c0fef206b788。既有折扇条目描述已持有后的计数/格挡；新情境比较商店购买、当前刀源和直接防御备选。旧数值未重新验证。

### 3. 先区分已持X牌与未来才可能取得的X牌

货架有化学物X时，先区分当前已持X牌与未来才可能拿到的目标，再与当前防御/留金比较。自有A10版本unknown的5局5次购买花152–214金：4次已持萎靡或串刺；0PH64C4AWAX9 F5买时没有X牌，不能算当时已改善牌组。5局均含重试/判死且终败。
范围：以当前costs_x/牌文核目标；加成数占位未知，未来拿牌不回填当前触发；这不证明无X牌永不该买，也不证明已有X牌必买。

disposition=new_candidate；knowledge=silent-relic-chemical-x-owned-target；strategy=silent-brain-relic-chemical-x-owned-target；rk=silent-rk-relic-chemical-x-owned-target。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/chemical-x-owned-target-evidence.json；SHA=17505dad9a74243dfa68f4341eb49a5fbe0cb2a33bec6c56bc8921422579b2d2。旧条目验证战斗中已持X牌的兑现；本条购买时序含同一0PH局F5尚无X牌，二者适用时间不同，不把其F6之后事实回填F5。

### 4. 购买会员卡后按实际新价重算本店清单

决定买会员卡时，把卡本身支出与本店实际购物需求一起算；买后读回新价再核清单，不把未来商店折扣当已兑现收益。A10版本unknown的4局4次购买花189–226金，均核同店标价下降；9TG1RP5LFAAK F3先付189，264→75，回响斩标价37→18。
范围：4局均重试/判死、均终败；ZE2DNC29WWHB在3HP花194买卡，次层终败。未证明折扣回本或应先于保命采购。

disposition=new_candidate；knowledge=silent-relic-membership-reprice-current-cart；strategy=silent-brain-relic-membership-reprice-current-cart；rk=silent-rk-relic-membership-reprice-current-cart。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/membership-reprice-current-cart-evidence.json；SHA=0997b4e861d351db48d71846b7659ced6117359e577d652f38ac72cc042e2e67。既有joint-budget仅记录共同预算；本条新增同店实际价格变化/会员卡前置成本。黄金印留金条目保持既有ID，不另造同义条目。

### 5. 已有供药条件时分开估容量与当前药水

货架有药水腰带且已持供药遗物时，把新增容量与实际药水内容分开比较，不因未满栏就忽略容量，也不把空格当药。VLZ6CCT8AQ0A F20持白兽雕像、AR523ATD2G4W F21持小邮箱；分别花185/180金，栏位均2→4，占用仍1/0，牌组不变。
范围：Silent A10/版本unknown；2局2机会均无重试证据、均终败。只证实当步容量，未来补药及收益未知，仍比较当前药水/防御的机会成本。

disposition=new_candidate；knowledge=silent-relic-potion-belt-current-supply；strategy=silent-brain-relic-potion-belt-current-supply；rk=silent-rk-relic-potion-belt-current-supply。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/potion-belt-current-supply-evidence.json；SHA=34ed835493cd76c290ad7f61d41af407851250d674f639acf0bf85137be35523。既有条目是满栏后弃换药；本条两局购买时均未满，研究供药条件与容量购买，不复制满栏换购经验。

### 6. 按随机升级的攻击牌池估磨刀石而非指定核心牌

货架有磨刀石时，先列当前未升级攻击牌池，按随机结果比较升级价值；产刀的技能/能力不能因产刀就算攻击升级目标。YXY2RL1E83HM F28有刀刃之舞/飞刀风暴，花188金，782→594；后继实际只见一张打击和一张切割变为升级，牌组张数不变。1局1次购买，终F48败。
范围：Silent A10/版本unknown/无重试证据；这次两张升级不保证下次命中核心，也未证明比186金弹珠袋或202金忍术卷轴更优。

disposition=new_candidate；knowledge=silent-relic-whetstone-eligible-attack-pool；strategy=silent-brain-relic-whetstone-eligible-attack-pool；rk=silent-rk-relic-whetstone-eligible-attack-pool。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/whetstone-eligible-attack-pool-evidence.json；SHA=dacd989efe1a750791433e21c48334f7dccd944c3d49bd45a938dc028f663d26。未找到相同具名遗物购买情境；旧钓鱼竿随机升级机制不是磨刀石，不移植其样本或机制。

### 7. 遗物交换比较实际牺牲物与未知随机回报

兰伟德实际给出药水、100金币、具名旧遗物三选时，比较付出物当前用途与随机奖励数，别把两件随机当两件已知强遗物。7X0W3U8TVA2A F29交打击木偶、Y5H4CFAQ2WTG F20交铲子，后继各少旧1件、多新2件，HP/金币不变。
范围：Silent A10/版本unknown；2局2次机会、均无重试证据且终败。新遗物身份是事后结果，不能回填选项或声称此交换优于付药/金币；未知旧遗物未来兑现与随机分布。

disposition=new_candidate_partial_rk_waiting；knowledge=silent-relic-exchange-current-sacrifice；strategy=silent-brain-relic-exchange-current-sacrifice；rk=silent-rk-relic-exchange-current-sacrifice。

证据：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/exchange-evidence.json；SHA=1f73846af8db7df42731c69b7ccda515a978a312dd5689dbab4fcc1f572a3f5f。两次原生三选/后继已核，文字与knowledge已落盘；事件rk不在冻结合同，缺口单独保留。

## 机会分母、分层与反向结果

自有506名单与原六流截止保持，排除Z2手动局、KF9缺末态、BP9及后续局。DuckDB仅:memory:、threads=2、显式11分片中的decisions/frames文件名单，先JOIN506名单并限制off+len≤原截止，再查询。所有原始seek均留offset/bytes/SHA/cutoff，未拷原始状态流或共享logdb，未init/sync。

1,329个每局每层首次开店机会中，274个初始货架含所查六遗物；逐遗物/进阶/重试分层保存于purchase-statistics.json。以下A10机会数是初始开店货架代理，购买列才是后续真实动作；没有购买记录不冒拒选意图，行与组可共享同一局，不累加为独立局：

| 遗物 | 无重试证据：购买/初始在售机会（局） | 重试/判死：购买/初始在售机会（局） | 真实购买局数 |
|---|---|---|---|
| SNECKO_SKULL | 1/7（7局） | 9/48（48局） | 10 |
| ORNAMENTAL_FAN | 1/7（7局） | 0/17（17局） | 1 |
| CHEMICAL_X | 0/5（5局） | 5/44（44局） | 5 |
| MEMBERSHIP_CARD | 0/9（9局） | 4/33（33局） | 4 |
| POTION_BELT | 2/10（10局） | 0/40（40局） | 2 |
| WHETSTONE | 1/14（14局） | 0/40（40局） | 1 |

六类购买共23次、21个去重A10局；交换另抽核2局2次，总自有支持23局。全部所选购买/交换局终败；支持的只是当时构筑兼容、成本、实际动作和后继资源，不是收益。无X牌先买化学物X、3HP买会员卡/头骨、买磨刀石升级到普通攻击等限制保留。非A10购买另列原分层，不计A10支持。只检得A0的干瘪之手购买未新增；本批没有重开旧Boss/开局/休息任务。

1,046条chest/relic的抽取原理由全部为only one relic offered，没有把它们计为多选机会；未逐个seek宝箱状态，不冒全面原帧验收。自动获得/精英掉落与有货架购买严格分开。

外部source=external:sts2fun，公开URL=https://sts2.fun/static/sts2_public.db.zst；下载/采集2026-10-21，DB SHA=1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5，statistics.json SHA=4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d。筛选Silent/A10/单人/valid/非弃局/无modifiers；许可未找到明确再分发条款，只沿已冻结聚合署名，不读原库/玩家标识、不重新下载。

v0.107/v0.108/v0.109/v0.110/v0.111原上传分母分别2932/683/583/411/1739，精确8个build原分母在source-ledger.json。未取得机制改动对照，逐版本保留，不将unknown当未改，不因unknown停止可用组。外部只记录显式bought_relics，没有当前真实构筑、完整拒选货架或购买前金币，故该缺列子项用自有主证据，外部只作独立描述对照，未写mixed假一致。

外部保留119行（含未新增的干瘪之手对照），六购买情境引用106行，各版本/幕原分母与反向结局均在external-relic-rows.json。v0.111如下，单元格为购买上传局n/其中整局赢家数；同一上传可能跨幕，不求和，不把此比率称购买收益：

| 遗物 | 幕1 n/赢家 | 幕2 n/赢家 | 幕3 n/赢家 |
|---|---|---|---|
| SNECKO_SKULL | 13/4 | 11/7 | 25/17 |
| ORNAMENTAL_FAN | 4/1 | 10/4 | 8/8 |
| CHEMICAL_X | 1/1 | 6/1 | 13/11 |
| MEMBERSHIP_CARD | 13/4 | 32/16 | 17/10 |
| POTION_BELT | 6/1 | 9/5 | 15/11 |
| WHETSTONE | 5/2 | 3/2 | 9/5 |

这些具名比较均未达到每组100，达标比较数=0；本单元是遗物情境候选，不是单牌20–30卡比较批。不以重叠cell或终局库存凑100，也不否决已核的稀疏方向和资源事实；不交固定购买排序、因果改善或安全血线。外部v0.111第三幕折扇8/8等强观察也保留生存/自选/未选项缺失限制，不提升为必买。

## 覆盖、消费者与未完成项

程序核200次购买前后、1,329个初始开店状态、所选23次A10购买的原生/原计划事实与2次交换。模型实际通读所选23次购买的数值核对/具名备选，详细抽核13个购买前牌组资源窗口及2次交换原题/后继；未声称逐页通读1,329个开店状态。全部1,765次原始seek（含重复窗口）有凭证，去重窗口/字节另见coverage.json和各*-seeks.json。旧理由只作定位，模拟估计/赢家选择不作为实际收益或机制事实。

匿名代表只经manifest验SHA的有界reader，cluster1/6各offset0、limit1一对一页；模型通读4条完整节点投影（2胜2负，共143节点），页字节和SHA保留external-pages/。每簇另9对及其他簇未读，代表不是全字段快照；簇仅定位，不据此命名/触发玩法。c6胜/负都在精英节点获得磨刀石，不能当购买对照。自有完整局四section本批未通读（0局），不声称完整剧本。

六个rk为shop的描述tag，不含hp/win/contrast收益数或行动命令；谓词只检查当前具名在售遗物/金币/牌组存在，详细兼容条件需读文字，不能把tag当已满足兼容或已胜出。交换rk文件是non-executable spec，state=waiting；冻结applies_to无event、predicate无event.options，绝不伪装成shop，不自行扩schema。文字event策略可用正文条件表达，仍待正式消费者。

knowledge候选使用scratch专用容器，现无该自定义格式正式消费者；7文字策略、6合法rk均未发布，未在生产工具读回。交换rk合同/消费者缺口单列rk-exchange-gap.json。7个情境的生产查询、自然采用/收益、正式账本/发布锁和科学父全部pending/open；候选完成不关闭父。已有黄金印/joint-budget等原条目不复制上线，旧机制ID只关联不重计新成果。

固定检查：生产parseStrategyLibrary通过7条；validateReflexEntry通过6条，6个在售正例/售罄负例符合，非shop/event题型不命中。仅固定scratch格式与谓词检查，未做原生产题回放、模型调用或正式读回。无源码改动，tsc/vitest/cases按本无源码批保持null。首次内存VIEW预备参数失败已保留说明并修正查询写法，不冒代码失败。原分片收尾SHA同、HEAD同；gitleaks对scratch扫描无泄漏，最终report/result另核。

完整来源账本source-ledger.json；逐情境处置context-mapping.json；覆盖coverage.json；候选逐ID状态candidate-status.json；输入验核input-verification.json；格式凭证candidate-validation.json。冻结前序计数只保留input_manifest.predecessor原4新/1更，不把旧成果作本批新增。本批新增非0，不触发连续两批0新增停产规则，不自行开下一单元。

## 机器结果（下块与result.json及最终回复相同）

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-191311-strategy-proposal",
  "base": "efc1a53795e5e13be1b89453659562b0d9cfcb20",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/report.md",
  "external_source": "issue51-decision-relic-001-20261024",
  "input_sha256": "0f219b1d35390d0ba8076e591b71fbee12c8ec0ff438e79680b4357b42c1fb14",
  "external_results": [
    {
      "id": "external-decision-relic-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-relic-skull-existing-poison",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-skull-existing-poison",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-relic-skull-existing-poison",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-relic-fan-current-attack-supply",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-fan-current-attack-supply",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-relic-fan-current-attack-supply",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-relic-chemical-x-owned-target",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-chemical-x-owned-target",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-relic-chemical-x-owned-target",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-relic-membership-reprice-current-cart",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-membership-reprice-current-cart",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-relic-membership-reprice-current-cart",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-relic-potion-belt-current-supply",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-potion-belt-current-supply",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-relic-potion-belt-current-supply",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-relic-whetstone-eligible-attack-pool",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-whetstone-eligible-attack-pool",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        },
        {
          "kind": "rk",
          "id": "silent-rk-relic-whetstone-eligible-attack-pool",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-candidates.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-relic-exchange-current-sacrifice",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/knowledge-candidates.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-relic-exchange-current-sacrifice",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/strategy-candidates.json"
        }
      ],
      "reason": "已落盘7个遗物决策情境：6个购买情境有文字策略/rk配对；1个真实交换情境有knowledge与文字，rk因冻结合同缺event题型waiting。100门槛比较0个；均为稀疏观察候选，未正式发布或读回。"
    }
  ],
  "own_support_runs": [
    "0PH64C4AWAX9",
    "32VSST9UX7MN",
    "3MPFJ1WYP8JJ",
    "72RFEYV6WNPA",
    "7X0W3U8TVA2A",
    "8FP19V1W4SRQ",
    "9TG1RP5LFAAK",
    "9Z9H2EXKLF3T",
    "AR523ATD2G4W",
    "C7LERZPCRFZ1",
    "DPYF2BAA3DKT",
    "G3TD6JEN47KT",
    "GXNKW8X1XYJP",
    "JLN5SK17W4FQ",
    "NBJBVSBNPYQB",
    "Q10YYQ5DUPJA",
    "TDLBRNA0R05B",
    "U084Q0B4EJSX",
    "VLZ6CCT8AQ0A",
    "VNSXWCWXR3VW",
    "Y5H4CFAQ2WTG",
    "YXY2RL1E83HM",
    "ZE2DNC29WWHB"
  ],
  "decision_output_counts": {
    "new_contexts": 7,
    "complete_text_rk_pairs": 6,
    "partial_contexts_rk_waiting": 1,
    "knowledge_candidates": 7,
    "strategy_candidates": 7,
    "validated_rk_candidates": 6,
    "rk_specs_waiting": 1,
    "same_id_updates": 0,
    "bytewise_reuses": 0,
    "aliases": 0,
    "external_aggregate_rows_retained": 119,
    "external_rows_for_six_purchase_contexts": 106,
    "comparison_contexts_reaching_100_per_group": 0,
    "formal_publications": 0,
    "production_consumer_readbacks": 0,
    "natural_queries_observed": 0,
    "natural_adoption": null,
    "benefit": null,
    "consecutive_zero_new_batches": 0
  },
  "partial_waiting": [
    {
      "id": "silent-rk-relic-exchange-current-sacrifice",
      "state": "waiting",
      "destinations": [],
      "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/rk-exchange-gap.json",
      "reason": "真实交换证据已落盘；冻结reflex-entry-v1.applies_to无event且predicate无event.options，不伪装shop、不扩schema。"
    }
  ],
  "context_mapping": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/context-mapping.json",
  "coverage": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/coverage.json",
  "source_ledger": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/source-ledger.json",
  "candidate_validation": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-191311/learner/runs/20261024-191354-f7cb1ebb-a82b-4570-aab5-773f644ce348-strategy-proposal/scratch/candidate-validation.json"
}
```
