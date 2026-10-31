# #66 知识显式分类工程交付

基线 main `a6767d51efe6a06717037af28300bf4837dd5643`，独立分支/树 issue-66-knowledge-classification。实现正式 K1 分类合同、严格目标引用、schema3 索引、真实 ToolDef 覆盖/空因反馈及学习合同接线。所有分类标签只在合成测试夹具中；正式知识字节未改，生产数据库、main/live、STOP、运行配置、账号和其他会话未修改。源码发布号由原 ops 在实际部署时核定。

共享接口已经 #66/6395326635、#67/6395330933 登记，主管6395371177裁决分类优先。精确采用 #67 `8d6e4b021fff0065b07ca4e9ba69e8e719f6f00f` 的 helper 原字节、learner/lib/knowledge-runtime.ts 最小 import/末尾追加和 knowledge-runtime 测试三断言；不依赖 #67 运营全包。最终交付已包含这三叶，集成无需再重复 cherry-pick 原67提交。原67 decision追加保留，后续67沿此固定接线串行追加。ops 原完成通道不改，新增固定 Python 测试实际调用该通道。

分类格式、操作、迁移和回退的完整合同见 `docs/knowledge-classification.md`。`knowledge-candidate-v1`/K1/原 ID 不变，新增角色与公共 classification.json，通过 path/type/id/parent/规范目标 SHA 严格关联。同一候选验证所有目标与元数据；空证据/未知字段/非法主题/悬空、跨角色、过期SHA及重复目标拒绝。分类独立修订保留旧版本，目标内容变化必须同候选更新SHA，旧证据不能删除。

schema2→3只建分类表/索引，不重放原迁移、不改原修订/K1/绑定/候选；schema1继续先走原类型回填。读者只读固定K1并核schema3。分类关系同时受目标及元数据的发布成员约束，旧局/回退不会读到后续标签。原 inline 合法主题兼容；同目标的显式元数据主题优先。实体/别名只取明确字段，不按文本猜分类。

工具返回角色/公共及原进阶静态范围内的 total/classified/unknown；filter_pool保留其他索引条件、仅去除topic，明确不是适用知识。空因区分未分类缺口、过滤不匹配、原trigger不适用、缺输入/未知、空静态范围及分页。正文额外条件、rk predicate和未核流派不会冒已求值。严格筛选不隐藏拓宽/重试。策略线索现有 count 外增加明确 tool/input，保持按需调用及两类路线分别判断/不变复用。铁甲执行规则/参数及正式知识保持，新增只读分类能力按同样角色隔离；原非Silent提示路径保持原样。

## 覆盖与冻结回归

- 旧库0标签保持unknown；显式空topics与unknown区分，多主题同一原条目不复制。
- experience/strategy与严格V6 rk/core、嵌套combo/vocab、公共fact kind关联；公共/角色、进阶、明确游戏版本隔离；短中文/别名走固定索引。
- 分类修订、证据保留、重复候选幂等、ID换内容拒绝、基线CAS冲突、发布中断原子回滚、重启/旧新局/回退、schema2升级失败回滚及一致备份恢复。
- 实际CLI classification-draft只读输出待补证草稿；补齐后complete发布；实际原Python完成回调→真实CLI→隔离SQLite→类型查询，重复回调只一发布事件，旧绑定保持，未触发Git/完整检查。
- 原#60冻结回归：输入SHA `164dce9e638db5cfaf6f563d4087b33df0bc264df5976de2a77893102fc1c36d`，128条策略原字节SHA `d8a1a53d9fafa31324046cebe18a61f3cbd269a4f3431ca36acb8e1804b35b0f`。真实ToolHost以原首题、原startup筛选仍返回0，但报告128条unknown；另一次显式离线去主题诊断仍14条，不算原自然调用/返回/采用。两个fixture固定进测试目录，出处见 frozen-provenance.json。
- 原ops后继DOORS/休息“有线索但未查”仍是运行观察；本项不补主题、不改正文适用范围、不强迫查询。FYSH消费者/正文限制仍归原学习/runtime owner，不启用FIGHT_PLAN。

## 检查与限制

生产tsc通过（production-tsc-final.log）；本项CLI/性能工具独立范围tsc通过（scoped-tools-tsc-final.log）。额外全工具tsconfig.tools检查报未改动旧工具错误，原完整输出tools-tsc-v2.log保留，没有称该额外检查全绿。分类/原runtime/typed/query-guidance八文件103项通过（targeted-after-sandbox.log）；先前四文件54项亦通过（targeted-final.log）；原完成回调真实端到端1项通过（callback-final.log，先前callback-e2e-v3.log亦通过）。沙箱首轮638文件/5895过/16败：13项非空新线索旧断言、2项空线索兼容、1项稀疏夹具缺失。空线索改为保持原缺席形状；按新要求更新非空线索断言，原plan/重启/复用及无正文/不强制查询断言保留。issue29夹具恢复原Git字节，记录fixture-restore.json。第二轮最终沙箱单worker638文件/5911过/0败，exit0；随后fork路径1文件/11项过，整体脚本exit0。终态见checks.json及sandbox-final.log，首败原件保留。

首轮分类测试的错误响应被测试辅助函数误当JSON，修辅助函数后通过；策略线索原8断言禁止工具参数，与本项新合同冲突，按新授权改为可选tool/input，同时保留无正文/无强制查询检查。Python回调夹具先缺持久选择SHA、后使用symlink CLI触发原直接运行守卫导致空stdout，改为完整固定原绑定及普通CLI副本后通过；未放宽生产守卫。所有首败日志保留。生产源码没有为旧工具类型错误或测试夹具问题扩大改动。

真实ToolHost完整性能测固定正式Git输入与万条合成规模，包括SQL、适用性、分页、输出和审计，不含LLM/网络。cold为新只读连接/ToolHost，进程模块及OS页缓存不清空；不冒整进程冷启动。性能最终读回见performance-final/：真实库最高热P95 1.362ms，万条规模最高13.412ms，均<50ms；实际冷调用最高真实46.218ms、规模263.712ms另列。首轮performance-v1/保留。规模包含10000条未知分类，再新增100条显式分类，宽查询与主题/别名均测；不外推成万条全分类最坏情形。目标沿#62完整tool热P95<50ms。

## 交原集成与ops

先按固定改动清单核同源码/helper与测试，保留并行日志和现行ROOT/LIVE差异；按原唯一窗口核最终组合，勿夹#65在途检查或等待#67全包。自然边界备份并核唯一writer，安装配套reader/validator/store/classification/schema/CLI/学习注入，运行init增量升schema3，核旧K1、原字段、候选和绑定，再验实际ToolDef。不能用旧schema2 reader打开升级库；回退按合同用匹配回退源码的restore恢复升级前一致性备份到新目录，保留新库/历史，不覆盖活动DB。

新真实分类由原学习者依据证据提交、完成回调发布，再由原ops核实际工具读回和旧/新自然绑定；只读覆盖计数及固定夹具不算真实分类。#60现有入库与自然消费并行，本项不是新前置。知识内容、正文/消费者适用性、正式ledger/通知ACK、自然采用/收益和父要求仍开放，工程交付及必要运行核收后沿#59释放空闲开发UI，不自行停其他会话或删除现场。
