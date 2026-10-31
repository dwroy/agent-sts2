# #69 显式研究问题合同：当前 main 对齐补交

主管入口：[20/6523733863](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6523733863)；原需求：[69/6406995463](https://github.com/dwroy/agent-sts2/issues/69#issuecomment-6406995463)。在原分支 `issue-69-a10-learning-web`、原工作树接续，进入 #79/#69/#71 学习吞吐批；就绪项先集成，不互等。

## 固定基线与差量

- 基线 `1b7c652cbd5ef2355687e1e159fccacb2a73da06`，是指定 `9dbb37b5dd84c42809017c94bf224eced4a8d5f9` 的后继，已含 #77 supervisor close；本树只重放显式问题合同一个提交，初始重放 HEAD `3888e2a715f596e5f7ef5826705db9f98372396f`。
- 原交付 `58a49914587ac1f024c39a167c79dcecbdad374f` 保存在 `archive/issue69-58a49914`，原报告、失败/通过日志、固定问题、来源历史均保留。新交付的最终 HEAD 由原分支及 #69 本轮评论固定；本报告所在提交即交付提交。
- 11 个代码/输入/测试/文档叶的逐行增删与 58a49914 完全相同；`range-diff.log` 仅显示当前 main 上下文（own_learning 输出、#77 verdict/close）和 decision-log 位置。唯一冲突是 decision-log，保留 main 全历史后追加原 2026-10-26 记录。没有重新实现或改游戏知识。
- ROOT 生产五叶：`ops/codex-ops-learn.py`、`ops/learner_jobs.py`、`ops/public_web_jobs.py`、`learner/lib/public-web.ts`、`learner/lib/launcher.ts`；另部署固定问题 `learner/requests/public-web/issue69-accuracy-v0111.json` 一叶。LIVE 零叶。精确 blob/mode/SHA 在 `source-freeze.json`；其余是测试、文档及历史/本次检查材料，不作为生产替换叶。
- 当前 main 的 `own_learning` 返回/自有槽、外部默认 `default` 档位、#71 库存/finish 接线、#77 非阻塞锁/close/完成事件与迟到 finish 保持。与 #79/#71 共享文件由原集成按固定提交差量串行；不能整叶覆盖后续合入，不把它们当本合同的功能依赖。脑适配器、预算/失败留证、共享定义、runtime/CAS、账号/配置/权限/容量不改。

## 合同与 ops 接续

原策略槽/租约/注册屏障/runtime，仅显式 public-web 新单可以成对提供问题文件及原字节 SHA。输入在派发前核 schema/任务/角色/来源意图，固定进 batch/key；prepare、TS、提示、来源完成全链核原输入，不重新读取后续可变文件。原模板 SHA `ecbc947dc231d9b3ba22dd771ee21ff22bae56892788f7c3dfe0c591413c493f` 不变，旧任务与旧缓存批不改必搜。

固定问题只核公开 ACCURACY 原牌文/升级差异及是否对应缓存 v0.111.0，未预填机制、数值或策略。问题 SHA `884051eae3d739536fa7c7c2695628578bfa127fb40eafc7d2b35494a277c43d` 不变。接收组合、部署 ROOT 后，由原 ops 沿原合法入口执行：

```bash
nice -n 19 python3 ops/codex-ops-learn.py write --task strategy-proposal --character silent --public-web \
  --public-web-question learner/requests/public-web/issue69-accuracy-v0111.json \
  --public-web-question-sha256 884051eae3d739536fa7c7c2695628578bfa127fb40eafc7d2b35494a277c43d
```

answered 必须有实际 search 和同 URL 已读网页证据；保原生 callID、URL/日期/版本角色进阶/样本许可/摘要 SHA 与 cited/unused/waiting。版本无法对应则 unknown；未完成/失败写 waiting 和原件，不把未调用说成网络失败，不为验收硬发知识。有支持片段才沿原 K1 候选→runtime 发布→生产本地工具读回→自然采用。首 053512 仍固定为“缓存内容成功、真实 search/open=0 未验”；本次固定夹具与源码工程接收不关闭真实网页/自然采用/胜率父项。

## 本次验证

- 生产 tsc exit0；相关 TS 7 文件34项、Python41项（问题绑定/负例/原 finish→隔离真实 K1→本地工具读回）、原 learner CLI47项和 fork paths11项均通过，均沿新基线运行；旧20261026绿不复用。
- 沙箱首轮654文件：653文件6063项通过，external-stock外层一项15秒超时。内部原Python28项全部通过，耗时15.335秒；首红1540.10秒与完整日志保留。原样同源单独复查Python28项14.081秒、外层1文件1项通过。未改夹具/超时/排除表，不宣称单轮全绿，原集成最终组合唯一完整检查必须保留此风险并真实核收；无代码返工，不重复整套自测来掩盖首红。
- `sandbox-direct.py` 精确提取当前原沙箱脚本排除项，以直接exec和一个worker运行；命令/脚本SHA见各command.json。原冷材料fixture按同HEAD原blob精确展开，读回见fixture-readback.json。11叶开测前后SHA一致，检查进程已退出，见source-freeze.json、freeze-readback.json、checks.json。
- 当前fixed-producer工程声明不含本五个变化生产叶，声明文件未改；新发布仍由原owner按最终ROOT/LIVE及实际方法前像/票据核收，不能沿旧full。#20最新6524405929/6524458924的#81冻结批保留，main仍1b7c652c；本树只备后续固定来源请求，不改其baseline、取消或重full。

固定测试不访问真实外站/真实模型/游戏。原集成对最终采用组合执行唯一适用完整检查；本树不 submit/tick/authority/install，不改 main/live/STOP、不关闭会话。
