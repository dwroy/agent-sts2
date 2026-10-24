本批 20261024-161310-strategy-proposal 的冷启动补证已完成候选交付：4条新策略、1条原ID更新，覆盖5个独立情境；旧分组知识另复用1条，不计第六情境。数量目标5～10已达，科学父仍开放。formal_publication=pending、consumer_readback=pending；正式发布0、生产工具读回0、自然采用0、收益验证0。

取证/记录时间：2026-10-24T16:30:29+08:00。HEAD=66a67f2bc8fa808414ffa2f61bd775a57d1bc2ad，与dispatch_base相同，git diff --binary为0字节。learn.json本批external_source、external_binding、manifest SHA与5223字节work_spec SHA均核同，记录见scratch/input-verification.json。仅scratch和本批报告产物；未写源码/正式库/共享状态/正式学习账本，未合入main/live，未启动模型/MC/Jev/游戏/full或tick，无源码提案、fix或测试任务。tsc/vitest/cases均null。tui参数不代原生turn_context；本轮未核原生模型档位/tier、用量或耗时，不报告其生效。

冻结来源核验：11片新transport文件逐片大小/SHA全部核同，读后再核无变化；六原始流头部身份和原source_size边界核同。7片当前nlink=1，其他片仍多链接；原路径后续压实可使链接计数下降，不能据此宣称当前仍全为多链接。初次额外nlink>=2假设失败已记录，实际所有字节/SHA一致，始终仅rb/read_parquet读取，未改请求/登记/证据。外部7个聚合输入SHA核同，外部数据库/逐玩家数据/玩家标识读取0，新下载0。完整来源、大小、SHA及边界见input-verification.json、evidence-audit.json。

自有主证据为原冻结506名单，A10为466（无重试证据123、retry_or_predicted_death343）；其他进阶40逐组列出，版本保持unknown。Z2、KF9排除，BP9与后续局未纳入。内存DuckDB threads=2，显式列11片路径并先按allowed506和off+len<=原切点过滤，沿现有room/fight视图统计；未init/sync共享库。程序覆盖321328个冻结帧索引、4017段第一幕战斗，2533候选决策原行；完整实选开局选项505局（D2JR3FN0VYH5仍缺），1510次前三真实遭遇奖励，450局首Boss首记录COMBAT T1帧。原候选11条因未完成4条或同题时戳帧缺7条排除，见decision-exclusions.json；继续/离开题不作祝福比较。12条旧卡奖题文缺类型的问题由同题原状态补足，非按卡名猜机制；20条文本规范化诊断含skip，typed题文与实际type冲突0。

所有1510奖励动作均以原状态card_options和后继牌组核实：1471次拿牌恰增加1张对应原ID牌，39次skip牌组不变，skip涉及35独立局。450首Boss帧全部T1，牌组/HP取该战首帧，排除Boss后奖励；56局无此帧不补。过首Boss以后续出现act>=2的记录对齐，506终帧均GAME_OVER且胜负与名单一致；它可包含SL后的最终通过，不冒作逐试胜率。首次截止另用首条predicted_death日志ts作代理，未把预判等同真实死亡；所有入本轮奖励与Boss帧都早于该代理截止。SL触及战斗的原视图掉血/使用次数不当单次代价。统计详情保留无重试、实际重载/attempt>1、预判必死组合及其他进阶；这些未来分层只审计、不作在线触发。

候选按以下稳定ID去重；完整正文分别在scratch/candidates/，统计/局号/原引用在evidence-*.json、source-ledger.jsonl、per-context-mapping.json。单个JSON内的统计行、段落、别名不另算条目。

| 情境 | 处置 | 稳定ID |
| --- | --- | --- |
| golden | update | silent-brain-opening-golden-pearl-external-comparison |
| first_reward | new | silent-brain-first-combat-reward-type-comparison |
| later_block | new | silent-brain-early-block-after-attack-prefix |
| skip | new | silent-brain-first-three-combat-skip-check |
| preboss | new | silent-brain-first-boss-power-hp-review |
| golden | reuse | silent-external-cold-start-ancient-build-associations |

