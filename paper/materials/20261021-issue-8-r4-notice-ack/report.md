# #8 R4 manual notice 兼容交付

2026-10-21，开发工作树 `issue-8-r4-notice-ack`，基线 `a2eed3cb3`。

`ack_manual_notice` 原任务白名单缺少 `v6-reflex-distill-r4`。继续核原启动输入发现，R4 使用 `.artifacts/<batch>/inputs.json` 的 `manual-v6-r4-input-bootstrap-v1`，以 `request` 记录原要求，未显式记录 task/character；旧入口要求 `ops/codex-ops/learner` 布局和 request_id/task/character，单加白名单仍会拒绝真实原件。

本补丁增加 R4 专用输入校验：冻结原路径、schema、request、batch、worktree，若输入包含 request_id/task/character 则也必须一致。原启动必须是同 task、batch、工作树、正常退出和唯一线程；完整原 proposal 必须是 `learning-notice-proposal-v1` 且 request_id/batch/task/character 一致。R4 通知的 request_sha256 必须绑定完整 proposal，不能换成 bootstrap SHA。旧三个手动任务沿原规则处理。角色、送达状态、前序阶段和证据原件的校验继续由现有 ACK 入口负责。

四原 question id：

- `r4-no-supported-pick-advice`
- `r4-genuine-source-experience-missing`
- `r4-old-combat-scope-retained`
- `r4-unavailable-provenance-and-damage`

原 proposal SHA256：`4e6e78ab3504f55fc100f72082bb42b6e17397a50268555c1ad14497bc61cfe4`。通知包含完整原文，因此四个 id 也随原文受绑定；删改 id 的固定数据用例拒绝且无写入。

## 原件预检与接续

`original-authentication-preflight.json` 保存实际原件的路径/SHA、原来源绑定 source 和只读鉴权结果。以原主检出的启动日志、冻结输入和 scratch proposal 调用鉴权函数，旧基线拒绝，补丁接受；scratch proposal 与 ops 归档逐字节相同，四个 id 与 Roy 原确认文件一致。前后核对原输入、日志、proposal、旧拒绝回执和 Roy 确认的 SHA 均未变。

这是鉴权预检，不是生产 ACK；没有创建生产通知、写入中央登记或学习父要求。原 proposal 中 ops_forwarded/watcher_received/roy_notified 仍全为 false；旧拒绝回执保留。watcher/ops 集成后沿原通知链使用原来源绑定，各角色凭自己的实际回执执行原 `ack --source` 流程，不能将本报告或固定数据测试当送达凭证。本开发会话没有代任何角色登记。

原批次退出、draft0，三个区间全跨 0、缺真实 source_experience 的结论保持原状；科学父未关闭，未正式知识发布，未续批、模拟或运行 play，未改 live/STOP、REFLEX 配置或对局规则，无行为发布编号变更。

## 验证

- 固定数据 Python 回归：7 项通过，含旧 5 项及 R4 独立角色链、错误身份/原文/SHA 拒绝。最终源码输出见 `manual-python-final.log`。
- 基线反证：相同 7 项测试运行旧鉴权函数，旧 5 项保持通过，R4 正向链在原白名单处失败；见 `baseline-r4-red.log`。
- 本次改动的 Vitest 入口 `tests/manual-notice-ack.test.ts`：1 文件、1 测试通过（内部运行上述 7 项 Python 回归），771 ms；见 `targeted-vitest.log`。
- 沙箱脚本中的 `npx tsc -p tsconfig.json --noEmit` 已通过。
- 脚本末尾的 `paths.test.ts` 单独以单 fork 补跑（前段失败将触发脚本 set -e），1 文件、11 测试通过；见 `paths.log`。
- `SANDBOX_WORKERS=1 bash agent/tools/test-sandbox.sh`：tsc 通过，Vitest 原始结果 580 文件通过、6 文件失败；5216 项通过、7 项失败，退出 1，用时 1441.19 s。脚本既定排除不变，完整输出见 `sandbox.log`，不能报告全绿。

完整检查发现与本补丁无关的 `v6-direction-provider.test.ts:139` 失败：缺少 W0 时预期 win/expected_win 为 null，现值为 0.5。该用例及 agent/src 均未改动。另用 `git archive a2eed3cb3 agent` 在 `.artifacts/issue-8-r4-notice-ack/baseline-source` 导出完整基线源码（共享未改动的 knowledge 与 node_modules），在基线副本单跑同文件，复现完全相同的断言差异，3 项通过、1 项失败；当前树单跑也是同样结果。分别保留 `provider-baseline.log` 与 `provider-current.log`。该方向数值问题超出 #8 运维通知兼容范围，没有改相关测试、新增排除或调整对局数值来掩盖；整套检查不能报告全绿。交 watcher/ops 评估原基线问题，本交付不集成 main/live。

随后完整检查输出 `v6-projection-entries.test.ts:23` 的 1 项失败（general_win?.n 预期 20，实际 undefined），及 `v6-target-values.test.ts:18/58` 的 2 项失败（constructionCoverage.reason 预期 null，实际 insufficient_known_options）。同一份基线副本单跑这两个文件，6 项中同样 3 失败、3 通过，断言差异一致；见 `projection-baseline.log`。至此三文件四失败均已在未修改基线上复现。

另外三项复核：

- `component-usage.test.ts` 缺少工作树 `data/logdb-venv/bin/python`，`legacy-refresh-incremental.test.ts` 的系统 Python 缺 duckdb。仅在忽略的 data 目录链接本仓库已有 LogDB venv，没有安装依赖或修改其内容，再运行两个原测试文件：2 文件、5 项通过，见 `component-legacy-restored-venv.log`；药水 Python 用例单独使用该 venv 也通过，见 `potion-venv.log`。
- `ordinary-close-isolation.test.ts` 原运行在 15 秒子进程限时被终止（status=null）；未改代码或限时，单文件重跑 1 项通过，测试耗时 14.51 s，见 `ordinary-isolated.log`。原失败仍留在 `sandbox.log`。

定向复核后剩余阻塞是上述四项基线方向/projection 断言，不是本次通知代码引入；未重新跑整套并宣称全绿。原检查与重跑分文件保留。交付暂存区完整补丁（含报告和原始输出）经 gitleaks 扫描退出 0，无泄漏。原始测试日志保留工具输出的末尾空行。

## 回退

对交付提交执行 `git revert <交付提交>`，恢复旧入口对 R4 的拒绝行为。保留所有历史 proposal、false flags、拒绝回执和未来各角色真实 ACK 的审计原件；代码回退不能用于回写或撤销已发生的送达事实。由 watcher/ops 沿 #8 原链集成，本工作树不合 main/live。
