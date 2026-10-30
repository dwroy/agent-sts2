# #82 旧404证据不完整的单次受控重取

按 [82/6513078786](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6513078786)，原树、原线程在 `55bc8ba576cbdecb53062fa2641f848b7a39c11f` 上补一次受控重取。起因是 [ops原失败回执](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6513026437)：冻结404正文匹配，但缺Content-Length及curl rc，旧CLI在1/40分片page8停止。旧失败及前两次工程材料保留；本次没有运行生产下载、读取或改写生产私有索引/盐/游标，不能据固定夹具声称生产404已补齐。

## 行为与边界

- 只对已验证列表行的原回放URL，旧journal无curl rc、冻结404无Content-Length且正文精确匹配 `Replay not found` 的情形开受控路径。有完整长度的旧404仍离线恢复；已知curl失败、长度不符、不同正文、其他接口和跳转不领取额度。
- 私有根目录 `legacy-404-recheck.json` 共用一次额度，绑定URL、cycle及下载参数。先把旧正文、头、journal和已有part复制到 `raw/legacy-404-rechecks/`，核SHA并记原长度/mtime，再持久写开始标记，才发一次无Range/条件头的完整GET。新正文/头另存，不覆盖旧失败，保存SHA、HTTP状态、curl rc、开始/完成时间。
- 新结果只有rc0且完整的精确404记墓碑；200走原长度、固定SHA、修订保留与回执发布。429、超时、5xx、其他404、跳转、206、rc非零及长度/SHA错误均停止，不退避、不循环、不扩大重试。新响应没有Content-Length但curl正常完成时，仍保存实际全部响应头和正文SHA，不伪造长度字段。
- 请求已开始但结果不明也消耗额度，重启报主管。完成响应后、墓碑/成功索引提交前中断，校验冻结证据恢复结果，不再请求；第二条旧失败或新cycle不能再领旧证据额度。原墓碑下一完整cycle的自然重查不变。守卫、旧证据、异常结果不手改或删除来绕过单次约束。
- 旧完整404无法得知curl rc时新增字段记null，新墓碑记实际rc。墓碑统计/熔断、投影、DB、报表和玩法规则均沿用上一批实现。

## 固定验证

最终六源前后SHA、字节、模式见 `source-before-final-checks.json` / `source-after-final-checks.json`，无漂移；命令、rc及日志SHA见 `checks.json`。全部使用现有依赖、固定合成输入和临时目录，无API请求；nice19、顺序执行、单worker，最多Node+Python或Node+一个fork两进程。

| 检查 | 结果 | 原件 |
| --- | --- | --- |
| Python固定套件 | 60项通过 | `python-final.txt` |
| agent生产tsconfig noEmit | rc0 | `tsc-final.txt` |
| Spire Codex包装与导入检查，threads/1worker/60s | 2文件2项通过，内含Python60项 | `vitest-final.txt` |
| paths，forks/1worker/60s | 11项通过 | `paths-final.txt` |
| 原CLI help | rc0 | `cli-help.txt` |

新增11项覆盖：原1/40、page8、第85条的单次404和200两条接续；782份已核raw、原导出及回执、旧缓存、盐逐字节不变；11种异常结果一次即停且重启不请求、游标与失败原件不变；请求中断额度消耗；完成响应后中断的404/200恢复；成功发布后重复恢复不改原成功回执；坏证据拒绝；第二记录/跨cycle额度约束及原墓碑自然重查；其他旧失败不扩展；固定SHA和固定长度校验；200与旧raw相同也清理旧失败journal供下轮正常重查。

首轮58项和完善边界后的60项均通过，分别保留 `python-r1.txt`、`python-r2.txt`。旧材料中的失败与本批无关，保留原件不回填新源码。未跑本次实际组合完整Vitest；上批703文件/6850项的full不转用本次差量，交原唯一检查负责人按新冻结组合做适用检查。

## 小批K接力

ROOT运行差量仅 `eval/spire_codex_download.py` 一叶（mode100644）；`eval/spire_codex.py`、`eval/spire_codex_projection.py` 及原TS包装无变化。ROOT-only差量是Python固定测试、说明文档、决策记录与本材料；LIVE运行叶=0、宿主常驻入口=0，不分配行为release_id。前后blob/SHA及精确路径均在source receipt，基线是本分支上一交付55bc8ba57；原集成按已采用的规范化主线取这次差量，避免重放原功能历史。

仅准备新的固定请求，priority0、无其他任务依赖，不submit/tick、不改authority、K/L或唯一full门。原小批队列由原负责人冻结实际候选、核运行映射与适用检查，不能复用旧绿；沿通用K接力，不等其他issue凑批，也不自行释放K、刷新或恢复绑定。

实际合入且原ops核ROOT部署字节后，仍由原ops沿原1/40、page8参数接续一次生产CLI，782已核raw和导出不重下，原盐和游标不改。404补齐后核墓碑与比例；200核新增下载回执；其他结果立刻交主管，原投影/build/audit/report后继及全量/八Boss分母验收继续按原顺序。#83和科学父项仍等实际全量，不因开发交付关闭。

回退仅撤本次源码/测试/文档差量；私有单次额度记录、旧失败、新响应、墓碑、raw、成功回执、缓存、盐、索引和游标保留。旧CLI仍会拒绝尚未补证的这一条旧404；额度已消耗但结果未完成时停止交主管，不可通过删证据或额度继续请求。本次未写main/live/STOP、账号/配置、运维prompt或正式知识，未运行play、生产下载或关闭其他会话。
