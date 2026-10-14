# 本批交付

2026-10-14，批次 20261014-161301-s2-strategy-proposal。十个原提案逐项核证，全部 waiting。没有足够证据新增策略规则；没有源码/知识改动、提交、合入或行为发布。提案正文见本目录 proposal.md，逐项原文和证据材料均保留。

## 身份与边界

- 工作树 /home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-161301-s2，完整base 46993bc280403cccc4c021e31a43d53dbe562d77；开工干净，执行 git merge --no-edit main 返回 Already up to date。
- 只读根 learn.json 本批行：task=strategy-proposal、character=silent、reason=proposal、worktree精确匹配，有十个proposal_ids；没有research_request/implementation_request/proposal_repair。普通专题文件绑定旧批20261010-150327，不匹配本批，不读其work_spec/manifest，不承接纯研究或实现专题，不套research_complete。
- 先读README、最新顶层STATE-2026-10-12、decision-log末尾、learning-protocol及learning-code-proposals。未读取其他角色知识，不派下级agent，不运行play/API/LLM，不联网，不安装依赖，不改运维prompt。
- 本批派发十局保持原名单。另五局 9TG1RP5LFAAK、JQPT83P8KDSZ、S9UZAK0JP0C0、7X0W3U8TVA2A、MTQ0EUBJ3R6T 均由原派发提案明确引用，只作其补充证据。15局runs行逐一核为SILENT；HMVJKM56S4Q8、F4QKG4J1AJJZ、G403VCZ3BH1B为A9，其余为A10，分阶保持。
- 全部原run code的+dirty保持；本批base或当前live均不能冒充旧局完整执行源码。

## 证据与结论

冻结及逐字节重读了21,854行：11,008 states、10,609 decisions、109 SL记录、15 runs、16 run-config、97 run-plans。每行保存真实原行号、offset、bytes、SHA256和原JSON字节，见 evidence-manifest.json、各*-index.json及*.jsonl.gz；原decisions计数与15局runs记录相同。109是日志行数，不是109个独立SL实验。

evidence-verification.json 中25项固定材料核对均成立，包括：RC逐张挡/临时敏捷/幻影首刀；B强制弃牌后实际血损；X接管后实到状态、一层幽灵及夜魇未及兑现、毒胜仍付9血；7X后段毒0→7与25→18；MTQ同盘多6即时伤、多损8；跨幕16个原范围转换。它们支持已有局部事实，不能填补未执行支线、完整入伤、替代路线/药时或整战因果。

跨幕原提案10局16对全符合同上限floor(缺失HP×80%)。全15局另合计22对，仅作本次读回范围。取领奖末帧至新幕事件首帧；act_id先变化而血未回复的中间MAP单列，未误判成机制反证。

逐项最终状态及具体缺证：

| 原id后缀 | 状态 | 缺少的关键证据 |
|---|---|---|
| 03754e1265894000 | waiting | 幻影其他层数/组合取整与药时完整后继；局部首刀/折扇不覆盖宽项 |
| e5ea36df117ca9b7 | waiting | 自动接管的中间动作/抽序及可自主启动对照，首题已是接管结果 |
| ab055ef7dfbb44e5 | waiting | 延后幽灵整战、叠层及复制收益造成错误排序；六次均T1 |
| 0129c465c6f5bd79 | waiting | 夜魇/接管/杀序/SL同条件完整后继；单弃与毒胜保血仅为子实现 |
| abe9d5d0be109a9f | waiting | 相同资源下替代路线/休息/留药整战机会成本 |
| f16527e59b5cc1e0 | waiting | 宽组合独立效应及延后用药后继，不能由局部属性窗口整体核销 |
| 7a8e9ccb7e646538 | waiting | 中间完整伤害事件与同条件替代整战；熔炉时点也改变 |
| cd9f76184de6e29a | waiting | 未见跨幕交互及替代路线收益，16对公式不能关闭资源父范围 |
| 292f6731bdb9b669 | waiting | 其他目标/叠毒/阻挡组合与持有价；标量入口不能安全推广单目标实测7 |
| 0802f69b28d25079 | waiting | 完整候选执行认证、成对整战和独立留出，不能据四相关尝试拟SL阈值 |

