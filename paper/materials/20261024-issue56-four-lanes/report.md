# #56 外部学习四道调度交付

基线 `2b0f1ebc1fcced5685387905fcde708908eacc8f`，独立开发树；按 #56 正文和主管评论 [6383255912](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6383255912) 实现。该评论确认没有已预检的 codex1 事务，90% 分支只停外部准入并请求原 ops 换号，真实事务与验收不在开发会话执行。

## 结果与边界

- 外部 A 流派剧本、B 单牌、C 遭遇战+rk、D 其余决策各自最多一个未结算 owner；同道队列顺序续派，来源 ID/原世代重试及跨计划重叠去重保留。低额度档最多四个外部批次；高额度档最多两个，新空位优先此前未派或最久未派的道。在途批次不因降档被终止。坏输入/原退休证明缺失只挡原候选，不阻塞健康兄弟道。
- 外部 pending/在途期间，一个独立自有槽沿原复盘→经验/提案等路径，外部不再抑制复盘。原自有 owner、未决验收与审计文件锁保留。没有外部需求时保留原普通双策略槽等流水线，铁甲战士逻辑不变。
- 原五分钟订阅采样增加原子当前快照 `subscription-usage.json`，包含采样时间、周窗口及账号 home 的 SHA256。调度和 wrapper/launcher共读；≤70% 四道 ultrafast，>70% 且 <90% 两道 fast，≥90% 停外部准入并向原 ops 队列去重请求换号。未知、过期、错账号不启动；同档刷新允许 checkout 继续，跨档保留注册走原失败门。wrapper 仅传入口参数，不修改共享 config。
- 新外部派发仍受主盘严格 >80 GiB 以及原临时盘/容量门约束。原 ready/dispatch/finish、原生回执核验、未送草稿、发布和 retention 路径保留。每道是独立批次、独立工作树；本次没有并行写 live 的新路径。
- `external-launch.json` 初始只记录请求/有效档位，实际档位未知；仅在原生 turn_context 经原绑定核验后补 `observed_service_tier` 与原文前缀/SHA证明。请求 ultrafast、实际 fast 的固定反例会如实记录 fast。
- 只给队列当前 plan 增加 `lane` 元数据，冻结清单、SHA、版本与分母不重写。`knowledge/`、`agent/src/` 和版本表无差量，R434 正式知识由 ops 原发布通道保留；开发树不运行 play、不改 live/STOP、不关闭其他会话。

## 验证

固定来源、假额度/磁盘、假原生 CLI 与临时仓库，无真实模型或游戏。代码冻结清单见 `source-freeze.json`。最终检查结果与原始回执见同目录验证材料；早期失败及主动中止记录保留，不能当作最终通过。

最终 `SANDBOX_WORKERS=2 bash tools/test-sandbox.sh` 整体退出 0，包含生产 tsc、固定排除的 Vitest 和单独 paths 复验；107 项 Python 策略回归退出 0，冻结的 14 个代码/测试叶子逐 SHA 读回一致。标准脚本两阶段共用 outputFile，因此 `sandbox-repaired.json` 只有末阶段 paths，不冒称其数量是完整套数；整体退出 0 与两阶段原日志保存在 `validation.json` / `sandbox-repaired.log`。

首次完整沙箱 5,839 过/3 败原 JSON 保留：fake-herdr 夹具漏复制新增 policy 依赖已修；导入扫描缺少稀疏省略的原 `issue29-brain-speed/results.jsonl`，只从原基线逐字节展开，无提交差量；余下一项是 #37 已在 main 修正的旧动态策略断言，本树复用 main 已验收的固定夹具 blob（见 `validation-prerequisites.json`），没有混入 main 的产品/知识变化。中间定向 108 过/1 败与早期策略失败/主动中止都保留，不覆盖历史。

额外 broad `tsconfig.tools.json` 仍报 52 个工具诊断，原文 `tools-tsc.log`；未把这项记通过。首次 compiler-API 基线对照因当前 TypeScript CLI 包无 API 而未成立，已在前置记录保留，不声称该额外检查与基线等价。仓库要求的生产 tsc 则为 0。

## 发布交接

1. 集成员沿原唯一检查窗口核验并精确集成本提交的代码叶子。ops 原运行根部署 Python 策略入口、新 policy、wrapper、TS launcher/source 和订阅 sampler/helper 的完整组合；不部署 #51 被覆盖的 3:1 八叶。队列 `lane` 按当前原队列逐 plan 合并，保留 ops 新输入与世代，不用开发旧队列覆盖运行根。尤其现有手动 A/C 在途批次及开发期间新增的 plan 须在原队列补齐所属道；无法确认所属道的旧 owner 保守占槽，不扫描认领或重复派发。
2. 首个自然五分钟采样写出绑定当前账号的快照后，原自然 tick 才准入；不强制 tick、不改沙箱权限。原在途/未送草稿/未决租约按原门结算，不能为达到五槽而重开旧批次。
3. ops 记录实际部署 T、源码和四道+自有槽五个不同 batch/worktree 的自然在途读回，各批 `external-launch.json` 的原生实际档位为 ultrafast。只有请求、注册、固定测试都不算此验收。
4. 在 [T,T+2h) 以原完成回执及独立 source unit ID 去重统计完成单元至少四个；原失败、未验证来源、正式发布/消费者与自然采用/收益分账。真实 codex1 换号由原 ops 在收到请求后按 `docs/llm-handoff.md` 预检、drain、激活和验证。
5. 本交付为调度基础设施，不造对局行为发布号，不关闭学习/科学父要求。自然五槽、两小时吞吐和真实换号均交原 ops，未在开发交付中冒报完成。

回退：沿原发布流程回退本次调度/launcher/wrapper/sampler 组合到原版本，保留新 lane/快照/批次/回执与失败历史，不清 learn.json 或任务 owner；不得借回退部署已被 Roy 覆盖的旧 3:1 候选。原在途批次由原 owner 按完成/保留门结算。
