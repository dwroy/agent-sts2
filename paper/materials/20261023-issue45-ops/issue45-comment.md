[ops] #45 第一轮已实际回收 1 棵，释放约 208.18 MiB；五类逐棵归属和差异档案已落盘，其余保留原门待结算，issue 保持开放。

逐棵清单共 155 项：普通收尾36、身份冲突36、dirty31、scratch19、运行/失败11，另22项受源码/发布/父要求等约束。

| 类别 | 本轮处理 | 原五类剩余 |
|---|---|---:|
| 普通收尾 | 36项均绑定原批与原attention；22 source drift、10 parallel record、3 notice/baseline、1 index lock；25项已有dataset尝试，未重跑/伪造closed | 36 |
| 身份冲突 | 36项均找到原batch，binding字节均等于各自HEAD，当前无活进程；旧binding与现主实例不同，未改写身份凑过门 | 36 |
| dirty | 31棵tracked差异及25份安全未跟踪文件归档并核SHA；28份私有过程元数据只留原处，源码/owner验收仍待 | 31 |
| scratch | 19份原终局JSON及报告均找回，实际报告全在原主目录，不在该批树内；记录真实位置，不搬移/改写原报告骗过绑定 | 19 |
| 运行/失败 | 11项保留原exit/在途身份，不以无活进程冒充成功 | 11 |

另从ops分配积压中，`ops-v6-r3-composition-20261020-040034` 的三份知识源码已核main/live实际发表，补走原 `worktree_retention complete` 后由原worker（limit4）正常回收，Git注册和.git均消失，分支/归档SHA核同。checkout实测释放218292224字节；全文件系统同期净增208777216字节，分开记，不把全盘变化归因本任务。回收后plan仍0 eligible。

`ops-infra-live-exact-20261020-1802` 原allocation_failed（历史共享工具manifest不匹配）保留；`ops-w3-live-805-20261020-1241` 原hand/loop源码发表缺口保留。没有放宽门、手工删树或关闭科学父。后续需原owner/集成员沿逐项清单确认历史身份及主目录scratch的真实绑定；无法完成者交主管决定，不自动当孤儿删除。

原件：`paper/materials/20261023-issue45-ops/retention-inventory.json`、`settlement-register.json`、`original-owner-bindings.json`、`ops-completion-registration.json`、`original-worker-terminal.json`、`plan-after-worker.json`。差异档案路径/SHA逐项在settlement-register；首次归档含可重建历史删除预像的过程已记录纠正，最终仅存实际新增/修改，原树与Git仍在。
