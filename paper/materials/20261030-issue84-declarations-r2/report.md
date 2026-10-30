# #84 实际组合声明返工（r2）

按 [集成员返工要求](https://github.com/dwroy/agent-sts2/issues/84#issuecomment-6514268370)，本提交只修订两项 producer 的受核声明及复核材料。#84 五项工程仍与 #85 r2 同批；原集成员接最终冻结、唯一完整检查和实际映射，原 ops 接部署同事务准入、补算与自然运行验收。

## 固定输入与精确差量

- 已采用 main：`f2d8e742776751620a675fae168c04b4323421f7`。
- 原 #84：`7a22ca832ff5a155dcd18760322dd6cfeb341154`；另保 `refs/heads/issue-84-fixed-producer-r1-source`，原请求文件原样保留。
- #85 r2：`50d8c223da550af8d30541d0714fc42afd25b536`。
- 两源共同基线：`9b0cf5955d7485c93ed1baf7d94bf1d2e08e1f06`。
- 自有隔离副本：从上述固定 Git blob 构造 base 加两源相对共同基线的逐叶差量，再叠本次声明。未复制/写入集成员独占组合树，未复制生产 DB/control。

相对原 #84，唯一运行部署叶为 ROOT 的 `ops/fixed-producer-dependencies.json`，100644。原源码 blob `e0d4b4b543b435c3687f2779975d2aa4ac5562d8` → 本次 `69055d059a605c85c1da026b2e8043bb0bd4ddb1`；SHA256 `df87c3f457e4c9ac48120ca568ff7b9e65ba84fead5edc6938bc6aeb5fb9a280` → `099c24846c735cdf4c6389e9e5af2eadc5bf230acefed6405d0ece3c28772f8c`。本次 LIVE 增量零叶，原 ROOT 七叶/ROOT+LIVE 三叶部署合同继续适用。

其余差量仅本目录复核材料与 decision-log 一行；未将 #85 源码带入本开发分支。`deploy-map.json` 列原 17 个其他执行/测试文件未变的 SHA。上述前像是相对 r1 的**源码前像**；只读观察生产 ROOT 尚无此声明文件，不能把源码前像当生产安装回执。实际安装前像仍由原发布事务重新核定。

## 逐叶复核

`leaf-audit.json` 对 #85 的全部 16 个新增/变化 `agent/src` 叶和离线 CLI 逐项列出 Git blob、SHA、静态边变化及 IO/动态/子进程审计。未按目录自动更新声明；`declaration-delta.json` 保存 29 条逐 producer 的节点前后像：

| producer | 已有叶更新 | 新叶 | 总叶（含公共 ROOT） |
| --- | ---: | ---: | ---: |
| v6-history | 10 | 3 | 302 → 305 |
| silent-boss-calibration | 13 | 3 | 395 → 398 |

V6 没有读/导入的 schema、store、typed-schema 三叶只更新 calibration，未扩大 V6。新增叶为 `decision-knowledge-exposure.ts`、`decision-knowledge-view.ts` 和 `strategy-grading.ts`。静态新增边位于 decision-knowledge、router、knowledge-projection、strategy-entries 及新模块；原 calibration 源码指纹真实读取家族显式补三叶。保持原成员及顺序，没有目录兜底。`grade-strategies.ts` 是离线候选 CLI，无调用/读取路径且不在原读取家族，明确排除。

曝光模块新 IO 为 logsDir 下按 runId SHA 命名的 JSONL 数据账本和独占锁；已复核身份/整行/大小校验、NOFOLLOW、0600/0700、追加、文件及目录 fsync、锁 inode 归属和关闭。数据不作为模块或子进程执行，账本内容不进源码方法指纹。两个其他新模块是投影/结构验证/摘要与排序，crypto 仅做摘要。Codex、Dsh、KnowledgeAgent 新增发送前回调，追到 router→attachment→曝光账本；既有后端命令、MCP 生命周期、源码动态边不变。SQLite 迁移执行受核源码中的常量 SQL，未增加从数据加载代码的路径。

所有受影响 TS 节点仍用原 `scan=all`、静态导入解析及整文件 `opaque_sites=[sha256]`；上述 IO/调用审计是本次整文件 opaque 复核的依据。原守卫、公共 ROOT 节点、unknown-reject 合同以及其余 11 项声明完全未改。

## 验证与边界

`closure-before.json` 在自有固定组合副本复现原来的 11 过/2 拒绝；`closure-after.json` 为修订后 13 项闭合。另 11 项的叶数和方法 SHA 与返工前逐项相同。outcome 仍 15 叶、不含 agent/src，方法保持：

`f50b9ea3c7debe7724ad29e0d36d654791442f252ede0d6f2dc28a5fe8fdfaf9`

两项新的方法预览（不能手填 control）：

- v6-history：`56be3ed269b83282825c934a3c9e22d8f3b7ea9f049d03bf92fccb36294da653`
- silent-boss-calibration：`7a43337c566bfb2039d3f7357e3fb3acccfc901a98e3a2cc0d734e0725aee096`

原守卫下 8 项检查通过：两 producer 漏新叶分别拒绝；账本源码未经复核拒绝；只改源码 SHA 未更新 opaque 声明拒绝；删 router 静态边拒绝；新 calibration 实际读取叶未申报拒绝；无关 agent/src 叶保持 outcome；账本数据追加不改三个相关方法。均在自有临时数据副本中检查，原组合输入无写入。

组合副本生产 tsc、knowledge-runtime tsc 均 0；核心 Python 70 项过；定向 Vitest 12 文件 145 项由通过结果覆盖：首轮 10 文件129项过、另两文件补齐原固定数据后16项复验过。首轮核心5项因启动器解析 venv Python 符号链接丢失虚拟环境而缺 duckdb，保留原 venv 入口后70项过，未安装依赖。Vitest 首轮缺固定聚合/开局 JSON 及空 `.cache` 目录的两项失败原件保留，未改源码、断言、阈值或排除。`checks.json`、压缩原始日志与 `cold-fixtures.json` 可复核。`source-freeze.json` 核 2348 个固定源码文件除声明外无意外漂移。

组合验证入口（读取提供的组合，负例仅写 OWN_OUTPUT 临时副本）：

```sh
nice -n 19 python3 paper/materials/20261030-issue84-declarations-r2/verify-combination.py \
  --root COMBINATION_ROOT --output OWN_OUTPUT
```

该组合必须含本提交声明与固定 #85 r2；本开发分支只带声明，单独对旧 #85 源码调用两项 manifest 会正确拒绝。原集成员还需在真实冻结组合重新执行，其他源码若再变必须重新复核，不能复用本次方法预览当工程准入。

## 原请求修订准备

新固定 HEAD 见本提交及 issue 交付评论；新准备文件为 `ops/codex-ops/delivery-issue84-declaration-r2.json`，保留请求 id `issue-84-fixed-producer-r1`、issue84、P0 与原开发分支 ref。#85 r2 现有依赖 id 无需改写。原请求文件和原固定源码分支保留，由原集成员显式修订后接同一批；开发未 submit/tick/freeze/full。

这次只是声明工程返工。原 #84 的唯一实际组合 full、生产新进程核同/CAS 准入、outcome 一次新 request 补算（分列10/26切点后覆盖/缺证、新D1及真实消费者）、下一次无关正常 LIVE 发布稳定性仍保持待验；旧 D1 与故障不改，不关闭科学父。未写 main/live/STOP/control、运行 play、控制其他会话或变更知识内容。
