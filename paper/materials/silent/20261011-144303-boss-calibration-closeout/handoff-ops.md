## 20261011-144303 本批幂等核验与发布状态

2026-10-11 14:50:39 CST：本批全量重提取与既有候选逐字节相同；没有新模拟、拟合、模型/策略修改或内容指纹目录。
已结束 SILENT 227局，boss尝试1009次，可用409场（299胜/110死）；SL预测死亡截断599次、
另外1次缺首回合决策帧；三场模拟失败保留，各起点可用调参106/107、验证300/302。
冻结结局切点为2026-10-11T04:48:50.649Z。该结果与上一候选相同，不冒称本批新增45场。
相对实际上线的live基准仍有45个新实际结局，因上一候选未发布而保持due；相对候选为0，
正常入口以identical artifact already complete跳过。用候选作previous的纯幂等测试返回new=0、threshold not reached；
这不改变实际发布触发基准。所有临时产物位于本批scratch。

固定候选源码/数据提交：30261a8e9b6823dab93e4f7c91adbe53863bda1a；候选树：3aaf8598b9955a135405db9bd49b83e65eca30b5。
既有功能实现：cdf75af64fb5b118a5a808ecb3b05e2a05991c36；固定模型：7e1193cef9467416bc10c8e344a49f4fd98390c7，两者均已是live祖先；
候选提交尚非live祖先。107调参keys、UTC切点、整体Platt和模型选择不变，新样本只延伸验证。
本批复用并重新验完整SHA清单的归档：experiments/boss-sim/silent/bfe55aacb854d355f0efc23cc10ccdde45586a7fa57b6adc45127edc2abd92fd/。
旧目录和报告保持；paper/materials/silent/boss-sim-calibration.md仅追加本批记录。

原入口自测含tsc退出0，vitest 265文件/2681例通过；Python12校准及8调度固定夹具通过。
调度测试包装只为既有fixture补临时工作树目录，不改生产源码、断言、测试入口或排除名单。
本批核210项固定模型输入、409完整开场状态、1007个来源帧offset/len/SHA，2个缺帧来源仍排除。
四项准入逐项重算核对名单，完整归档与当前提取fights/sources/turns/extraction均字节相同；
刷新入口两次幂等分支均未调用子进程模拟/拟合。未重跑旧控制战，不把旧控制日志冒成本批模拟。

B2/B3整体Brier=0.1086/0.1079；A10验证300场，预测−实际=+4.6/+5.1百分点，打穿比1.308/1.316。
逐boss仍有6/6项可信，全部boss验证数量已≥10，数量不足均0；其余由Brier/gap/leak质量指标拒绝。
A0–4和A5–9各0独立验证、各差10场，不把调参样本当验证。F49验证17场、数量差0，
实际胜率5.9%，B2/B3预测41.6%/36.4%、打穿比2.801/2.941，继续低信度；没有验证F48→F49联合通关率。
A10模型48项攻击记录来自A10；TEST_SUBJECT/BIG_POUNCE一项由固定A9记录估算，适用限制保留。
当前生产输入较固定模型有69项变动，本批只验证指定旧模型，不证明当前生产模型等价或策略效果。
Roy的授权涉及架构/校准方法和门槛；表中胜败、残差与准入结论源于静默对局，未引入人写机制。

锁内 live=56268f61928e0330d91293e585efab075839bb4a，他人 MERGE_HEAD=a83d9ab675560a177249aa638e99df40bcfb5553，19 个未解冲突。本批未改 live 的索引、刷新或合并现场。
实际合入、固定发布commit/tree、新eval版本均null；现有live为S1.boss-calibration11。
这是合入现场阻塞，无需Roy重新批准。未执行保存刷新/预检/自己的合并或合后测试，
以免破坏他人合并；没有本批合入可回退。解除后仍按原锁内完整流程保存刷新、查重叠、预检、
合入固定源、合后自测，失败只回退自己的合入、保留原刷新，通过才登记唯一版本和双通知。
账本复用silent-0408（fight/proposed），仅经CLI补本批核验与来源，不重复新建发现、不标shipped。
code_proposals=[]、implementation_domains=[]：本批仅幂等工具核验，未改combat/potion/sl/terminal/structure规则。
完整外部检查交实际发布后的调度器；未发布故不造版本或通知规则已上线。

定期入口与事件：agent/tools/boss-sim/refresh-silent.py，ops/learner_jobs.py:calibration_job，
每小时:13/:43及learner完成事件检查；升阶或累计20个新实际boss结局触发，SL截断不计。
来源、完整逐boss可信表/不足场数、提取/切分/拟合/残差报告及全部来源清单如下；
最终记录提交与CLI回执见本scratch/result.json、record-commit.txt、ledger-update.json。
