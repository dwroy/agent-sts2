# #25 停机前 WIP 交接

2026-10-21，分支 `issue-25-open-book-kb`，工作树 `.worktrees/issue-25-open-book-kb`，基线 main `c57f78a49`。Roy 批准 WSL 停机扩容，按 Claude 通知保存后停止；本提交不是验收交付，不改 `status:review`，没有发布到 live。

## 已保存

- #25 已设为 `status:in-progress`；已读 AGENTS、README、最新 STATE、decision-log 末尾、学习协议（含第 9 节）、v6-plan 第 13 节和 GitHub 协作规范，读取了 #25 全文与评论。
- 核查 Spire Codex 许可：PolyForm Noncommercial 1.0.0，Required Notice 为 `Copyright © 2025-present Peter Lord and Spire Codex contributors.`，不当作 MIT 或商用许可。wiki 尚未核实许可，未导入 wiki。
- 固定来源 revision `4f52f5a53597e4fdc6cf130f7ebe2cdd35236101`，`data-beta/v0.111.0/{eng,zhs}/{cards,relics,monsters,events}.json`。原件只保存在本地忽略目录 `data/external/spire-codex/`。相同文件有缓存不重复下载。最初用于辨识 schema 的 stable 文件也在缓存里，不用于生成条目。
- `knowledge/builders/build-open-book.py` 已从缓存生成 595 牌、298 遗物、115 怪、66 事件。Silent 专属与其余资料分文件；保留 pool、机械事实、来源、许可、版本、下载时间、SHA 与过滤说明，剔除图片、风味、长剧情。
- 新 `agent/src/knowledge/open-book.ts`：离线条目选择、18,000 UTF-8 bytes 上限、静态未知数值精确模板匹配、mod 优先冲突记录与去重缺项队列，当前仅 Silent 接入。
- 大脑 request 初步附条目（含 options 名称），Jev state 初步附条目；CardModel 增加不参与评分/known 判定的 externalReference，尚待完整消费者验证。
- `ops/open_book_refresh.py` 和现有 ops learn tick 初步接上有限后台补缺，仅使用已核许可快照、缓存及收据；检测到 play 时延后，无新 daemon。

## 恢复后继续

1. 首先复核 WIP diff 与测试回执，不把当前草稿当完成；修正数据 schema/许可校验与下载锁细节、请求选取/升级/动态值隔离、缺项与冲突记录的边界。
2. 补模拟怪物参考接口，检查 CardModel 附加字段对投影/指纹/现有测试的影响；与 #13 对齐接口。外部数值可查询不代表已经实现出牌机制，不改 known、策略评分或学习样本。
3. 补固定测试：四类相关性、上限与遗漏、精确 ID、升级、现场优先、未知模板、安全队列、无网络；测 5 类题（拿牌/事件/商店/休息/幕初）的字节与耗时。
4. 生成覆盖/缺口与现场文本冲突报告。主检出 `data/game-data.json` 只是一份 `mod_version=0.16.2`、`fetched_at=2026-09-27T03:51:37.812Z` 的旧缓存，含 596/299/107/57 四类条目；不能声称它是当前 v0.111 现场。保留版本和时间差；必要时取得合适固定 mod 证据后再比较。
5. 检查补缺 tick 的运行根目录、对局排除门禁、pending/receipt 公平性、版本更新重查和实际写回/读回；测试不能发网络或运行 play。
6. 完整 tsc、vitest、gitleaks；date 后记 decision-log；正式交付 #25 `[dev #25]` 评论、改 `status:review`，交集成员/ops 开局边界发布。本任务不自行合 live、不碰 STOP，不给未发布行为分配 release_id。

## 提交前检查

- `nice -n 19 node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`：退出 0。
- 完整 vitest 首次运行日志：本地 `data/external/issue-25-wip-vitest.log`。运行约三分钟仍只有 RUN 标记，按最新停机指示对本次检查 PID 711396 发 SIGTERM，退出 143；没有完整测试结果，不能声称通过或代码失败。重启后必须完整重跑。
- 暂存区 `gitleaks git --pre-commit --staged --no-banner --redact`：退出 0，无泄漏。公开评论另扫。

重任务 nice 19、最多 4 进程；未运行 play、未改 live/STOP、未读取 DLL/PCK、未安装依赖。原始缓存不进 git。