开局更新沿原GOLDEN_PEARL策略ID，实际42次选择的后继记录均+150金币、HP/最大HP未变（含A3的1局另账）；A10无重试证据选择4/9过首Boss，对同台未选1/2，整局两组均0胜。有重载且预判必死层26/31对9/11过首Boss，另有选择组1局只有预判必死无重载、未过关。外部v0.111.0整局34/111对24/110（+8.81点）与自有端点/版本不可互换；v0.108.0的8/31对14/42（-7.53点）、v0.110.1的4/20对8/31（-5.81点）保留为旧build反向结果，机制对照未知，不跨版本合并。不从金币差直接推断商店或首Boss收益。原两候选/旧processed、failed、rc0身份不改；原另两单元1/2候选均不动。

首战有Attack可选的A10无重试证据，拿Attack43/65对其他14/33过首Boss（+23.73点）；重载且预判必死层152/194对65/78（-4.98点），单独有预判无重载的其他组0/1不并入。这个方向反转不支持固定牌型排名；原type=Skill的牌也可能有牌文中不同用途，不能把type直接当伤害/防御能力。

第2～3战已拿Attack奖励前缀、且本题有明确格挡文本的每局首个机会，A10无重试证据取格挡6/18对其他29/46（-29.71点）；重载且预判层48/58对110/142（+5.29点）。这是不同于首战的资源补充情境。前缀未涵盖事件/商店/删改牌，不是完整伤害能力；格挡正则只作代理且包含DASH等Attack，不冒称防御牌全集，不写固定补牌顺序。

前三卡奖有skip的A10完整三奖励局，无重试证据7/15对无skip58/104过首Boss（-9.10点）；重载且预判层14/19对256/318（-6.82点），另有无重载的预判层无skip0/1单列。三奖励齐全是事后统计纳入条件，不能要求当前题知道未来奖励；成功skip与失败拿牌例均保留，未认定跳过动机或因果损失。

首Boss首记录牌组含Power、A10重载且预判层，HP<=半最大HP的10/25过关，对较高组202/226（-49.38点）；首次截止代理分别7/25和183/226。无重试证据的低HP且有Power组0局，不能补为0胜或作通用阈值。32/70成功与41/70失败反例均核；Power类型不等于成型，半血仅描述分箱，不是安全线/触发安全保证，也无最低可行牌组。

达到外部各臂100门槛的比较保留1组（原v0.111.0 GOLDEN_PEARL 111/110），本轮新增外部合格比较0；自有不套用外部100门槛，稀疏分层、零分母明确未知。new=4、update=1、reuse=1、unique_contexts=5；reuse与update共享开局情境，候选文件共6但非6个独立成果。冻结前批新增2，当前真实新增4，连续零新增计数0；不扩单元或重开旧Boss/刀009。

模型实际读回与程序覆盖分账：28个情境片段记录/18个不同自有局，包括16个开局/奖励片段、4个首Boss完整牌组清单与8个无重试奖励正反例。只核这些选中字段/片段及统计，未读506完整局或114代表的四section，whole_own_games_four_sections_completed=0。外部经manifest核SHA的有界reader读v0.111簇0一对匿名代表，49+49=98完整节点及元数据；簇号无玩法命名、不作完整流派剧本。赢家第三次战斗节点出现all-false奖励仍过首Boss，输家前三战均拿牌也过首Boss，说明代表抽选例不能替代自有总体比较；商店all-false未作skip，Boss节点所获牌未倒填战前。其终局牌组只用于对照数据局限，不用于触发。外部另读GOLDEN_PEARL各build有界统计页；玩家独立性未知，上传局数不算自有支持。

来源取证窗口全部按offset/bytes/source_size/SHA留账：4998个独立原窗口（2533 decisions、2465 states），共208766705字节，重读SHA核同。未把17GB状态流或全量状态副本放入上下文，未导出外部玩家标识。raw-read-references.json可沿单行回核；本轮使用现有索引seek，未调用无边界extract_evidence。后续若用extract_evidence必须单流--source-size按该表原截止，不能默认新流大小。

