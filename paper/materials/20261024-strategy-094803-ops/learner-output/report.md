# #51/#54 poison 单流派学习回报

batch=20261024-094803-strategy-proposal；plan=issue51-build-playbook-poison-008；base=29c412febb8a65b72d208717723dfaf942b3041d。

本批processed：scratch落盘1个真实新流派剧本（8个内部观察段落，不拆分灌计数），不是正式发布。正式发布0、消费者读回0、自然采用0，own_support_runs=[]、runs=[]。无源码/代码提案/合入/行为版本；tsc、vitest、cases均null，未运行full、模型或游戏。

## 冻结核验和边界

从主根ops/codex-ops/learn.json只读提取本批external_source/external_binding，与派发身份、unit_ids、真实HEAD和冻结清单核同。input_manifest SHA 9056a6ad671d68fd8f423d3e4ac3a72de55514597bfd1e90186a135b0ef0757f；work_spec SHA 4fb708c293efe8e88700f18b047eec190a6d8c93e48b910754a9ed24935890eb；build manifest SHA ac5f0d359e445d4bf605681d67f403155e84f292bb19872903fa13b7bc3ea852。六个聚合和十份契约逐个bytes/SHA通过。所需五个历史精确文件按worktree_storage恢复，回执均为dispatch_base及对应blob；没有扩大历史/数据库输入。

已读README、最新STATE-2026-10-19、decision-log末尾、学习协议第9节、#27/#28/#42冻结契约（brain-strategies、schema、learning-code-proposals与统计发布契约）。STATE历史停点与后续decision-log接续同时保留；本批不操作STOP/队列/游标/live。

本批启动模型/effort/service tier的原生回执未在本任务中核验；脚本请求不当成原生已采用档位，实际用量/耗时留原启动器记录。本回报不宣称fast生效。

## 八簇选择

| 簇 | v0.111分母 | 核心原ID（按权重） |
|---|---:|---|
| 0 | 129 | ABUNDANCE w=0.2734 45/129=34.88%, PANACHE w=0.2355 35/129=27.13%, LEADING_STRIKE w=0.2183 88/129=68.22%, ACCURACY w=0.2168 66/129=51.16%, CLOAK_AND_DAGGER w=0.1923 75/129=58.14%, NEUTRALIZE w=0.1881 126/129=97.67%, STRIKE_SILENT w=0.1812 120/129=93.02%, KNIFE_TRAP w=0.1811 36/129=27.91% |
| 1 | 223 | BOUNCING_FLASK w=0.2873 85/223=38.12%, ACCELERANT w=0.2747 98/223=43.95%, DEADLY_POISON w=0.2740 130/223=58.30%, SNAKEBITE w=0.2724 142/223=63.68%, FOOTWORK w=0.1914 105/223=47.09%, NEUTRALIZE w=0.1878 216/223=96.86%, STRIKE_SILENT w=0.1875 214/223=95.96%, BURST w=0.1826 37/223=16.59% |
| 2 | 57 | SHOCKWAVE w=0.5425 51/57=89.47%, PHANTOM_BLADES w=0.1838 30/57=52.63%, PIERCING_WAIL w=0.1753 38/57=66.67%, PREPARED w=0.1677 33/57=57.89%, BACKSTAB w=0.1465 21/57=36.84%, NIGHTMARE w=0.1455 11/57=19.30%, WELL_LAID_PLANS w=0.1453 16/57=28.07%, BACKFLIP w=0.1428 32/57=56.14% |
| 3 | 224 | DASH w=0.2332 99/224=44.20%, CLOAK_AND_DAGGER w=0.2146 138/224=61.61%, PHANTOM_BLADES w=0.2113 112/224=50.00%, ACCURACY w=0.2098 115/224=51.34%, LEADING_STRIKE w=0.2076 143/224=63.84%, BLADE_OF_INK w=0.2038 68/224=30.36%, INFINITE_BLADES w=0.2030 107/224=47.77%, DODGE_AND_ROLL w=0.2015 95/224=42.41% |
| 4 | 350 | DAGGER_SPRAY w=0.2018 175/350=50.00%, LEG_SWEEP w=0.1875 150/350=42.86%, SNAKEBITE w=0.1855 158/350=45.14%, PREDATOR w=0.1819 121/350=34.57%, BACKFLIP w=0.1758 178/350=50.86%, STRIKE_SILENT w=0.1733 330/350=94.29%, PIERCING_WAIL w=0.1728 172/350=49.14%, ECHOING_SLASH w=0.1726 113/350=32.29% |
| 5 | 238 | BUBBLE_BUBBLE w=0.3230 156/238=65.55%, ACCELERANT w=0.2782 139/238=58.40%, NOXIOUS_FUMES w=0.2494 162/238=68.07%, MIRAGE w=0.1999 82/238=34.45%, SNAKEBITE w=0.1915 136/238=57.14%, HAZE w=0.1867 86/238=36.13%, OUTBREAK w=0.1837 67/238=28.15%, FOOTWORK w=0.1728 143/238=60.08% |
| 6 | 272 | FAN_OF_KNIVES w=0.2739 131/272=48.16%, ACCURACY w=0.2218 176/272=64.71%, BLADE_DANCE w=0.2130 175/272=64.34%, LEADING_STRIKE w=0.2129 189/272=69.49%, PHANTOM_BLADES w=0.2006 142/272=52.21%, INFINITE_BLADES w=0.1968 139/272=51.10%, CLOAK_AND_DAGGER w=0.1918 168/272=61.76%, HIDDEN_DAGGERS w=0.1796 124/272=45.59% |
| 7 | 246 | UNTOUCHABLE w=0.2691 144/246=58.54%, RICOCHET w=0.2565 143/246=58.13%, PREPARED w=0.2278 166/246=67.48%, DAGGER_THROW w=0.2120 116/246=47.15%, ACROBATICS w=0.1792 79/246=32.11%, NEUTRALIZE w=0.1790 238/246=96.75%, BACKFLIP w=0.1719 122/246=49.59%, HIDDEN_DAGGERS w=0.1673 80/246=32.52% |

