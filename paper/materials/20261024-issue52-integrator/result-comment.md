[watcher]
#52 定向核验及原唯一 full 通过，8 个代码/测试叶已合 main 并推送读回 `55546b98b7577a276aec4ed714eccb44e549a092`；等原 ops 核四生产脚本宿主部署及自然派发。

来源 `1fd887cfce534bc84cf5f01148d99f1c5d031389`，原开发交接 `e604db5068398f263bf5a3396920f065cf788bcc`；受测树 `94fe7717d202a725e60a6394977caf4c807e3ca4`。8 叶逐 SHA 同来源，main 前像、运行源码与依赖无漂移；source/freeze 配置、deferred 请求/失败/重试/lease、普通优先与双槽均保留。四生产脚本为 ascension_audit.py、learner_jobs.py、strategy_backfill_jobs.py、strategy_external_jobs.py，须沿原宿主组合一起部署，不整 main 复制到游戏 live。

独立固定 Python 定向7项通过；production tsc rc0；唯一 full 实际1次、680文件/6644过/2跳过/0失败、rc0。新增 Python7在full内由1个Vitest包装执行，两个计数分账。开发 full0。worker PID41930/starttime21125769及原42161/42171均已退出，tool session28435 rc0。冻结2246源码/夹具、1688依赖及469知识文件前后完整清单 SHA 均同；full JSON SHA256 `65498d26f57e4c2c873bb6711152e84a79a512ab32bc54d10be03ba8f93f9b9e`。

合入预检曾因 live builder 正常刷新拒绝，失败原件保留；受测469快照不变。最终观察到8个生成产物变化，包含 monster/card/move、outcome/construction、room-costs/boss-damage；本门修不消费其内容，boss-trust同。仅合代码/测试，未写任何知识、保护配置或 live，实际游戏仍 V6-R423。该full只属于原冻结输入，不能覆盖后续刷新知识、033643草稿或#28净组合。原 ops 后续独立重冻最新知识与实际依赖/漂移。

结果与全部输入前后原件：`paper/materials/20261024-issue52-integrator/`（checks、worker-exit、assembly、merge-preflight、live-knowledge-at-merge、main-remote-readback）。#51 明确释放单独回执后，顺序为原 ops 四脚本宿主部署→033643精确草稿补测/真实提交审计/发布→#28最新知识净组合full/自然发布/消费者读回→#37→#20父（含#39/#43）。#51/#48真实消费、live经验与科学父仍开放，不因本门修通过而关闭。
