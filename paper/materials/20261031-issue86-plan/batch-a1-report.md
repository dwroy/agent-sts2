# #86 A1：默认关闭的 S1 工程接线

批准原件：86/6539967934；开工/ETA 与 116/173 答复：86/6539981368。
本步可独立合并、独立回退；第 1 批 A 尚未整体完成，不以本步替代 A2 或生产核收。

## 本步结果

1. 新 `stats.sqlite` 原始 BLOB/对象去重、完整 S1 manifest、整轮 base CAS、请求幂等、
   方法 authority epoch、JSON 镜像与一致备份恢复。预制镜像后短事务可见；失败/current 不动，
   旧 reader 和旧请求不追最新指针。未创建或迁移任何生产统计库。
2. `KnowledgeResources` 与 17 个 A reader 的 FS 适配，保持原数据和计算代码。
   绑定损坏显式抛错；JSON 回退不先打开损坏数据库，不读 Git 旧副本。
   K1 显式历史版本绑定与原恢复冲突守卫；已绑定 K1 的策略读者仍读库中原版，
   固定回归覆盖 173 对 116 及历史 K1 选择，不改写策略正文。
   不可变 manifest/长度缓存保证热点元数据不逐次 SQL/哈希；方法 authority 不缓存，
   最终事务仍重新核原 epoch。缓存修正后的 runtime tsc 与 3 文件 16 项通过。
3. 原 refresh recipe 在冻结投影中计算，一轮一次 S1 提交；原科学/训练/角色/进阶门保留。
   实际 outcome→catalog 夹具跑通并核源码 A 字节不变、失败/current 不动、已发请求不重算。
   投影未完成时留原件并要求原 owner 检查，不自动删除重跑/换 base。
4. 现有 `fixed_method_admission` 工程事务的可选 S1 扩展，仍用原六门/full1/owner/前像/
   CAS。先保存原票并 block epoch，再安装/核同/准入；恢复不重放旧 block 覆盖后继。
   原双根声明保已有科学输入，新增 2 个 A producer（catalog、monster-db-check）与 S1 IO 闭包。
5. 局中 prepare 小 bundle；局间只核已准备回执和固定 run-config 绑定，不读统计 WAL 或重算。
   shadow JSON 权威、SQLite 比较；每进程 session/序号/结束计数防止成功前缀冒完整审计。
   只读五局资格工具不切生产开关；性能门与自然采用仍由原角色核收。
6. 原报告和恢复报告均保 run_id，能够读回原局固定 S1；旧刷新独立进程夹具补齐新 helper。
   默认 off 时未知 run_id 保持旧启动器等待 mod 的语义；启用或已退数据时缺绑定仍拒绝。
   已发布 refresh 请求的重放补结原 running 健康事件，保原版本且不重算/挪动 current。
   原测试一般知识数据从固定 Git 对象展开到私有目录；自带 FS 黄金夹具保原路径和原答案。

实现说明与显式命令、同版 JSON 回退、备份范围、恢复入口见 `docs/stats-runtime.md`。

## 验证账

当前源码已在本 issue 工作树组合固定 main `caa8a54598d82d55f1593d6650c6987007b84223`，
相对该 main 的共享 `.agents` 策略与 `eval/versions.json` 差量为零。
原计划892与上游全部历史保留。原 WIP 精确副本及本会话 stash 522b2677 保留；
未修改实际 main/live 工作树。最终固定输入2253个，验证状态见 `batch-a1-validation.json`。

- 两套 production / knowledge-runtime tsc 通过。
- 主干组合关键回归14文件79项通过；独立 Python 85项通过；15个 producer 实际方法闭包
  的逐叶/静态/opaque 校验通过；MCP三种真实私有子进程通过。
- 本轮完整官方 sandbox 实际 661 文件/6113 项全部通过，独立 paths 11 项通过，原入口最终 rc0。
  原 heavy dev request ccab7ea9c54b46b9916b01b67325093c，runner793077/start87041120，
  19:25:11排队、19:48:52.613655准入。nice19/单worker，不代集成员ROOT/LIVE组合full1。
- 真实故障：已登记JSON镜像/metadata缺失不能沿可选ENOENT吞掉；shadow先登记权威读取，
  权威失败亦保完整失败审计；两侧均未登记的可选资源仍保原缺失语义。新增4项回归，
  3文件20项通过；修复前实际room loader返回空值的原件与修复后显式抛错原件均保留。
