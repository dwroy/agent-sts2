# #36 P1：派发回合整个未绑定窗口拒绝模型活动

修复集成员 [6350284670](https://github.com/dwroy/agent-sts2/issues/36#issuecomment-6350284670) 的退回。基于原开发 HEAD `76b41d6d7`；原两枚协议/即时回执补交尚未合入，集成须沿 `6a5d049f0` + `76b41d6d7` 再取本提交，不能只取这次两处守卫。

运行代码仅改 `learner/lib/herdr.ts` 与 `ops/learner_tui.py` 的活动拒绝条件：从活动 turn 的 task_started 起，到原派发/明确续接提示按完整 marker/SHA 被接受前，工具调用/返回、reasoning 与助手消息都设置或保留拒绝。条件不再依赖 pending/confirmed prelude；后来正确的 AGENTS/context/marker 不能洗掉先前活动。调用/返回后缀涵盖原工具族，reasoning 和工具返回在原冻结真实 JSONL 中均有观察；这些项在已绑定模型工作中仍正常接受。

历史边界未改：TypeScript resume 在初始EOF之前只读跳过历史，新测试用历史未绑定工具/助手行验证；Python 在首个原绑定turn前继续隔离历史。原完整label/短名、cwd/session/turn/正文SHA、一次性marker、未知user、人工草稿、lease/PID/前台/退场/75守卫不变。

## 原样审查复现与固定回归

`repro.ts`/`repro.py` 从审查记录提交 `e1084908d` 同字节复制，SHA核同；直接在原HEAD运行时，前缀前function/local-shell/assistant三反例均错误接受，前缀后已拒绝，干净正例通过。最终源码下六个负例均拒绝、干净正例通过。Python直接验证code0完成证明，TS同时核NativeBatch与只读对账，原红/原绿与本轮新绿都保留，见 `reviewer-replay.json`/`checks.json`。

新增TS与只读对账的7类×6位置负例：function/custom/local-shell调用、function/custom返回、reasoning、assistant，分别放在前缀前、前缀后、context后、无前缀、明确续轮context前/后。独立Python同矩阵；另有已绑定首题/续轮正常工作正例、TS真实入口mock的历史resume正例、Python历史隔离正例，以及只读CLI明确退出75且两份输入不变的反例。原审查ownership文件未修改。

最终生产tsc0，定向9文件/205项通过；Python26项有独立原件，已被Vitest一个包装入口包含，不重复加算。Python矩阵是方法内subtests，不另加算42项。20输入SHA读回，nice19、单线程worker、串行检查；早期165/166过及最终205过日志分开。未跑full，原112/6123绿不覆盖本源码；集成员按原发布队列核精确组合及兼容。

## 四个已消费原任务保持

只对上轮已冻结的四份原档案和原生JSONL离线复放，未读取新会话正文或操作当前模型：最终只读CLI四次0，独立Python纯native重建四份通过，原档案/冻结JSONL SHA不变。session/turn/marker/完整SHA仍与前次证据相同，见 `four-snapshot-regression.json`。这不是当前状态、产物、退场或finish证明；fix档案submitted/无result与另三75的差异保留。未写原bindings/状态、未重送/重排/新模型、未动监督租约/真实pane。

R416发布、四旧批各重排一次及原模型消费事实保留。本轮只交开发差量，不改main/live/STOP/hosting/账号/服务档/权限，不运行play，不分号、不插队或关闭会话；原自然验收、四批最终完成、学习/科学父保持开放。
