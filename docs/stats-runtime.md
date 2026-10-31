# A 类统计资源 S1（#86）

本页对应第 1 批的第一步 A1：默认关闭的存储、读接口、冻结刷新和准入接线。
尚未退出 Git 数据与 K；不以本步源码安装宣称锁冲突已经解决。A2 负责精确退跟踪、
残余 writer 闭集与原共享 kit 的 source-lock provider 配套，不能删 K 文件替代该验收。
本页不是生产开关指令或已采用回执。

## 数据与绑定

- 正式学习知识仍由原 K1 writer 维护。S1 只接受 `statsResourceKey` 的 A 白名单；
  pending、正式策略、校准、opening-value、event-pages 与外部参考不自动升级为 A。
- 一次原 refresh recipe 在 `data/stats-refresh/<request SHA>/root` 冻结代码、当前
  S1 输入和原 K1/D1 的未迁输入。原 reducer、角色/进阶分账、训练及科学门不改。
  K 仍串行化刷新；投影 writer 不写 Git/LIVE 数据叶，不拿源码发布锁。
- 全轮失败不提交。先逐文件 SHA 校验、fsync 同版 JSON 镜像，再以短
  `BEGIN IMMEDIATE` 核 base CAS 与原工程准入 epoch，提交完整 manifest/objects/current。
  方法在长算期间变更，旧候选保留但不能发布；不重写旧 request/base 或偷偷重算。
- 长期读者捕获 `{K1, S1, operational_view_sha, capabilities_sha}` 的不可变 bundle。
  `run-config.knowledge.assets` 包括原目录、bundle SHA、版本和 backend。
  K1 CLI 采用 bundle 指定的原 K1；重启保原绑定，不追最新 current。
  运营视图是 completion 身份集合的只读回执，不声称跨库事务或正式知识采用。
- `KnowledgeResources` 从 SQLite 读原始 BLOB，按 bundle/路径/SHA 缓存；A 的旧
  loader 经 `resource-fs` 适配。自定义研究目录仍读取自身固定输入。已绑定的资源
  损坏抛错，不以 Git 旧副本或空知识静默兜底。未包含的可选角色资源保持原缺失语义。

## 显式 CLI 与准备

`agent/tools/stats-runtime.ts` 只操作显式 `--runtime`，没有默认生产路径。
`ops/stats_runtime.py` 使用已修复的 Node SQLite 和原生类型擦除，不用 Python SQLite
打开 WAL 统计库，不下载依赖。调用形式为：

```bash
nice -n 19 "$HOME/.local/node/bin/node" --import ./tools/stats-loader.mjs \
  tools/stats-runtime.ts current --runtime <本次明确的本地目录>
```

在 `agent/` 执行；初始化必须显式 `init`，不存在/坏库不自动重建。
`seed` 只接受已冻结的项目布局、methods/dependencies 文件和稳定 request，且原库须空；
同 request 重试只能复核原发布。正式迁移前由原 owner 核 Git、D1 有效 A 的覆盖关系，
按当前实际已发布字节冻结，不能直接拿过时 Git 覆盖 D1，也不能把 116 条策略覆盖 K1。
首个 seed 是迁移原件，不视为新方法的生产准入；后续 refresh 必须有原工程事务 admission。

`publish --candidate <文件>` 只接受冻结投影中的普通文件，候选含原 base、methods、
executed_methods、admission_epoch 和输入来源。中断后可用 `status --request` 区分
absent/prepared/published；已 published 的 request 不重新计算或移动 successor 的 current。
投影已存在但尚无成功回执时自动入口保留并报错，由原 owner 检查原 candidate/日志，
必要时显式重送原 candidate；不能删除现场后用同 request 换输入。

局中 `ops/stats_launch.py --prepare` 预检所有 JSON 镜像、原依赖及读者 capability，
生成 `ready-bundles/<SHA>.json` 和原子 ready 指针。工程激活前可用 `--control <草稿>`
准备候选，但此参数不会安装或启用控制。局间 launch 只核小回执、持久化绑定并传入
原 K1/D1 入口，不打开统计 WAL，也不启动重算或镜像复制。未准备好保留边界，不热切。

