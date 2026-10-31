# #64 精确部署交接（检查通过，原 ops 接部署）

固定开发 `bc80005598d615516a36e3824f8bdba7e65356b3`，base `614687462eaed74a0264f29730b73e883e2b25ee`；补充合同 `2a11e1d4c5791ed4a193398aaeb959f065150adc`。本目录 `deployment-handoff.json` 列出实际前后像、差量 SHA 和动态交接状态；只有本项 `full-state.json` 为 `full-passed`、退出/锁/冻结输入独核通过并已精确 main 集成后才可部署。唯一full已终态689文件/6727过/0败/2跳、三tsc0；ROOT/LIVE与依赖SHA未变，原worker已退出且检查锁已释放。main实际提交见main-integration.json；发布号与生产部署由原ops登记，当前不宣称已上线。

四个生产叶：

- `agent/src/brain/types.ts`
- `agent/src/brain/specs.ts`
- `agent/src/brain/engines/codex.ts`
- `agent/src/core/config.ts`（注释配套）

三配套测试：`agent/tests/brain-codex-session.test.ts`、`agent/tests/route-reason-schema.test.ts`、`agent/tests/route-reason-fixture.ts`。部署需沿原 base-to-source 差量鲜核前像；`live-seven-leaf.patch` SHA `7cf22129d5e9c212fd7d0585584d5b48b31a18f94b3276194f0a87ae3ebfc2a9`。禁止整棵开发树覆盖实际 LIVE，当前知识、其他已接收源码及历史测试差异均保留。LIVE 会话测试差量后 SHA `466d8855e94f4a06d2c2c701747880cfc53deb96e39a761dfe2033a376a4c5dd`，不同于 ROOT/开发叶 `840840fd3d30e6509b1224141baf0663af2b9c7612666d7b4921770e2f7f8768`；这个差异已在独立 LIVE 镜像核验。

本次在目标 reviewMap/endgame answer spec 中令实际 Codex 严格输出 schema 可携带可选、nullable、最多60字的 `route_reason`。旧预算和调用次数保持，其他引擎/角色/旧式丢字段路径保持；构筑 `change_reason` 与路线理由独立，omission/null/keep/重复路线复用，缺少或无效理由及非法路线继续拒绝。解释内容语义和效果没有工程检查结论。

绿后原 ops 按当前 publication-admission 新事务接入，鲜核实际 LIVE 提交及四生产叶前像，精确部署、登记实际发布号与版本/通知，下一自然启动核真实工具/严格输出、实际 reasoned change 的持久化与路线消费、omission/keep/repeated route 复用、构筑与路线独立、同局恢复沿已接受计划。没有自然命中时保留运行待办，不虚构改线、采用或收益。#60 知识运行验收独立；#65 封存兼容和 #59 四叶候选不夹本包；旧 #63 三例不重回收。

回退只对同一原始逐叶差量做逆补丁并先鲜核重叠，保后来变更、历史、持久计划与理由日志；不要复制旧整叶或整树。部署责任与自然运行归原 ops，工程终态证据及准确 main 提交由本角色回 issue。
