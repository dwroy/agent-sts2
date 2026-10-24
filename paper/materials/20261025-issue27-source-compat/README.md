# #27 历史通知来源兼容处理路径（05:13原链）

记录时间：2026-10-25T05:17:26+08:00；角色：watcher。此为原CLI/source owner的核验交付，不是已实现/已发布声明。

15条原日志、输入、完整消息文件SHA、单一launch/正常退出/原线程已核；每条notice唯一匹配源文件的完整条目，通知token、原ops投递及本角色冻结receipt/evidence SHA均核。当前CLI纯函数验源仍拒绝全部15条；本轮生产ACK命令0，正式watcher_received/roy_notified均0。详见 [逐条审计](source-audit.json)。

## 原来源矩阵

| 来源 | 条数 | 原任务 | 冻结输入schema | 原消息选择 |
| --- | --- | --- | --- | --- |
| #4 | 3 | issue-4-elite-calibration-task | ops-original-elite-learning-input-v1 | 顶层数组，逐条index见审计 |
| #13 | 4 | issue-13-card-models-task | ops-issue-learning-input-v1 | 顶层数组，逐条index见审计 |
| #14 | 1 | issue-14-act3-calibration-task | ops-issue-learning-input-v1 | /findings/0 |
| #27-B1 | 3 | issue-27-brain-strategies-task | issue27-brain-strategy-input-v1 | 顶层数组，逐条index见审计 |
| #27-B2 | 4 | issue-27-brain-strategies-task | issue27-brain-strategy-input-v2 | 顶层数组，逐条index见审计 |

每组原source路径、完整三份path/SHA、线程/树/batch及每条消息的index/原ID/规范JSON SHA全在source-audit.json。#4的 [source候选](issue4-source-candidate.json) 是本轮从原日志只读推导，等待原source owner核准；其余四组复用原source文件。#27 B1/B2同request/task但batch、thread、tree、input schema/SHA、整份questions SHA不同，不能互借来源。B2七条questions中本轮仅index 3–6四条；历史三条不再冒充本轮新增。

## 当前拒绝与完整修复边界

原04:19实际15个CLI均因未知父且未显式scope返回rc2，原回执保持；不重复生产命令。本轮仅调用ack_request纯验源函数（生产state只读快照）复现--source下的下一道task门：manual notice request, task, character or thread mismatch。下列是按源码和原件核出的后续不相容门，不冒称实际CLI逐门运行。

1. ack_manual_notice只允许四类手动V6任务；本批是issue-4/13/14/27研究任务，不能改名或造学习父。
2. 非R4输入只允许ops/codex-ops/learner布局；本批真实输入在四个指定.artifacts目录，包含五组冻结文件。仅加task白名单仍会拒绝。
3. #13/#14原启动prompt不含request id；应在历史研究专用合同里通过launch.params.evidence精确路径+输入SHA+输入中的request/task/batch/character（及原worktree）绑定，不能补写旧prompt。其余组仍核原prompt；#27输入无worktree，由原launch.cwd/params.worktree绑定树。
4. 当前contains_original比较整份文件与一条消息；15条都是整份list的一项或#14.findings[0]，当前整文件比较全部false。必须同时保整文件SHA和唯一完整条目绑定，不能只比finding片段、忽略字段或改旧message。全部15条kind均属于现有learner-dissent/disagreement，无需为本批放宽kind。

## 原owner可实施的窄合同及验收

建议由原CLI开发owner在独立工作树新增明确的历史issue研究source分支（例如独立schema historical-issue-learning-notice-v1），仍使用ack --source；保留现有manual V6/R4/proposal/feature/legacy分支规则。schema名是提案，当前CLI尚不支持，不能立即拿提案执行生产。

