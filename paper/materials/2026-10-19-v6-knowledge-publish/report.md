# Silent V6 知识发布（部分交付）

请求 `roy-20261019-v6`；批次 `v6-knowledge-publish-20261019-223156`；代码基线 `601160a34f130bf16c73e61078a90ffe97a724c0`。本批只复核封口结论，不新增游戏知识、不重新拟合、不读取在途核心R2/reflex R3、不运行模拟、在线模型或游戏。

已发布子集为 **19 条方案动作标签、7 个既有枚举**，效应数值仍未知。4方向/14组合未发布；244条正式经验原字节保持。main=de4e1deee010b1250dddf910c5b11808e10aa25e；live未核、未同步。消费者固定读回可读取并进入题面，不等于对局采用或收益；父要求未关闭。

## 冻结来源

冻结清单 SHA256 `00723648cc68127f91e67a988b4a77ca26782832d94fb91d37a8a5c1106710c7`；16份直接输入全部SHA/字节通过，1448份结果所引用的封口材料全部SHA通过；372局均在原角色Silent已结束库存，244经验全量覆盖。

- 实际采用输入 `/home/dw/Projects/agent-sts2/.worktrees/v6-build-cores-20261019/knowledge/characters/silent/pending/v6-build-cores-v6-build-cores-20261019-1838/draft.json`，SHA256 `a4755da27f3d35b7592a7b936ebc8c92ac45797aaab0dce3ea580e418a8e3137`。

- 实际采用输入 `/home/dw/Projects/agent-sts2/.worktrees/v6-reflex-distill-r2-20261019/knowledge/characters/silent/pending/v6-reflex-distill-r2-v6-reflex-distill-r2-20261019-1913/draft.json`，SHA256 `1b2e1ebf63de20f826a890bf13dcce293328003ee97bc5af5271e60c9a8b3b36`。

验收报告本身只证明来源、结构及其明示范围，不能替代科学证据。原报告、context、SHA清单和代码基线均保存；没有以R1/R2名称判定可发布。原始日志重seek1979段，共63529458字节，逐段SHA、Silent身份、局号、层、回合一致。每条已发布reflex全部原观察均有见证，n_support=独立原证据局数=metrics.n，无分母删减。7枚举全部原观察亦已匹配。

## 发布/排除与格式转换

| 对象 | 实际处理 | 依据 |
|---|---|---|
| build-cores.json | 仍不存在，4方向/14组合pending | R1当前校验123项失败：旧分版本/进阶主统计、缺现行两份池化指标/来源原计数/A10双折算与收缩/可执行前提。不能在发布时重拟合或补null/零来伪造口径。 |
| reflex.json | 抽取19个原entry，包装reflex-file-v1 | 原ID、顺序、predicate、signal、confidence、证据、scope和关联字段完全相等。 |
| reflex-vocab.json | 抽取7个被正式reflex引用的原member，包装reflex-vocab-v1 | 保留原维度、原ID、标签和全部证据；未另定枚举评分。 |
| experience.json | 无变更，244条原字节相同 | 没有本次已发布方向/组合，故不添悬空cores/combos，不动原正文/证据等字段。 |

85条reflex中66条pending，逐条理由见publication-decisions.json。主要阻塞为核心引用未发布、谓词没有按option.actions匹配、原观察无法匹配来源见证；原因可重叠。共享枚举silent-r2-explicit-legality的MEXYTC0Z2MQQ/F17/T1缺可匹配原见证，故枚举及依赖它的3个原本合格reflex一同pending，没有为发布删该观察或替换枚举。全部21个词表member逐条有去向：7发布、14pending。已有正式三文件原来不存在，无覆盖/删除旧条目。

原草稿固定入口使用完整244条经验/372局context：核心退出1，reflex退出0。原core/reflex包装均为内层严格对象，未复制draft外壳。对正式包装用实际loadV6Knowledge：Silent reflex/vocab loaded，cores/directions missing。缺文件检查为missing，无别角色或公共回退；铁甲、Regent、Defect、Necrobinder均未读取Silent文件。核心未发布导致方向规划、组合商店/休息/拿牌无法声称读回；冻结基线没有W5/W7最终接入，依赖其owner提交及合入核验，本任务不实现消费者。

## 科学边界与完整性

所有描述性观察仍design=observational；19条signal保持原tag，未把可发布数值降为标签，原R2本来就有0个可直接发布数值。原n/误差方法/频率分母及未知效应值经published-reflex-audit.json按ID明确关联，不私扩严格signal。频率n=0只是原稿实际观察分子，效应及SE仍null；不是缺字段补0。高损失、负向对照、删失、反例、旧异议保存在已核SHA的原sidecar中。

核心R1原分层统计和所有未知、12项缺证类别均保持原稿；本批没有声称已经保留为现行池化主统计、A10双折算或收缩，因为冻结版本根本没有这些主统计。待定不能变成“格式通过即科学有效”。经验全量244行覆盖见full-experience-coverage.json：保留原core/reflex覆盖原文、每条去向及19条部分读取，不缩小validation-context的分母。

## 固定消费者读回

实际入口：loadV6Knowledge → loadCombatEntries → combatEntryAudit → projectCombatDecision。每条以原SHA状态帧中的手牌构造一个明确固定候选，不称该固定候选是当时dispatch；计划outcome缺字段保持未知，无模拟。每条分别验证：匹配方案true→题面含signal、标签、confidence、n_support及来源；空动作false→不挂；缺方案unknown→不挂。未观察进阶99不挂；四个其他角色均无本角色私有文件。输入/输出SHA、原状态字节引用、命中ID、完整正负未知输出均在worktree-consumer-readback.json；main读回独立保存main-consumer-readback.json（只有实际合入后执行）。

