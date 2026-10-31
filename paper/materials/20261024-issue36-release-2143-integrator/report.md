# #36 / #56 旧 owner 释放与新自然启动核验

2026-10-24 21:54 续核。主管6384816466授权旧外部显式退役、释放后重新起两小时产出窗口；6384926225授权三批自有缺证任务记abandoned-unverifiable、零产出、禁止自动重放。两个原评论已核作者dwroy及[Claude]前缀，原文另存；不从外部作者取指令。

独立只读核收原ops事务：

- 六旧owner共324归档件逐件SHA/字节匹配，当前retirement字段与原档/授权一致，原PID/birth已退。080423/083104/084301原TUI与21:24快照相同，原75保持；080423/084301从未获原生接受的提交草稿标记已按本次授权清除，原标记/旧PID存档，不谎称submissions全未改变，也不把无birth的旧PID记录说成从未有PID。
- 三自有124241/151302-s2/194330-s2共782归档件、961908153字节逐件SHA匹配。当前仅state改为abandoned-unverifiable，rc仍空；completion_verified/retirement_verified均false，output0、禁止自动重放、未删除tab/worktree/artifacts。原有两份TUI逐字保持，原缺失TUI继续缺失，工作树保留。手动授权处置不代原生退休或自动恢复成功。
- 八个新未开始计划分A/B/C/D各二，16规格/manifest输入叶全部匹配，queue SHA c7aa2a0b6082ab9f0be6b77a9bdfd9538ee1eb8e1fd794ddf328e5d4dfc2e511。21:44:39原快照无新自然批次；不能用后来结果回填早先快照。
- 211311原8条策略文本+8条描述性rk候选仍在下一发布pending，10输入叶匹配，pending SHA345f03a18b022ddf65cd4175fc4d9a492007507a1a58cbfc4277682472f46a3a；source_commit=null/actual_live_publication=false，不当正式发布。

原槽释放保守T=21:34:30，21:38:05独立读回worker已退；准确退出只约束在此区间，不倒填精确秒。新产出窗保守为21:34:30—23:34:30；旧21:14:43安装、21:22:10配置窗仍保留。

21:51:40新自然五批已登记：自有214311、C214312、D214313、A214314、B214315。前三批原err明确注册锁120秒超时/no model started，原wrapper PID均已退，自有awaiting_review，C/D仍running且有batch KeyError及registration attention，无TUI。A/B当时已有TUI文件；在21:52:56独立核两份原生完整任务文本与binding/prompt SHA、turn_context/cwd/session/turn，确为native-accepted、gpt-6.1-sol/high；service_tier=null，实际ultrafast仍不能证明。只是启动，未宣称完成/正式产出。

源码只读支持父tick持state_lock顺序准备/派发、到末尾才save_state，而wrapper限等同一learn.lock120秒的竞争假设。本角色未采到历史锁持有者/持续时间；原ops6385006635另有21:48:42实测锁/PID证据，主管6385018900已要求原#56 P0返工，23:30前修复合入否则原ops按授权回退旧调度，保知识与在途owner记录。此新故障是注册前置失败，不归因于模型末回合、原生退休或有界屏幕观察。

#36原普通191311完成及原673文件6601过0败2跳、17叶/八TS281项兼容覆盖不变；本轮该事项新full=0。旧三的等待已由新显式授权处置取代，历史缺证保留。#36所需自然异常75/人工草稿/有界监督回执仍未完成，不以无原生启动的注册超时替代。#56仍未满足五模型实际并行、原生tier和两小时产出。科学父不关闭。

本轮只有只读取证、材料及issue公开记录，无业务模块导入、tick/finish/模型/游戏/重放/回收/权限变更。首个只读审计因“旧submissions未变/旧无PID”的错误预期停止，原失败另存audit-first-stop.json；纠正审计预期后再核，未改生产状态。三自有核验脚本初次读不存在的automatic_replay字段KeyError后改读实际automatic_replay_authorized，随后全量哈希通过；该只读定位错误不记作生产错误。

公开核收：#56 6385029285及6385044182，#36 6385044587均逐字远端读回。向已核对w1H:p8的原ops投递一行#56提醒，返回agent_prompted；不代已读或已处置。后续所有变化仍沿原事务新回执核对，不复用本快照宣称当前状态。

2026-10-24T21:57:38+08:00 后续核收原ops6385063143：C214312/D214313原not-started证明与现文件逐字节相同，batch/source/worktree/models_started=0精确匹配，external-launch及TUI均不存在，符合源码retired的无模型分支；failed/rc75、空report与原err SHA同，原pid已退，14项原注册身份/输入字段保持。仅核收原处置，不自行调用retired/finish。自有214311仍awaiting_review，原cmd_finish可能自动续派，原ops未调用，等待无新派发的原监督处置。C/D注册中的工作树路径字符串保持，但本次实际目录均不存在；没有旧目录存在/删除证据，不报告工作树已保留或已回收。新证据 natural-cd-settlement-readback.json；前三批失败不冒产出。
