# 静默猎手策略学习回报

源码已提交 `cf0f2495354d9cf5dcb96dc31a2de0f4c53f441a`；两次live合入锁都被占用（第二次等60秒），退出75，未改live。`merged=null`，无本任务上线版本、无合后测试、未标shipped。按合入受阻流程交运维兜底。

基线 `0b4b4c89235f15713316a0b06c81a03a34c08036`。先核开工树干净、合main无冲突；开工旧分支 `fix-batch-20261007-173847` 与合main的 `2c718ee6f5c90ae2bc0ce31d1f53dd3c159c2b89` 保留。发现其含上一批勒紧+ `5e80e683` 后，本项转入从main建立的 `strategy-silent-mirage-20261007-223545`；不随本项发布上一批代码。

## 本项实现与证据

派发 silent-proposal-329a2629d5f1bf1e；补充CLI代码提案 silent-proposal-9c628c8136bd1848（pending）；账本 silent-0010，只经根 ledger.py 追加 proposed、证据链接和源码commit，保留旧claim/首证/经验shipment历史。领域 combat；未改药水/SL/终局/结构。

DUZUBAJ3A8GP，SILENT A10，F30 T5：首试528→532，末试612→616，先施毒使毒4+4→4+9，蜃景现场8→13挡，玩家9→22挡；第三次584→588改施毒另一目标仍13挡；第二次556→557单敌1毒、先蜃景只得1挡。SL不作独立样本，不能推整场转胜。

旧同方案按入口8挡，完整前缀少报5、17挡；新按施放时存活敌当前毒总量给挡，毒不消费，后加毒不追补。仅普通MIRAGE、silent A10、CalculationBase=0/Extra=1、无敏捷/脆弱/不可动摇/幽影修正时生效。其他角色/未知等级/升级/未观察组合保持原行为；保留全部合法选项与目标，未新增固定杀序或权重。

只提交4个源码文件（卡牌模型、战斗/牌堆进阶上下文、求解器）与2个固定测试文件；生成脚本未改，无需重建知识。铁甲数据未读、模型新标记不对铁甲开启；固定比较确认其他角色与不支持范围模型保持等价。

## 验证

- 最终撤源码：final-withdrawn-source-red.rc=1，9例中5失败/4通过，包含实际17对22挡、零毒后施毒与后轮旧13对实际8挡差异。恢复：final-restored-source-green.rc=0，蜃景9+铁蒺藜7=16例；existing-fixed-cases-retry.rc=0，尖啸/铜鳞本局另3例，共19例。
- 首次原入口 source-sandbox.rc=1：tsc0，240文件中的239通过/1失败，2522过/1败；失败仅check-imports把我保存的4份.ts源码备份当源码。备份原字节改名为.ts.txt并保存路径映射；原失败日志不删不覆盖，导入检查单复测1过。
- 原入口完整重跑 source-sandbox-retry.rc=0：tsc0，vitest首段240文件2523例全过、paths段1文件11例全过，共241文件2534例。未增加排除、未调生产预算、未安装依赖、未联网/LLM/运行play。第一次单worker965秒，重跑4worker382秒，保持沙箱原排除名单。
- source gitleaks 0，暂存35.30KB差异无泄露；最终scratch扫描另见gitleaks-artifacts.log/rc。提交前全局身份未改，英文提交、Co-Authored-By: Codex GPT-6.1-sol。
- 工作树的6文件逐SHA256与自测暂存版本一致；根账本CLI check：261项、0问题。所有初稿、测试辅助入口错误、迁移签名错误与旧失败日志均保存。

## 派发逐项处置

10项都核角色、来源、账本、原Markdown及指纹：四个来源局均SILENT A10，重提取2027帧与旧证据清单逐局SHA256一致。原Markdown已保留，未重复写历史复盘。3 duplicate、6证据不足 waiting、1已实现源码但合入受阻 waiting；后者不冒称 implemented。

### silent-proposal-5264153a4a4b0e5c

账本：silent-0039, silent-0209；来源局：61E2QS63Y9WU；经验：silent-obscura-summon-growth。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-obscura-summon-growth.md
处置：waiting。已核61E2 F23T4本体及幻象剩血、两次航行增力。另一focus幻象39伤零损候选没有实际完整执行及下一轮结果；现有召唤模型不证明固定首杀收益，召唤后复活与A10成长组合尚缺本批独立完整对照。


### silent-proposal-e0275838dbb45d18

账本：silent-0046, silent-0128；来源局：DUZUBAJ3A8GP；经验：silent-piercing-wail-temporary-strength。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-piercing-wail-temporary-strength.md
处置：duplicate。DUZ F30T5/T6当前普通尖啸20→14、临时−6次轮恢复且滚动成长至力4/攻击22；独立本局固定重放通过。保持未观察属性组合的既有行为，不改保血/留牌阈值。
实际live祖先源码commit：c7578f37608526591edd86041cee5a28c3894fee；截至live 4f5ca8cb07fd023433d59b52a34cde0144889e61 已核。

### silent-proposal-329a2629d5f1bf1e

账本：silent-0010；来源局：DUZUBAJ3A8GP；经验：silent-mirage-poison-card-block。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-mirage-poison-card-block.md
处置：waiting。已提交cf0f2495354d9cf5dcb96dc31a2de0f4c53f441a：DUZ F30T5普通蜃景动态毒挡，撤码5败、恢复19固定例、沙箱tsc/vitest0。两次live取锁受阻，第二次等60秒；未改live，当前缺实际live祖先证明，待运维合入；不是游戏证据不足。


