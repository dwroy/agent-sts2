---
title: 经验库进阶审核
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 300
max_turns: 800
default.base_branch: v4
default.merge: no
default.merge_dir: {{project_root}}/jev-sts2-v3
---
# 任务：经验库按进阶审核（Dai 2026-10-04）

你是 STS2 × Jev 项目的离线学习者，这一次只做一件事：把经验库 `knowledge/characters/ironclad/experience.json` 里**所有 active 条目**按进阶审核一遍，并在变更记录里追加一节。全程用中文，自己做，不再派下级 agent。

为什么做：现在几乎所有条目的 asc 都是「[某进阶, 20]」，在 A9 时 198 条全部适用，按进阶过滤等于没做；很多条目把 A0–A9 的数字混在一起，有 76 条是 [0,20]，多是低进阶学来的。V4 大脑的知识前缀会带上本进阶适用的全部条目。目标有两个：A9 时大脑看到的经验要准，数字要用 A9（或 A8+）的；不适用于 A9 的条目不要进 A9 的前缀。

- 改代码的工作树：{{worktree}}（在这里改 experience.json、跑测试、提交）
- 合并基线：{{base_branch}}；是否合入：{{merge}}（V4 一律 `no`，由开发会话审过后合入）
- 复盘：{{project_root}}/notes/lessons.md（只读，2 MB 以上，按 grep 定位后按行号读）
- 变更记录：{{project_root}}/paper/materials/experience-changelog.md（只追加一节）
- 日志（只读）：{{logs_dir}}；日志库：`data/logdb-venv/bin/python agent/tools/logdb/query.py --no-sync "SQL"`（`--schema` 看表；fights、floors、turns、fight_frames、runs 等）
- 临时文件只放在：{{scratch}}

## 1. 开工
1. 往任何文件里写时间之前先跑 `date`。
2. 在 {{worktree}} 里 `git status` 确认工作区干净，然后 `git merge --no-edit {{base_branch}}`。有冲突就停下，在回报里写明。
3. 读变更记录的「2026-09-28 首次构建」一节（口径）和最后两节（现在的写法）。

## 2. 每条 active 条目分成三类，分别处理
1. **机制类**：招式、数值公式、触发时机、牌和遗物怎么起作用，例如女王砍头的时机、巨兽自爆 3T+9/3T+14、狱火按层扣血。
   - asc 写 [0,20]；
   - 机制本身和进阶无关，但数字随进阶变的，改用按进阶填的占位符（{DMG:…}、{HP:…}、{GAIN:…} 等，见 agent/src/knowledge/render/facts.ts 和 monster-db.ts 的 fillDbNumbers）；没有占位符的，写明进阶（「A8 35、A9 60」）。
2. **统计 / 阈值类**：死亡率、掉血中位、血量线、胜率、「n 场赢几场」。
   - 数字一律按 A8+ 重算，A8 和 A9 差得多的分开写，例如「A8 …；A9 …」；
   - 只有 A0–A7 数据、A8+ 没有数据的，asc 写上限（如 [0,7]），或者用 A8+ 数据重写；
   - 口径照变更记录：战内掉血、走廊只算 Monster 房、问号另算、死亡单独计；截至什么时间要写明。
3. **策略类**：「该怎么做」，比如路线、精英取舍、火堆选择、打法。
   - 用 A8+ 的数据核实：有支持的，asc 写证据的最低进阶（A8+ 证据写 [8,20]，只在 A9 验证过的写 [9,20]）；
   - 在 A8+ 被反驳的，写进阶上限，或者退役（retired_reason 写清楚是哪个进阶的数据反驳了它）；
   - A8+ 没有数据、只有低进阶证据的，写上限 [lo, 7]，回报里列出来。

**不改的部分**：
- 药水：`potion:*` 和 `general:potion` 只改句内数字，可以按进阶分开写数字；其他条目里原有的喝药/留药分句一字不改；不许新增或加强任何喝药规则。
- scope 类型只用已有的几种。

## 3. 合并和压缩
- 同一件事只留一条；审核中发现重复、互相矛盾、被代码修掉的，合并或退役（证据、反例一起带过去）。
- 字数预算：所有 active 条目的 lesson 总长 ≤ 60000 字符（agent/tests/experience.test.ts）。这次审核后，A9 适用的条目总字数最好比现在（约 4 万）少；说明压缩了什么。

## 4. 核对数据
- 每改一个统计数字，都要能从日志库复算；在变更记录里写一张表：「条目 | 类别 | 原 asc → 新 asc | 原数字 → 新数字（口径、截至时间） | 理由」。
- 抽查至少 20 条机制类条目，确认机制本身确实不随进阶变：看 monster-db 的 damage_by_asc、日志。

## 5. 测试和提交
- `export PATH=$HOME/.local/node/bin:$PATH`，`npx tsc -p tsconfig.json --noEmit` 和 `npx vitest run --maxWorkers=4` 退出码都要是 0（高负载时战斗测试可能超时，先单独重跑一次再下结论）。
- 用 `agent/tools/knowledge-slice.ts` 和知识前缀的渲染（agent/src/knowledge/render/knowledge-prefix.ts）比较 A8、A9 两个进阶前缀里经验部分的字数，改前、改后各一次。
- 在 {{worktree}} 提交：`git -c user.name=dwroy -c user.email=roy.dongwei@gmail.com commit`，英文提交信息，写明版本号和三类各改了多少条。不推送。version 改成下一个版本号。
- 变更记录末尾追加一节：`## <日期> 进阶审核（version …，分支 …，<提交号>）`，小节依次是：方法、三类各自的处理和数字、合并和退役、A8 / A9 前缀字数（改前→改后）、需要 Dai 定的事。只追加，不改前面的内容；工作区仓库（{{project_root}}）不要提交。

## 6. 安全和资源
- key 不许打印、不许落盘：不读 `.env`、`~/.jev_api_keys`、`~/.deepseek_api_key`、`~/.codex/auth.json`，不跑 `env`、`printenv`。
- 只改 {{worktree}}、变更记录（只追加）、{{scratch}}。ops/、notes/ 和 paper/ 下的其他文件只读。
- 不推送；不运行 play；不读 sts2.dll 和 .pck；杀进程用 PID；不 `npm install`；logs/ 只读。
- **CPU**：对局在跑，抽数据和跑工具只用单进程，或最多 4 个 `nice -n 19` 进程；不跑 boss 模拟进程池。

## 7. 回报
最后一条消息按这个格式写（中文）：

```
## 经验库进阶审核回报
- 版本：<旧> → <新>；提交：<提交号>（分支 …）；合入：未合入，待调用方合入
- 条数：active <旧> → <新>；机制类 N、统计类 N、策略类 N；退役 N、合并 N
- asc 变化：[0,20] → 其他 N 条；只适用 ≤A7 的 N 条；A8 适用 N 条 / A9 适用 N 条
- 字数：总长 <旧> → <新>；A9 前缀经验部分 <旧> → <新>，A8 同样写
- 改了的统计数字：N 条（表在变更记录）
- 测试：tsc 退出码；vitest 文件数 / 用例数 / 退出码
- 需要 Dai 定的事（没有写「无」）：……
```

最后单独给一个 json 代码块：

```json
{"task": "experience-asc-audit", "version": "...", "commit": "...", "merged": null, "active": 0, "retired": 0, "merged_entries": 0, "a9_entries": 0, "a9_chars": 0, "tests": {"tsc": 0, "vitest": 0, "cases": 0}}
```
