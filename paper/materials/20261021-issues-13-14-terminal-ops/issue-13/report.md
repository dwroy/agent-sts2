# Issue #13：未建模卡牌研究报告

结论：EXPOSE、NIGHTMARE、SHADOW_STEP、STORM_OF_STEEL有可复核的限定候选；SPORE_MIND没有Silent施放证据，拒绝建零效果模型。R410原消费者仍有相应缺口。全部草稿未发布，未提交、未合入；正式实现与消费者读回继续沿原学习闭环，不新增审批门，不关闭issue或科学父要求。

## 输入与范围

- issue=13；batch=issue-13-card-models-20261021-111429；character=silent。
- 输入SHA256：`2086bf30cd40515a00a558b24e46c1108f2f8a563b60e9551f7a5a7f7d68b49b`，18份直接输入与共享知识文件/尾段核对通过。
- 本树HEAD=`e8811ce066141356035aaa10259b31f9dae88c7c`；运行时代码实际V6-R410=`5a295bb5ed52f0c0fa5e8c045dcfcba3d894b532`。差异只有AGENTS.md和docs/github-issues-workflow.md，二进制diff与SHA保存在runtime-base-to-worktree.diff/base-verification.json。
- 原R409=`cf4aff4ceebd958ad70b1512cc886c45bd8092aa`，126个材料清单成员逐一核SHA。原report/analysis-summary/manifest、83题结果及相关完整原帧均核查；原失败不改写。原R409的51/83本幕Boss全死、样本不足346等限制仍成立于其原版本，不由本研究修复为成功。
- 冻结403个已结束Silent局只用作来源资格；六局shadow清单完整覆盖。历史索引有界seek读到104个动作前帧/请求，42条历史链深核，加shadow23条EXPOSE链合65条。其余历史帧未全量研究，不能声称403局全机制覆盖。
- 日志只读冻结完整字节切点内。835条不同源行的path/offset/bytes/SHA/局号/层/回合保存在source-index.json；其中177条shadow证据以整行SHA与原日志精确匹配，无未匹配，不凭时间归属。流只封边界/尾段，full-prefix SHA为空，不声称全流已核SHA。
- 原消费者读取共享冻结升级知识；卡牌类型/target/keywords元数据来自原shadow manifest封存的单一data/game-data.json成员（SHA和用途见catalog-provenance.json），未从当前data/live或本树旧知识取值。该目录元数据只供原消费者机械读回，不能当新机制证据。未运行完整V6/Boss模拟。

## 覆盖与分母

| 卡 | 深核普通 / 升级动作 | 独立局 |
|---|---:|---:|
| EXPOSE | 21 / 16 | 4 |
| SPORE_MIND | 0 / 0 | 0 |
| NIGHTMARE | 6 / 5 | 5 |
| SHADOW_STEP | 5 / 0 | 2 |
| STORM_OF_STEEL | 5 / 7 | 4 |

完整覆盖、拒绝表见coverage-and-rejections.md与coverage.csv。六局shadow内：EXPOSE手牌70行/1局、实际23次（普通8/升级15）；SPORE_MIND手牌10行/4个局层回合键/1局、施放0；另三卡只有奖励候选。手牌行、回合、SL动作和局数不混算。历史before身份核过不代表其全部效果核过。

按原analyse.py统计口径完全复现A标签：EXPOSE208、SPORE_MIND60、NIGHTMARE11、SHADOW_STEP4、STORM_OF_STEEL4，另MIRAGE4、SIDESTEP4。EXPOSE208只来自1局13题；SPORE_MIND60只来自1局3题。B中868/378及baseline1054/459亦复现。baseline、候选、目标和样本都不增加独立局。七卡清单、83题逐槽路径、奖励身份与未核分支在shadow-unknown-inventory.json；额外两卡只列待办，不实现。

## 逐卡结论

**EXPOSE。** 7XS2Y920KA6E A10 F19T3普通清8挡并加2易伤，F30T1升级清18挡并加3易伤，F37T1只清目标1制品、加3易伤且两非目标制品保持，F45T1已有1易伤变4。更早ZZMYZ5UBCG72、HSX4HYATB4E2、P5HT1272P5SB原帧独立回查。深核37次/4局，21普通/16升级。牌面普通/升级Power2/3、费用0、消耗分别记录；手牌少一不独立证明进入消耗堆。R410原函数：普通known=true/vulnerable=2，升级known=false/vulnerable=0；二者均无清挡/清制品字段。因此不能只改known或只读变量当完整模型。silent-0066修普通易伤、silent-0217修升级预览漏消耗，与本次范围独立；沿silent-0208及原00a6a提案续接。

**SPORE_MIND。** 只见费用1、target None、空正文和变量、显示“消耗”或“昏眩。消耗。”，无真实Silent施放后继。其具体生成来源/实例和升级未知。历史索引唯一同名施放属于非Silent，拒绝借用且未读其原帧。保留unmodelled，models.json为空数组。不能从名字、空文本或其他角色推效果。

**NIGHTMARE。** 深核11次/5局，6普通/5升级，原施放结果pending保持原样，真实selection/choose及NIGHTMARE_POWER3另核。7次到次轮，4次未到：XTSV1U9JD34T同一F49的3次SL重载和1次最终死亡不计兑现/独立局。4Y94N8RDPGPM复制蛇咬+、突然一拳+、致命毒药+；9TG1RP5LFAAK普通版复制毒雾/后空翻+；P5HT1272P5SB复制富足；54G5683J0E5S复制步法+。同名4张可含原保留/抽到的牌，不算4次复制。致命毒药源带魂缚、次轮3同名牌无魂缚的限定观察保留；不推广所有附魔。步法复制到手时敏捷未因到手自动增加，不把到手当施放或收益。当前schema没有保存所选模板并延迟交付的表示；不能用立即adds或零效果替代。复用0140/0141/0385及原提案。

