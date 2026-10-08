# 静默猎手策略任务回报

记录时间：2026-10-08 03:15:29 +0800。任务scratch：20261008-025837-strategy-proposal；实际调度batch：20261008-025836-strategy-proposal。

本次派发10项全部逐项waiting；重新核对六局原始证据、十份保存Markdown、19项角色经验、26项账本及固定base/live源码，没有新增策略源码。具体旧规则、新行为、反例和验证方法已落在本目录proposal.md及逐项原稿副本。

完整40位base：1a7884c9a76a9bbe5deed9b4488164a45b3acfc5；源码核验固定live：d17f38562a4bc1ae3d2a7c4b0a9c294e764ef665。开工工作树干净，git merge --no-edit main无冲突；这个基线合并不计本批实现。最终HEAD必须仍为base、工作树干净。无新增源码提交、无live合入提交、无eval版本，fixes=[]、merged=null。已有其他批次的源码和失败历史保持，不归本批产出。

六局在runs.jsonl及所读状态中均核为SILENT A10；只解析指定六局。直接从只读logs重新抽取3432帧状态和3306条决策，六局原状态SHA256与前014012任务逐字节一致。原稿十个SHA256全部与队列一致，只读本次proposal_ids；未派proposal_repair，不消费其他待处理ID。

源帧核验结果：F35/F43神化7→5能量、手牌已观察升级、F43同序列实51伤/13损且场外deck不变；CA5F13力量0/4/8及喷水11/15/19；5PMF39无毒目标冒泡只实扣1能而玩家/敌状态不变；61E2负敏捷双防御3+3、F23本体线实扣47/损15且幻象次轮2血仍攻击；DUZF30睡3/2/1及醒来后4力/22攻；8JRE原/替线同指纹与已有选线文本/首步派发均已断言。证据校验退出0与追加9组断言属于只读数据核验，生产测试cases=0。

神化的631帧抽牌堆聚合文本/4761个聚合条目确实存在，但未保存逐卡dynamic_values。已观察普通/升级差值可供限定模型开发；当前base与固定live均没有APOTHEOSIS模型及传播接线，UpgradeDelta缺fasten、enemyTempStrengthLoss、poisonPerTurn、poisonExtraTriggers。未知附魔/升级及完整跨抽弃验证仍缺；本批不把缺完整胜局当作禁止修纯数值模型的理由，也不把局部转换拼作完整实现。

核验纠偏：combat-plan.ts:4423的chosen_order取rollout里的order.label，语义是击杀顺序。8JRE单敌缺该值不能支持“没有出牌顺序”的结论；日志已有journal.choice、decision_id及首步派发。候选原答/护栏/SL各阶段和重规划执行边界的完整审计是另一缺口。该澄清只写本次提案/报告和CLI附注，没有重写历史复盘、改变选择规则或添加游戏机制。

## 每个派发ID的处置

| ID | 证据局号/层/回合 | 账本 | 处置与具体缺数据 |
|---|---|---|---|

| silent-proposal-89354805ee4d7e77 | VLZ6CCT8AQ0A F35T1/F43T1—2/F45T1 | silent-0237, silent-0238 | waiting：缺未知升级/附魔的逐卡转换及跨抽弃完整覆盖验证；当前模型无APOTHEOSIS接线，UpgradeDelta缺勒紧、临时减力、毒雾与触媒字段。已观察差值可供限定模型开发，但未覆盖部分保持未知，不能将局部模型认作整体完成。 |

| silent-proposal-f2bfceddb1898dca | VLZ6CCT8AQ0A F43—45/T1、T4—5 | silent-0106, silent-0019, silent-0201 | waiting：成熟度展示子项已是live祖先45161a51c2c6b7e4a499b13cf749c4108193bbf5；缺相同总预算、固定随机输入的MC分配对照与候选稳定性曲线，且神化传播仍未覆盖。单次用时不足以拟合预算或药水血价。 |

| silent-proposal-283a164780d11e69 | VLZ6CCT8AQ0A F35T1/F43T1—2/F45T1 | silent-0237, silent-0238 | waiting：与89354805相同的完整升级传播缺口；保留经验来源链。已有升级勒紧子项不等于神化的状态变换已实现。 |

| silent-proposal-ebbfe3b97548756d | VLZ6CCT8AQ0A F43T1、T3—5/F44/F45T3、T5 | silent-0005, silent-0016, silent-0049, silent-0071, silent-0143, silent-0046, silent-0053, silent-0027, silent-0011, silent-0021, silent-0106, silent-0204, silent-0020, silent-0019 | waiting：升级勒紧子项5e80e683daa08ae2569733b3b541cb523d7fe861已是live祖先；14账本/15经验的请求缺升级、持续输出与资源共同冻结的复合验收，不能以子项关闭整体。 |

