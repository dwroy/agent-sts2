# #83 工具小批：第三幕回放与按 Boss/ID 选择

接主管 [6515854107](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6515854107)，原分配基线 `f2d8e742776751620a675fae168c04b4323421f7`，此前只提交方案 `eb6e75bf2`。本批只交工具前置，四个 Boss 的模型修正、打法提炼、准入与真实两臂结果继续开放。

## 行为

- capture/replay 允许 act1/2 的 Boss/elite 与 act3 的 Boss；拒绝 act3 elite、未知/第四幕、幕数与审计不符。继续要求原状态、原 Plan、全候选覆盖和精确 SHA；零游戏/模拟调用。默认回放只准备两臂，真实 Jev 调用仍须原显式 `--ask`、预算和来源门。
- 增加 `V6_COMBAT_ENTRY_SELECTION`：Silent 的精确 `Boss实体ID → 条目ID数组` JSON 表；仅本任务四个 Boss 键。匹配第一至三幕当前明确存活实体，拒绝 run 下一 Boss、未知/歧义实体；只向消费者提供指定且当前进阶适用的 combat_line 条目。r1误限第三幕，后继已纠正（原自有无厌沙虫152条均第二幕）；旧r1与原检查保留，不能用r1声明四Boss均可开启。空表/删 Boss/空数组关闭对应入口；坏配置、缺 ID、错误题型/进阶拒绝，无整库兜底。全局 `V6_COMBAT_ENTRIES=off` 优先；未配置选择变量与其他角色保持原兼容行为。
- 完整知识库、来源 SHA 和角色 scope 不改；审计另存实际 Boss/ID 子集。capture 可传 `--selection`；replay 验证并重现相同子集，逐候选上下文也须是该 Boss。投影拒绝配置与旧审计不一致。run-config 可选记录 requested/规范化选择或 invalid，并进入 config_sha；旧默认 off 不增加字段。
- 未修改模拟器、门槛、排名、候选动作、药水规则或任何知识条目。选择开关本身不能证明条目有效，也不提升低可信模拟器。准确用法与撤回边界见 `docs/jev-encounter-reflex.md` 的 #83 节。

## 部署与验证范围

ROOT 源码七叶：`agent/src/eye/run-config.ts`、`agent/src/reflex/jev/{combat-entries,combat-entry-projection,combat-entry-replay}.ts`、`agent/src/v6/combat-entry-selection.ts`、`agent/tools/v6/{capture-combat-entry-replay,combat-entry-replay}.ts`。LIVE 运行只需其中四叶：run-config、combat-entries、combat-entry-projection、新 selection 模块；offline replay 模块及两 CLI 为 ROOT 工具。固定测试三叶（含一新增），文档一叶。逐叶 SHA/部署列表另存 `tools-source-final.json`、`tools-deployment-map.json`。

本批旧行为默认 off；开发不设置生产环境、不写 live/STOP、不控制其他会话，不分配 release_id。源码沿原集成员小批及唯一组合检查；如果 #84/#82 已就绪可由原 owner 合批。实际开启只能在模型/条目通过原验证后由 ops 按 K/L 自然边界做，登记准确 K1/LIVE/ID/时间，不能直接把新能力当作授权已验证结果。

验证：生产 tsc、v6 工具 tsc 均退出0。最终相关七文件123项与独立 paths11项通过；含第三幕成功/错误幕与elite拒绝、四 Boss 精确子集与空/坏配置/未知ID/范围/角色隔离、真实加载/投影/无额外模拟、capture/replay 子集与原SHA、run-config身份、旧off字节等价。初轮五文件82项通过也保留。

单 worker 沙箱广域652文件/6048项：650文件6046项通过、2项失败，原退出1保留。其一是原 sparse checkout 未展开的 `paper/materials/issue29-brain-speed/results.jsonl`，已从指定 f2d8e742 Git blob 恢复并核SHA；其二是本批新增测试误比较 ask 对象里的不同回调函数（显示数据相同），只把断言改为实际 state/questions 线上的逐字节比较。两项均在最终123项中通过，独立paths11项也过。沙箱后生产七源码逐SHA不变，仅该测试断言变化；不重跑21分钟广域、不把原红改写成最终组合full绿。原集成员核实际组合并接原必要完整检查。原日志、夹具恢复及逐源前后证明均在本目录，完整本地副本亦在 `.artifacts/issue83/`。

### r2：第二幕选择器修正

原自有 `sources.jsonl`（SHA `7e7bcb05662ca4be24f7f1607b215ebad0331567b0498ed42adc1d219c151a3d`）中无厌沙虫152条均act2，其余三个目标为act3。r1选择器误将所有目标绑act3，已主动在83/6516309521报错并通知原集成员用后继请求，不改/撤生产事务。r2仅将选择器合法幕范围改为1–3，Boss/ID/角色/范围/未知/空表/坏配置及第三幕elite拒绝均保持；补第一至三幕通用选择测试及第二幕真实加载→审计→replay/投影回归。r2生产/v6工具tsc均0、七文件126项通过，原paths11与r1原红/123结果均保留；没有重跑r2广域或冒最终组合full。r2前后源SHA另存 `tools-r2-source.json`；旧 `tools-source-final.json` 仅表示r1，不能当r2字节相同证明。

## 自有日志与外部输入接续

已在 [6515865754](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6515865754) 向原 ops 请求冻结日志，随后接 [6516038481](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6516038481) 取得原LIVE实验目录的17份冻结输入，本角色逐文件核SHA/bytes全同。cutoff `2026-10-06T02:46:11.648000`，107 tune/551 val keys 保持；已保存来源、现有四 Boss 指标与 SHA 的只读盘点 `self-data-baseline-inventory.json`。原表数字是历史全尝试校准，不能当本轮首试结果。

首试子集与数量限制已在 [6516099470](https://github.com/dwroy/agent-sts2/issues/83#issuecomment-6516099470) 另报，并在原主管收件箱留一行；原val实际首试 Aeonglass12/实验体4/无厌沙虫29/女王8，预测死中止保未知，不能借旧全尝试凑>=10。接主管6516127890，已先提交 `9f37c0b5d` 预注册补样窗口 `(2026-10-19T08:19:14+08:00,2026-10-30T14:00:52+08:00]` 再冻新输入，只补val，不回流tune或用于调参。该后续数据/模型工作不拖本工具小批；完整首试派生与新增val材料另交。原表 simulator_base 为 `9f424551…`，本开发基线为 f2d8e742，必须重放同输入比较，不复用旧模型结果冒新源码准入。

外部 1208 当前仍没有通过正式安全投影；由 #82 修 index mismatch 后交输入。开发未读 raw/private-index/salt、未启动下载/全量/生产统计或真实 Jev。每个 Boss 的至少三条候选、真实留出两臂、首试准入与全量重验仍未完成，不关闭 #83 或学习父项。
