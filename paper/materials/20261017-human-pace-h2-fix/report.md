# H2 A/B/C shadow 修正与历史拿牌回放

原父 roy-20261017-human-pace；Roy 2026-10-17 23:29 经 Claude 指派。仅 Silent shadow，不接管真实拿牌，不调用大脑或游戏；其他角色保持关闭。

## 结果

42 道原历史题，3 个独立局，37 题有成功大脑选择可比较。原始冻结截点沿 H2 natural/inputs-final/manifest.json，未扩样本或用事后结果补新选择标签。

| 项目 | 原观察 | 修改后历史回放 |
|---|---:|---:|
| 目标组完整数值比较 | 0/42 | 0/42，继续 unknown |
| 下一个 Boss 完整配对差 | 38/42 | 38/42，沿原缓存 |
| 有依据的模块首选 | 0（旧42题工程skip） | 27/42；另15题交大脑 |
| 任一候选明确计划外 | 42/42 | 9/42 |
| 未定方向/缺计划 | 原与计划外混列 | 33/42，保留初始计划缺口 |
| Jev 与大脑一致 | 18/37 | 18/37 |
| 大脑拿牌组一致 | 11/28 | 15/28 |
| 大脑跳过组一致 | 7/9 | 3/9 |

模块与大脑在可比且有首选的24题中13题一致。38题有下一个Boss数据不表示38题有严格偏好；数值相同且没有唯一模板依据时仍交大脑，禁止把平局自动填成skip。Jev42次离线调用全部成功，18题选择改变，总体一致率未提高；19项分歧在disagreements.md。实际后继结局仅属于原大脑选线，不能评价未执行拿牌的整局收益。该批已用于修正设计，不能冒盲测或自然验收；不建议据此转on。

## A：事实、排序与第二幕门禁

影子排序先用原可比目标组胜率差；组不完整时，转用同题下一个Boss的配对胜率差，再以学习者模板归属处理MC误差内的接近题。S只记录，既有低可信标记不取消。没有可分辨数值或唯一模板依据就module_first=null/defer_to_brain；Jev故障也保留这个null，不默选skip。

原directionStart把syntheticBossStart返回的任何unmodelled遗物都视为“假设库存无法计算”，连原样持有的遗物也全拦。42条原始题面逐指纹匹配，按当前已冻结mod元数据及既有分类器重读，42条均有未建模标记（蛇之戒指、佩尔之眼等；完整列表/来源见relic-probe.json）。这只是现有分类器覆盖诊断，不是新增遗物机制、历史完整知识复原或认定这些效果无影响。

本次只放开Silent第二幕、原遗物多重集合完全不变的部分模型基准。每个结果显式带model_limits和未建模项；不假设共用遗漏会抵消，S仍unknown，不提升生产可信度。增加/缺失遗物、第三幕/最终连战、未知组件和无效HP资源契约仍拒绝，仍用原worker、C2及5秒/60秒预算。离线回放复用既有缓存，未新增模拟，因此不把源固定题可运行说成42题新目标组数值已补齐。

uncommitted/missing单列：已有明确要/不要条目仍可描述覆盖，其余为unknown/initial_direction_needed，不因每张候选不在某一核心就触发已违反计划；9题明确计划外与33题未定方向不互相偷换为“已覆盖”。所有叫醒只记日志。

## B：复现与成本

replay-input.jsonl冻结42题原事实、大脑实际动作及原Jev记录；replay-input-manifest.json绑定原清单SHA，84条决策/旁路原行逐offset/长度/SHA核回。另42原始状态逐SHA与fingerprint匹配，relic-probe输入及当前元数据快照独立保存。无新独立游戏结局。

在恢复原精确源码WT后，从主检出执行：

```bash
nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs paper/materials/20261017-human-pace-h2-fix/replay.ts
nice -n 19 node --import ./agent/node_modules/tsx/dist/loader.mjs paper/materials/20261017-human-pace-h2-fix/relic-probe.ts
```

脚本默认导入本功能独立WT的源码；回收后按source SHA `89bec47ab4ef678b01ff8487762e125599a757fa`恢复任意独立WT，再设置 `H2_REPLAY_SOURCE_ROOT=/该WT绝对路径` 即可，不能改用未来源码冒同一回放。实际调用时的原脚本另保留为replay-executed.ts.txt与relic-probe-executed.ts.txt；后续仅加入可配置源码路径，机械结果另核同。--jev为已授权的Jev真实调用分支，结果存在即拒绝重复请求；原replay-jev.jsonl保留。Jev本批输入70,826/output2,043 tokens，耗时p50=310.5ms、max742ms，42次均低于原1秒预算，无重问。没有大脑/Codex生成、play、模拟或新worker。实际账单未读取，不报告账单费用。

## C：整幕计划具体结构

新增只读concrete投影：原明确方向与候选方向分开，保留要牌优先序、不要/删除清单、具体card_id、未解析文本与冲突；休息/升级保留大脑原条件文本与来源，不把auto扩写成新阈值。未定方向不能填成大脑已选择某核心。实际RunPlan、实际大脑题面/决策要求和执行路径均未改，也无新大脑调用。该改动让既有输出可审计，并不声称原大脑承诺具体方向的比例已经提高；若以后要求大脑必须承诺或改变输出要求，应另行明确边界。

## 工程验证与发布边界

九叶精确source manifest与暂存树已冻结。独立tsc-final.exit=0；相关6文件29固定题0。原完整入口full1：480文件4412题过、唯一component-usage因新WT缺既有logdb解释器路径返回127，未改断言/时限/源码。补共享既有解释器链接后，原失败题与入口未到paths共2文件12题0；原full1、两次材料路径辅助错误及回放首稿错误保留。不重未改源full、不称整套全绿。已交原ops核组合证据，实际处置/精确source/窄合及最终树宿主各自以原角色回执为准。

阶段只有shadow记录和固定/历史验证，不关闭H0六Boss可信度、0332根资源或宽父，不启H2 on/H3+。

源码已精确提交 `89bec47ab4ef678b01ff8487762e125599a757fa`，原ops正式接受组合证据后实际窄合main977ed706/live017453260488d82709423fe76dbd1152d22de2c7/treef53b07d7ed22b7c25d72c9c3965ad742ad8e889e，纯shadow不加行为号，R388保持。精确新树host仅沿原ops唯一链，终局另以原回执为准；本报告不借源补验冒host绿。

原ops另明确：23:37的29固定题为初版历史，不单独冒最终九叶独立全绿；最终full1中这些当前相关题均已执行且无失败，原full唯一失败及环境补验分别保留。

2026-10-18T00:17:58.463510+08:00 新codex3 ops本人核原唯一精确宿主：live0174532604 / treef53b07d7，tsc＋Vitest0，532文件5229过2跳，原canonical log SHA 76fc8877368b62c82783dbbeebb2e7b1c6bb9ae9efea6139853e349305b23583已由watcher读回。只认证该部署树，source full1/环境补验0不改写；H0/0332/自然和on门槛保持。