## 原工程方法事务

`fixed_method_admission.py --stats-control <草稿>` 是原同批六门/full1 工程票的可选扩展，
不是第二审批者。仍绑定原 owner、实际 ROOT/LIVE、前像 SHA、原终态证据与声明图。
A1 控制缺省 off，旧票和旧事务保持原合同。首次激活需要 A1 已安装，不能用缺少 S1
CLI 的旧 LIVE 执行后继激活。控制草稿中的方法摘要由最终受测组合重新计算。

原事务先持久化原票，再 CAS block stats epoch；源码核同后只迁走相应 A 方法的
旧 D1 refresh 选择，保留 B 与运营条目，再安装 stats 控制并 admit 新 epoch。
期间失败保持原 publication/blocked 状态，原 owner installed-only resume；不释放未知门。
重放旧 block 不覆盖已 admitted 后继；无方法变更的源码发布不无故刷新 epoch。
未结旧 D1 writer、K keeper/borrower、发布写体和三类补跑债务仍各按原回执结算，
候选失效不等于资源退场，一次 S1 成功不代 all→成本→漏斗都完成。

`review-declarations.py` 是本批工程审阅工具，不能放进 refresh 自动准入。它保留旧动态
边与科学输入，补显式 S1 IO 闭包；运行 verifier 仍逐叶核原 SHA/静态边/opaque sites。
读者 capability 的逐源 SHA 属于提交后的 ready bundle，不混作 reducer 的算法输入。

## 对照、性能与五局上限

`backend=shadow` 以同 bundle JSON 为权威结果，每次 A 读对照 SQLite，审计仅含
路径/SHA、差异和耗时，不复制游戏知识或提示。比较失败不改变 JSON 决策。
每个读进程有独立 session/连续序号及结束计数；写日志失败、缺尾或缺序号均不能通过，
不能拿一个成功前缀冒充完整零差异。不同进程的原 session 可交错。

`ops/stats_shadow.py` 只读原自然 `play` 完局/run-config/审计；要求同 capability、
连续 5 局零差异、原绑定一致及配套延迟回执。差异/未知局或修复换 capability 重新计数。
它只报告资格，切换仍由 ops 按原局间事务执行，开发不控制生产游戏。
离线门仍为至少 200 个独立固定题面、每题至少 5 轮、同题新旧输出零差异；分别报告
首次连接/冷载、缓存、工具与完整决策 CPU 段，以及 RSS/字节。CPU p95/p99 配对增量
的 95% 上界不得超过旧→旧噪声且噪声封顶 1ms。局部 BLOB/loader 测量不能冒此门通过。
本步尚无生产五局或完整决策 CPU 验收。

## 回退和备份

同 S1 的 JSON 镜像在发布前已校验、落盘；下一自然局将原
`stats-runtime.json` 的单个 `backend` 从 sqlite 改成 json 即选同版镜像。
JSON 分支不先开坏 SQLite 取 manifest；原局/重启仍保持原 backend，不热重绑。
这不恢复源码树内 writer，不退回旧 116 策略，也不改 K1 或数据可信度。
S1 版本回退可显式 `rollback --version ... --request ...`，同请求重放不重置后继 current；
方法 authority 与工程源码回退仍走原匹配票据，不能借数据回退绕过方法检查。

`backup` 使用 Node SQLite backup API，拒绝覆盖目标，chmod 0600、fsync 后留原件；
`restore` 只写全新目录，核 integrity/每对象 SHA 并重建所有历史 JSON 镜像，恢复写库为 WAL。
此备份只覆盖 SQLite 数据，不代整个运行目录备份：原 owner 还须一并保留
launches、ready-bundles、operational-views、原控制、run-config/日志及 request/投影现场。
灾难恢复先核原完整绑定与目录回执，不能把缺失绑定自动改成最新版本。

A2 采用前，A 数据仍受原 strict/K 保护；A1 如需撤回，按原受测源码/方法组合回退，
保留已准备候选及数据库。共享 kit 退 K 接口尚未到件时仅交 source-provider 对照，
不热补 kit、不改旧 job 合同。B/C 尚能就地写 strict 输入时保对应保护、明确“未解锁”。
