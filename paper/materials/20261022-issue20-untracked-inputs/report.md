# #43：#20未跟踪可加载模块输入修复

按[主管要求](https://github.com/dwroy/agent-sts2/issues/43#issuecomment-6340866821)沿#20原开发线补交，公共父`d9c4849b1fa69b6fae5510a82f20cf95abf796a8`。集成员原[复现及失败原件](https://github.com/dwroy/agent-sts2/tree/c4ed1b2c079737086bcb83b78ebcf571a277b0aa/paper/materials/20261022-issue20-integrator-r4)保留，旧d9c源码不据本轮结果改写为可准入。

**本轮增量影响live启动：否；父交付仍为是。** 只修发布输入证明及固定回归，不改游戏规则、环境、启动协议或上游kit；kit仍为26130354b86fbdbb4a1baddda07a770b0b9d6fd5。

## 原因与修复

原inventory用部分目录+后缀判断未跟踪文件；普通0644的.mts/.cts/.jsx与目录外模块不被拒绝，也不进入Git tree/运行指纹。结果是实际消费者可以改变，exact/data复用却仍判输入未变。这是本轮前一交付自身的缺陷。

现在Git未忽略的未跟踪文件默认拒绝，不再枚举几个模块后缀或猜目录。根目录、agent共享目录、eval、knowledge非JSON及任意新增格式都走同一门；文件无执行位也不能绕过。仅下列情况另有明确边界：知识JSON由ops冻结快照前后逐项绑定；非执行/非软链接ops锁和日志为运维状态；当前检查生成的JSON回执/日志逐路径登记，plan/快照/审阅材料另有SHA证明。未知文件先纳入受检Git树，不能默默丢出输入证明。既有Git忽略的依赖、凭据和隔离副本边界保持，不扫描账号/复制依赖。

默认关闭新门的旧发布检查入口也补实际inventory+知识前后核同，不能在新门未启用时继续走tree-only exact复用。新旧回执均带当前`input_policy`；旧v2/纯数据证明缺标记则不用于复用或发布，不自动升级历史摘要。新数据发布入口同步登记生成回执，防止把自己的记录当未知运行输入。

## 实际定向结果

- 生产tsc退出0；`python3 -m unittest test_release_order test_release_checks`最终30项通过。包含17种格式/等价路径负控，保留原.ts、未跟踪知识JSON消费者、锁/日志负控；另核新旧入口、exact/data复用拒绝、检查中出现模块、旧政策回执不复用。subtest不另累加为独立测试总数。
- 真实单文件Vitest：tracked imported-module.test.ts导入普通0644未跟踪runtime-helper.mts。模块返回1时1过/退出0；仅改为2后1败/退出1，原断言`expected 2 to be 1`保留。两次都只跑该固定消费者，threads/单worker，未跑完整Vitest。
- 原状态机以显式模拟full命令执行器生成合成原回执；随后加入模块时exact和数据基线复用均预检退出1、state=failed-retain-original、没有reuse mode、额外模拟命令0。模块实际改成2后再次请求也同样拒绝，原合成回执字节未变。**合成原回执并非真实full绿：建立它时模块尚不存在；它仅用于验证已有回执不能绕过新预检。** 原集成员已有“模块在场而漏记”的旧源码模拟反例继续保留在上述原材料，不拿本轮合成记录替代。
- 首次自有真实回放准备失败：夹具只忽略node_modules目录、没有忽略共享依赖软链接，严格预检因此拒绝未证明的agent/node_modules。核Git实际未跟踪列表后，将夹具忽略规则与项目已有的依赖链接边界对齐，未放宽模块门。初始fixture、replay-first.py及replay-first-failure.log保留；修后使用独立fixture-fixed生成有效对照，未覆盖原失败。

consumer-before/after.log.gz（原始内容无改动压缩，原文/压缩SHA均保留）、result.json、mocked-*.json、targeted-final.log与输入SHA另存本目录；mocked文件均为夹具，不是生产检查回执。早期28项定向及修后30项结果各保留。未重跑原full、未新增重任务等位者、未调用模型/对局/生产刷新。

## 回放与交接

在本检出运行replay.py prepare准备独立固定仓库，直接用既有Vitest对fixture-fixed/agent的tests/imported-module.test.ts跑一次；replay.py mutate后对同一文件再跑一次，预期第二次非零。replay.py拒绝覆盖已有fixture，重放须在新的材料副本中保留原件。共享依赖只链接，不安装；真实单文件与门禁模拟分开。

源码/文档改动6份：ops/release_plan.py、release_checks.py、release_queue.py，两份定向测试与docs/release-assembly.md；另追加材料和decision-log。默认release/area/heavy关闭与#37→#20同文件顺序不变；#43随#20交原集成员核收，本会话不自行关闭。原最终组合窗口、ops自然边界迁移、#39首局与其他真实采用继续保留。

本轮未改main/live/STOP、生产安装/开关/账号/ops prompt/其他会话或上游kit，未读取凭据。源码补交与定向通过不代完整组合/发布授权；旧回执政策不匹配的处置交原角色按输入证据核验，不凭本报告伪造完整绿。
