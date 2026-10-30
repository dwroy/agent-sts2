# #82 404 墓碑合同后继交付

依据 [82/6499780647](https://github.com/dwroy/agent-sts2/issues/82#issuecomment-6499780647)，在原树、原分支和原线程接续。差量基线为上一交付 `f40e29463bed028c08721dc403500708ff083e0d`；固定交付 HEAD 以 `issue-82-spire-codex-tombstones-r1` 请求和 issue 评论为准。只准备请求，交原集成员小批队列；#84/#77 未就绪不等待，不 submit/tick/install、不另开完整检查链。

## 实现与边界

- 仅已验证列表行的原回放接口、成功完成的 HTTP404、严格识别的 JSON `{"detail":"Replay not found"}` 或精确纯文本，进入私有墓碑。不同正文、额外字段、其他接口、跳转后的404、非零curl返回码、字节不符均拒绝；429/超时/5xx等保留原退避和失败处理，不记墓碑。未推断源站删除或失效原因。
- 同一 private run ID 保留墓碑和历次观察：cycle、分片、页、1-based序号、时间、列表SHA、头/体SHA及精确副本。副本独立复制，后继curl不能截断它；journal持久记录缺失证据，本轮不删除chunk/headers，历史raw/收据与ops已冻结失败副本不动。新响应记录curl结束时间，旧版冻结404仅有完整Content-Length可离线接收，时间为响应头文件mtime。
- 墓碑先持久保存再熔断。当前cycle去重成功与墓碑并集为已处理记录，墓碑数×100大于记录数或连续5个新处理run为墓碑立即停止。恰好1%可继续；重复行/重读前缀不重复计数、不清连续性，重启在联网前仍拒绝已触发的cycle。
- 同轮墓碑不重试，下载journal也覆盖索引提交前中断；下一完整cycle遇到该run自然再试一次，仍缺失追加原墓碑观察，恢复成功解除active并留历史。
- 未完成cycle固定原versions/shards/page，复用本轮已核回放及原manifest验证导出；原导出bytes/SHA坏则不联网并保留游标。无需借每日manifest重建原40分片。工程未触碰生产索引或原游标，未启动生产下载，也没有实际把原404转为墓碑。
- active墓碑排除旧成功raw的当前回放投影、DB及统计，也排除同run整局导出；导出缓存以私有盐和墓碑集合生成新的可用性寻址，旧文件保留。`report.replay_availability` 及download结果独列墓碑数、已处理数、比例、连续数、跨轮active数；公开结果无墓碑ID/位置/响应内容。这些采集覆盖计数不作为游戏统计分母。

## 验证

所有检查用固定合成输入/临时目录，无API请求；已有DuckDB环境，无安装依赖。最终检查前后六源SHA一致，见 `source-before-final-checks.json` / `source-after-final-checks.json`，其中原TS包装无差量。检查均nice19，顺序执行；Vitest单worker、无文件并行，包装用threads以限制Node+Python最多两进程。

| 检查 | 最终结果 | 原件 |
| --- | --- | --- |
| `data/logdb-venv/bin/python -B eval/tests/test_spire_codex.py` | 49项通过 | `python-final.txt` |
| agent内现有Node直接执行 `typescript/bin/tsc -p tsconfig.json --noEmit` | rc0 | `tsc-final.txt` |
| Vitest `spire-codex.test.ts` / `check-imports.test.ts`，threads/1worker/60s | 2文件2项通过，含Python49项 | `vitest-final.txt` |
| Vitest `paths.test.ts`，forks/1worker/60s | 11项通过 | `paths-final.txt` |
| 原生CLI `--help` | rc0 | `cli-help.txt` |

11项新增测试覆盖：原1/40分片第8页第85条冻结404，782条已核回放及导出不发生新请求；严格404和非墓碑错误/跳转；索引提交前journal接续；同轮重复/重启去重；严格1%与持久熔断；连续5条低比例熔断；新成功重置但旧前缀不重置；坏导出无网络且索引字节不变；下一全量重查/恢复；不完整旧404拒绝；回放/整局导出/DB/报告排除与恢复。

首轮46项有1个夹具路径错误，失败摘要 `first-failure.txt` 保留；改为canonical合成路径后47项通过在 `python-r2.txt`，增加边界后49项在 `python-r3.txt`。最终再加40分片和跳转断言，按新冻结源码跑上述final检查；不回填旧失败。未跑当前最终组合完整Vitest，不把上轮full或本轮定向结果冒作最终组合full；交原唯一队列冻结实际组合并做适用完整检查。

## 映射、接续和回退

ROOT运行叶仅 `eval/spire_codex.py`、`eval/spire_codex_download.py`、`eval/spire_codex_projection.py`。ROOT-only改动为Python固定测试和 `docs/spire-codex.md`；原TS包装不变。逐叶前后blob/SHA/bytes/mode见source receipt。LIVE运行叶=0、宿主常驻入口=0，不分配行为release_id；铁甲及其他对局行为等价。

本次差量应由原集成员对上一已接收的规范化组合核三ROOT叶，沿原队列冻结新组合；不能把整个旧分支历史重新采用或复用旧绿。若#84/#77后继已就绪可合批，未就绪不等；无队列安装/开关/authority变更。原ops在实际合入并核ROOT部署后，沿原参数从1/40/page8续跑，收墓碑数/比例以及原全量、投影、DB、审计、八Boss分母验收；#83继续等全量。已核782条和导出不重下。触发熔断保原现场交主管，不手改计数/游标绕过。

回退只撤本后继ROOT代码/测试/文档差量，保留墓碑历史、原索引、raw、salt、收据、缓存和失败现场；旧版对404仍会停，不能在旧版运行时清墓碑伪造继续。未写main/live/STOP/知识、账号/配置/资源上限，未运行play、生产下载或关闭其他会话；开发交付不代表生产续跑、全量或科学验收完成。