原source owner先核准五组原绑定，#4候选特别回签来源；按source-audit逐条给source绑定增加显式JSON pointer及条目canonical SHA。分支只接受上述task↔input schema↔原目录/文件名配对，保原log/input/message SHA及无symlink/越界门，必须核单一launch/summary exit0/原thread/cwd/params/scratch/evidence路径。#13/#14按冻结输入绑定request替代prompt字面出现检查，仅限该历史合同。#14还核原notice-request的issue/character/batch/request_only及findings容器；其原ACK空、未发送等producer声明保持。

条目必须从已认证完整源文件的指定容器中取出，完整JSON所有键值与notice.message规范比较相同，在容器中唯一；有id时同时核id（没有id的#13/#14不造id）。notice.request_sha256保原完整message文件SHA，本批15条均如此。继续核canonical notice token及payload notice_id；已注册父或现有scope冲突必须拒绝，成功只返回无学习父的通知归属，不写科学父。

固定夹具验收需覆盖五组15正例、B1/B2错配/同ID排队、错误task/schema/path/batch/thread/char、输入/消息/日志SHA被改、条目缺/添/改字段或重复歧义、symlink/越界、伪造scope/父、错误actor或queued receipt、旧阶段缺失/错误/evidence SHA不符；拒绝前后notice与learn状态字节相同。原V6/R4及其余来源回归也须通过；不要用真实生产ACK试错。按仓库规定在开发树跑tsc+vitest（或授权沙箱脚本），交原集成/发布链，不由ops临时放宽生产校验。

原#8已closed，其R4兼容交付不包含本批研究任务；不重开旧开发线程冒充已有支持。原#27保存本处理合同，CLI开发归原责任链/主管安排独立代码任务；原ops负责核来源并接发布/读回，不代研发派活。本轮未新开任务会话/模型，也未修改任何调度状态。

## 兼容交付后才执行的登记顺序

以下为待执行模板，当前执行次数0：

```bash
python3 -B ops/learning_requests.py ack --notice <原ID> --stage watcher_received --receipt paper/materials/20261025-issue27-role-receipts/<原ID>.watcher_received.json --source <owner核准且CLI已支持的该条来源绑定>
python3 -B ops/learning_requests.py ack --notice <同一原ID> --stage roy_notified --receipt paper/materials/20261025-issue27-role-receipts/<原ID>.roy_notified.json --source <同一来源绑定>
```

先核实际部署CLI SHA及上述固定验收回执；watcher用自己的冻结真实receipt逐条登记watcher_received，独立读回后才登记roy_notified，再核原ID/message/request SHA/ops_forwarded不变和两个receipt/evidence SHA。原ops_forwarded不用重写。旧rc2永远保留，不能将此次方案/issue评论/提醒回执当ACK，也不证明Roy本人已读或同意。

## 000402独立缺证

0ca61b2ba10a18ca2e12f5b3是既有注册父ops-20261013-experience-000402-merge-recovery，当前blocked；不进历史手动研究分支。原.worktrees/exp/learner/runs/20261013-000403-experience-update.jsonl及root同名路径仍缺，所需SHA b1be2be174208edcafe23f3e0e47f4236560577c2752b6a02f88bd094755a765。已查旧211项archive manifest不含wrapper（原复核引用见source-audit），本轮没有新找到备份。

由原wrapper/archive owner找回同SHA字节，恢复项目内原绑定路径或由原CLI owner提供严格同SHA归档解析（不改注册），核原launch/thread后再沿注册父原链验源；raw state/native片段、新wrapper、恢复源码提交均不能替代。无原件则继续pending/blocked、CLI0，不恢复未知线程，不关闭科学父。

## 本轮边界及等待点

本轮仅新增审计/处理合同及自己的交接；未改CLI、notice、父request、ops状态/live/知识或任何ACK，未新开full/局/模型。review队列仍#43/#39/#36/#20；43/39/20等既有owner/Roy门，36沿原ops运行核收，未出现新的源码交付。#58/#60发布及#36停止现场按原handoff保留。等待原source owner核准五组绑定、原CLI开发责任链交兼容源码和固定验收回执；000402独立等原日志。
