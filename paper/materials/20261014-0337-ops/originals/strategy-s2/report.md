# 静默猎手策略队列核验报告

记录时间：2026-10-14T03:25:56+0800（写入前已运行date）。批次：20261014-031301-s2-strategy-proposal。

结果：十个已领取原提案全部waiting，逐项原因见proposal-results.json和proposal.md；没有新源码、知识或游戏规则修改，没有源码commit、live合入、eval版本或shipped登记。已有子实现不等于原宽提案全部完成，不关闭量化或学习入库父请求。

完整base：26179538ad5b7caacd2f27ab307fb06e3aff7345。开工工作树干净，普通身份核验后merge main为Already up to date。未绑定纯研究或冻结实现请求，未读取另一请求替代本批身份。报告与提案均位于本批工作树learner/runs/20261014-031317-strategy-proposal，运行产物为忽略项。

来源局：751FN9QM9MHQ、KV0JHNJCKXLS、YQL8RZ8BWN1E、L9SGRBB5R698、PU80F84P6HPN、KEN58SH9SLZ6，逐局runs.jsonl均为SILENT/A10。不引用其他角色知识，不将原提案引用的旧全历史样本数冒充本批核数。对局历史含dirty标记和旧脑引擎，原记录不改写，本次并未恢复这些局的完整历史dirty源码树。

## 证据和消费者验证

1. 十份原Markdown与专用队列SHA256一致，保留原字节副本，未覆盖原稿或重建新id。关联16个既有silent账本，完整字段见queue-fold.json及ledger-fold.json。
2. 原字节读回全部匹配：4071条decisions、4167条states、43条SL记录、6条run-config；偏移、长度、真实行号和SHA见evidence-manifest.json。该manifest的initial_bytes是冻结扫描边界，不是原文件已不再追加的声明。
3. 六条无decision_id的路线元数据行明确排除，输入4065条有效决策；保留原行缺口，不把过滤后的相邻位置当原日志连续。
4. 现有离线audit-selection消费者对六个冻结输入分别退出0，输出为`<run>.audit.json`。六个输入SHA逐一读回，415个可核完整端点窗口、362个未知窗口，共777个；未知不填0。六次消费是证据核验，不是六次新策略回放或六个胜率验证样本。
5. verify_evidence.py退出0、8342项检查通过，包含原字节读回、角色/提案身份、四组同指纹、十个关键取舍窗口、巨兽残壳用毒及KEN七次槽位变化。回执evidence-verification.json的scope为frozen_evidence_and_existing_consumer_readback；不冒称tsc/vitest或整战模拟通过。

751 F17T7多损10血、多6敌净扣，KEN F17T10多损6血、多2净扣，与原局部观察相符。KEN T5省2血却延步法至T9且有追加小刀重问的反例也保留；既不支持只取最少即时失血，也不足制定固定血价门槛。KV T5的原始端点算术仍可核，但诅咒选择/超时使现有完整回合消费者保持unknown。巨兽残壳毒2→8而血/挡/41自爆不变，不证明提前喝或新排名的收益。七次实际喝药不能替代留药支线。

## 已有源码与未完成范围

live读回快照bc8ac5b44a6acae03dec148f552790009df3a4c2；十个相关源码叶均核实际提交祖先和live字节。候选/持牌事实05cd292c6f01bb31e406473d3a9843e659d62b93、单动作回执bade647f9fe4c9103b40e2f26b26296692ad24b7、SL资源预测a8b1f8be153fe4f3a34146117546c2178f2e446b、药水未知价对照04921bd785ac6838066522f91ea0bb6ab95cb6a1、巨兽说明d5e20aa4dd44168ce30944dfcce74f8322144953、阶段/最终资源0d092f6b928a6221eabf3516abad25c48ceaac9c及离线窗口9b87d54f097d84521152e6cca8d6072af8140394均已有。selection actual_turn、完整候选及因果归属仍null，SL同轮原始占位血排序保留。

完整逐叶回执为live-source-receipts.json。explore.ts与本树仅三处历史注释Roy/Dai不同，相关算法一致；没有借本批修改注释、跨树整枝合并或搬运知识。没有把上面真实子提交填入整项implemented/duplicate结果。

十项等待条件分别为：751的跨续问执行与受控整战；已确定/未决损血及药水无药/留药分支；经验来源相同范围的完整兑现；能力逐轮联合分账；KV毛伤/回血/诅咒边界和路线反事实；巨兽排名受控后继；巨兽提前/保留药时结果；KEN七药完整候选归属；KEN持牌/无实体与能力延迟的固定后继；经验来源相同范围的独立后期验证。proposal.md给出每项局号/层/回合/账本、反例、预期行为、验证与回退。

## 测试、合入及保留

fixes=[]；merged=null；tests={"tsc":null,"vitest":null,"cases":null}。没有源码改动，未进行撤源码负对照/恢复测试、生产tsc/vitest、完整宿主测试或live合入。本次没有需要回退的新发布，无发布编号可分配；未运行play、联网、安装依赖、推送或启动下级agent。知识和其他角色行为无本批修改。

保留第一版states抽取回执：误取顶层run_id导致0条，改为state.run_id及本角色校验后4167条；first-attempt manifest不改写为成功。一次只读工具调用在bubblewrap构建前遇到外部目录ENOENT，同权限同命令重试成功；没有扩大权限，也不把构建阶段未执行当源码失败。大输出显示截断后，关键原稿和取舍数据均另做有界读回。

最终结构化回报保存result.json。code_proposals列的是十个原CLI id，没有新增id；implementation_domains是本次核验涉及的combat/potion/sl/terminal范围，不代表这些领域上线了新实现。

账本追溯登记材料为ledger-link-updates.jsonl：仅经根目录learner/ledger.py update追加本批proposal/report链接与waiting说明，保留旧claim/status/version和全部历史。实际CLI回执、读回与最终工作树检查另记final-validation.json；不自行把原已上线知识降级为新proposed，也不将本次提案标shipped。
