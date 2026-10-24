# #57 注册屏障组合补交

回应退回评论 [6385470519](https://github.com/dwroy/agent-sts2/issues/57#issuecomment-6385470519)。原交付 ce3e9b860 的新 check-learner 块固定等全局 learn.lock，会重新挡住 #56 已释放逐批屏障的 wrapper。原报告/失败/回执保留；本次不是把原13项测试当作组合通过。

本补交将 #56 冻结 `0d4a20c031b3f9663bc15d2b49a5efc019e604f9` 的10个源码、文档和测试叶作为明确组合依赖；本开发会话仅在独立树组合，未执行 main/live 安装。没有导入 #56 的材料/知识差量，不覆盖当前生产队列、账号、世代、在途行或原生会话。`source-freeze.json` 保存原依赖叶 SHA256 和组合后14个生产文件 SHA256；#56 保持独立交付，不能将 ce3e9b860 单独部署。

## 修复

check-learner 与 ready/tier/prepare/entry 使用同一 registration_lock。新自动批次由 #56 原事务 reserve 批屏障，父进程原子替换 learn.json、fsync 文件及目录后才释放该批；完整外部行包含 external_binding、lane、policy、candidate_mode，再 checkpoint。父事务仍可持 learn.lock 校验下一来源，子进程不重新等整轮 tick。旧手动入口没有 batch gate 时保持原全局屏障，伪造/异批 gate 路径拒绝。

没有增加120秒超时、跳过模式/HEAD/SHA/租约或放宽门。父端 source snapshot 继续 learn→refresh→live 非阻塞锁序；已发布 wrapper 只在本 batch 屏障后按 refresh→live 非阻塞复核冻结输入，不在这些锁内反取 learn。发布写入的原全局短事务及 PAUSE、ACCOUNT_DRAIN、旧/未知 LLM_DRAIN 语义保留；候选仍显式 merge=no，finish 与实际发布的边界不变。

## 组合回归

新 fixture 运行真实 start_learner、原父 save_state、真实 Linux flock、原 wrapper、真实 external ready/tier/prepare、真实 check-learner 和 learner_entry 的租约核验。仅以固定 Git base/额度时钟、模型传输和 finish stub 隔离环境；没有模型调用、Herdr 实服或游戏动作。

- 同一真实父 state_lock 内先后注册四外部＋一自有，所有 wrapper 在父全局锁仍持有时到达固定模型传输。传输端另开 flock NB 确认全局锁确实忙，校验原 PID/lease、batch gate、完整行、candidate_mode、merge=no 和固定树 launcher。不是等父锁释放后才认成功。
- 对真实 fsync 做旁路观测（仍调用原 syscall），核最后两次对应实际 learn.json inode 与目录 inode；published 原函数在此后才执行。每条传输观察行均可与该已持久 checkpoint 精确配对。
- 准备下一来源前等待先前注册批次到达传输并退出固定 wrapper，以有限活跃 worker 复现同 tick 的依赖；父全局事务不提前释放。不拿短观察冒充120秒超时。
- 发布 waiting 时同样可启动四候选，仍挡新局，自有 writer 不冒充候选。
- 完整注册且真实 prepare 已结束后，分别注入 PAUSE、ACCOUNT_DRAIN、旧 LLM_DRAIN、未知 publication marker，真实新准入均拒绝；固定模型传输0，原 not-started 回执 models_started=0。
- 注册后候选模式被替换为 live，或传入其他 batch 的 gate，均拒绝。保留原未发布/不完整注册不释放门与持久化失败的负控。

原 #56 注册回归2项（已升级真实准入组合）、新增组合4项、原发布门13项、外部来源22项通过。TypeScript 定向4文件48项通过，原件 `registration-positive.log`、`registration-admission-controls.log`、`targeted-composition.log`。原13项和单项通过不代本次组合证据。

## 检查与接续

本开发树 `SANDBOX_WORKERS=2 bash agent/tools/test-sandbox.sh` rc0：生产 tsc0，主套633文件/5848项全过，单独 fork 的 paths 1文件/11项全过，共634文件5859项。原件 `sandbox.log`。检查后14个生产文件 SHA 逐项核同冻结清单，shell 语法与源码 diff 检查通过。没有借用 #56 的宿主完整检查结果，也没有争其发布/完整检查锁。

提交前 staged gitleaks rc0，原件 `gitleaks-staged.log`；公开补交评论另扫。测试原日志保留末尾空行，源码/文档格式检查单列，不改写原始检查输出。

补核 ops 已报的宿主 main `f6238c41211b3a2734d7f5e9a644d4071216f235` Git 源与原0d4依赖：四个 Python 生产文件 AST 一致，wrapper 字节一致，原件 `dependency-host-equivalence.json`。这是 Git 依赖语义核同，不代本会话的生产物理加载证明。此前 broad tools 的52项基线同错及失败历史仍在原交付材料，本轮未冒重跑或称其通过。

交付后由原集成员在 #56 注册修复组合上独立核验 #57，确认14叶完整、源 SHA 与注册/候选元数据一致，再沿原队列安装。原 ops 首个自然发布窗仍须实核等待期候选自然派发并完成、发布完成前新局0、释放后自然续局；未强制 tick、finish 或开模型制造证据。原 #56 五槽/实际 tier/吞吐窗、科学父与消费者/自然采用要求保持原 owner 开放。