- 第一轮完整检查658文件654过/4败，6089项6085过/4败，rc1；第二轮657/658文件、
  6088/6089项，rc1（独立旧刷新夹具缺stats helpers）；第三轮同计数rc1（external-stock
  外层15秒/内层20秒冲突，原28项Python全过15.466秒）。相关夹具修复不改黄金答案。
  本轮采用上游main已有60秒边界，不将其冒本单新增。
- 两次仅本会话核PID后TERM的运行均保留rc143，不能计完整通过：早期黄金FS隔离修正；
  第四轮旧源码发现JSON真实缺陷后停止PID641390/start86906562，2246输入零漂移原件保留。
  未停止其他会话/对局/检查。本轮已自然结束，按集成员要求先让#77，不追加heavy/full。
- 更早Python37项3个fixture错误、153项注册表扫描1败及入口/冷材料复验失败全部保留本地
  `data/issue86-delivery/`；三个完整rc1、主要修复和最终组合日志随本报告存入证据目录。
- MCP是文件读者/环境合同的合成夹具，不是生产K1索引或模型自然采用；JSON移走SQLite仍可读。
  未声称完整决策CPU门通过、五局自然shadow通过或生产backend已切换。

## 部署与独立回退

- ROOT：`ops/stats_*.py`、原 fixed_method_admission/声明、report/report_run、run.sh；
  测试、文档、工程材料按原 ROOT 策略。
- ROOT/LIVE：新增资源/存储 TS、A reader 的导入及失败透传、run-config、K1 selected-version
  和两 CLI、`stats-loader.mjs`，以及原 builder/refresh_driver/refresh_publish 的 IO 接线。
  实际逐叶安装映射与方法票由原集成员按最终组合生成，不拿本树测试冒实际 LIVE 检查。
- 此步 `STATS_REQUIRED=false`，未提供/安装生产 stats-runtime 控制；没有 `.agents` 锁策略/
  kit pin 或 K 消费者改动，232 条 A 数据继续受 Git/strict/K 保护。
- 先只装默认 off 的 A1；回退按匹配源码/方法票恢复本步差量，保库/候选/日志，不分配行为号。
  若原 owner 后续已启用 S1，先按原局间规则退同版 JSON，不能直接关闭/删库或恢复旧就地 writer。

## A2 交接，不冒已经完成

`a2-retirement-paths.json` 是 232 条精确 A 路径；`a2-path-guards.tsv` 为全部 603 条路径分别
登记 writer/消费者、A1 现态、A2 条件和版本口径。没有把全 knowledge/ 或 B/C 列为可忽略。

后续仍须：按实际有效 Git/D1/K1 原件冻结并 seed/逐值读回；A 路径退出 Git、冷检出测试与
所有运行时工具/离线回放绑定（明确包括 `v6/direction-runtime.ts` 的 T6 药水表枚举与
`a2-reader-next.json` 的工具候选；本步不声称全部完成）；200 题×5 轮同题 CPU 配对及冷载/缓存/工具/RSS 原件；
原报告五局提醒与 ops 自然切换；剩余 B/C writer 路由/保护闭集；旧 D1/K worker/keeper/
borrower/发布写体真实结算和 all→成本→漏斗原债务；primary-sync 的原 source-lock provider
或等价接口、项目策略/固定 pin/旧 job 合同同组合核收，最后才退出非 refresh 的 K 消费。
原68接口请求仍未到新pin；本轮进一步实核既有51c289c5的冻结literal sync_lock接口，
私有内核夹具可在旧K仍占用时按新S→L获锁，旧job保K合同/策略变更拒绝旧冻结/S=L拒绝。
`a2-frozen-sync-interface.json` 仅为等价接口准备，不代原owner联合核收或旧事务结算。
A2可据此推进，不把等新pin当所有独立工作的阻断；不热补kit、不改生产策略或旧job。

额外读边界审计已修：`engines/process.ts:agentEnv` 有意过滤资源环境，原 Claude CLI 的
`mcp-launch.ts env={}` 会丢失 K1/S1/D1 和角色绑定。现只对默认知识目录显式转交已捕获/
校验的资源身份；不转交 API 密钥，自定义研究目录保原隔离。S1 bundle 与 K1 不匹配即拒绝。
生产 Codex native tool bridge 在原父进程，目前没有因此读 Git116 的已核证据；不将潜在
可选 CLI 分支缺口冒成生产现网缺口。三种真实子进程夹具通过，已纳入本次最终受测源码。

这一步是后继激活/精确退数据的前置安装，不是“锁冲突已解决”或 B/C-D 批次完成。