**SHADOW_STEP。** 本次5次/2局均普通，R0HEV5E3QT6G A0 F48T4全弃、SHADOW_STEP_POWER1，下一轮DOUBLE_DAMAGE_POWER1；K643VJCTQT0J A10补核4次，包含旧手中群蛇被全弃和先建立群蛇的边界。Cards=3在普通牌面未兑现即时抽牌。现有discardsHand/doubleDamageNext、rollout下一轮转换已存在，但known仍false；不能据此跳过联合消费者验证。升级及未知自动弃牌、伤害修正次序保持unknown。复用0033/0035与a770c提案，不再造同源bug。

**STORM_OF_STEEL。** 12次/4局：普通5、升级7；这些动作都将除本牌外的N-1张手牌换成对应普通/升级小刀。较早0NZXA12NLDMH普通1费、C7GNN3DDFUFY普通0费、32VSST9UX7MN普通1费及升级1费分别保存，不把临时0费推成基础0费。32VS F29换6刀净0挡、F30弃触不可及换6刀净6挡；K643 F35带奇巧/余像净11挡。不能写风暴固定6/11挡，内部自动/生成顺序仍缺证。已归档的71e742/c1dd614原提案以原SHA读回：前者只修升级手牌边界并停线，后者明确等待；69776普通0费原文也未建完整生成公式。动态刀数须在实际施放时按剩余手牌计算，静态adds不能无条件支持前缀离手。沿0455/0456/0458和原ID续接。

## 候选、异议与原提案

候选在 `knowledge/characters/silent/pending/issue-13-issue-13-card-models-20261021-111429`，每卡models和audit成对。模型对象遵循R410已发布CardModel接口，不创造可被误当已发布的新schema；不支持的清除、延迟复制、动态生成语义记录在审计/提案中。全部draft known=false，只有实际实现、固定原消费者验收后才可提升；这不改变生产普通EXPOSE已有known标志。正例是已观测限定证据，不推出通用充分条件。

4项限定/异议逐项含prior/finding/evidence/affected_ids/next_step，见disagreements.json。它们应由ops沿issue与原通知闭环处理；本批没有替ops/watcher/Roy填ACK，也不认为issue原文已获Roy确认。#14/#4只接卡牌模型依赖，不共同修改叶子。

根ledger.py经真实CLI追加5项update，登记研究proposed范围、新支持与原ID；没有重写旧status/version或标shipped。根code_proposals.py pending回执保存，复用已有同源未完成提案，**new add=0**。去重文件和原提案状态在existing-ledger-proposals.json；其中3份旧exp路径原文未在原路径/根保留路径找到，只把队列原summary/SHA/范围当索引，不冒称已读全文，不因此新建重复提案。升级风暴2份则从既有约2.4MB归档只读指定成员核SHA，未恢复整个checkout。CLI输入/输出/退出码/命令和读回见cli-receipts.json、ledger-update-input.jsonl；source_task=issue-13-card-models保存在真实账本note/来源稿中。

## 验证与可复现性

- 固定检查 `1804` 项通过，多数为逐行SHA/边界机械检查；涉及65条深核动作、单目标反例、延迟/未到次轮、普通/升级、旧手牌转换与精确牌面未知保护，不能写成1804个独立效果试验。
- replay.mts只调用本树原modelHandCard/offHandCardModel，有界单例，输出r410-consumer-replay.json。它证明当前解析结果，**未证明候选已经被生产消费者接受**；没有模拟损血/胜率数字，也未重跑R409失败或倒改原结果。
- derive.py检查原帧效果和研究guard；原消费者仍缺的行为作为诊断保留，不把当前缺口期望失败改成生产通过。未跑完整tsc/vitest、生产刷新、全量模拟、新模型/API或play，符合本研究任务限制。
- 复现按audit.py → history.py（固定单线程DuckDB只读）→ seek_shadow.py → replay.mts → derive.py。所有计算nice19/ionice3、BLAS/OMP=1，无线程/worker池。history查询索引可能随调度更新；已用的行/选择列表与本批全SHA索引已固定，精确复核应按source-index读回而非重新扩展发现集合。

## 继续工作

ops沿原ID分配精确实现，不由本研究直接发布：EXPOSE补升级变量与清除语义；NIGHTMARE补选择绑定/存活下一轮复制；SHADOW_STEP补已核普通资格及联合读回；STORM按实际弃牌数生成并保护未知自动分支；SPORE_MIND等新Silent证据。MIRAGE/SIDESTEP仅后续范围待办。之后运行原完整检查、合前知识冲突预检、开局边界发布核号、实际消费者读回。报告完成不代上线、自然采用或胜率改善；父要求继续未完成。

最终交付检查：正式跟踪文件差异为空，工作树仅新增指定pending目录；模型字段与已发布CardModel接口核对通过。公开评论草稿gitleaks退出0、无发现，尚未发送，由ops代发；回执见public-secret-scan.json。完整产物SHA清单见artifact-manifest.json。

版本补充审计：18个覆盖局的runs快照逐行SHA和冻结run-config字节引用见run-provenance.json。按原样保留reported commit/code/dirty；`current`及脏源码不解释为精确提交，run-config也不等于逐动作原生源码封印。游戏构建/补丁版本未封印，保持unknown。候选的R410原消费者读回与历史观测版本分开，未声称历史对局都运行R410。
