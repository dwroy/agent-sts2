# #60 隔离夹具依赖闭包退修

按6388232854处理，基线28780925be9e2ba4029a328920946aac05d9b328。生产逻辑、真实解析器、默认关闭行为、原断言和预期返回码未改；只给两文件三处复制清单加knowledge_runtime_env.py。

- ops/tests/test_llm_handoff.py:136：真实launcher准入夹具。
- ops/tests/test_llm_handoff.py:149：下一局brain selector夹具。
- ops/tests/test_publication_gate.py:46：三个真实游戏入口/全局marker夹具。

仍从仓库复制并执行真实标准库解析器，没有mock解析、修改返回码或用78代76/0。原STOP/准入/brain选择等断言完整保留，无新增断言以稀释失败。

固定检查：Python两原文件分别16/13项通过；生产tsc退出0；原TypeScript两包装account-drain/publication-admission合计2文件4项通过。原始stdout/stderr见llm-handoff.log、publication-gate.log、ts-checks.log；精确源码和解析器SHA见source-inputs.json。

不另开full。集成员原唯一full的6626过/2败/2原有跳过，以及Python中3条断言失败仍保留为原失败，不称已被覆写成全绿；原结果SHA99803774472adf367990ce974febef90e1afce6468b297fef7725ca07c901eb4，原冻结树/日志未改。新来源交原集成员核新输入和下一必要检查后再走原发布链。

本开发会话未改live/STOP、生产DB或控制文件，未运行真实游戏/模型/生产tick，未启动/停止其他会话。#58原发布不受本补丁影响；#60自然迁移、持久原绑定、合法候选→生产tools→自然局、旧反证/失败/ACK及学习父要求继续沿原owner验收。