核完8簇后选择簇1：高权重四ID含显式POISON文本，且代表轨迹记录同组ID的多种取得顺序。仅为毒相关ID组的操作名称；未获牌效/机制文本，不证明唯一毒流、纯毒打法或簇5不是毒相关。

簇5的高权重ID与簇1有ACCELERANT/SNAKEBITE/FOOTWORK重叠，未据此声称簇1穷尽所有毒相关玩法；只处理一个目标簇的完整20条轨迹，不扩任务。

## 完整阅读覆盖和独立分母

91个有界页全部保留原JSON、筛选、artifact SHA及页SHA，清单见scratch/page-inventory.json。八簇archetypes各1页；簇1五版本archetypes/timeline各1页；v0.111组合1161行共59页（每页≤20）、matchups 12行2页（8+4）、boss-semantics 9行3页（4+4+1）。代表轨迹一对一页，共10页，每局全18列、未截尾，共713节点，10胜10负，20个不同内容摘要；不等于20个独立玩家或20个经去重自然局。完整性逐项见scratch/trajectory-coverage.json。

| 页offset | 胜例（节点全范围） | 负例（节点全范围） | 页SHA256 |
|---|---|---|---|
| 0 | projection-40ed0656498ebe5e 1–49 | projection-a7d1a45b65eee902 1–15 | dd9a8e121276862fa39f419c88aaaaab15f91ddab4f11987605bb74430f239d4 |
| 1 | projection-6f1a785fb54b4210 1–49 | projection-e05868df228bc04b 1–7 | d73fb67e210741a1526b6ed1d4e28168c89f4b2c2dff7ce406613a8a68fed756 |
| 2 | projection-67064be025992be3 1–49 | projection-b47197e675bcc56b 1–8 | 461336e0de33512f0ed206339f99df271971fbf8f3480be40ae9479cee547a13 |
| 3 | projection-adacc9b017954650 1–49 | projection-59420de19fd0b489 1–9 | 64f93db62ab63536d084d56f99a9ec6f3a238f67362475249a020ff35032ab16 |
| 4 | projection-f9ea71f22071a180 1–49 | projection-92f2215255e10258 1–25 | 1a1dc72fff5e56d587f778dc32d855595791c357c02e1404bda38cdd19629c41 |
| 5 | projection-9a01895b898a7417 1–49 | projection-7f436238c2fbe45e 1–17 | ce7564a11b7a95d6f313eda49cce1ba5aa599e5fe306c57093cb36cf2f0a6859 |
| 6 | projection-66f51e61b86f3029 1–49 | projection-2b90dbf512a7fd29 1–30 | d17503e80ed5b0af9c902a21b6ba278a9dd81025ab8a54a5e0a55f94d912dd1b |
| 7 | projection-ee442e12d853ee79 1–49 | projection-4b3d02ee3f2115c0 1–33 | 6303a7165f8017d2fadc659b90239e4f24336dbaa94fdec5ff5364b374282220 |
| 8 | projection-b2f26caab97046d0 1–49 | projection-b38c65acc7c26588 1–48 | 1146ccd39e5b39610ceee498dc07177993d1358adbb760215ca14951bd143dce |
| 9 | projection-8610d8aed4d7255d 1–49 | projection-fd00c5f546b35a50 1–31 | 124174075568d3c49c5949b5fcf5f7f264f459345018d2cc7f15922b01b4d718 |

