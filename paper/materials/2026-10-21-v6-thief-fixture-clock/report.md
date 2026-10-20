# P4 单败：thief-card-value 固定样本测试的时钟依赖

2026-10-21 03:59 CST，原 W8 / codex1 / native session `01a15382-761a-76a2-922d-271169b2463c`。续接 Claude P4 和 ops 03:50 单败定位要求；仅在原 P4 自有树取证和修改测试，没有修改 ops 树或运行完整测试。

已确认的问题是固定结果测试依赖宿主真实模拟时钟：用例要求必得 8 个样本，而生产实现允许预算耗尽后返回 0 个样本及未知值。最小修复通过已有的 `ThiefCardSetup.now` 接口，为这个固定结果用例注入固定时钟；另加独立用例推进时钟，严格断言过期后的零样本、`timedOut=true`、`status=no_samples`、空数值和原因。真实串行模拟器、牌组、种子、8 样本、on/off、仅计算一次及日志断言均保留；生产 15 秒预算与原测试 120 秒超时不变。

**原 full 的零样本具体原因仍未知。** 原日志只有匹配对象缩写，没有实际 `status/why`、模拟阶段时钟或 CPU 现场；不能据本次受控时钟试验把历史失败归为宿主负载，也不能据当前单跑通过宣称原完整检查通过。

## 输入与依赖

- 原失败联合 tree：`58db1f19f3b09903dd002447e5671ecd57a657d6`；2399 输入清单 SHA256：`1058987e39d5932e68168b2c8361eba38e9068dfa4fafb1063edd647f67c3516`。原 full 为 629 文件、5935 通过 / 1 失败 / 2 跳过，1429.598 秒；唯一失败用例 31367 ms，测试文件 32175 ms。原 full SHA256：`c97e4d64a866879350e185ba4f31ac273b04236b9d2772d0f731a0621f04fb41`。
- 自有隔离副本复制全部 2399 输入（116402865 字节），逐项 SHA 匹配后运行。修后再核，仅 `agent/tests/thief-card-value.test.ts` 一叶变化，其余 2398 叶相同；证据见 `input-copy.json` 与 `fixed-input-difference.json`。
- R407 基线 `a7d07949efb03278a62050ca39447941309b4b7e` 到失败联合 tree 的 loop、估值、串行模拟器、build-sim、boss-start、预算模块及相关固定夹具等 12 个直接依赖字节一致，见 `dependency-comparison.json`。P4 没有改生产 TypeScript；知识刷新漂移另列于该文件，不能据直接依赖一致冒称全库无差异。
- 用例显式使用 `FIXTURE_DB/FIXTURE_MM`、固定升级表和 loggedKnowledge；角色为 Ironclad，不进入 Silent 的 H1 回合预算分支。`thiefCardValue` 的缺 Boss、未知牌、错误、无完成样本等分支都可能为零样本，因此不能只据 `samples=0` 判具体原因。

## 定向结果

所有测试均 nice 19 / ionice 3 / 单 worker / 主盘短 TMPDIR，无真实模型请求或生产刷新。

| 输入与试验 | 结果 | 用例耗时 |
| --- | --- | --- |
| 原联合输入，原用例单跑 | 1 过，9 跳过 | 8661 ms |
| 原联合输入，原整文件 | 10 过 | 原失败用例 8735 ms |
| 原联合输入，仅加观测 | 串行模拟实际完成 8/8，未超时 | runner 240 ms，收到预算约 14981 ms |
| 原用例 + 受控推进时钟 | 准确出现 `samples 8 → 0` 断言失败 | 受控单例 4530 ms；wrapper 7.805 s |
| 修后联合输入，tsc | exit 0 | 0.880 s |
| 修后联合输入，整文件 | 11 过 | 原用例 8726 ms；新增过期分支 11 ms；wrapper 12.771 s |

受控推进时钟输出明确为 `samples=0, requested=8, timedOut=true, status=no_samples, hp=null, measures=null`，原因为 `no sample finished within the time budget`。这证明宿主时钟是原断言的有效影响因素，不等于复现了历史 full 的物理成因。输出中的 `ms=120008` 是注入时钟累计值，不是真实运行 120 秒。原 full、两次原源通过、受控红灯、修后绿灯分别保留。

隔离副本首次 tsc 因 2399 输入清单未列 learner/eval 的 package.json，缺少 ESM 包边界而失败。补入**同一冻结 tree**的两份 package 元数据后 tsc 通过；前次失败原件及支持文件 SHA 保留在 `fixed-tsc.*` 和 `typescript-support-files.json`，未改任何生产编译配置。第一轮受控红灯用 JSON reporter，console 诊断未输出；第二轮改直接 stdout 并保留独立日志，未覆盖首轮。

## 最小运输

正式源码：`7127c1528fee38d2e5094c2127a73186eeffb5d1`，tree `0c9c1924f6000168688705ce9750691d7d93f2b5`。**只运输一叶最小 patch，不运输父提交、整支或整个 tree。**

- 文件：`agent/tests/thief-card-value.test.ts`。
- 前像 SHA256：`74d761cae2a2b45562ab19c14393dcf333215ecaa6bb53b6acac33a91b9a9a3e`。
- 后像 SHA256：`de8d4f301de804bcabf28124357c4410e304f265dd6e2614defbcfe3d3d4d332`。
- patch：`checks/minimal-source.patch`，SHA256 `cab7aae8b136fccef73359c51005b5fe4e94fab4e504a9a42dc096ca6847d4a7`。
- manifest：`checks/source-manifest.json`，SHA256 `979bc45ad5b5f2c1df5801b819e544a8323f18eab9b9de0e3b29af61a9ce713b`。
- 已实际对冻结前像应用 patch，后像与正式 Git blob 字节相同，见 `transport-proof.json`。

源码与材料 gitleaks 均另附。当前仅完成源码提交、tsc 和定向验证，**main/live/完整联合验收均未完成**。交 ops 将该一叶补丁与原 P4 29 叶组成实际精确候选，按单点窗口完整验收；不附带 001302 六叶、014301 三叶、805、配置或知识更改。R407 当前局、CARD=jev、REFLEX=off、STOP 与 Regent 均未操作。
