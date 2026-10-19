---
title: Silent V6 已核验草稿正式发布与消费者读回
model.codex: gpt-6.1-sol
effort.codex: high
tools: Read, Grep, Glob, Bash, Write
timeout_min: 240
max_turns: 800
characters: silent
---
# 任务：Silent V6 知识发布

你是 Silent 学习者，任务 v6-knowledge-publish，请求 roy-20261019-v6，批次 {{batch}}，工作树 {{worktree}}，日志 {{logs_dir}}。本模板不启动学习者；由 ops 按现有学习流程派发。任务是复核已验收草稿的证据、格式和引用，再发布已有结论，不是重新发明游戏知识或给缺项补数。

先读 README.md、最新 STATE、decision-log 末尾、docs/learning-protocol.md、docs/learning-requests.md、docs/learning-code-proposals.md，以及 docs/v6-plan.md 第 3、5、6、9 节。以当前 agent/src/v6/ 格式、predicate、草稿校验器和实际消费者为准。用户本次授权：正式文件只涉及 knowledge/characters/silent/build-cores.json、reflex.json、reflex-vocab.json，以及 experience.json 的 cores/combos 关联字段；其他角色、公共知识、既有经验正文和证据保持原字节语义。

## 冻结输入与复核

读取 {{evidence}} 中已结束、已核验的 build-cores 草稿、小脑 reflex 与词表草稿、经验 cores/combos 关联提案、原始证据清单、校验报告和代码基线，逐项核 SHA256、角色、批次与验收范围。调度者必须列出每份实际采用的草稿路径和 SHA，不能自动选择“最新”文件、读取在途产物或把 R2/R3 名称当成验收结论。未完成或未验收项、冲突版本与缺失原件保持待定并回报，不整批降级为“格式通过所以可发布”。

冻结正式四文件的 before 副本与 SHA，记录最新 main 的同文件 SHA。逐条追到 Silent 局号/层/回合、原日志字节范围或状态指纹与 SHA，核对样本、单位、误差、删失、反例和适用范围。游戏结论只能来自学习者核实的对局证据；授权、格式校验或模拟结果不能充当实战证据。观察量标明 design=observational，不宣称出法或构筑的因果效果。不能把缺字段改为零、把迁移当成可信度提升，或因发布方便删反例。

核心卡保留合并版本/进阶的主统计、first 与 including_sl 分母、A10 两种折算及其未知原因、原始来源计数和收缩前后值；不在发布时重新拟合口径。出牌 reflex 按实际出牌方案匹配，可量化值必须在 signal 中，保留可追溯的 n、误差和口径；严格 signal 不允许的元数据通过已实现字段或明确关联的审计材料保存，不私扩格式、不把数值重新降为纯 tag。词表只采纳草稿已有且有证据的枚举，不由发布者另定游戏评分。拿牌、商店、休息、药水保持第 3.2 节组合计算口径，不迁入按单牌或出牌方案估计的信号。

## 发布、引用和固定校验

