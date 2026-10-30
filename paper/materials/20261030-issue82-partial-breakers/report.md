# #82 部分安全投影与墓碑门返工

2026-10-30，原树、原线程以 `bd4540cda899d5c0249b60a17b9ad9fdbc4370c6` 为基线，分别落实 [6515844478](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6515844478) 的部分投影和 [6515600192](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6515600192) 的采集门。两项工程验收与全量采集、版本争议、学习效果分账。

## A：部分 cycle 的安全输入

先只读核原 ops 的 `progress.json`、`project.log`、计划、冻结索引及回放头。原 CLI 三个源码 SHA 与原计划完全一致；不是部署漂移。1208份已下载回放中1137份 header/index 同为 `v0.111.0`，71份索引为 `v0.111.0`、header 却为 `0.1.0`。后者 mod_version 分布为 v1.2.1/68、v1.1.1/2、v1.2.0/1。这是原站列表分片与回放头之间的实际版本证据冲突，不是本次13条墓碑或在途文件造成的。现有证据不足以裁定两种 build 是否同义，不添加别名或改写任何一侧。原失败、once、计划 SHA 见 `build-mismatch-diagnosis.json`。

`project --partial` 只收当前 cycle 已核 SHA、无在途文件、非 active 墓碑且通过原单人 SILENT A10/版本校验的回放。不合格项分原因隔离，其他解析和隐私错误仍停止。完整模式仍拒绝 build 冲突；71局恢复收录须另交主管确定可验证的版本语义，不能把隔离报告当作该争议已经解决。

部分投影/DB/audit/report 同带 `partial:true`、收录数、排除数及截止游标。整局导出也限定在已通过回放校验的同一集合内，DB只读精确 manifest，报告核DB绑定的投影收据 SHA。全量完成后仍须重做正式全量投影，旧部分DB不能冒充新范围。

实际验收使用原1208局冻结索引的逐字节副本，原raw和原盐只读引用，输出留原开发树 `.artifacts/issue82-partial1208-validation-r4/root/cache/`。不下载、不改原生产根。收录1003局；1208中排除71版本冲突、134多人局；另排除13条 active 墓碑（不包含在1208份成功raw分母里）。静态导出在这个合格集合中匹配972局，不能冒充1003局都有导出。截止为第1/40分片、第13页、cycle未完成。精确输入与输出 SHA、四阶段真实终态见 `partial-validation-final-receipt.json`：project/build-db/audit/report 均rc0，独立audit核1977份安全文档（建库前审计为1976，新增DB收据后多1份）且未含玩家标识字段。DB计数见该回执，DB SHA256为 `0e720292b23bd197f6badd10314ffc1bdbbc2f40a851c3ec025afd4cef2c2ce4`。

已在 [#83/6516266341](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6516266341) 交付，精确路径及SHA见 `safe-handoff.json`。只把该目录的安全 `cache/`、DB、manifest、审计及报告交 #83；#83不读父目录的raw/private-index/salt，也不glob历史缓存，不把部分数量当全量覆盖或玩法结论。

开发自己的实际验收失败均保留：首次部分导出文件名把两个HMAC串接后达312字节，触发ENAMETOOLONG；改为对完整范围一次HMAC，补有墓碑且有导出的固定回归。第二次投影成功但建库触发512MB内存上限，原全库单事务改为临时库按回放提交；第三次已写完1003局，却在972行整局导出组成的24,746,775字节JSON批次再次触发512MB上限。离线复现后，入库批次按1MiB编码字节分批（单行不拆分，保留5000行上限），不改表、内容或去重语义。仍单线程/512MB，全部成功才替换正式库。固定后继失败测试验证上一份正式DB及receipt不变，另用1000行固定宽记录在128MB限制下验证完整写入与重复去重。这三次开发失败不覆盖 ops 原 `replay/index build mismatch` 失败，也不把旧失败倒填为新源码通过。

## B：10% / 连续5 / 页50% / 接续

CLI `--max-tombstone-ratio` 默认0.10，仅有限的[0,1]；精确有理数比较，累计严格超过才停，恰好10%可继续。连续≥5不变。新增同页已处理≥10且墓碑≥50%停止，包括第10条是成功时形成5/10的情形。先持久保存去重计数再查门，重启在网络之前拒绝已触发的同参数门；重复行/页前缀不重复计数，不重置原连续性。

私有 `cycle.page_progress` 保存页内去重键，公开进度仅列页级聚合。原索引只能还原旧墓碑所在页，历史成功行无页归属，因此旧页成功分母记null、`legacy_tombstones_only`，不虚构50%比例；原恢复页逐行核实后按去重已观察行计数。累计仍准确读回13/1221、连续1。旧页8/11/12/13分别2/5/4/2碑，原件见 `original-page-summary.json`；读取汇总不改生产索引。

固定测试覆盖10%精确边界及严格超过、CLI默认/覆盖/非法值、连续5、页9行不启用/10行恰好50%/40%、成功行触发页门、重复/重启去重、旧页未知分母与原13碑接续。旧404一次补证路径、额度和全部旧测试保持。

## 交付与剩余责任

运行差量为 ROOT 三叶 `eval/spire_codex.py`、`eval/spire_codex_download.py`、`eval/spire_codex_projection.py`；LIVE叶0，无游戏行为版本号。基线/候选逐叶 SHA 在 `source-closure.json`，只取父提交为bd的新提交接入原小批/K队列，不merge或重放原功能分支历史。只读main参考672b7019的三运行叶与bd基线逐字节相同。main参考只读已在009c902b之后；能与#84合同修复同批则交原负责人，否则独立小批。开发只准备固定请求，不submit/tick、重冻或重跑候选full。

原 ops 在实际合入、核ROOT字节后才按既有授权从第1/40页13接续采集；13碑及已用旧404额度保留，不能重新领取额度或重取。旧失败/once、782原缓存/导出、盐、原游标和私有证据不删除、不重写。全量采集/正式投影/八Boss分母由原 ops 和 #83 后继验收，71局版本语义交主管，不关闭科学父项。

回退只撤本次三源码叶/测试/文档差量，不删除私有页账、原墓碑或一次额度，不改盐/游标或抹去安全产物与失败记录。回退CLI会重新在原1%门拒绝接续；回退不授权修改数据越门。未写ROOT部署/main/live/STOP/PAUSE、正式知识、账号或运维prompt，未运行play、生产下载、生产重取或关闭其他会话。

## 检查记录

最终固定Python72项通过（`fixed-final72.log`），包含旧404额度/782固定数据保留、10%/连续5/页50%/续跑、部分投影与DB范围绑定、后继回放失败不替换正式DB、宽导出128MB回归。实际1208四CLI全rc0，三运行源码与该回执一致。生产索引及原ops四原件最终SHA不变，见`preservation-final.json`。

按原脚本 `bash tools/test-sandbox.sh` 自测，单worker/no-file-parallelism、nice19。首轮tsc通过，Vitest650文件/6017项过，唯一external-stock外层15000ms超时（其28项固定Python已在14.906s通过）；脚本因此rc1、未到paths，原件`sandbox-initial-rc1.log`保留。随后仍用原脚本，仅定向external-stock和本次spire-codex，CLI设Vitest时限60000ms，不改测试源码、原Python20000ms子进程时限、生产门或排除名单：tsc0、线程阶段2文件2项过、fork阶段3文件13项过（含paths11），脚本rc0，原件`sandbox-targeted-rc0.log`。不把定向复核倒填为首轮全绿，不再扩跑候选组合full；实际集成组合的唯一完整检查仍交原负责人。逐项命令、结果及源码SHA见`checks.json`。