拿牌、商店、休息、药水未移入单牌信号：全部正式项applies_to=combat_line。directionSummaries/directionTask收到无正式核心，因此本次正式方向组合读回blocked；没有把旧过渡模板当成新发布核心。

## 正式文件SHA256

| 文件 | before | after |
|---|---|---|
| knowledge/characters/silent/build-cores.json | 不存在 | `None` |
| knowledge/characters/silent/reflex.json | 不存在 | `aab34d6e5fb0a2375cf95a44aed94a77907e175de3f817686389ef687b5aaee9` |
| knowledge/characters/silent/reflex-vocab.json | 不存在 | `a4e2d063a2896ea4d1ac7168f031072b6f5ae0e7f7218e54feeb5c9fbf626a2c` |
| knowledge/characters/silent/experience.json | `cce6bde4b02657667e05b632b897811dd4679b3371733106e038690cd04cf48c` | `cce6bde4b02657667e05b632b897811dd4679b3371733106e038690cd04cf48c` |

## 已发布条目逐项

| ID | n（独立来源局） | confidence | signal |
|---|---:|---:|---|
| silent-r2-card-shockwave | 3 | 0.35 | silent-r2-debuff-window |
| silent-r2-card-well-laid-plans | 4 | 0.35 | silent-r2-delayed-setup |
| silent-r2-card-piercing-wail | 119 | 0.5 | silent-r2-debuff-window |
| silent-r2-card-malaise | 28 | 0.5 | silent-r2-debuff-window |
| silent-r2-card-shadowmeld | 22 | 0.5 | silent-r2-current-block |
| silent-r2-card-rolling-boulder | 12 | 0.5 | silent-r2-delayed-setup |
| silent-r2-card-flechettes | 3 | 0.35 | silent-r2-counted-attack |
| silent-r2-card-precise-cut | 12 | 0.5 | silent-r2-counted-attack |
| silent-r2-card-metamorphosis | 2 | 0.35 | silent-r2-observed-continuation |
| silent-r2-card-caltrops | 1 | 0.2 | silent-r2-delayed-setup |
| silent-r2-card-haze | 28 | 0.5 | silent-r2-poison-application |
| silent-r2-card-dark-shackles | 8 | 0.5 | silent-r2-debuff-window |
| silent-r2-card-bullet-time | 5 | 0.5 | silent-r2-draw-lock |
| silent-r2-card-toric-toughness | 12 | 0.5 | silent-r2-current-block |
| silent-r2-card-fight-me | 1 | 0.2 | silent-r2-debuff-window |
| silent-r2-card-panache | 5 | 0.5 | silent-r2-delayed-setup |
| silent-r2-card-blur | 2 | 0.35 | silent-r2-current-block |
| silent-r2-card-eternal-armor | 2 | 0.5 | silent-r2-delayed-setup |
| silent-r2-card-stone-armor | 1 | 0.2 | silent-r2-delayed-setup |

## 检查与闭环

生产tsc已由沙箱脚本完成并进入Vitest。首次沙箱入口在Vitest配置打包时因只读共享node_modules/.vite-temp报EROFS；原件保留。第二次原入口加--configLoader runner参数后已有ops-herdr失败且长时间无新输出，约9分钟后中断，退出130；随后改用现有--configLoader native参数，固定排除名单始终未修改。native固定格式14项通过，完整入口退出及stdout/stderr见validation.json。相关8文件142项中141通过、1项CLI因tsx创建IPC管道listen EPERM失败，已用同一原草稿复现；node --import tsx直调固定入口通过。native完整沙箱入口退出1：525文件通过/7失败，4740项通过/15失败、3个错误，耗时873.67秒。15失败均由日志定位为spawnSync/tsx IPC EPERM、本地127.0.0.1监听EPERM（含3个药水固定测试超时）或Vite临时配置EROFS；set-e使末尾paths单fork阶段未执行。固定排除名单及原因仍以既有脚本原文为准。完整沙箱外tsc+vitest仍由ops补跑，不能将已知基础设施限制写成测试全通过。gitleaks对两个正式文件已通过，提交前还扫描暂存差异及完整审计材料。check-experience返回missing=[]，experience结构/字节差为零。

账本silent-0529仅proposed；未填写shipped。结构提案code-proposal.md及真实注册输入保存，code_proposals.py add拒绝真实source_task=v6-knowledge-publish（exit2 invalid task link）；不修改CLI、不使用虚假source_task。实际code_proposals=[]，提案注册未完成并列continuation；不是已登记成功或已实施。原异议/新缺证经ops收件箱交回，watcher/Roy确认未代填。

main已在原锁内重核四文件SHA并变基后快进，实际发布提交de4e1deee010b1250dddf910c5b11808e10aa25e；合后main实际路径逐项读回已通过。其后main的并行ops提交保留，agent树仍与本批冻结受测基线相同。live由ops同步并核实际提交/文件SHA、再跑同探针；本任务不重建live、不改STOP/Regent、不发版、不推送。回退只撤回本批两个新增正式文件，不覆盖同期其他知识。

## 续接

1. ops核实际main发布提交，按同探针重核live，同步/读回/自然采用分别记账。
2. 原owner处理核心卡现行口径验收、缺原证据与方向/组合依赖；本批不读取在途版本、不自动派批次。
3. 原开发owner兼容真实任务名的提案CLI注册；保留本次失败回执及账本来源。
4. ops补跑完整检查；核实际live后按原发布锁分配行为编号、实际规则通知及parent闭环。