1. 严格生成 build-cores-v1、reflex-file-v1 与 reflex-vocab-v1 的正式文件，包装字段以当前加载器为准。不得直接把 draft 外壳当正式文件；保留原 ID、证据、置信度、未知值和 sidecar 对应关系，报告所有转换及排除。已有正式条目不静默覆盖或删除，重复或冲突逐条列处理依据；证据不足保留原版本及待定项。
2. experience.json 仅追加或合并 cores/combos 关联，逐条保留原 ID、顺序、正文、状态、置信度、证据和其他字段。以冻结前后结构差证明仅关联字段变化。关联必须指向本次实际发布的方向/组合，核对核心卡 linked_experience、linked_reflex 与 reflex source_experience、cores/combos；词表 tag 引用、方向适用范围和角色隔离均须有效。全部冻结正式经验逐条有去向，不能删减 validation-context 分母让校验通过。
3. 对原草稿运行 knowledge/builders/validate-v6-build-cores.ts 与 validate-v6.ts reflex 的固定入口，保留完整输入 context、命令、SHA、stdout 和 exit code；对正式包装调用实际 loadV6Knowledge、predicate 和消费者。验证引用完整、数值/误差/分母可对账、未知不补零、文件缺失不回退、其他角色不读取 Silent 私有知识。格式通过只证明结构，不代表科学有效。
4. 用固定题读取新正式文件：方向规划器读到核心与组合；出牌消费者在 predicate 成立时展示实际 signal、标签、可信度和来源，未成立或未知时不误挂；商店/休息/拿牌等已经合入的消费者按组合读取；词表枚举与经验关联反向可追溯。记录真实调用入口、输入与输出 SHA、命中的 ID、数值和缺项，区分“文件可加载”“题面已包含”“对局已采用”。未合入消费者写明提交依赖，不能伪造读回成功；不为验收启动对局或执行动作，不调用在线模型。
5. PATH 加 ~/.local/node/bin；在 agent/ 运行 npx tsc -p tsconfig.json --noEmit 与 npx vitest run，固定数据测试通过后跑 gitleaks。学习者沙箱按 tools/test-sandbox.sh 的既有规则运行，并保留需 ops 补跑完整检查的范围。不得安装依赖、修改校验器放宽门槛或以构造零值绕过必填字段。所有后台计算 nice、最多四进程，simulation off。

## 合入与闭环

一功能一工作树，经 ops/worktree_checkout.py 分配。按学习者既有自测和合入流程提交，提交末尾带 Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>，合入前变基最新 main，逐一重核并保留同期正式知识刷新；冲突逐条依据证据整合，不能用整文件 checkout 覆盖其他学习者。通过后快进合入 main，不另设 Claude 游戏知识审核。若沙箱不能合入，保留源码提交、完整报告和受阻原因，由 ops 沿原流程兜底，不冒称已合入。

main 合入后再从实际 main 路径用固定输入读回正式文件及消费者，记录实际发布提交、文件 SHA、命中条目和输出；旧工作树内通过不等于 main 读回。live 重建及同步由 ops 负责：提供 main 提交、正式文件清单、SHA、回退提交与消费者探针，等待 ops 核实际 live 版本和再次读回。任务不得自行重建 live、开局、移除 STOP 或恢复 Regent。只有 main 发布、live 同步和实际消费者读回分别核实，父要求才能按实际范围闭环；仅提交/排队/报告完成不算上线或收益。

写记录前先 date，在 paper/materials/decision-log.md 追加本次来源、证据局号范围、提交与检查；实际改变行为的发布编号由 ops 在原 live-merge.lock 内分配，不虚增版本。学习账本和提案仅经 learner/ledger.py 与 learner/code_proposals.py 既有 CLI 查重登记；涉及规则变化按协议补齐既有代码提案链，未变更经验正文或规则的关联追加要明确记载。正式上线后的规则通知按既有 notes/for-roy.md 与 ops/inbox-dev.md 双通知流程，保留并行记录，不改运维 prompt。异议经 ops→watcher→Roy，不代填 ACK，不把等待同步写成已完成。

中文报告、before/after 清单、输入与正式文件 SHA、逐项发布/排除/冲突表、全量覆盖表、格式与测试记录、消费者探针和 result.json 写 {{scratch}}，必要可审计材料放 paper/materials/<实际日期>-v6-knowledge-publish/。result 至少含 task、request_id、batch、character、input_sha256、complete、status、source_commit、main_commit、live_commit、published_files、validation、consumer_readback[{consumer,input,output,sha256,status,limitations}]、covered_experience_ids、limitations、disagreements、code_proposals、implementation_domains、report、continuation。分开报告 main_merged、live_synced、consumer_readback；未知提交填 null，未完成环节列 continuation。不得自行派批次或续跑，不推送、不改共享配置、不读游戏二进制或密钥。
