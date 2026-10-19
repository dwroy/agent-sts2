# 正式工厂集成检查

正式提供方 main a92e8b37f / 记录13a06c1e4。测试只用固定数据；所有命令在本工作树 agent/ 执行，PATH 前置 ~/.local/node/bin。完整 Vitest 以 nice 10、maxWorkers=4、testTimeout=120000 执行，无排除新增测试。

- tsc-1 / focused-1 为保留的首轮失败；tsc-2 / focused-2 为修正后的结果。
- factory-preview 和 b-pairs 为正式工厂合入前的只读预览，不能替代正式 main 的全量检查。
- gitleaks-staged / staged-2 为源码哈希清单的误报：keycheck 文件名与其 SHA256 被 generic-api-key 规则匹配；detail 已脱敏。staged-3 因 sparse 路径未更新暂存清单仍匹配旧清单。改成独立 path / sha256 字段并用 --sparse 正确暂存后 staged-4 退出0；没有添加扫描白名单或排除规则。
- source-sha256.json / source-readback-1.json 记录首轮全检的1437文件及零漂移读回；该轮仅旧导入边界名单断言失败，原件 full-1 保留。精确补入两个消费者后，第二轮以 source-sha256-2.json 为准，未改生产逻辑。结束后逐一读回，不以当前值倒填失败记录。
- 最终通过状态与主树记录变更的源码等价性见 final-result.json。

第二轮完整检查588文件/5607项通过/2项原有跳过；合入前 main 新发布 Silent R2 两个知识文件6d1c86948，W5不修改该发布。第三轮在该基线重跑完整检查，以 source-sha256-3.json（含R2知识哈希）及 full-3/tsc-4 原件为准。

第三轮588文件/5607项通过/2项原有跳过（502.10s）。随后只读变基content_store兼容修复及记录main0c1f289eb，agent受测文件仅上游content-store.test.ts更新；第四轮以source-sha256-4.json、full-4/tsc-5为准，包含两个ops脚本与R2哈希。

最终第四轮：588文件/5607项通过/2项原有跳过（528.65s），tsc0，Python存储15/健康9通过，范围gitleaks0；1441文件逐项哈希无漂移。详见final-result.json。
