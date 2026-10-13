# 静默猎手策略提案消费报告

本批 20261014-050124-strategy-proposal 的十个原提案均为 waiting。机制和局部诊断已有证据及实际 live 子实现；剩余范围缺完整候选执行归属、联合消费者验收、受控整战或独立后期验证。没有新源码、知识、游戏规则、提交、live 合入、版本或 shipped；不关闭量化或学习入库父要求。

完整 base：4d6f7edcd300dfb3b7123fd3754dfc545d64ed80。初始工作树干净，普通批身份核验后 git merge --no-edit main 返回 Already up to date。learn.json 的 task/character/worktree/proposal_ids 与本批精确匹配，没有 research_request 或 implementation_request；普通专题根请求绑定另批，不用它替代本批身份。

本批派发局：751FN9QM9MHQ, KV0JHNJCKXLS, YQL8RZ8BWN1E, L9SGRBB5R698, PU80F84P6HPN, KEN58SH9SLZ6。全部 runs.jsonl 记录为 SILENT/A10。没有读取其他角色私有知识，没有把原提案的历史支持总数或同局相关 SL 尝试数当本批独立样本。原历史含 dirty 标记和旧脑引擎；本批未恢复其完整历史 dirty 源码树。

## 证据核验

- 十份原提案 Markdown 的实际 SHA256 全匹配队列，保存 original-01.md 至 original-10.md；各原 ID、来源任务、证据与账本见 proposal-inputs.json、ledger-evidence.json、proposal.md。
- 本批从原日志逐 offset/length 重新读回 4071 条 decisions、4167 条 states、43 条 SL 和 6 条 run-config，共 8287 条；29,041 项字节/JSON/角色检查通过。旧同角色材料仅用于定位字节范围，日志只读；真实行号、SHA 和来源索引见 source-manifest.json。
- 六条路线元数据没有 decision_id，明确排除并保留原因。六个冻结消费者输入含 4065 条有效决策、4167 条状态，SHA 见 consumer-input-manifest.json。
- 六次现有离线 audit-selection 消费均退出 0，独立输出本批 *.audit.json；777 个窗口中 415 可核观测端点、362 未知。89 项本批核验通过，另五个 KEN 能力/格挡/追加小刀观测核验通过。无 LLM、网络或 play。
- 751 F17T2/T7/T13 三组与 KEN F17T5/T10 两组原题指纹一致。关键十个完整端点、七次耗药槽位、残壳施毒及 KV 未知边界均核对原输入与本批消费者输出。

415 个端点描述实际整轮的观测变化，不能将全部变化归给某一题面候选；actual_full_candidate_result 与 causal_candidate_result 仍未知。完整候选认证、受控整战重放和独立后期验证均未完成，不把接口 completed、预测最优或相关 SL 当实际胜率因果。

## 关键结论及反例

751 F17T7 原/换线实损 13/23、敌净扣 12/18：多付10血、多扣6血；T13省6血也少6敌净扣。题面未决弃牌的保守多计6与两线实际血价差分开，不能作为新计算bug或拟统一门槛。

751 F13T3 有药 plan2 与明确整战无药 plan5 均预测损8、五轮8/8胜，牌伤26/16；本轮无药 plan3 后续仍有7/8样本饮用，不当整战无药。实际选择饮用，没有同资源无药或保留至boss的完整受控结果；成本0且药水表未加载不证明持有价为0。

KEN F17T10 第4/5试多损6血仅多2敌净扣，B2差−0.2583、se0.0132；第4/6试T5省2血却把步法由T5延到T9，末试T8两防御仍各5挡，且274604追加小刀来自重问。两方向反例同时保留，既不支持只取最低即时损血，也不能将原更差线探索规则报为基础设施bug。七次实耗药逐槽位核实，但没有F15不饮用/保留至boss的完整受控支线。

KV F33第4/5试T5人工端点同零损、敌净扣36/29；现有消费者因结束后的诅咒选择/超时仍保持 turn_end_unverified。少7净输出不叫保血收益，两端净差也不能补出全部毛伤/回血或路线反事实。

YQL F17末T10残壳毒2→8而血26、挡13、41自爆不变；L9/PU/YQL原SL都核到近十亿占位血。阶段/本体已结束事实充分，PU旧巨兽胜线也真实；它们不能证明新参考排序或提前/留药收益。当前同轮旧排名仍用raw占位血，直接归零会改选路径，缺完整受控后继时保留排序。

## 已有代码与等待范围

live 读回快照：26bb0f07b6e72394e09b08dfb15f51a6c2d0fe86。14个相关叶均核实际live提交、源码祖先、提交blob和实际工作树字节；完整SHA见 live-source-receipts.json。候选/持牌05cd292c6f01bb31e406473d3a9843e659d62b93、单动作bade647f9fe4c9103b40e2f26b26296692ad24b7、资源预测a8b1f8be153fe4f3a34146117546c2178f2e446b、药价未知04921bd785ac6838066522f91ea0bb6ab95cb6a1、巨兽说明d5e20aa4dd44168ce30944dfcce74f8322144953、阶段资源0d092f6b928a6221eabf3516abad25c48ceaac9c、整轮窗口9b87d54f097d84521152e6cca8d6072af8140394均为实际live祖先。

本树与实际live的这些消费者叶一致；explore.ts仅三处历史注释Roy/Dai字节不同，完整diff另存，相关算法一致。没有冒称全部源字节完全相同，也没有修改注释或整枝导入刷新知识。

逐项证据、原账本ID、旧行为/预期行为、反例、验证方法与waiting原因全部写入 /home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-050124/learner/runs/20261014-050136-strategy-proposal/proposal.md 和 proposal-results.json。十个原ID均保留，已有子提交不填作整个提案implemented/duplicate；没有新CLI ID，不修改原提案或调度注册。

## 测试、失败与交付

fixes=[]；merged=null；tests={"tsc":null,"vitest":null,"cases":null}。本批没有生产源码改动，不做撤源码/恢复负对照、生产tsc/vitest或live合入；上述六次消费者及证据检查是固定旧帧核验，不报为新源码测试、策略整战模拟或上线成功。第4节无代码可合入，未执行刷新提交/合并/版本编号。

本批自编证据核验脚本第一轮误把原药水槽位字段写成slot，退出1；核原schema后改用index，第二轮退出0。first-failure日志保留，不改写第一次结果，也不归为生产代码失败。其他工具输出截断后的原提案和关键帧已有界读回。

账本仅经 /home/dw/Projects/agent-sts2/learner/ledger.py update 追加本批proposal/report链接及waiting说明，保留旧claim/status/version，不重复追加旧证据，不把已上线知识改回proposed，也不标本提案shipped。CLI回执与读回、最终干净状态及资料扫描另存 final-validation.json。

report：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-050124/learner/runs/20261014-050136-strategy-proposal/report.md。proposal：/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-050124/learner/runs/20261014-050136-strategy-proposal/proposal.md。最终结构化字段另存 result.json，原日志/原稿/失败/未知和本批现场全部保留；未推送、安装依赖、运行play或派下级agent。

最终读回：16条原账本CLI追溯更新已逐物理行offset/length/SHA匹配，旧字节前缀保留，未改claim/status/version或追加重复证据；账本check为459项、0问题。gitleaks资料目录扫描退出0、0项（全量遮蔽输出），日志与JSON保留。最终HEAD仍为完整base，git status为空，执行源码、任务模板、eval及全部knowledge相对base零差异。final-validation.json为真实本批回执。
