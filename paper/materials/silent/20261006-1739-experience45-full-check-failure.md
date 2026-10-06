# S1.exp45 完整补测失败处置

记录时间：2026-10-06 17:45 CST；调度器事件：2026-10-06 17:39。

## 结论与决定

保留已上线 S1.exp45，优先派学习者排查并修复。此次完整检查仍为 exit 1，不以定向通过替代完整通过，不重置既有 shipped，不停止对局。根因未确定；现有证据没有证明本批静默经验更新导致生产回归。

## 完整失败证据

- 批次：20261006-170126-experience-update；源码 ab8335ba091e3385036352f04354613cac683cdb，实际合入 8807bc1442e7525c8d8f52361e8d45925c9436aa。
- 固定发布：56c64ff8c32d6ef1cc0d2febb8252229f7e69133；固定树：a6beac224eb8405df7466b457d08658e67bd54c3。
- 完整套件：254 文件，其中 253 通过、1 失败；3001 例通过、1 例失败、2 跳过。17:28:31 开始，600.00 秒。日志无 tsc 错误诊断；调度器只保存组合退出码 1，不单独补造 tsc 退出码。
- 唯一失败：agent/tests/boss-clock.test.ts:191，`boss clock > ERPH Waterfall Giant: the eruption caps the fight at ~T10; F14 still short`，`expect(clock.fightTurns).toBeGreaterThanOrEqual(9)` 实际 8，原上界为 10。
- 原日志：ops/codex-ops/learner/20261006-170126-experience-update.fallback-a6beac224eb8405df7466b457d08658e67bd54c3.checks.log，74450 字节，SHA256 bff90c65f22978128219e6441f3678b09e821bf41cd05fb776d4ae869c002546；原字节归档：paper/materials/silent/20261006-1739-experience45-full-check.txt。checks_pending=false / rc=1 及历史保留。

## 已核对的技术边界

- 经验源码只改 knowledge/characters/silent/experience.json；固定发布相对上一已测 4087fb8c4547491093a763e9b8975f891eede0b2，没有 agent/src 或 agent/tests 变化。另有七项自动知识刷新；这些变化不直接证明根因。
- 两版本 boss-clock.test.ts 的 blob 均 04522ffe81b4936872909245cdf75f9b618cd1a0；boss-clock.ts 均 bed839377fdf68339577d0826a1d8b4b410b531f。铁甲 boss-damage/monster-records 各自 blob 不变，common/monster-db.json 的 WATERFALL_GIANT 子树亦完全相同。
- 测试第一组调用实际加载器：boss-clock.ts:199 的 unblockedShare 读取字符 boss-damage.json；monster-db.ts:174 的 readMonsterDbJson 合并 common 数据与角色统计。boss-clock.test.ts:188 固定板面不等于所有输入均固定；后面的 describe 才通过 setMonsterDbForTests/其他钩子注入夹具。数据加载、环境、测试隔离和进程内状态仍交学习者定位，不推断游戏机制或校准结论。
- 本轮只定向运行一次主目录当前源码：`PATH="$HOME/.local/node/bin:$PATH" nice -n 19 node_modules/.bin/vitest run tests/boss-clock.test.ts --maxWorkers=1`（cwd=agent），exit 0、1 文件 33 例通过，17:42:42/940ms。它使用主目录当前数据，不能代替原固定发布的完整检查，也不能据此宣布缺陷已修；原日志归档 paper/materials/silent/20261006-1739-boss-clock-target.txt，SHA256 ff86b032b3a189ac3efc408de461292390da17f677ab53a71426f60a483b154b。
- 此测试在固定沙箱套件内，原源/合后首轮 tsc0、203 文件2194例通过历史保留；目前不新增完整重复测试。

## 学习者后续要求

先按原固定发布及日志复现、核对实际加载数据/环境/缓存/测试状态；若是测试输入漂移，使用从原测试证据固定的输入隔离所有被刷新的表，保持原断言含义。若确有生产缺陷，依据对局证据按学习协议处理，不把铁甲夹具推成静默知识。不得简单把 9 改成 8、放宽或删除断言、新增排除、修改游戏校准或回滚刷新数据来消除失败。修复应有撤回失败/恢复通过证据，源/合后固定沙箱通过，再由调度器补完整套件；证据不足明确未修。

codex-dev 当前由 20261006-172732-strategy-proposal 占用，不抢工作树；先将任务加入最高优先队列，白名单派发结果另行追加。