#27/#42冻结策略/来源合同和#28回放合同逐项核，#55现行消费者合同按manifest SHA使用。正式40条策略及经验/reflex逐字节与HEAD核同：具体BLADE_DANCE/FOOTWORK前缀策略和第2/3幕skip为相关但不同情境，不覆盖成同一证据。旧祝福策略同场景沿原ID更新；旧知识逐字节复用。外部反向build、自有版本未知与SL分层反转均入库候选/来源账，formal/effect仍未知，不强称支持旧假设。原始对照与差异详见contract-overlap-audit.json。

本地生产parseStrategyLibrary已解析5条，正文557～624字节；只读固定检索可取到合适粗范围的候选。原tsx CLI曾因沙箱IPC listen EPERM失败，改用node --import tsx loader完成同一离线解析，不改权限/依赖；没有重跑full。gitleaks scratch扫描0泄漏。此检查不等于正式生产kb_strategies读回；现行trigger不支持真实战序、奖励前缀/Power类型数，正文明确先核当前情境、不能核时不适用。当前第1幕/楼层字段只是粗筛，实际调用方还要遵守正文范围；不能把检索命中当范围证明。knowledge旧候选的历史scratch引用/专用消费者仍待原owner适配；rk没有原Plan/完整逐候选结果/留出回放，不补条目或开#28。

下一步仅由原ops/发布owner沿既有发布锁、实际学习账本和正式库消费者链核真实范围后接续。候选配额完成不关闭#51科学父、不声称已向主管或Roy送达；报告与subitem-dispositions保留各缺口，原通知/ACK不代填。