版本机制对照unknown，分别统计、不合并。v0.107簇分母360已足单组描述门；v0.108/109/110为85/89/68，各自小样本保留而不拉低本批v0.111合格描述范围。所有版本独立玩家数未知。

| 版本 | 全cohort原分母 | 簇1上传行 | 胜行 | 终局一致 | 胜例观察成型/一致胜例 |
|---|---:|---:|---:|---:|---|
| v0.107 | 2932 | 360 | 59 | 356 | 5/57 |
| v0.108 | 683 | 85 | 18 | 85 | 1/18 |
| v0.109 | 583 | 89 | 19 | 87 | 4/18 |
| v0.110 | 411 | 68 | 8 | 67 | 1/7 |
| v0.111 | 1739 | 223 | 42 | 221 | 8/41 |

## 剧本和关键观察

完整可读剧本：scratch/poison-playbook.md；结构化候选：scratch/poison-playbook-candidate.json。每项都有一句方向、幅度、原分母、一行范围，及独立的页SHA/节点支撑和反例。

- **core-identity**：毒相关ID可作构筑候选标签，不以终局簇号锁定当前打法。 簇1终局DEADLY_POISON 130/223=58.30%，SNAKEBITE 142/223=63.68%；整局胜42/223=18.83%。 范围：Silent A10/v0.111单人有效非弃局无modifier上传记录；终局描述代理，无牌效或因果判断。
- **core-pair-direction**：核心共现有正反向，搭配只作探索性候选，不下固定三件套命令。 ACCELERANT+BOUNCING_FLASK胜8/27、负6/27，出现率差+7.41pp/q=.877；BOUNCING_FLASK+DEADLY_POISON 6/27对6/27，0pp；ACCELERANT+DEADLY_POISON 8/27对11/27，-11.11pp/q=1。BACKFLIP+LEG_SWEEP 13/27对5/27，+29.63pp/q=.792。 范围：同簇同版本、末幕相同且终止节点差≤3的无放回配对；终局共现代理，不是胜率增益，双方均<100。
- **order-and-pivot**：按当前已得前缀保留转向余地，早拿多张核心不构成成型或安全证明。 前5节点至少两种四核心ID：胜7/10、负5/10，出现率差+20pp；平均种数双方同为1.6，差0；首5节点零核心的胜例1/10。 范围：20条选定代表轨迹，记录拿牌/所得/变形前缀代理；非完整牌组，不输出最佳拿牌顺序或转向时点。
- **act-checkpoints**：幕末参照同时看已得核心和防护代理，缺三件套不等于应继续强追。 41条终局还原一致胜例：幕1/2末六核心副本中位3→4，正block副本代理8→9；前三质心牌组合仅8/41观察到成型，33/41未成，另1/42胜例排除。 范围：只描述事后已观察下一幕且终局还原一致的胜例；六核心包含NEUTRALIZE，不能读成毒牌数或通过门槛。
- **failure-and-remedy**：拿到核心后仍要重看沿途资源；受伤、治疗和休息分别记账，补救收益未知。 代表负例终止幕1/2/3为5/10、4/10、1/10；INFESTED_PRISMS记录总受伤胜均18.9(n=10)、负均30.4(n=5)，差-11.5HP；胜例受伤最大60仍后续胜。 范围：选择性代表轨迹；精英暴露分母不同、整局结局含未来信息，仅资源消耗代理，不能指定更安全路线或某张补牌因果收益。
- **boss-preparation**：Boss准备分开核前节点HP与本节点代价，不从通过代理承诺安全。 KAISER_CRAB通过代理21/31=67.74%，总受伤均37.29HP；KNOWLEDGE_DEMON 22/27=81.48%，均22.78HP，相差13.74pp/14.51HP，组别有重叠且非等价比较。 范围：簇1/v0.111上传Boss记录；真实入场与净损失全缺，不排名克制；同场景指向已有Boss ID。
- **sequential-boss-preparation**：已记录连Boss路径要给后场保留审查项，前场通过不能代后场完成。 AEONGLASS→QUEEN后场终止3/9、终局胜6/9；QUEEN→AEONGLASS后场终止3/14、终局胜11/14；后场前节点HP均37.44/48.21，仅量级代理。 范围：簇1/v0.111的已观察第三幕路径；按路径原分母分列，不累计或推断最佳顺序，未知后场不作已失败。
- **jev-hp-budget**：Jev可参考分场受伤与治疗的观察范围；可承受净损和安全HP预算保持unknown。 AEONGLASS记录总受伤0–97HP(n=45)，治疗0–40HP；胜例前节点92、本节点受伤97/治疗34/末HP29，另一负例TEST_SUBJECT前节点80/受伤80/末HP0；不是可共用血线。 范围：仅附观察先验，不接求解器、不设阈值、不改出牌/药水/SL/终局规则；当前真HP、牌组及药水仍需本系统现场信息。

