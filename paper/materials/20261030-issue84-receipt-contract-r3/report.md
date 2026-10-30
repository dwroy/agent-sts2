# #84 方法票真实终态合同修复（r3）

按 [主管裁决](https://github.com/dwroy/agent-sts2/issues/84#issuecomment-6515844112)，基于已采用 main `672b7019cbf6f0940a453f761c97618842638320` 修复方法票准备被真实终态额外 consumer 检查误拒绝的问题。原 r2 源码另保 `refs/heads/issue-84-declarations-r2-source`；本次是独立小批，不修订已采用的旧请求。

`fixed_method_admission.checked_evidence` 改为六项 required 是 checks 的子集，且 checks 内每项都必须为 `passed`；非映射也拒绝。其余终态、full_runs、候选/来源、实际 LIVE 前像、逐方法源叶、声明以及原始回执 SHA 绑定代码不变。未归一化/重写原回执，未忽略额外检查失败。

新增四项固定回归：16项全过沿 prepare→原票 SHA→部署准入→release 通过且不改回执；额外 consumer 的 failed/unavailable/running/cancelled/skipped/null/true 均拒绝；六项 required 逐项删除均拒绝；非映射 checks 拒绝。16项正例还核原票后哪怕仅追加换行也在写前因回执 SHA 改变拒绝。原六项正例及身份/CAS/恢复测试保留。新16项回归先在旧代码复现同一报错，原件保留。

验证：生产 tsc 0、核心 Python 74 项过；publication-admission 与 learning-runtime 两文件6项过（包含原gate13、registration4等原入口），导入检查补原 `b84d95c5185941eec143cbcf2966d5770309cca5` 冷夹具后单项过。初次导入红原件保留；冷夹具仅临时本地视图，复验后移除，未改断言/源码/排除。两个变更文件自测前后 SHA 无漂移。日志和命令见 `checks.json` 与压缩原件。

只读核验原批 `009c902bb2634bfb872b8f54dba51391` 的真实 `sts2-terminal.json`，SHA仍 `d8719222e68b026ad0af9f0ef5f520c1f8b1bb708a031669d3d96360d00a53b1`，当前控制选择 refresh=outcome、entries=postmortem。新代码直接读取原 ROOT/runtime 源视图，对实际启用的 outcome 方法调用 checked_evidence 通过；完整16检查原样保留，方法仍 `f50b9ea3c7debe7724ad29e0d36d654791442f252ede0d6f2dc28a5fe8fdfaf9`。没有调用生产 prepare/start/finish、生成生产票或建立发布门。原 full1 和失败原件均未改。`actual-terminal-readback.json` 是本轮只读结果，不是新工程回执或准入票。

额外探查全部声明时，未启用的 v6-history 在原 runtime 视图对 v6-room.ts 未核字节继续拒绝，原件见 `inactive-v6-probe.json`；当前生产方法票不选择该 producer，本次不扩大开关或改声明，不把该探查冒充全方法核收。

运行部署差量仅 ROOT `ops/fixed_method_admission.py` 一叶，LIVE零叶；旧/新 blob为 `a518d66845046f3c73b905d22e82b1ce3d9a31e4` → `bd711baf9939324c834ee03c42749ee69c81c7d3`，SHA为 `e6bdb5ada3ca32df282e9367d06b7b81669b503c9e2289f15fd097d9c91443bb` → `25adff9db3cf85919a5c19ae1f5eee7ab0833ffa7fee48b79ddb6dd3a56f7d4e`。另一个源码差量仅原测试文件新增四测试；`deploy-map.json` 给精确映射。声明未改，该helper不在任何producer方法输入中，无行为发布号/知识变更。

交原集成员小批队列，适用检查由原政策核定；#82若在主管20分钟窗口到件可合批，否则#84先走。新请求仅prepare、不submit/tick/full。实际合入后仍由原ops沿原入口鲜核并准备新票，接schema备份→原19叶LIVE迁移→CAS K1→分号/读回→outcome补算。未写main/live/STOP/control、跑play/生产补算、关其他会话；P2 idle告警留待后续，不夹改本批。
