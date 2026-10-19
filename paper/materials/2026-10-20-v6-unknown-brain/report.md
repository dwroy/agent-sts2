# V6 构筑未知与 Jev 失败转大脑安全网

2026-10-20 07:16:14 CST；会话 v6-w4w6。最终源码 `914bd7fc6a0e6c6c63acf2fa77d0210558195f8f`，基线 main `d112821faa32dc830d1228ef8b7c0de828c9688f`。

完整测试执行于源码 `1d8efb82dd63f665a1e74e39bac215473768a4be`、基线 `4e6e17606a3aca46547b3de8cdec1d0e3152aef0`；此后变基仅接入 notes/paper/ops 收件箱记录。变基后逐项复核全部 2127 个已跟踪 agent/knowledge 文件集合与 SHA256，测试输入完全相同。具体提交与路径见 `checks.json` 的 equivalence。

四类构筑题（拿牌、选药、商店、休息）进入 Jev 前按本题实际可选 ID 去重计数。至少两项有完整方向/目标质量的加权值，且已知比例达到 `V6_MIN_KNOWN_OPTION_RATIO`（默认 0.5），才能请求 Jev。0 只关闭比例门槛，不能取消“两项”最低要求；非法配置回默认。部分质量的未归一化已知和、只有配对差、无效样本/误差均不算已知；完整的 clearance 或 current_gate 加权胜率可计入。

不满足条件时，同一局面直接重建原大脑题，关闭该题 V6 路由；Jev 不可用、请求错误、超时、非法答案也这样转原大脑，同板不循环请求 Jev。原大脑原有事实/路线/休息后续选择和显式 skip 保留。Jev 已失败的请求仍记入原题型的耗时/兜底审计。大脑也不可用后才用原代码；全部未知且原拿牌基线将默认 skip 时，使用第一个合法可领取牌作为确定性最后手段，不引入牌值或游戏数值。Codex fault/原 Silent 必需 Boss 评估继续暂停，不绕过既有故障守卫。

记录 `v6_unknown_to_brain`，含原因、已知项数/总数和比例阈值；V6 日志携带 T6，屏幕记忆将该信号交给原方向触发器。触发消费复用 question_id，W9 按同 ID 去重；原大脑调用由现有计数器记录，同回合合并与 15 次软上限不变。商店/休息文件仅 `v6RoomActive` 增加一行 fallback 门禁，共用逻辑在 `agent/src/v6/construction-safety.ts` 和 loop。

## 限制和交接

- W6 逐槽 noul 尚无槽位加权胜率投影提供方；持有 HP 和脑档位不冒充投影，因此当前这类选药题严格 unknown 并走原大脑。自动领取空槽奖励、战斗用药不受影响。
- 选择题本身不构造或修补缺失的游戏机制/升级定义；本补丁不证明投影质量，不能关闭既有模型补证或旧局故障。
- 未修改 sim、Jev 协议实现、知识、live、STOP、运维 prompt、共用 Codex 配置或发布编号；没有真实模型请求或游戏动作。Claude/ops 按原恢复授权集成 live 并验收后，才决定恢复。
- 行为逐项回退沿 `V6_CARD_DECIDER/V6_POTION_DECIDER/V6_SHOP_DECIDER/V6_REST_DECIDER=brain`，总体回退 `V6_BUILD=off`；具体配置见 `docs/v6-ops-rollout.md`。降低覆盖阈值仍保留两项最低门槛。

## 固定数据验证

- 新增/更新定向测试：5 文件、107 项通过。覆盖全未知、仅 1 项已知、2/4 边界、低比例、自定义阈值、部分质量/非法样本、实际选项过滤；拿牌与房间 Jev 成功/错误/超时/非法答案；W6 转原大脑；脑失败最后手段、脑显式选择；精确日志与 T6 同 ID 消费。原 off/shadow 题面等价锁继续通过。
- 完整类型检查：exit 0，1.373 秒。
- 完整 Vitest：Test Files  598 passed (598); Tests  5730 passed | 2 skipped (5732)，660.011 秒，最多 2 worker、nice 15，未排除测试。
- 本次源码提交范围 gitleaks：exit 0；发布前另扫材料与最终提交范围。固定输入清单 2127 文件，FF 前复核 SHA256。

`checks.json`、`tsc.log`、`vitest.log.gz`、`targeted.log.gz`、`gitleaks.log` 与 `tested-inputs.json` 保留验收证据。压缩日志逐字节保留原件，包括末尾空行。开发中失败原件仍在独立工作树 `.artifacts/unknown-brain/`，没有覆盖。
