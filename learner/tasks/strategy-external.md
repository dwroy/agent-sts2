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

只读冻结的、已脱敏聚合 JSON 与发布契约，不读原始数据库、逐玩家数据或玩家标识，不下载新数据。游戏知识只能来自这些证据，不从预训练知识补齐。来源统一 external:sts2fun；逐结论记录版本、采集日期、输入 SHA、独立样本分母、观察性限制、反例和缺口。v0.111 与 v0.107–v0.110 分 cohort 统计，不能混算；本系统 live 证据另账，runs=[]，不得补局号或把玩家聚合冒成本系统验证。

按 work_spec 的有界单批主题提炼 knowledge/strategy/rk 候选。先核 #27/#28/#42 冻结契约，命中同场景就合并候选/指向既有ID，冲突保留本系统与外部两条证据和适用条件。rk 保留可复盘条件与缺口；#50 双Boss准备度要求照绑定规格交付。只在 scratch 保存真实候选和来源账本；每条写 formal_publication=pending、consumer_readback=pending。正式发布仍沿既有发布锁、学习账本、消费者读回和后续自然采用流程，候选完成不关闭科学父。不改源码/正式知识、不合入 main/live；HEAD 保持 dispatch_base。

所有 unit_ids 逐项写具体处置和缺证理由，允许 waiting；不得捏造发布、读回、收益或样本。保存 {{scratch}}/report.md，最后输出同一 JSON：task=strategy-proposal、character=silent、batch=真实ID、base=dispatch_base、runs=[]、fixes=[]、merged=null、tests={tsc:null,vitest:null,cases:null}、report=报告绝对路径、external_source=绑定plan_id、input_sha256=冻结manifest SHA、external_results=[{id:unit_id,state:processed或waiting,destinations:[{kind:knowledge或strategy或rk或merged-into,id:目标ID,path:scratch中真实候选文件绝对路径}],reason:具体理由}]。processed 表示候选已落盘且至少一个去向；waiting 的 destinations=[]。不得把启动参数或请求档位当原生已采用档位，使用量/耗时以原启动回执与运行记录为准。
