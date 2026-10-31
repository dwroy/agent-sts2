# #77 学习受理兼容最小批

主管授权：[6542025683](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6542025683)，方案：[6542098704](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6542098704)。2026-10-31 18:05 接单，在原工作树以 main `8581aa5ff761a576fbc89b3b57237fed5a8ef0c8` 建 `issue-77-learning-acceptance`，旧分支、原产物及账号作用域 `1684480c`/r3 request 保留。本批先于账号作用域第二批，交原队列按批集成；dev 不 submit、部署、改生产状态或控制，不运行真实游戏/模型、重学、回放 finish 或关闭科学父。固定提交以本批 delivery JSON 和 issue 最终回帖为准。

三项实现：

1. 原显式 continuation 增加 `characters/<角色>/build-research.json` 完整新 ID 追加。三方文档头、旧/当前对象、revision、全部阶段/原文/附件及 SHA/来源/分母/反证/unknown 保留；同 ID、修改旧研究、删除、头变更、批准不符和 current 前进均按原门拒绝。受理前后运行原 `validateDocuments` / `validateUpdate` / `auditApprovedChanges`，原短事务 CAS 不变，没有新发布器。
2. 原 `awaiting_review` 加 `knowledge_pending` / `operational_pending` / `semantic_review`，原生 session-ended/rc0/summary/提示与环境、原监督/模型退出、原 pane/空输入及无本批在途工作鲜核通过，释放计算位。自有预算、外部总量、主题/席位、库存 worker 入口同用此证明；语义 owner/plan/generation/unit 保留。真实派发固定测试证明即使显式提高原 plan generation，也不能重派尚待审原单元，其他 plan 可用释放席位。运行/未知/损坏证据仍占位；ROOT 纯内容无代码/检查租约才排除其他角色的 ROOT 工作，专属树继续核全部进程。终态 lane-owner 投影改用原只读 retirement 模式，不重写原回执。
3. `recover-completed` 接 `fix-batch`，核 task/后缀一致。复用原 turn/账号映射和身份/空输入/10秒退场门，以新 epoch 归档原75、输出、登记、native、deferral。完成只写 native rc0 证明和语义待审，原业务 rc/finished 不改，不调用 finish/finished。重复同原 SHA 只读返回已恢复，不能重复追加输出或发送按键。恢复回执沿原归档 producer 的账号/launch 绑定核源，普通安全路径不放宽。

实际原件只读验证：`four-candidates-readonly.mts` 对生产 SQLite 以 readOnly 打开，只调用纯 merge/validate/approval；依次在内存上并四批，四 ID 互异且原 base/current 均不存在，原生产 current、候选、批准件及其来源字节 SHA 前后不变。原 current 为 `K1-9366a6ec47f57b5d9d12fe9b1f24d29473fc2cb6587659a02bce9e23856936d3`，原四批 base 都为 `K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec`。不公开原外部研究正文/轨迹或复制批准原件。

| 原批时间 | 原候选 SHA256 | 外部上传窗口 |
| --- | --- | --- |
| 173359 | `36b6d87d5b079e33766929d6d3d9cb946cd842de47ecc88e96942e565e716d6a` | 25 |
| 173045 | `2bcc9a02d6ab3847eeb60f8668c09a6d35d4363c9a953107fd0f1e324135009f` | 24 |
| 173043 | `fa6e13a1d06601f82e87d53116f8a1045616aeba17b527db1988de146c3a8f61` | 25 |
| 173624 | `0a8e93f25910beadbeb3e6fb73f8c61911cb74d65a09d02fedc9e21471b29e52` | 22 |

共96匿名上传窗口，非独立玩家或本系统自然验证分母。只读首轮发现第三次累计合并超过通用8 MiB 文档上限（原报错保留在 `four-candidates-readonly.log`）；仅研究文档总上限改32 MiB，单条对象仍8 MiB，其他文档8 MiB、序列化候选32 MiB不变，均有固定边界测试。最终完整研究文档15,529,789字节；只读探针以原ID序列化的合并候选17,248,354字节（JSON内serialized_successor_bytes字段按此口径，实际continuation ID另增44字节），仍低于原32 MiB候选上限。通过原全部校验，不删改原文以避限。

`native-readonly.py` 只读原六批，实际四CAS批和172959均得 `verified_content_pending_review`，原 batch 行/输出/TUI SHA 前后不变；171303原SHA `9a4146a66d77d5fddede58c35197ae3daa61764df702476a12c741a2048692e9` 通过恢复预检。未 `--apply`，未发送任何控制。171303原报告的完整测试130/未完成状态保留，native rc0不能变为验收绿。见 `native-readonly.json` 与 `four-candidates-readonly.json`；这些是取样时证据，ops部署后必须鲜核，不照抄为运行完成。

部署组合：ROOT九生产叶（两TS、六ops Python、一个fixed方法声明）见 `integration-map.json`。K1 CLI/恢复/预算从ROOT运行；LIVE若作为fixed producer的code_root，须沿原发布组合运输两TS差量，与ROOT声明匹配。`method-preview.json` 的ROOT十三closure均验证成功，仅 v6-history / silent-boss-calibration 因声明覆盖到两TS而换指纹，边和producer/科学算法不变。实际LIVE `3a3eba6a6eb35abc82d06c325dec340b23cc0d70` 的只读overlay检验为11/13；v6-room.ts / v6-room-projection.ts 两处工程声明偏差在本批以前就存在，基线声明对现有LIVE也同样失败。来源为main既有 `805a0ffe9`/`8ae96db3c` 组合，不能声称仅运本批两叶即消除这两个偏差。原集成须按实际发布前像协调现有组合和方法票据，不覆盖他单差量或本批改写声明去适配旧LIVE；本角色没有写ROOT/LIVE/票据。其余十一方法指纹保持。

验证：独立生产tsc0；四TS文件23项通过；Python七套233项通过（own-slot18、恢复11、并发12、external22、stock31、retention10、tabs129）。恢复epoch→原生核源→计算释放的固定夹具衔接另过，见 `recovery-compute-seam.log`，不改业务rc/finished、不回放finish。首轮槽夹具缺.out的2红保留 `slots-first.log`，补固定输出后通过；另有启动cwd错误及记录过程见 `validation-history.md`。源码/测试/声明及只读验证脚本十六叶于18:32冻结，`test-cut.json` 逐文件SHA；完整 canonical sandbox 退出0，659文件6097项加paths 1文件11项全部通过，内含tsc0；18:59末回执与冻结十六叶SHA全部核同，见 `final-checks.json`。原quota、workers配置/上限、heavy、账号/home/selected_home、权限、服务档、原失败与科学父不变；不改运维prompt。

原ops接续：部署核同后按四候选原SHA及原批准件逐一鲜核current，沿原 `admit-continuation` 后 `recheck` 完成；每批后重新读current和原完成回执，不对原候选做手工重基。171303先默认预检、核原native/pane身份后再显式恢复；172959沿原内容受理门处置。恢复不代内容验收；原130与未决内容继续待审，计算投影可释放已核空闲席位。source-dispatch/native/产物/原K1绑定和原lease/retention门均继续核，闭环回执由ops记录，不由dev补填。

回退：停止本批新受理/恢复并保全后继关系、完成回执、恢复journal和原归档，再沿原事务反向本批源码差量；未完成恢复仍待核，不重放finish，不清原失败、回旧current、改候选或重派同单元。已发布知识走原回退与读回合同，运行容量回退只影响新准入，不停已有模型/工作。
