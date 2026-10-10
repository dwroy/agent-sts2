# Codex 用量读取与用量守卫（2026-10-03）

codex-cli 0.160.0，家目录 ~/.codex（Roy 的 ChatGPT 登录，prolite 计划），引擎 src/brain/engines/codex.ts，守卫
src/brain/engines/codex-usage.ts。起因：`codex exec --json` 的事件流不报限额；4 道基准题把周窗口从 0% 推到 1%，一局
约 70 次调用约占周窗口 9–26%（每次都付约 155k tokens 的完整提示，缓存不命中）；Roy 自己用 Codex 也走这个账户；
账户有 500 credits，计划用完后可能自动扣 credits（真钱）。

## 怎么读

0.160 没有打印用量的非交互子命令（`codex login status`、`codex doctor` 不含；TUI 的 /usage、/status 要交互）。
干净的读法是一个**短命的 `codex app-server`，走 stdio JSON-RPC**（每行一个 JSON 对象，不带 `jsonrpc` 字段）：

1. → `{"id":1,"method":"initialize","params":{"clientInfo":{"name":"jev_brain_usage","title":null,"version":"1"},"capabilities":null}}`
2. → `{"method":"initialized"}`
3. → `{"id":2,"method":"account/rateLimits/read","params":{"excludeResetCreditDetails":true}}` ← GetAccountRateLimitsResponse
4. 收到 id 2 的回答后关 stdin，服务器自己退出（约 20 ms）。

- 不能三条写完就关 stdin：服务器读到 EOF 就退出，不等用量的回答（实测只回了 initialize）。
- 登录：`CODEX_HOME=~/.codex`，token 文件由 codex 自己读，我们不读、不拷贝、不打印。环境只给 PATH/HOME 等基本变量
  （engines/process.ts agentEnv），不带任何 key。
- 不起也不用共享 daemon：`--disable daemon_auto_start`（另关 hooks、memories、plugins、apps 等，见
  CODEX_USAGE_DISABLED_FEATURES），`-c sqlite_home=… -c log_dir=…` 指到 /tmp/jev-brain-codex-state/usage，
  `analytics.enabled=false`、`check_for_update_on_startup=false`。读前读后对比进程列表：没有新进程；Roy 登录起的
  managed daemon（`app-server --listen unix:// --managed-daemon`）没碰，一直在跑。
- 20 s 没读完就杀进程组（负 PID）；回答后 3 s 还不退也杀。
- 协议的类型定义可以离线生成：`codex app-server generate-ts --out DIR`（不需要登录），见 v2/GetAccountRateLimitsResponse.ts、
  RateLimitSnapshot.ts、RateLimitWindow.ts、CreditsSnapshot.ts。

## 实测（2026-10-03 18:00–18:16 CST）

| 读 | 用时 |
|---|---|
| 探索脚本（initialize 211 ms，回答 926 ms，退出 944 ms） | 0.94 s |
| 守卫自己的读（experiments/brain-replay/codex-usage/read-usage.ts，连读 3 次） | 832 / 773 / 814 ms |
| 只起停 app-server、不读用量 | 0.17 s 墙钟，约 0.18 s CPU |

一次读约 0.8–0.9 s，大部分是等后端；CPU 约 0.2 s。回答（账户 id 去掉）：

```json
{"ordinaryUsageAllowed": true,
 "rateLimits": {"limitId": "codex", "primary": {"usedPercent": 1, "windowDurationMins": 10080, "resetsAt": 1791623197},
                "secondary": null, "credits": {"hasCredits": true, "unlimited": false, "balance": "500"},
                "individualLimit": null, "spendControlReached": false, "planType": "prolite", "rateLimitReachedType": null},
 "rateLimitsByLimitId": {"codex": {"…同上…"}},
 "rateLimitResetCredits": {"availableCount": 2, "credits": null}, "accountId": "<去掉>", "rateLimitUpsell": null}
```

当前：周窗口（10080 分钟）**1%**，2026-10-10 09:06:37 UTC（17:06 CST）重置，credits 余额 500。

