# #77：main 前进后的纯运营候选重验

按主管 [6525520719](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6525520719) 优先修正运营候选接续；原问题 [20/6525465831](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6525465831)。本批基于 main `39e48ce9d09248b86c0eec1bf2339c4b453ec253`，原工作树独立分支 `issue-77-knowledge-rebase`。顺序在 #56 学习并发之前，或在其准备好时由原集成员合批；原账号作用域 P1 `1684480c` / `issue-77-own-learning-slot` / 原 delivery-77-r3 请求继续保留。主管收尾 `f877530f`、原部署/七批回执和科学父均保留。

## 最终行为

保留原未提交受守卫源码/知识拒绝门。对于 base 前进（包括空受守卫变化清单），以原 v1 候选 `report` 和逐条 `records.evidence` 的固定文件/SHA/字节范围作为登记输入；显式 `payload.knowledge_inputs` / `method_inputs` 文件→SHA 映射也逐个核原字节。相对路径按原 artifact 根解析，不从目录推断读取集，也不把派发合同中的可用 producer 列表当成已读取的方法。候选与原报告路径计写集。Git rename 拆原/新两个叶，文件/父路径替换保守算相交。

相交沿原路径拒绝，明确相交叶，交原 owner 重学或工程交付；不会自动重派、改原 base 或伪造 engineering 标志。缺输入登记、非法/外来路径、不透明方法/知识 SHA 没有可解析原输入 manifest、非祖先 base 都按未知相交保留。固定 calibration 的旧方法 manifest 不在本次放宽范围，原方法/科学门仍保守拒绝，不从当前声明补造旧输入。

不相交时继续完整执行原 schema、角色/局号/分母、父项/账本/提案、证据 SHA、原事务与 ID 冲突检查；末尾再核 HEAD 与 guarded dirty 未变。重验使用当前源码和实际数据，原候选、原报告、原 base 字段和失败历史不改。原 SQLite 完成事务另存 `source_revalidation`（原/新 base、变化叶、登记输入与来源位置/范围、写路径、空交集依据）。候选 digest 仍只对应原候选内容；新 proof 是原完成回执的附属审计，不冒改候选版本。

同 ID/原字节已完成后沿原 DB 权威回执恢复，后续 HEAD/日志增长不重验、不重复存记录、不改已持久化 proof。每次 validate 使用本批局部重验字典；没有全局临时 base/输入集。schema/原分母等失败仍走原 pending/submission 历史，原失败不清。K1 发布、D1 生产者/方法准入、源码工程交付、角色隔离、父要求及自然消费均沿原合同。

## 原 204303 的只读核验

最终冻结 validator 对 `20261030-204303` 的原 `dfd8f252d7b01d247c87916928cfd264f4000ac7c8ff8a3bfd76ada072c91b91` 候选完整 validate 成功：原 base `1b7c652c` 到 main `39e48ce9` 的 8 个 guarded 叶与 33 条登记输入/候选写路径不相交，实际核了 34 个原对象共 30,998,821 字节。原候选字节和 SHA 保持。最终 validator SHA 与冻结切相同，含原日志 offset/length 的 proof 见 `204303-read-only-validation.json`；前一次增加范围审计前的只读结果单独保留。

这里只调用 validate，没有调用 complete、写运营库/批次状态、改原报告/候选、启动模型或对局。原运营 pending/两次失败仍在，不能把开发预检当实际完成。合入后由原 ops 对同一 204303、同一原入口重走，核 SQLite 原文/完成回执、原 candidate SHA、source_revalidation 与原失败历史，再报告实际入库；不强 tick 或重学来绕过此门。

## 生产叶、固定方法与检查

仅三 ROOT/host 叶，零 LIVE：`ops/learning_runtime.py`、`ops/learning_runtime_store.py`、`ops/fixed-producer-dependencies.json`。前后 Git blob/mode/SHA 在 `delivery-leaves.json`；实际消费者在 `required-checks.json`。原 .agents board、并发/额度、service tier、账号/home/selected_home、STOP/PAUSE、权限/角色及生产配置均未修改。

原固定方法闭包引用这两份 runtime 叶，故相应源 SHA/opaque-site 声明必须同批更新；13 个方法 fingerprint 预览见 `method-previews.json`。只改 callback/审计回执适配，不改 builder、科学门、样本、输出模型、生产者输入路径或能力边。原集成员必须在实际采用/合批组合上重算这些指纹，按原发布事务重新绑定适用方法票据；本预览不代生产票据，不改旧在途合同，不为放行取消方法准入。

最终定向 Vitest 5 文件 / 11 项通过；内部 runtime 固定测试 30 项（含新增 10 项：不相交放行/原 base 不改、相交叶、缺登记拒绝、原分母校验继续、重复回调与旧失败、双批独立、显式输入 SHA/不透明方法未知、相对路径、rename、空变化清单的新 base 审计），原 fixed producer admission 24 项通过。最终生产tsc及完整开发sandbox退出0：655文件 / 6073项全过，另paths 1文件 / 11项全过，六个代码/测试输入SHA开测后保持；结果在 `verification.json` / `sandbox-final.log` 记录，冻结源码切在 `source-check-cut.json`，旧批/旧 full/中断检查不代本批最终检查。

最初声明准备脚本误从 agent cwd 启动，import 失败；立即停止本树已核身份的初次测试进程（143），错误和部分日志保留。更正目录后先生成最终声明/代码切，再从头运行 canonical sandbox。第一次定向命令包含一个不存在的 TS admission 文件参数（Vitest 仅匹配三实际文件）；已另跑正确的原 host Python admission 24 项，未把缺失参数算通过文件。无生产进程信号或控制操作。

首轮完整 sandbox 为 653 文件 / 6071 项通过、2 文件 / 2 项失败，原件 sandbox-first-red.log；两处均在未加本补丁的39e48ce9精确Git blob隔离快照复现。board poll 夹具复制生产board后继承了新启用的merge_queue，却没有固定kit pin；brain selector夹具继承heavy启用，但它只安装fake launcher。仅两份测试夹具显式固定临时配置（queue false/heavy false），实际生产配置不动，正测仍显式开启queue并核拒绝。9项poll、17项handoff定向过；之后在最终六个源码/测试输入上重新冻结并从头跑canonical sandbox。原基线、首红、夹具修正及最终日志分账保留；本批生产叶仍只有原三份，原P1测试差量后续集成须保留这两项夹具隔离。

原集成员沿 #77 与 #56 协调在并发批前或合批，保实际 selected_home 独立差量、原唯一完整检查和发布锁；不自行 submit/部署或抢原 full，不把这次开发 sandbox 充集成 full。合批时保留本批 `Store.complete` 可选回执接口与局部重验上下文，原并发预算/owner/额度/方法门由 #56 原代码承担。原账号作用域第二批继续排后，不因本批关闭学习/量化父项或回收旧研究。

回退仅逆转本三源码差量及匹配声明；原候选、完成/pending/失败、原 receipt 新 proof 及已归档对象均保留。旧代码不认识新附属 proof 仍可按原 digest 读回已完成记录；未完成旧 base 候选会恢复保守工程拒绝，交原 owner 决定，不手改 base 或重复导入。
