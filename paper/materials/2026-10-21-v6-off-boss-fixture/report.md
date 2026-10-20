# P4 联合检查：关闭 V6 的六例字节差异

六例失败来自固定测试读取了后来刷新的怪物观察数据。27 组冻结题的解析后动作逐字节相同；六个题面的差异仅在 Boss 事实字段。修复固定测试的 W0 输入，保留全部原 golden、生产代码和当前知识数据。

正式源码 `88b51030b906700aa30ea2e8f79eb10be2b623bb`，tree `5c97360ba5805d6b0b4e1ffb67f5088e568000ef`，只改 `agent/tests/v6-off-equivalence.test.ts` 并新增 `agent/tests/fixtures/v6-off-boss-clock.json`。交付仅运输这两叶的最小 patch，不运输父提交、整支、正式知识或运行配置。

## 复现与实际差异

原 ops 联合 tree `5628371e35d26465df06514f7f4384c269fd1182`，2399 输入 SHA `980341350cc5dece633f10d76f9a302268a406a9260797697fb26a11d8711c6b`。在自己的隔离副本逐项核对这 2399 个输入后，原 `v6-off-equivalence` 测试复现 6 败、3 过，hash 与原 full 相同。

对前轮数据和本轮数据各留存 27 帧：三角色 × 三关闭模式 × 三题。Node 使用与原测试相同的 `JSON.stringify` 与 SHA256 比较；27 个前轮帧全部匹配原 W0 golden，27 个 `resolved` 的 JSON 字节全部相同。其中商店六帧存在以下差异，每项在 unset、explicit_off、off_with_all_subfeatures_requested 各出现一次：

| 角色 | 题面字段 | 前轮 | 本轮 |
|---|---|---|---|
| Ironclad | `act_boss_clock.hp_loss_per_turn` | 10.5 | 10.6 |
| Ironclad | `act_boss_clock.fight_turns_note` | 对应说明中的 10.5 | 对应说明中的 10.6 |
| Silent | `act_boss_clock.boss_enemies[0].attacks[2].per_hit` | 19 | 20 |

Regent、奖励和休息题没有差异。商店的解析后动作仍为 `close_shop_inventory`、计划 `leave`，包括理由、decider、journal 在内的完整 `resolved` 都相同。详见 [逐帧字节比较](checks/frame-byte-comparison.json)、[压缩帧清单](checks/frame-manifest.json) 和 [原 full](checks/original-full.log.gz)。本结论不判断新的观察数值正确与否，也不要求回退正式知识。

## 根因与单依赖对照

Vitest 全局 setup `setup-potion-cost.ts` 经 `potion-cost → potion-equivalents → knowledge/render/data` 预先加载了 `sim/boss-clock`、`knowledge/monster-db`。这些模块早于本测试文件的 `knowledge/files` 路径 mock 加载，保留了真实的 `knowledgeFile` 绑定。实际读取路径仍为隔离副本的 `knowledge/common/monster-db.json`，不是 `/__v6_off_fixed__/...`；[读取路径与栈](checks/loader-readback.jsonl) 已保存。该文件存在，未走 catalog 缺文件回退。

先把 48 项知识变化全部换回前轮，原测试 9 例全过；再仅换回旧 `common/monster-db.json`，其余 47 项保持本轮数据，原测试仍 9 例全过。后一组 [单依赖对照](checks/only-common-previous-result.json) 锁定本次失败所需的数据依赖，未将所有漂移一概归因。

## 最小修复与证据来源

固定题本来就是 W0 `78933a38d3349ec0b16615d852da89e5eee13871` 的三张 Ironclad 局面，重标角色用于检查路由字节。W0 的 Boss 缓存先加载原 Ironclad 记录与掉血表，再沿用于这三个角色。因此新增 fixture 精确提取同一 W0 中三场题所需的三 Boss、五怪物、三遭遇，以及原 Ironclad 的 `threat_by_asc` 和 Boss 掉血表；不填写或修改数值。它仅复现既有架构测试输入，不是跨角色游戏知识结论。

来源为 W0 的 `knowledge/common/monster-db.json`、`knowledge/characters/ironclad/monster-records.json`、`knowledge/characters/ironclad/boss-damage.json`；[provenance](checks/fixture-provenance.json) 保留各文件 blob、字节数和 SHA。运行 [提取验证脚本](checks/extract-w0-fixture.py) 可从不可变 Git 数据重建并逐字核对 fixture；[结果](checks/extraction-check.json) 为 identical=true。

测试每例通过已存在的 `setMonsterDbForTests` 和 `setUnblockedSharesForTests` 注入固定缓存，每例后清空。没有新增生产接口或运行依赖，原 golden 文件 SHA `02a29d0b413d800701c862af5dabc8d1b42461aabdaaec4d2db1488f2e953212` 不变，所有断言不变。

## 验证与交付边界

在同一 2399 输入隔离副本仅替换测试并新增 fixture，2398 原路径逐字不变；5 个清单外的构建元数据从相同 Git tree 提取，详见 [输入关系](checks/input-relation.json)。没有修改 ops 工作树。

| 检查 | 结果 |
|---|---|
| 原测试、本轮知识 | 6 败 / 3 过 |
| 原测试、仅 common DB 换回前轮 | 9 过 |
| W0 固定输入修复后 | 9 过 |
| `tsc -p tsconfig.json --noEmit` | exit 0，0.863 s |
| off / monster-db / oneshot-shop / thief-card-value 定向 | 4 文件、75 过，15.990 s |
| 两叶源码 gitleaks | 0 finding |

定向按 nice 19、ionice 3、单 worker、短主盘 TMPDIR 执行，原始 JSON、退出码与计时均附在 checks。旧 full1、首次复现失败和一次准备目录错误产生的无效实验记录全部保留，未用后续成功覆盖。

本次没有启动完整检查、游戏、模型、学习或生产刷新，没有变更 main/live/STOP/actor。当前运行标签为 R408、CARD=brain、REFLEX=off，不能把旧 R407 检查标签回灌当前配置。本补丁不改变 P4 原 29 个生产源。

`ordinary-close-isolation` 的 15 s 子进程超时、零 SHA bad-object 仍归原 014301 三叶夹具链，根因未由本实验核定，也未夹入本补丁。两项正式来源由 ops 协调齐备后，才安排一次实际联合完整检查；本次定向通过不冒完整绿或发布。