每项证据局号、层、回合、全部旧账本id、反例、预期行为和验证方法见 proposal.md。未新建重复id，未重写历史复盘/提案/首证/先验。

## 已有源码及消费者读回

source-audit.json 锁定核查live c268cf3a5b1a299c2da52edeb5748ace5ea2a566，实际磁盘相应14个源码文件均等于该提交。

| 已实现的有限子项 | 实际live祖先源码commit |
|---|---|
| 幻影首小刀 | d65609ff2bc98ec5ec2e06b558159aba89d93032 |
| 一层幽灵 | 96f17377a331e50ea5b6a3fe8d2b605932ed1bd4 |
| 无绷带普通生存者单弃 | bf423c173d3be348a4ad714e1d26516df619ff41 |
| 已观察毒胜保血搜索 | 222445a9bb6bf56cb4f3ceea2cc8b20fba54128f |
| SL同题预测资源比较 | 5604982e13890e0e2bc8bf8246272e8267321c0b |
| 未知药价与无药预测参考 | c4670f4f416c7d93e192e889c5080e7e4e0e733f |
| 有界终局HP观察审计 | 83512ddcd2c70fd9b983dc38524ff25c8970c1d3 |

14文件中7个base/live字节相同，另7个保留Roy→Dai注释差异原字节和完整patch；去注释后的转译执行文本14个均相等，结果在source-comment-comparison.json。此项不是生产tsc/vitest，也不能由祖先关系证明宽提案完成。

本次以原固定输入实际运行既有 learner/audit-selection.ts 三次，均exit0；唯一无decision_id的X路线元数据原行另存consumer-exclusions.json，原行号缺口保留、不跨接。没有改消费者或生产代码。

| 局号 | 有ID动作 | 题段 | 可见动作后端点 / 未知 | 可见整轮端点 / 未知 |
|---|---:|---:|---:|---:|
| XTSV1U9JD34T | 774 | 167 | 222 / 552 | 27 / 113 |
| 9Z9H2EXKLF3T | 932 | 219 | 382 / 550 | 49 / 90 |
| MTQ0EUBJ3R6T | 424 | 68 | 156 / 268 | 25 / 50 |

完整候选实果全部为null。动作回执、相邻观测净变化、整轮净变化、模型预测和完整候选效果保持各自证据边界；三个exit0是材料消费者结果，不是策略收益或生产测试通过。

## 记录、失败与验收

只用根 learner/ledger.py update 为相关旧账本追加本批note/by/where追溯，不降级已有shipped，不重写claim/evidence/first_run/prior/version，不将waiting标成implemented/shipped。实际CLI输入、stdout、追加原行及读回结果保存本目录。无新增代码提案，原十个CLI id仍是本批处理对象。

保留三种准备错误及修正：初稿按顶层run_id筛states/run-plans得到0，改为state.run_id/run并核静默后取得全量；初稿误取act字段得到0转换，之后只取act_id变化又停在回复前MAP，最终按新幕事件首帧核22对，旧结果分别保留；源码审计初次误写selection-turns.ts导致git show 128，修为真实selection-turn.ts后完成，原stderr/脚本保留。它们是本批材料脚本错误，不是生产失败或撤码红绿。

补充准备记录见preparation-failures.json：首轮转译工具路径缺失，未安装依赖，改用现有esbuild；esbuild默认保留一处对象内注释，使首次执行文本比较为13/14相同，原差异实际仅该注释Roy→Dai，保留emitted原件后用去空白输出核对。另两次bubblewrap建立前因其他工作树回收遇到rg ENOENT，同命令/原权限重试成功，没有改变沙箱或将其计作生产失败。

没有源码修改，因此没有运行生产tsc/vitest或撤码实验；tests固定为tsc=null、vitest=null、cases=null。没有源码commit，fixes=[]、merged=null，无eval版本、release_id、实际上线或Roy双通知。既有规则保持；未建立新策略，无需回退。工作树HEAD应保持完整base且git status干净；scratch为被忽略交付材料，不提交、不回收本树。

最终机器回报保存 report.json。gitleaks及最终工作树/提案SHA/账本追溯验收见 final-verification.json；这些检查不冒充生产测试或经验live入库。