### silent-proposal-fcfc3568c08fd6da

账本：silent-0129；来源局：DUZUBAJ3A8GP；经验：silent-bronze-scales-per-hit-thorns。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-bronze-scales-per-hit-thorns.md
处置：duplicate。DUZ F30T4丝虫两击反6/甲虫单击反3，以及T6死亡轮8毒+3荆棘分账，3例本局固定重放通过。已有逐击统计实际命中、全挡仍触发、死亡轮结算；不改药水代价。
实际live祖先源码commit：12296292e176ac663057988c7a9ae0487af7b246；截至live 4f5ca8cb07fd023433d59b52a34cde0144889e61 已核。

### silent-proposal-bddfa690a84e03d0

账本：silent-0128, silent-0079；来源局：DUZUBAJ3A8GP；经验：silent-slumbering-beetle-wake-growth。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-slumbering-beetle-wake-growth.md
处置：waiting。已核DUZ F30睡3/2/1、T4醒、T5尖啸、T6力4及22攻击；四试均败，缺同抽同资源的另一完整获胜线，不能以全败样本拟合多打伤害与少挡的血价。尖啸/成长局部另核，不声称睡眠/眩晕/醒来全链已完成。


### silent-proposal-60930500313a651d

账本：silent-0132；来源局：5PM6JAQG6FNQ；经验：silent-serpent-form-per-card-damage。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-serpent-form-per-card-damage.md
处置：waiting。已核5PM F33T1建立群蛇4、T2防御各反映单敌4伤。随机目标的多敌、重放及二次叠加未观察；T1生成后的剩牌退出无能量/伤害变化，而T2弃抽混有开信刀，尚缺逐牌事件区分新建起效时点及重放与控制动作的触发边界；不把单敌战净扣或模板扩为通用规则。


### silent-proposal-c20b5139dd0dff71

账本：silent-0168；来源局：DUZUBAJ3A8GP；经验：silent-infested-prism-tainted-skill-cost。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-infested-prism-tainted-skill-cost.md
处置：waiting。已核DUZ F27T4/5火花3→6及技能污染6/12/18；现有技能污染接线可保留。若调整技能选择，缺相同资源/抽序下迷雾收益与少打技能方案的完整胜负对照；未获全链火花成长/回合污染消失的独立验证，不用9血损拟合强制少技能规则。


### silent-proposal-ae9e692d680e3819

账本：silent-0183, silent-0005；来源局：5PM6JAQG6FNQ；经验：silent-lost-forgotten-possession。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-lost-forgotten-possession.md
处置：waiting。已核5PM F39两次抢夺、负力敏与首试毒杀返力。末试死亡帧玩家能力已清，不能分离死前返还与GAME_OVER清场；缺同轮毒杀返力后再出牌、遗忘死亡返敏及多来源各自返还的独立前后帧，不添加固定击杀序。


### silent-proposal-246daedaa3021847

账本：silent-0211, silent-0209；来源局：CA5KE8GFJ9X2；经验：silent-gardener-skittish-shield。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-gardener-skittish-shield.md
处置：waiting。已核CA5 F9T1/2非致死扣血后7盾且胆小仍7；T4后续中和/小刀只消同敌7→4→0挡，没有第二次未挡失血。缺同敌同轮连续两次非致死失血的触发/消费序列，不能据持续显示的能力值改一次触发规则。


### silent-proposal-f84be739ede0e40e

账本：silent-0230；来源局：CA5KE8GFJ9X2；经验：silent-caltrops-thorns。
原保存Markdown：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal/silent-caltrops-thorns.md
处置：duplicate。CA5 F9T6/F13T1的CALTROPS3新建荆棘、持续推演与反伤分账，已有7例固定测试本轮通过。原be0df8cd并非live祖先，但重新实现源db6e32d2为真实祖先，不重复发布。
实际live祖先源码commit：db6e32d2ee101af6b53f8228c27165bb41f04811；截至live 4f5ca8cb07fd023433d59b52a34cde0144889e61 已核。

## 运维接续与回退

提案文件：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-223545-strategy-proposal/proposal.md。最终JSON：/home/dw/Projects/agent-sts2/.worktrees/codex-dev/learner/runs/20261007-223545-strategy-proposal/report.json。

锁可用后按任务锁内流程保存刷新知识、检查重叠、git merge本分支、原入口合后检查。注意live已并行发布上一批勒紧+，本源基线未包含该项：须作三方合并、保留其最新卡模型；不得把本源6个blob整体覆盖到live。保留所有并行数据/记录。若知识重叠或冲突，不覆盖；交运维机械集成。源码patch可由git show本源取得，父基线见上。

实际上线且合后测试通过，才能将本派发项登记implemented、建立唯一eval版本、date后decision-log/根for-dai与inbox双通知；然后运维依据实际版本登记对应账本shipped。当前无实际源码祖先证明，CLI补充提案pending，原消费项waiting。

回退实际本项集成中的源码差异或revert上述源码commit；保留最新勒紧+及其他并行已发布代码。并行知识刷新保留，不停局、不运行play、不推送。
