# 上游代码（third_party/jev-sts2）

`third_party/jev-sts2` 是上游 [DiscreteTom/jev-sts2](https://github.com/DiscreteTom/jev-sts2) 的 git submodule，钉在 **002e873**（2026-09-19，上游 main 的最后一次提交，共 19 个提交），原样不动。.gitmodules 里设了 `ignore = none`，子模块里有任何改动 `git status` 都会显示。agent/tests/third-party.test.ts 检查：子模块指针是 002e873；子模块检出时，HEAD 是 002e873、工作区干净（没有改动、没有多出的文件），下表标「原样」的文件和子模块里的逐字节相同；agent/、learner/、eval/ 的代码里不出现 third_party（既不从那里导入，也不往那里写）。

新检出要取子模块：`git submodule update --init third_party/jev-sts2`（要能连 GitHub）。不取也不影响运行和测试：子模块只作参照。

## 为什么只作参照、不从里面导入

我们 agent/ 里有 7 个文件和上游逐字节相同、而且它们的导入也全是上游原样的代码，原则上可以直接从子模块导入、删掉我们的副本：src/jev/pricing.ts、src/jev/questions.ts、src/mod/schema.ts、src/strategy/damage.ts、src/util/format.ts、src/util/lock.ts（discovery.ts 也原样，但它导入的 client.ts 我们改过，不算）。这次没有这样做：

- 那样一来，没取子模块的检出就跑不起来（schema.ts 有 205 个文件导入），而外层仓库合并、改名以后的第一次检出、运维脚本都还不知道要取子模块；
- 收益只是 6 个小的叶子模块，其余 54 个上游文件（包括循环、配置、各个界面）我们都改过；
- 以后要改成导入，只需把这 6 个文件换成一行 `export * from "<相对路径>/third_party/jev-sts2/src/…"`，调用方不用动。要不要改由 Dai 定。

## 对照表

60 个上游文件（src/ 下 38 个）。「v4」是改布局前最后的 v4（5ec1384）和上游比；「现在」是本仓库现在的文件和上游比。src/ 下 v4 时原样 12 个、改过 26 个；现在原样 7 个、只改了导入路径 5 个（文件搬进了模块目录，相对导入跟着变）、改过 26 个。全部 60 个：v4 时原样 25 个；现在原样 11 个、只改导入 12 个、改过 37 个。机器可读的版本：[upstream-files.tsv](upstream-files.tsv)（由 agent/tools/restructure-check/third-party-map.py 生成）。

| 上游文件（002e873） | 我们的文件 | v4 | 现在 |
|---|---|---|---|
| `.env.example` | `agent/.env.example` | 改过 增 223、删 0 行 | 改过 增 223、删 0 行 |
| `.gitignore` | `.gitignore` | 改过 增 31、删 0 行 | 改过 增 37、删 0 行 |
| `PLAN.md` | `agent/PLAN.md` | 原样 | 原样 |
| `README.md` | `agent/README.md` | 改过 增 16、删 0 行 | 改过 增 36、删 22 行 |
| `package-lock.json` | `agent/package-lock.json` | 原样 | 原样 |
| `package.json` | `agent/package.json` | 改过 增 2、删 1 行 | 改过 增 4、删 1 行 |
| `src/act/dispatch.ts` | `agent/src/hand/act/dispatch.ts` | 改过 增 3、删 1 行 | 改过 增 3、删 1 行 |
| `src/act/gate.ts` | `agent/src/hand/act/gate.ts` | 改过 增 42、删 10 行 | 改过 增 43、删 11 行 |
| `src/cli/doctor.ts` | `agent/src/core/cli/doctor.ts` | 原样 | 只改了导入路径 |
| `src/cli/reporter.ts` | `agent/src/core/cli/reporter.ts` | 原样 | 只改了导入路径 |
| `src/cli/runtime.ts` | `agent/src/core/cli/runtime.ts` | 原样 | 只改了导入路径 |
| `src/config.ts` | `agent/src/core/config.ts` | 改过 增 1031、删 2 行 | 改过 增 1033、删 2 行 |
| `src/index.ts` | `agent/src/core/index.ts` | 改过 增 27、删 2 行 | 改过 增 39、删 12 行 |
| `src/jev/answers.ts` | `agent/src/reflex/jev/answers.ts` | 原样 | 只改了导入路径 |
| `src/jev/client.ts` | `agent/src/reflex/jev/client.ts` | 改过 增 40、删 0 行 | 改过 增 40、删 0 行 |
| `src/jev/pricing.ts` | `agent/src/reflex/jev/pricing.ts` | 原样 | 原样 |
| `src/jev/questions.ts` | `agent/src/reflex/jev/questions.ts` | 原样 | 原样 |
| `src/knowledge/index.ts` | `agent/src/knowledge/index.ts` | 改过 增 19、删 1 行 | 改过 增 23、删 4 行 |
| `src/loop.ts` | `agent/src/hand/loop.ts` | 改过 增 1367、删 44 行 | 改过 增 1372、删 49 行 |
| `src/mod/client.ts` | `agent/src/hand/mod/client.ts` | 改过 增 6、删 0 行 | 改过 增 6、删 0 行 |
| `src/mod/discovery.ts` | `agent/src/hand/mod/discovery.ts` | 原样 | 原样 |
| `src/mod/schema.ts` | `agent/src/hand/mod/schema.ts` | 原样 | 原样 |
| `src/project/deck.ts` | `agent/src/memory/deck.ts` | 改过 增 42、删 6 行 | 改过 增 43、删 7 行 |
| `src/project/narrow.ts` | `agent/src/memory/narrow.ts` | 改过 增 18、删 1 行 | 改过 增 20、删 3 行 |
| `src/project/run-brief.ts` | `agent/src/memory/run-brief.ts` | 改过 增 73、删 4 行 | 改过 增 74、删 5 行 |
| `src/project/types.ts` | `agent/src/memory/types.ts` | 改过 增 500、删 1 行 | 改过 增 505、删 6 行 |
| `src/replay/record.ts` | `agent/src/eye/replay/record.ts` | 原样 | 只改了导入路径 |
| `src/replay/replay.ts` | `agent/src/eye/replay/replay.ts` | 改过 增 3、删 1 行 | 改过 增 13、删 11 行 |
| `src/screens/chest.ts` | `agent/src/hand/screens/chest.ts` | 改过 增 14、删 2 行 | 改过 增 17、删 5 行 |
| `src/screens/combat.ts` | `agent/src/reflex/combat.ts` | 改过 增 70、删 12 行 | 改过 增 78、删 20 行 |
| `src/screens/event.ts` | `agent/src/hand/screens/event.ts` | 改过 增 307、删 11 行 | 改过 增 310、删 14 行 |
| `src/screens/index.ts` | `agent/src/hand/screens/index.ts` | 改过 增 63、删 1 行 | 改过 增 65、删 3 行 |
| `src/screens/map.ts` | `agent/src/hand/screens/map.ts` | 改过 增 779、删 39 行 | 改过 增 780、删 40 行 |
| `src/screens/misc.ts` | `agent/src/hand/screens/misc.ts` | 改过 增 42、删 3 行 | 改过 增 45、删 6 行 |
| `src/screens/pick.ts` | `agent/src/hand/screens/pick.ts` | 改过 增 225、删 8 行 | 改过 增 227、删 10 行 |
| `src/screens/rest.ts` | `agent/src/hand/screens/rest.ts` | 改过 增 365、删 5 行 | 改过 增 367、删 7 行 |
| `src/screens/reward.ts` | `agent/src/hand/screens/reward.ts` | 改过 增 101、删 14 行 | 改过 增 105、删 18 行 |
| `src/screens/selection.ts` | `agent/src/hand/screens/selection.ts` | 改过 增 854、删 11 行 | 改过 增 858、删 15 行 |
| `src/screens/shop.ts` | `agent/src/hand/screens/shop.ts` | 改过 增 527、删 17 行 | 改过 增 531、删 21 行 |
| `src/strategy/damage.ts` | `agent/src/reflex/damage.ts` | 原样 | 原样 |
| `src/telemetry/decision-log.ts` | `agent/src/eye/decision-log.ts` | 改过 增 133、删 3 行 | 改过 增 134、删 4 行 |
| `src/util/format.ts` | `agent/src/core/util/format.ts` | 原样 | 原样 |
| `src/util/json.ts` | `agent/src/core/util/json.ts` | 改过 增 27、删 1 行 | 改过 增 27、删 1 行 |
| `src/util/lock.ts` | `agent/src/core/util/lock.ts` | 原样 | 原样 |
| `tests/config.test.ts` | `agent/tests/config.test.ts` | 改过 增 42、删 1 行 | 改过 增 42、删 1 行 |
| `tests/damage.test.ts` | `agent/tests/damage.test.ts` | 改过 增 4、删 3 行 | 改过 增 10、删 9 行 |
| `tests/discovery.test.ts` | `agent/tests/discovery.test.ts` | 原样 | 只改了导入路径 |
| `tests/lock.test.ts` | `agent/tests/lock.test.ts` | 原样 | 只改了导入路径 |
| `tests/loop.test.ts` | `agent/tests/loop.test.ts` | 改过 增 83、删 2 行 | 改过 增 89、删 8 行 |
| `tests/mod-client.test.ts` | `agent/tests/mod-client.test.ts` | 原样 | 只改了导入路径 |
| `tests/pricing.test.ts` | `agent/tests/pricing.test.ts` | 原样 | 只改了导入路径 |
| `tests/questions.test.ts` | `agent/tests/questions.test.ts` | 原样 | 只改了导入路径 |
| `tests/record.test.ts` | `agent/tests/record.test.ts` | 原样 | 只改了导入路径 |
| `tests/scenarios.ts` | `agent/tests/scenarios.ts` | 改过 增 7、删 0 行 | 改过 增 7、删 0 行 |
| `tests/schema.test.ts` | `agent/tests/schema.test.ts` | 原样 | 只改了导入路径 |
| `tests/screens.test.ts` | `agent/tests/screens.test.ts` | 改过 增 1919、删 0 行 | 改过 增 1927、删 8 行 |
| `tests/support.ts` | `agent/tests/support.ts` | 原样 | 原样 |
| `tools/fake-mod.mjs` | `agent/tools/fake-mod.mjs` | 原样 | 原样 |
| `tsconfig.json` | `agent/tsconfig.json` | 原样 | 改过 增 2、删 2 行 |
| `tsconfig.test.json` | `agent/tsconfig.test.json` | 原样 | 改过 增 2、删 2 行 |
