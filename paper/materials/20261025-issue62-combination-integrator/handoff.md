# #62 固定组合与事实覆盖交接

状态：2026-10-25T13:22:03+08:00唯一full已终态独立核退：688文件/6711过/0败/2原跳，工程检查通过；原59事务释放后接实际源码集成和原ops新事务部署，生产reader尚未切换。准确清单见deployment-handoff.json。原 #59 冻结自然事务保持。

固定开发提交 `f56c9f238ab6e8939a356c54b6115555bd0a8030`，隔离集成候选 `0168b672a69d7cbedc04ad81f1cdc4621a2591a9`；ROOT 验证锚 `9c81d7877a697d51e782f938393cf57c09185103`、运行兼容锚 `0c5f165c97bc5d65790f0b1b3606ea3142dc032c`。2856 输入、1417 依赖、335 运行叶冻结；保留原 ROOT/LIVE 12 处差异和已接收 #59 三运行叶。80 ROOT 叶与 17 运行源码/测试/CLI 叶的精确 SHA、前像和用途见 `deployment-draft.json`；17 叶中 `knowledge-runtime.test.ts` 的 ROOT-only learner 依赖只在 ROOT 检查，不部署到实际 LIVE；实际 LIVE 安装16叶见 `runtime_install_delivery`。不能把该套件误报成 LIVE 通过。

ROOT 生产/运行专项、LIVE 生产与 CLI 严格类型检查为 0；ROOT 六套件 61 项、LIVE 两个适用套件 28 项通过。两次预检配置/目录范围失败保留原件；未改产品/依赖，无失败 full，唯一 full 终态另见 `full-state.json`，独立退出核收另见 `terminal-readback.json`（终态后生成）。

## reader 切换前事实闭环

主管原授权 #62/6393659006；原 ops 来源核准 #62/6393702431。`ops-source-approval-comment.json` 保存原回执；实际清单 `paper/materials/20261025-issue62-fact-coverage-ops/owner-approved-source.json`。

独立一次性隔离目录真实 CLI restore→extend→bind→rollback 全部 0。只增加核准三源，8→11 文档；原8文档、128策略/169rk、全部两原绑定与隔离新绑定/回退保持。475 次真实 ToolHost，3022 角色范围内原条目全部字段逐项比对；Silent1074、Ironclad/Regent各974，四类别、ID/中文/别名、角色隔离、空/非法参数、分页24KB界限、未知绑定拒绝通过。旧K事实空/几何不可用保持，不串版；新增几何精确 SHA 可用，角色/进阶限制与外部来源限制保持。

隔离候选 `K1-92ffac596b2731699a174ec4e53f6c6126143c76c0dde2fd2958f0a7ba31561a`；ops 候选 f95afe 的全部文档 SHA 与之相同，版本哈希还含 candidate ID，不应强等编号。原探针预期/字段假设错误与错误cwd缺tsx启动均保留，沿同一已扩展库有界接续，没有重复 restore/extend 或改产品代码。脚本、原失败、四 CLI 日志与最终成功回执在本目录，索引 `probe-archive-manifest.json`、`fact-coverage-fixture-correction.json`。

## 原队列与部署

原 #59 事务释放前不改其被冻结 ROOT 源码、LIVE、门或 FIFO，不夹 #64。full 终态通过后独立核worker实退、原锁、所有冻结输入/依赖/tree/index再给工程准入。原 ops 对新自然事务鲜读实际 current，鲜做一致备份/原升级和 CLI extend；保所有比本次备份更晚的知识、证据、绑定与发布历史；仅补缺失三文档，不能用旧 Git 全量覆盖。实际新 reader ToolDef 正负例和可用性通过后再绑定新局，生产 K 按实际 candidate/current 产生，不能直接使用本隔离编号。

回退精确顺序见 `deployment-draft.json`：数据 rollback 仅改未来绑定；schema1 源码回退必须保留升级后库，把升级前一致备份 restore 到新目录并对账后续历史，禁止原地覆盖活动 SQLite/WAL。实际部署/发布号/双通知与必要自然运行核收由原ops回issue，不增加人工内容审批、不强开局/模型。

#64 按主管6393659422为原58唯一修复入口，等固定交付接最早可用窗口；#63固定f95114df3已核收，隔离候选ee029e2ee已准备，三原样本候选配套只读seal_proof通过；下一窗口沿独立固定组合核收，未启动第二个full/未生产封存。#60运行验收独立，固定检索通过不代表自然采用/收益，科学父和未完成项保留。
