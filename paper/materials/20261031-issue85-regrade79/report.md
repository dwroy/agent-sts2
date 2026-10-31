# #85：重判 #79 的两份冻结合并内容

授权：[85/6539128264](https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6539128264)，输入交接：[85/6539088769](https://github.com/dwroy/agent-sts2/issues/85#issuecomment-6539088769)。本批是两条内容的新判断，不替换旧173检查点，也不阻塞 #77/#79 已批准工程合批。

| 对象 | 新档位／类别 | 新 confidence | 对象内正式状态 | 生产状态 |
|---|---|---:|---|---|
| silent-route-hp-observation | B+／路线资源／单臂统计 | 0.296970 | published | 等 #79/ops 原批受理 |
| silent-brain-poison-footwork-realization-review | B−／构筑组合／原观察，仅引用 | 0 | reference_only | 等 #79/ops 原批受理 |

`published` 是符合 #85 正文资格的对象内标志，不是已写生产库。回执明确 `production_published:false`，不生成生产候选或替 #79 写审批、关系或分类。

## 冻结与修订身份

固定输入原字节复制为 [frozen-input.json](frozen-input.json)，SHA256 `15042ed977def62948321bac6d3e2fbc2bee85ba80b8cc76c48c608d6fd2c81e`，基于 `K1-753af285189835e26c864fe38d6cf5550eab1399158bbb68ce8f73ce078e7fec`。新授权 [authority.json](authority.json) 保存主管原文、作者与原文 SHA，绑定完整输入、新判断文件和逐对象／判断 SHA。判断及限制见 [assessments.json](assessments.json)。

| ID 简称 | 去分级输入内容 SHA | 最终内容 SHA | 新 runtime revision |
|---|---|---|---|
| route | `5adde8b951bade4ab309b433be7c743a221cb612771b47b35a622e2eff4a10f2` | `968758b499ccf867d45b163edada011b6dde7268f6a3769dc9026d8904487cd7` | `c6537c17e5fab7cec2568b6e8dd586df7e072431d943393b3a8aa68f65ee168d` |
| poison | `401e79a837826674a552db10ce7368870ac4c2ca0590b26677459263cfc98ebf` | `39afcd5f25083d3d0c35808add90eea3b23a298387811114843475e93b9d39bf` | `8dd074065bdd3831e472a88f879c00bbc9cba492d1e29e5345e76506a2ccae11` |

完整对象在 [receipt.json](receipt.json) 的 `entries`，也分别放在 `objects/` 下，其文件字节即 canonical JSON、无尾换行，文件 SHA 等于上述最终内容 SHA。内容 SHA 使用项目 canonical 算法；runtime revision 为 `sha256(path + "\n" + canonical(entry))`。来源 `version` 字符串原样保留为 stock002-c3／stock001-c1，新判断身份由上述内容与修订哈希区分，不冒原修订继续有效。

回执文件 SHA256 `84db4fba1d3fd51beff8129277bc7e26f0ecbe0639b502b3c59efb711934dba1`。输入的 strategy、evidence、trigger、version、所有 batch_supplements/prior_texts 及其他非分级字段逐键一致；只新增新分级、confidence、formal_publication 及其依据，不从旧正式状态继承。保留历史中的旧文字／旧数字不成为本批评分依据。输入分类完整哈希写入回执，不改分类；最终 target SHA、审批原件及原新策略／分类新增交 #79 后续处理。

## 新判断依据

路线：重新打开保留的 20261024-154311 原归档并校验归档／成员 SHA，重新去重得280自有局、524机会、6个整局赢家。它仅支持完整历史仍保留的机会资源描述，满足自有10局描述门，故重新计算 `0.35×280/(280+50)=0.296970`。新正文仍是路线预算复核，没有变成固定休息、精英选择或安全线。182334新增外部两例单独 n=2，不借280局验证它们，不将524机会当独立局，也不把 unknown 自有版本和 v0.111 合池。两种终局与恢复后耗竭是所保留的边界／实例，没有可比对照臂，不支持 A 或因果收益。

毒系：重新核20条外部投影（10选定赢家、10选定败者，共859节点）、20个不同安全投影 SHA 与10页读取回执。保持幕1/2及三签名前缀触发时，4条命中全为选定赢家；4/10是赢家选样中的特征比例，不是齐备后的胜率，节点和旧批样例不能累加补分母。自有仍2局，外部仍低于50描述门；没有实际能力部署或已核确定性牌文机制，不适用机制事实 confidence=null。幕3才齐备的败例不能硬充当前幕1/2条件的反向。B−的0表示未达正文门，不是负效果。保留两局过首Boss的有限反证，不冒完整循环已验证。

[evidence-audit.json](evidence-audit.json) 保存逐来源、版本、SHA、分母、条件行与7个自有原始日志窗口重读证明；[audit_sources.py](audit_sources.py) 可重跑。外部统计文件 SHA `5def6d80…` 与源账本的 representative artifact SHA `db3480e4…` 分列，不混比；旧辅助定位缺口与版本 unknown 继续保留。本批新增系统对局0，无模型调用。

## 工具、核验与交接

最小扩展 `agent/tools/grade-strategies.ts`：显式子命令 `regrade-frozen INPUT ASSESSMENTS AUTHORITY DESTINATION`。在写文件前验证完整输入／逐对象／逐判断绑定、新 authority 来源及原文 SHA、唯一 ID、旧分级字段缺失、阈值与一致性；按本次判断重算分数、验证正式对象与更新，逐键断言非分级内容不变。输出为回执，`wx` 拒绝覆盖；没有生产写入口。旧四参数接口及原173检查点保持。

在 `agent/` 重跑：

```bash
nice -n 19 node --import tsx tools/grade-strategies.ts regrade-frozen \
  ../paper/materials/20261031-issue85-regrade79/frozen-input.json \
  ../paper/materials/20261031-issue85-regrade79/assessments.json \
  ../paper/materials/20261031-issue85-regrade79/authority.json \
  ../.artifacts/issue85/regrade79/new-unused-receipt.json
```

旧入口实跑生成的候选与原候选均为 `6a928688762544a624425d750d26525d6f3838dc0df522505a61f6d2452a9bb1`，没有把新内容塞入旧173判断。4文件31项定向测试通过，含新绑定、篡改／旧分级／重复／门槛拒绝、非分级字段与修订身份、原生CLI成功／拒绝无产物／拒绝覆盖，日志 [targeted-tests.log](targeted-tests.log)。生产 tsc、知识 runtime tsc 均通过；全套固定排除的沙箱检查653文件6035项全部通过，另 paths 1文件11项通过，单 worker／nice 19，结果见 [checks.json](checks.json)／[sandbox.log](sandbox.log)。这不是原 #77/#79 组合的唯一 full，不替代原集成员最终适用组合检查。

[consumer-proof.json](consumer-proof.json) 是本树 .artifacts 的隔离普通 submit/validate/publish 及实际绑定消费者证明：173条仅两条更新、171条不变、146原绑定逐列保留；两条 typed SHA／runtime revision 精确相等；`kb_strategies detail=full` 分别4片／1片取齐，拼接／解析后 SHA 等于最终对象。路线正文资格 true、固定视图1443B；毒系 false、仅引用，视图1738B。测试使用正式幕2／rest及逐行卡牌ID上下文，初轮将三ID错误拼在一行导致过滤为空，修正测试夹具后通过，初轮原日志留在 .artifacts。

该证明只在自有隔离库测试已有普通发布和消费者，不验证 #79 原冲突批的 reviewed-successor 准入，也不替它写关系；测试内仅为旧分类元数据重绑两条 target SHA，不交付生产分类。源备份、回执字节前后相同。[verify-consumer.mjs](verify-consumer.mjs) 可重跑到本树新 .artifacts 目录。

本批源码仅 ROOT 离线工具和固定测试两叶，LIVE零叶，前后 blob／SHA／模式／回退见 [deployment-map.json](deployment-map.json)。基线同时保留已采用 r2 和昨日审计，集成员只采本次 CLI 差量，不重合旧历史；固定请求只准备，不提交／tick，不热改 #77/#79 已批组合。工具回退恢复原 blob 即可，已交完整回执仍可离线核验。未改运行源码、生产知识／control、main、live、STOP、保存局或版本编号。先前另派的 launch 非迁移修复及自然30局父验收不由这两条重判关闭。

交 #79/ops：以本回执完整对象及最终 SHA 生成分类 target、双代审批与原批后继原件，保留原 candidate/report/approval/body/digest；新无冲突策略／分类另保留；走原 ID 和原锁序／准入，不重开182334模型。完整回执可独立消费，离线工具的源码采用不成为原批数据受理的新前置。此交付不自动放生产门。
