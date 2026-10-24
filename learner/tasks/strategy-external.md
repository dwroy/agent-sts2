---
title: 外部公开聚合数据策略提炼
effort.codex: high
characters: silent
tools: Read, Grep, Glob, Bash, Edit, Write
timeout_min: 240
max_turns: 800
default.batch: manual
---

# 外部来源专线

本批角色 {{character}}，真实调度ID {{batch}}，工作树 {{worktree}}，项目根 {{project_root}}，临时产出 {{scratch}}。自行完成，不派下级模型。先读 README、最新 STATE、decision-log 末尾和 docs/learning-protocol.md 第9节。仅处理宿主附加的 external_binding 与冻结 work_spec；它优先于普通选题，没有旧四专题/旧批次身份。先核 learn.json 本批 external_source、绑定清单 SHA、实际 HEAD=dispatch_base；失配即停，不改请求或登记。

只读冻结的、已脱敏聚合 JSON 与发布契约，不读原始数据库、逐玩家数据或玩家标识，不下载新数据。游戏知识只能来自这些证据，不从预训练知识补齐。来源统一 external:sts2fun；逐结论记录版本、采集日期、输入 SHA、独立样本分母、观察性限制、反例和缺口。版本处理：有实际依据表明机制未改的版本合并统计，同时保留各版本原分母和异质性；机制已改的版本拆分。缺机改对照时标明未知，先从各自已满足样本条件的组产出，不把未知补成“未改”，也不因此整批停产；本系统 live 证据另账，runs=[]，不得补局号或把玩家聚合冒成本系统验证。

按 work_spec 的有界单批主题提炼 knowledge/strategy/rk 候选。先核 #27/#28/#42 冻结契约，命中同场景就合并候选/指向既有ID，冲突保留本系统与外部两条证据和适用条件。本阶段只处理改进版单牌单元，旧双Boss/幕Boss及同类停派；流派剧本等#54统计层交表后再派。只在 scratch 保存真实候选和来源账本；每条写 formal_publication=pending、consumer_readback=pending。正式发布仍沿既有发布锁、学习账本、消费者读回和后续自然采用流程，候选完成不关闭科学父。不改源码/正式知识、不合入 main/live；HEAD 保持 dispatch_base。

缺列先寻找可计算的代理并继续产出，条目、统计和适用范围都显式标“代理”：例如拿牌顺序/已拿奖励前缀作为牌组代理，上节点结束HP作为入场资源代理；只有连代理都没有时，才跳过该子项并说明缺什么。只有终局牌组时可以给终局关联的方向性统计，但不得写成真实战前快照或使用未来事实作当前题目的触发条件。缺因果证明不是否决方向性统计条目的理由；写清观察关联和混杂，不写因果收益/保证/固定拿牌命令。缺失分母不能估成真实样本；不累加重叠cell为独立局。单牌每个用于发布的比较组样本至少100；不满足的细分组退到真实可用的更宽代理条件，仍不满足才跳该子组，不把其他合格组一起waiting。

每条采用“一句方向 + 幅度 + 样本 + 一行适用范围”，保留版本、SHA、反向结果、外部来源与代理限制；完整统计/证据另附可核文件。每批覆盖20～30张牌，逐卡给候选/复用/跳过，报告真实新增条目数、更新复用数、达到100门槛数；候选、正式发布与自然消费分别计数。连续两批真实新增条目0就停下报主管，不能自动扩大批次或重开旧Boss任务。本批计数基线由冻结work_spec提供。

所有 unit_ids 逐项写具体处置和缺证理由，允许局部waiting；不得捏造发布、读回、收益或样本。保存 {{scratch}}/report.md；还必须在该报告末尾写一个完整的json代码块（以三个反引号加json开头），其中task为strategy-proposal，内容与最终输出逐字段相同，包括reason/path/各disposition。可先生成唯一的 {{scratch}}/result.json，再把其原字节嵌进report.md代码块并原样作为最终回复；提交前解析两处并检查完全相等。不要只在独立result.json或最终回复中写JSON，否则原完整性校验会拒绝；也不要在写好报告后改写最终reason。最后输出同一 JSON：task=strategy-proposal、character=silent、batch=真实ID、base=dispatch_base、runs=[]、fixes=[]、merged=null、tests={tsc:null,vitest:null,cases:null}、report=报告绝对路径、external_source=绑定plan_id、input_sha256=冻结manifest SHA、external_results=[{id:unit_id,state:processed或waiting,destinations:[{kind:knowledge或strategy或rk或merged-into,id:目标ID,path:scratch中真实候选文件绝对路径}],reason:具体理由}]。processed 表示候选已落盘且至少一个去向；waiting 的 destinations=[]。不得把启动参数或请求档位当原生已采用档位，使用量/耗时以原启动回执与运行记录为准。