| silent-proposal-e5b87be50f28f311 | 8JRE1C4H4Z2W F33首/三试T2、二试T5、末试T11/F17T6 | silent-0079, silent-0021, silent-0125, silent-0018 | waiting：缺按同一观测关联的原答、护栏后、SL后候选快照及重规划分段的完整固定执行前缀，无法验收请求的端到端审计或拟合阈值。chosen_order实际是击杀顺序label；单敌无值正常，不能据此声称出牌顺序缺失。 |

| silent-proposal-49632bc4878fb597 | CA5KE8GFJ9X2 F13T1、T3、T5 | silent-0005, silent-0231 | waiting：该局未取得步法，缺力量、敏捷、虚弱和独立成长共同冻结的完整调用及源码对照，不能把现有属性子项认领为复合提案已完成。 |

| silent-proposal-66532328a585941f | 5PM6JAQG6FNQ F39末试T2/F33T1—2 | silent-0021, silent-0009 | waiting：缺相同血量、构筑及抽序下不同启动顺序的完整结局和可复现收益函数；F33胜与F39败不能拟合启动阈值。 |

| silent-proposal-43a76a31ba7bdcfa | 61E2QS63Y9WU F17T5—7 | silent-0030, silent-0027 | waiting：缺相同起始资源、完整抽序和另一可救活SL线路；本次首试获胜不足以改变SL范围或换线偏好。 |

| silent-proposal-5264153a4a4b0e5c | 61E2QS63Y9WU F23T1—5 | silent-0039, silent-0209 | waiting：缺A10召唤、航行、复活的完整组合调用与另一目标序后续实打；敌HP审计3f69541b5d3259dac94d3395bfe3da47936b4de9只覆盖子项，不证明完整目标排序请求完成。 |

| silent-proposal-bddfa690a84e03d0 | DUZUBAJ3A8GP F30T1—6（四试） | silent-0128, silent-0079 | waiting：当前进阶后轮伤害子项c7578f37608526591edd86041cee5a28c3894fee已是live祖先；缺睡眠、受击眩晕、醒来的完整组合验收，以及同抽同资源的完整获胜对照，不能拟合血价或固定首杀。 |

## 验证、提交和上线

本批未改源码：撤源码失败/恢复通过未执行，tsc、vitest和bash tools/test-sandbox.sh未运行，JSON为null/null/0；未发生测试超时或重跑。证据断言不当作生产测试通过。没有源码提交，不触发代码提交前测试、gitleaks、英文提交信息或Co-Authored-By；不冒造成功。

merge=live配置已核；本批无待合入新源码，按无改动流程不进入live锁/刷新/merge/合后检查，不新增decision-log上线行或eval版本，不登记implemented、duplicate、shipped。已核四个子项源码45161a51c2c6b7e4a499b13cf749c4108193bbf5、5e80e683daa08ae2569733b3b541cb523d7fe861、3f69541b5d3259dac94d3395bfe3da47936b4de9、c7578f37608526591edd86041cee5a28c3894fee确为固定live祖先；它们只覆盖子项，未用于关闭整体提案。

本批所有角色行为保持等价；未调LLM/网络、未运行play、未停对局、未安装依赖、未推送、未读key/.env/游戏二进制。怪物当前进阶首样本和房间代价五样本门槛未改，未将未观察进阶或其他角色知识用于结论。原帧均是发现/复核样本，重打不扩独立分母；策略阈值/目标/SL偏好尚需独立后置完整对照。

## CLI登记与运维交接

根目录learner/ledger.py update退出0，追加26项本次提案链接，by=learner:strategy-proposal；未上线条目为proposed，已有shipped经验不降级，不重复support/repeat。原十份注册输入经根code_proposals.py add --character silent再次去重验证，均返回原CLI ID，未新增无关队列项、未直接写队列状态。proposal_results交调度器逐项消费waiting，保留待新证据重派。

交运维提案：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-025837-strategy-proposal/proposal.md。报告：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261008-025837-strategy-proposal/report.md。本批没有可登记shipped的源码或版本；下一次按每条列明的缺口补数据和固定调用，不重复历史复盘。

保存文件：batch.json、dispatched-proposals.json、十份原Markdown与十份registration.json、ledger/experience快照、states/decisions.numbered.jsonl、verify_evidence.py、run-metadata.json、evidence-manifest.json、evidence-verification.log/rc、additional-verification.json、turn-opening-summaries.json、source-verification.json、ledger-update输入/日志/rc、registration-results.json、proposal_results.json、report.json。定位初稿错误及更正另存lookup-notes.md。最终账本与机械报告核验见final-verification.json；这些检查不算tsc/vitest。