## credits 会不会自动扣、能不能禁止

- 会。OpenAI 的 Codex 定价页（learn.chatgpt.com/docs/pricing）："After you reach your included limits, available credits
  let you continue working."；codexusage.dev/credits：有余额时后续请求自动扣 credits，不用手动切换。
  openai/codex#48394（enhancement，开放）请求 "Stop when plan limit is reached" 或用 credits 前先确认：现在没有这个开关。
- 0.160 本地也没有：`codex features list`、二进制里的配置结构（config 键）、exec / app-server 参数、app-server API 都没有
  "不许用 credits"的设置。API 里与 credits 有关的只有读（credits.balance / hasCredits / unlimited、ordinaryUsageAllowed、
  rateLimitReachedType、spendControlReached），和两个会动账户的请求：`account/rateLimitResetCredit/consume`（兑换"重置额度"，
  账户上有 2 个）、`account/sendAddCreditsNudgeEmail`。引擎从不发这两个。
- `account/rateLimits/read` 的 `supportsLunaReserve`（用完后由后端自动切到 Luna 模型的实验）不发，默认 false。
- 账户层面的设置（ChatGPT Settings > Usage 的自动充值等）不动。
- 结论：没有安全、只影响我们的本地开关可用。守卫在 80% 停（离 100% 留 20 个点），并且一见 credits 在用就停。
  剩余风险：两次读之间（默认最多 3 次调用或 10 分钟）若 Roy 自己把窗口用到 100%，这几次调用可能扣 credits；
  下一次读时余额下降就会让 codex 停下。

## 守卫

- 进程开始（Brain.preflight，在 codex 开局检查通过之后）读一次；之后每次 codex 调用前，若距上次读已有
  BRAIN_CODEX_USAGE_EVERY_CALLS 次调用（默认 3，re-ask 也算）或 BRAIN_CODEX_USAGE_EVERY_MIN 分钟（默认 10），先读再调。
  同时到期的调用共用一次读。不在后台轮询：不调用就不读。
- 停（本进程不再用 codex，走现成的"计划用完"路径：EngineFailure quota、无限期休息，控制台说一次，问题都给 BRAIN_FALLBACK）：
  - (a) 任一窗口（rateLimits 和 rateLimitsByLimitId 的每个桶，primary / secondary；individualLimit 按 100 - remainingPercent）
    used% ≥ BRAIN_CODEX_USAGE_STOP_PCT（默认 80）；
  - (b) credits 在用：余额低于本进程见过的最高值；ordinaryUsageAllowed 为 false；rateLimitReachedType 非空；
    spendControlReached 为 true；任一窗口 ≥ 100%。
  - 开局读就满足 (a)/(b)：codex 本进程不启用（router.markUnavailable，kind quota），开局 ERROR 一行，写进 run-config 的 warnings。
- 读不到：控制台说一次，codex 照用（下一次到期再试）。BRAIN_CODEX_USAGE_REQUIRED=on 时改为停用 codex（kind unavailable）。
  选"照用"是为了不让一次读失败（网络抖动、codex 版本改了 API）白白关掉 codex；ops 要稳妥可以开 REQUIRED。
- 记录：brain.jsonl 里与 codex 有关的行（codex 答的，或从 codex 回落的）带 `limits`：
  `{engine, read_at, read_ms, plan, used_pct, window, window_min, resets_at, credits, ordinary_usage_allowed, reached_type}`
  （最满的窗口）；logdb 的 llm_calls_raw 多三列 limit_used_pct / limit_resets_at / limit_credits。run-config.jsonl 带
  `codex_usage`：`{stop_pct, every_calls, every_min, required, start, last, calls_since_read, stopped?, unreadable?}`。

开销：每 3 次调用（xhigh 每次几分钟）一次约 0.9 s 的读，不到 brain 用时的 1%；每次调用约占周窗口 0.1–0.4%，
所以两次读之间最多多用约 1%。
