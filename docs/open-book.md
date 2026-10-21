# 开卷机械资料（#25）

本地库提供 v0.111.0 卡牌、遗物、怪物、事件的静态资料。大脑和 Jev 只按当前题目取相关条目，决策中不联网。当前接入 Silent；Ironclad 的题面、模拟序列化与评分保持原样。

## 来源与许可

唯一导入来源是 [Spire Codex](https://github.com/ptrlrd/spire-codex/tree/4f52f5a53597e4fdc6cf130f7ebe2cdd35236101)，固定 revision `4f52f5a53597e4fdc6cf130f7ebe2cdd35236101` 下 `data-beta/v0.111.0/{eng,zhs}/{cards,relics,monsters,events}.json`。已先核 [该 revision 的许可](https://github.com/ptrlrd/spire-codex/blob/4f52f5a53597e4fdc6cf130f7ebe2cdd35236101/LICENSE.md)：[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)。本批按个人非商业研究、实验和爱好用途使用；不是 MIT，也没有获得商用授权。条目与衍生报告继续保留许可 URL 及以下 Required Notice：

> Copyright © 2025-present Peter Lord and Spire Codex contributors.

来源许可正文 SHA256 为 `2f9aec3426be07b95de11700c1f2e5fda07f25eba974fb29741cbad8a1b6a6a0`。构建器同时固定八个源文件的 SHA256，许可或资料有变立即失败，不自动采纳更新。wiki 许可尚未核实，本批没有导入 wiki。

原件仅存忽略目录 `data/external/spire-codex/`；整理文件仅保留机械字段、机械选项、出处，去掉图片、风味和事件长剧情。每个源文件记录 URL、版本、下载时间、SHA、样本数和筛选方法；每条标 `source: external:spire-codex`、`game_version`、`provenance`、`origin_pool`、`evidence_scope`。`provenance` 指向同文件 manifest 的对应源文件，不是本系统实盘证据。

## 文件与查询

- `knowledge/common/open-book.json`：共享机械资料，含其他角色池的静态牌面；保留原池，不声称已在 Silent 对局验证。
- `knowledge/characters/silent/open-book.json`：Silent 专属的 91 牌和 9 遗物。
- `agent/src/knowledge/open-book.ts`：加载、ID/中英名称匹配、相关条目选择、模板补全和缺项记录。

共 595 牌、298 遗物、115 怪物、66 事件。其他角色池只在跨池获得等条件下参考，不计入 Silent 经验分母。版本不为 v0.111.0 的条目拒绝加载；未知版本不能由 mod_version 推断。

调用 `externalReference(kind, id, character, directory?)` 可按精确 ID 读全部条目，`externalCardReference` 是卡牌快捷接口。`attachOpenBook({options, question, payload}, options?)` 在 Brain request 组装时调用，也识别实际选项里的 JSON 字符串及拿牌摘要的 `card` 名称与 `text`。优先处理选项和题干，再处理牌组等背景；跳过有歧义的名称，ASCII 名称要求完整词边界。已有明确 ID 时不以名称猜测替代。遍历限制 120,000 字符、16 层；匹配未覆盖的描述保留原样。

`open_book` 含相关完整条目、所需来源、冲突、缺项和 `omitted`。附加总量（含替换描述的增量）上限 18,000 UTF-8 bytes；按整条加入，放不下就省略并计数，避免截断 JSON。单个很大的事件也可能被省略，仍可按 ID 查本地文件。上限约束新增部分，不压缩或丢弃原题。资料按文件 inode/size/mtime 缓存，缺失文件或原子替换后的文件在下一次查阅时重读。

只有静态描述的整段数字模板与来源匹配时，才补 `?(数值未知)`，保留所有已知数字，并注明 `基础资料补全`、来源、版本、ID、未计战斗修正。升级文本与基础文本分开，`facts.upgrade` 是增量。无法匹配、版本不符、文本带额外关键词等情况仍保留未知值；不猜测。`resolved_rules_text`、`rules_text` 和 `combat/board` 下的动态值不替换；mod 已知文本优先，差异另存冲突，不能用外部数据覆盖当前 HP、意图、伤害或价格。怪物普通/进阶 HP 并列保留，来源没有阈值，不推定当前进阶适用值。

## 模拟、Jev 与 #13

`modelHandCard(...).externalReference` 与 `enemySims(...)[i].externalReference` 提供同一离线条目的数值；字段不可枚举，不进入现有模型 JSON、指纹或求解器克隆。机制支持仍由原模型判定：查到资料不会把 `known=false` 改为 true，也不改变评分。#13 可通过上述接口读取静态事实，再按学习协议建立机制实现与回放证据。

Jev 的 direct 和 logged 入口共用 `prepareJevOpenBook`，先附同源资料，再进行原投影/压缩；实际发送、题面日志和投影 hash/字节口径一致。Jev 的 board 动态字段保持不变。重复准备同一题不重复附加。Jev 在原 24 KB 请求预算内加入资料：按实际投影后的基础题面预留空间，并留 1 KB 给 model 等传输字段；空间不足时整条省略。logged 路径的投影或无损压缩重试在 SDK 入口不再补第二次，防止日志与实际请求不一致。

外部条目没有本系统局号、胜率、角色验证分母或实战结论，不修改文字策略库、学习账本，也不把静态数据当作支持某种打法的证据。

## 补缺与调度

缺项仅接受明确类型的安全 ID，去重写入 `data/external/open-book/pending/<kind>-<ID>.json`；任意大写文本、字段枚举和路径不当作 ID。运行时冲突去重存相邻 `conflicts/`，不附玩家、局号或整局数据。

`ops/codex-ops.sh` 原 `learn` tick 调用 `nice -n 19 timeout 180s python3 ops/open_book_refresh.py --root <workspace> tick`。沿用原 PAUSE 门禁，不另起 daemon。tick 有非阻塞锁、256 条批次上限，先过滤已处理项再限量，坏请求单独记收据，不阻塞后续。检测到 `play` 时延后；每次真正下载前构建器再次检查。

补查限于已核许可、固定 revision 的八个文件：有缓存就不再下载，缺文件才一次下载；下载锁、JSON 校验、大小与 SHA 校验后原子写入。新网站、新版本必须重新核许可和固定摘要，本任务没有自动扩大来源。

构建结果写进忽略目录 `data/external/open-book/catalog/knowledge/`，不改 main/live 的受跟踪知识文件。默认知识消费者优先读已核 revision 的 overlay，失败回退随代码提交的资料；下一次读取能看到原子更新。显式自定义知识目录不读 overlay。收据按 revision 分目录，状态分 `available` 和 `unresolved-in-reviewed-snapshot`：快照里没有的条目保持未解决，不把“查过”算“补齐”；换已审核 revision 后可重查。

## 重建与验证

以下命令只读缓存或固定数据；首次补源需在对局之外显式加 `--network`。不安装依赖。

```bash
nice -n 19 python3 knowledge/builders/build-open-book.py
nice -n 19 python3 -m unittest discover -s ops/tests -p test_open_book_refresh.py -v
nice -n 19 python3 knowledge/builders/report-open-book.py --mod <固定-mod-导出.json> --output <报告目录>
cd agent
nice -n 19 node --import tsx tools/open-book-replay.ts <回放报告.json>
nice -n 19 node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
nice -n 19 node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism
```

本批报告见 [覆盖、冲突和五类题回放](../paper/materials/20261021-issue-25-open-book/README.md)。合入 main 由集成员核验，live 由 ops 在开局边界发布并分配 release_id；本开发会话不发布、不运行 play、不改 STOP。

回退时撤回题面调用和模型参考接口、停用原 tick 的本项调用即可；必要时由 ops 移走忽略的 `catalog/`，消费者回退随代码资料。缺项、冲突和收据保留为原始记录，不删除实盘、学习经验或其他任务产物。
