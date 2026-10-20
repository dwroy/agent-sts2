# 五项联合：W4 三项测试合同核实

记录时间：2026-10-20 19:55:13 CST。执行者：codex1 / v6-w4w6 / native thread `01a15382-68eb-7093-b677-040c9b45767f`。

结论：三项为被暂停的旧 P×W 测试与实际旧兼容提供方、新 A/B 消费端混接后的期望冲突；本补丁只改三项测试，不改生产公式。定向 3 文件 19 例通过，tsc 通过。尚未合 main/live，完整联合验收由 ops 单点执行。

## .75 与 .8125 的输入、算式与来源

固定输入来自 `agent/tests/v6-projection-fixture.ts`：拿牌供给 200 个布尔样本中 150 真，故 P_take=150/200=.75；skip 为 100/200=.5。完成组合牌组含 A，`prepare` 标为 completed，20/20 胜得 Wk=1；未完成牌组含 G，FixedRunner 每四个样本胜一次，5/20 胜得 W0=.25。方向只有 D，权重 D=1；唯一当前 Boss 目标概率=1，没有其它方向或目标权重影响这两个数。

| 值 | 算式 | 语义与来源 |
| --- | --- | --- |
| .8125 | .75×1+(1−.75)×.25 | 原兼容字段的完整混合期望，含 W0 |
| .75 | .75×1 | 后来的 P×Wk 设计，不含 W0；该实现已暂停运输 |
| null | P=.5、Wk=1、W0未知 | 原兼容混合缺 W0，不能以 0 代未知，不能改写成 .5 |

旧混合实现始于 `79dc023073785d09263b7e10e667f0c55f349abe`，`4ba67366122dbea1d433ca0a0311c031e509bf9a` 已明确断言 .8125。`303bbb1ac61f95f4d8f5aeb98967bf4f4bf9ab02` 把 `expected(k,g,p)` 改为 `product(k,p)` 并把测试改为 .75；`8da331893d98e98e48f67af20c9756f1f9aa5efc` 将其随 805 依赖精确搬接。当前五项包刻意不带该批实现。失败联合树 `9000141a281a094da2d1b632db38183786b1215e` 的 `agent/src/sim/v6-projection.ts` blob 为 `fdf32f734ae14f3d5fe8a2fcfc4b5c1f456d4193`，与原 live64 完全一致，因此 .8125 是原兼容算术，不是此次新公式或运行时回归。W8 0cf 的测试保留了后段 .75 旧断言，造成同一测试前后期望不一致。

Roy 已批准的新奖励 A/B：A 为当前牌组加候选后的本幕 Boss/精英战斗结果，B 为凑齐组合后的独立战斗结果和缺牌进度；均不乘 P，不以 expected_win 混合值作选择依据。方向题只读凑齐后结果缓存。旧 expected_win 仅保留在兼容提供方/完整审计中；本次不删兼容字段，不更改生产公式。测试同时断言新奖励题与方向题没有 expected_win / win_incomplete / availability / PW_bound。

## 三项修正与加强的断言

1. `v6-direction-provider.test.ts`：明确固定 P=.5、Wk=1、W0=null；兼容 win/expected_win 保持 null，原开场未知原因与样本身份保留；方向题无混合字段。
2. `v6-projection-entries.test.ts`：逐项核输入、样本数与上表算式；使第二组合 W0=1（其混合值=1），锁住第一组合 .8125 与方向最大值 1 不混淆。新方向题只标缓存 miss，不展示旧混合值。统计均值 .2500000000000001 仅按 14 位小数核实 .25，其它值/分母/缺失语义不放宽。
3. `v6-prompt-summary.test.ts`：28 项、17 组合、2 目标的低 P 固定数据留在兼容审计，不伪造 W；兼容摘要无 best_by_target 结果。生产 SHOP=brain、DIRECTION_REPLAN=off 时 on/off 均为原 shop/plan，原题与动作逐字相同、provider 调用为 0，不带低 P 上界条目。新 card A/B 题额外断言无混合字段。完整 metrics 不重复 JSON 序列化，仅比较去除该共享大对象后的审计合同。

## 冻结输入与运输

三叶 source `31a24bb2bf02fa26bac9fd284b9834e4e3f97bf9`，tree `772b074f5c16c4db78de567ca660e5f2b69211c6`。其父 `1faf2209f1efe4864caf4e3da345a470c86890d5` 只是把实际失败 tree900 建成可验证检出的本地验证节点，原分配基线 40e8；**禁止合入或运输此验证父、整支分支或整 main**。只使用 `checks/minimal-source.patch` 或 manifest 指定三叶后像，并与已正式冻结的生产依赖同包窄原子集成：W4 f74→79a→544；W8 0cf；route 1d2；input0929 的精确 transport patch；W8 benchmark 2a1a。不得单独把新断言合到旧 main，不运输暂停的805。

main 只读快照 `9f122e2e25a92632add2bb85c6e0dd44e0d7aa01` 与 tree900 的三叶前像分别列入 manifest；未把 main 漂移冒充本次受测输入。正式 source/前后 SHA256/Git blob/最小 patch 位于 checks。根 decision-log 只运输 `checks/decision-log.append` 一行，保留 ops 后续并行记录，不覆盖旧快照日志。

## 检查与保留的失败

全部 nice19/ionice3、单 worker、主盘工作树 `.cache/t`，没有 full/API/模型/游戏调用。原联合 full 的四败继续保留于 ops 1935 原件。

- 原断言红灯：3 文件，3 败/16 过，准确复现三项原失败。
- 第一次 CLI 误用不支持的 `--minWorkers`，未运行测试；保留 `red-cli-option-error`。
- 自有 green-v1：tsc0，17 过/2 败；新断言的浮点逐字比较及完整 metrics 重复序列化失败，均已修测试，不归因产品。
- 自有 green-v2：tsc0，18 过/1 败；提示用精简 runPlan fixture 调原 shop 还缺 V5 字段，补齐固定合法 V5 字段后重跑，不改生产。
- 最终 green-v3：tsc0（1.375s），3 文件 19 过（Vitest 详见原 log，wrapper8.954s）。源码最小 patch gitleaks0；材料扫描另留原件。

未自行 FF main、改 live/actor/STOP/Regent/知识或发模型请求。交 ops 与 W8 benchmark 一起完成唯一真实联合 full；旧来源 full 不覆盖新增三叶。上线、核号双通知与移 STOP 按 Claude 19:4x 原授权由 ops 执行；本报告不宣称联合完整绿或已发布。