41条胜例幕末参照、每组27条的终局组合和每组10条的代表配对都未达比较组各100；保留方向性描述和探索关联，不把它们冒称满足单牌发布门。总簇描述分母223达到100的主候选1条，真正双方≥100的比较条目0。全体29518组合BH≤.05通过0；当前簇1161行通过0，最大正负差仍保留。

## 去重、限制与局部waiting

同场景的8个旧ID已在剧本逐项指向，旧原条目/证据完整保存到scratch/dedup-existing.json，更新候选0、重复拆条0。三个自有Boss条目的机制没有用本批外部无回合数据再次验证；旧单牌DEADLY_POISON/ACCELERANT的负向关联保留，簇成员身份不覆盖它。旧外部Boss尾部表也不借作本批新样本。不同口径一致性unassessed，未发现可在同一观测条件下判定的直接冲突；不自动写aligned。

机制语义、最佳转向、真实战前/场间/药水、历史机制对照、验证楼层、独立玩家、安全HP预算缺证。已有可算的拿牌前缀、前节点HP、受伤/治疗/正block数代理继续产出；无代理的牌效因果和安全预算子项waiting，不整unit waiting。所选20条没有幕3后场败例，后场失败计数仅来自路径聚合，不冒造代表反例。每项缺证表见剧本。记录序号不是floor；终局聚类/未来胜负不进当前trigger；不扩schema。

本批仅knowledge候选，不创建rk战斗规则或可执行策略schema条目；未修改combat/potion/SL/terminal行为，因此code_proposals、implementation_domains、proposal_results三个数组均为空。

## 数量分账与交接

候选1；真实新增流派条目1；更新0；旧ID引用复用8（非新增/非消费者读回）；旧单牌scratch新计数0；整个unit跳过0/waiting0，内部缺证waiting保留；正式发布0；消费者读回0；自然采用0。冻结work_spec没有提供前一流派零新增连续计数，明确unknown，不从旧单牌0造流派基线。本批新增非零，不触发两零停线，不开启下一批。科学父继续开放。

来源账本scratch/source-ledger.json包含各结论版本、2026-10-21采集日、URL/数据库SHA、输入与页SHA、完整筛选、许可限制、反向结果与未知分母；完整统计另附aggregate-statistics.json、derived-statistics.json、trajectory-statistics.json。formal_publication=pending、consumer_readback=pending，待原发布锁/账本/消费者/自然采用流程。

## 完整性回执

result.json为唯一结果对象；本报告末尾代码块按原字节嵌入，提交前解析两处并核相等。最终回复使用同一对象，不更改reason。HEAD保持dispatch_base，git diff --binary为空；仅本批scratch/报告产物，正式库和源码未改。校验详情见scratch/artifact-verification.json（若存在）。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-094803-strategy-proposal",
  "base": "29c412febb8a65b72d208717723dfaf942b3041d",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-094803/learner/runs/20261024-094847-1af4a5ee-6bb7-4019-96f5-e9da3dcc5059-strategy-proposal/report.md",
  "external_source": "issue51-build-playbook-poison-008",
  "input_sha256": "9056a6ad671d68fd8f423d3e4ac3a72de55514597bfd1e90186a135b0ef0757f",
  "external_results": [
    {
      "id": "external-build-playbook-poison-001",
      "state": "processed",
      "destinations": [
        {
          "kind": "knowledge",
          "id": "silent-external-poison-build-playbook-c1",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-094803/learner/runs/20261024-094847-1af4a5ee-6bb7-4019-96f5-e9da3dcc5059-strategy-proposal/scratch/poison-playbook-candidate.json"
        }
      ],
      "reason": "已核冻结身份与全部SHA，核读8簇后选毒相关ID簇1；完整读取v0.111的10对20局713节点，落盘1个新流派剧本候选及来源账本，引用8个既有ID。组合比较每组27条未达100且BH未通过；机制、最佳转向时点和安全HP预算局部waiting。正式发布及消费者读回pending，自然采用0；未改源码或HEAD。"
    }
  ]
}
```