最终结果如下，代码块字节与result.json相同；最终回复也须原样使用此JSON。

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "code_proposals": [],
  "implementation_domains": [],
  "proposal_results": [],
  "batch": "20261024-161310-strategy-proposal",
  "base": "66a67f2bc8fa808414ffa2f61bd775a57d1bc2ad",
  "runs": [],
  "fixes": [],
  "merged": null,
  "tests": {
    "tsc": null,
    "vitest": null,
    "cases": null
  },
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/report.md",
  "external_source": "issue51-decision-cold-start-own-20261024-002",
  "input_sha256": "3aa655c3f4dd5213b6ede735f76cf999ec6186291148c5d894a9258b75eaed5f",
  "reason": "完成5个独立冷启动情境：4条新策略、1条原ID更新；另逐字节复用1条旧知识，不计新增情境。自有与外部分账，配额达标；正式发布、生产读回、自然采用和科学验收均pending。",
  "own_support_runs": [
    "01H1533KSS5C",
    "08A0GEAL8KQ5",
    "0DJ6GFZZ0TG9",
    "0NMF36KX3F7Y",
    "0PH64C4AWAX9",
    "0VBCQS9V0N87",
    "0YQJ9D1MC4NK",
    "1269Y20SKHUM",
    "1303HVDLVMGR",
    "177AS39M1UPW",
    "2GFAPDBDNSCR",
    "2K4H3JEJHRSB",
    "4AA19CXDKQK6",
    "4YPGHGJD393H",
    "6D0M76419BU7"
  ],
  "decision_output_counts": {
    "new": 4,
    "update": 1,
    "reuse": 1,
    "unique_contexts": 5,
    "target_min5": 5,
    "target_max10": 10,
    "under3_report_required": false,
    "target_met": true,
    "quota_gap": 0,
    "strategy_candidates": 5,
    "knowledge_reused": 1,
    "rk_candidates": 0,
    "comparison_groups_ge100_both_arms": 1,
    "new_external_comparisons_ge100_both_arms": 0,
    "threshold_scope": "仅保留原v0.111.0 GOLDEN_PEARL 111/110局比较；自有不强套100门槛，所有稀疏分层明列。",
    "predecessor_new_count": 2,
    "consecutive_zero_new_batches": 0,
    "scientific_acceptance": "pending",
    "remaining_gaps": [
      "精确战序/早期奖励前缀/Power类型数不在现行trigger白名单，需按正文核当前情境；不明不适用。",
      "自有版本unknown；外部机制版本对照未知；观察性混杂、首次预判必死代理与真实首试仍有差别。",
      "1局开局完整选项、56局首Boss前帧缺口保留；没有最低可行牌组或安全资源阈值。",
      "knowledge正式消费者、rk原Plan/候选结果/回放缺口；正式发布、生产工具读回、自然采用与收益均未完成。"
    ]
  },
  "external_results": [
    {
      "id": "decision-cold-start-own-fallback-002",
      "state": "processed",
      "destinations": [
        {
          "kind": "strategy",
          "id": "silent-brain-opening-golden-pearl-external-comparison",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/candidates/silent-brain-opening-golden-pearl-external-comparison.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-first-combat-reward-type-comparison",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/candidates/silent-brain-first-combat-reward-type-comparison.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-early-block-after-attack-prefix",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/candidates/silent-brain-early-block-after-attack-prefix.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-first-three-combat-skip-check",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/candidates/silent-brain-first-three-combat-skip-check.json"
        },
        {
          "kind": "strategy",
          "id": "silent-brain-first-boss-power-hp-review",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/candidates/silent-brain-first-boss-power-hp-review.json"
        },
        {
          "kind": "knowledge",
          "id": "silent-external-cold-start-ancient-build-associations",
          "path": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261024-161310/learner/runs/20261024-161406-30519cee-4072-4a48-9dcd-3d909aba5f47-strategy-proposal/scratch/candidates/silent-external-cold-start-ancient-build-associations.json"
        }
      ],
      "reason": "完成5个独立冷启动情境：4条新策略、1条原ID更新；另逐字节复用1条旧知识，不计新增情境。自有与外部分账，配额达标；正式发布、生产读回、自然采用和科学验收均pending。"
    }
  ],
  "subitem_dispositions": [
    {
      "id": "opening_blessing",
      "disposition": "updated-and-reused",
      "destinations": [
        "silent-brain-opening-golden-pearl-external-comparison",
        "silent-external-cold-start-ancient-build-associations"
      ],
      "reason": "GOLDEN_PEARL复用原策略ID更新，增加真实开局备选/选择/资源前后与自有分层；旧分组描述知识逐字节保留。1局开局完整选项仍缺，跨版本机制等价未知。"
    },
    {
      "id": "first_three_fights_card_types",
      "disposition": "new-candidates-with-proxy-limits",
      "destinations": [
        "silent-brain-first-combat-reward-type-comparison",
        "silent-brain-early-block-after-attack-prefix"
      ],
      "reason": "1510卡奖以原状态card_type/牌文和后继牌组核实；首战牌型与第2～3战已有Attack后补格挡是两个不同决策情境。前缀/格挡正则均明标代理，分层方向反转；无统一固定拿牌顺序。"
    },
    {
      "id": "skip_and_act1_boss_result",
      "disposition": "new-candidate-with-observational-limits",
      "destinations": [
        "silent-brain-first-three-combat-skip-check"
      ],
      "reason": "39次真实skip/35独立局；三次奖励齐全主比较按独立局去重，A10无重试与重试层分别保留。未据负关联禁止跳过或声称因果收益；动机未知。"
    },
    {
      "id": "pre_act1_boss_deck",
      "disposition": "new-candidate-with-resource-proxy-limits",
      "destinations": [
        "silent-brain-first-boss-power-hp-review"
      ],
      "reason": "450首Boss首记录T1牌组与HP，不包含Boss后奖励；56局无首Boss帧不补造。Power类型与HP观察分箱分层，无最低可行牌组/安全HP线；首帧不是原子入场。"
    }
  ],
  "publication_counts": {
    "formal": 0,
    "production_consumer_readback": 0,
    "natural_adoption": 0,
    "benefit_verified": 0
  },
  "scientific_parent_closed": false
}
```
