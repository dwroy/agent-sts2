# #69 显式公开研究问题输入补交

继续原线程/树/分支，源码父提交 `97cf364d9ddedc4c77a58bf6aa0b913d44b5b709`。依据 [主管6406995463](https://github.com/dwroy/agent-sts2/issues/69#issuecomment-6406995463)。首053512仍是“缓存内容成功、真实search/open为0”：其原模板/提示/结果/版本和失败不改，本补交不重放回调或追加旧线程turn。

## 变化

原 `write --public-web` 没有绑定问题的入口，且原固定模板允许缓存足够直接学习；与历史 `research_request` 混用会被拒绝。本次加成对的 `--public-web-question` / `--public-web-question-sha256`，仍为原Silent纯内容strategy单元、原槽/门/租约/barrier/wrapper/runtime，不加调度器或新权限。

问题JSON只从本仓 `learner/requests/public-web/` 的普通JSON读取，限16KiB、无软链接；核任务/角色/来源意图、明确parent、问题文本和目标版本，核原始字节SHA后才可派发。原JSON文本/path/SHA嵌入新批 `public_web.question`，原key绑定ID/SHA；缺失/坏SHA/不允许任务/与旧request混用拒绝，同一输入完成/在途/待核不盲目重派，失败沿原有界重试。

prepare和TS启动链读取**原登记快照**，派发后原文件改变不会改变在途问题。launcher在新scratch写原字节 `public-web-question.json`，启动日志带ID/路径/输入SHA/来源意图；原提示/原生线程绑定仍沿原链。只显式问题批次追加缺口与实际search/open意图，覆盖默认缓存选题，不把所有学习改成必搜。旧任务模板SHA仍为 `ecbc947dc231d9b3ba22dd771ee21ff22bae56892788f7c3dfe0c591413c493f`，原字节未改；无问题旧批按旧合同读回。

原来源完成证明增加该题 `id/input_sha256/status/version_match/conclusion`，加parent/来源意图/目标版本和实际search/read IDs。answered必须有原生已完成search及同URL读页来源记录，不能用缓存或search单独顶替；无法完成则waiting，版本无证则unknown，未调用不冒网络失败。不强发知识；可证片段仍经原K1，未证/缺口保原件，批次结束不冒问题/联网/采用/收益完成。未改K1类型/schema/CAS或对局工具。

## ops准确接续

题目仅为核ACCURACY原牌文/升级差异与缓存v0.111.0是否对应；没有预填游戏结论。输入 `learner/requests/public-web/issue69-accuracy-v0111.json`，原字节SHA256=`884051eae3d739536fa7c7c2695628578bfa127fb40eafc7d2b35494a277c43d`，parent为053512。新源码适用组合核收并配套部署后执行：

```bash
nice -n 19 python3 ops/codex-ops-learn.py write --task strategy-proposal --character silent --public-web \
  --public-web-question learner/requests/public-web/issue69-accuracy-v0111.json \
  --public-web-question-sha256 884051eae3d739536fa7c7c2695628578bfa127fb40eafc7d2b35494a277c43d
```

ROOT生产代码5叶：`ops/{codex-ops-learn.py,learner_jobs.py,public_web_jobs.py}`、`learner/lib/{public-web.ts,launcher.ts}`；另配固定问题JSON1叶。依赖既有#69原13叶/原模板及原知识runtime，LIVE源码0叶，无SQLite迁移、行为号、ops prompt或共享配置修改。完整合同见 `docs/learning-public-web.md` 新“显式问题输入”章节。

## 验证与固定公共叶

冻结11叶（5代码、1问题、1文档、4测试），SHA见 `source-freeze.json`。生产tsc0；定向六文件33项过；Python39项过（含原CLI显式参数/坏SHA拒绝、快照不随源文件变化、旧批兼容、等待/回答区分，以及固定原生search/open→原finish回调→真实隔离K1→本地策略工具读回与旧版本绑定保持）。所有网页/原生事件为小固定夹具，没有真实网络、模型或游戏。新沙箱642文件/5927项全过，单fork paths11过，原学习者CLI47过；生产/验证11叶无漂移且原worker672548已退出。终态检查见 `checks.json`，不借旧69的694/6752绿覆盖本差量；原集成员仍接本项唯一最终组合。

已核main `16f66e76ad49e65df75a2efd88685b56fb86294d` 的五生产叶与本项父提交相同。#71固定 `282155113e65293f62d557e1d82aeeb147d7406b` 在两个公共文件只增完成/库存接线；本差量只增cmd_write/dispatch参数。在两文件隔离副本实际apply-check/apply与语法检查0，原external_stock接线保持，见 `shared71-compatibility.json` / `shared71.patch`；这不是实际ROOT组合full。集成须按固定提交串行合补丁，保71接线，不整文件覆盖。#72固定 `5ec842acc70c9c46617f109d40b544b3f97f691b` 没改本五叶；#60 runtime/CAS和72知识schema/脑工具未触碰。共同依赖属于集成顺序核验，不让库存功能或68接管变成本问题能力前置。

回退仅撤后续新问题派发及新合同差量，保已登记输入快照、原模板/线程、来源/失败、K1版本与绑定。旧053512及所有无问题批次不回写。部署不得热改在途输入；新合法单元由ops沿原门实际验search/open、URL/日期/版本/样本/许可/摘要SHA和逐来源处置，有支持才发布并读回；自然采用/胜率与科学父继续，开发不为验收启动模型/游戏，不操作live/STOP/其他会话。
