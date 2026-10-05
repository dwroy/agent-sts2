# 修复批次20261005-112812及完整检查回报

核对时间：2026-10-05 12:09 CST。

- 本批完成回报exit0；固定最终live发布00e809f408d3d218b19eb8749340a1d13fe16ce5，版本S1.fix12/S1.fix13。五个源提交均已核实为live祖先：e78352f784d39cf25671446348daaada6ef2060b, 3cd9fc6c6b6bfa378508f7bd5ca2219c1088ad39, e3e7068b028e9d9bb75441b99a973161e9d90f4d, ed86d537bc1d6f91364abb77156060edb13ab4ba, 166594ed6b0a0fb206a6cee40bfb208da142d5f1。main只集成这一不可变已完成提交，保留全部运维记录和经验.13；不合移动codex-dev/live分支头、不操作正在运行的后续工作树。
- S1.fix12：potion-cost测试的数据/角色/时钟隔离，保留原断言和药水实现；计算下注silent-0081、涂毒silent-0082以及动作清单复验上线。第一阶段源/合后tsc0、166文件1959用例exit0。
- S1.fix13：学习者按9YBKCNBFP0X5 A4 F25/F48第6次T5—T9证据修复毒雾与头骨后续触发缺口silent-0086；能力仍3，仅相应毒雾触发额外1。源/合后tsc0、167文件1961用例exit0，未重跑；机制0087保留已有经验S1.exp13状态，不另当新bug登记。
- 原两批失败及回退仍保留；本批先修固定测试依赖，再合模型和动作说明，未放宽断言、增排除或修改药水打法。旧step061d1ca9整枝合并/旧部署脚本仍不能重跑，待办已由ed86d537固定差异实际合入替代。
- 本轮learner-checks属于经验20261005-112812-experience-update：实际固定提交72a6784f97c7feedcb6b305b79052dab2d5144cf，树61998977d445ec424bae20b0adff3c225de9118d；完整tsc/vitest exit0，218文件2769通过/2跳过，日志ops/codex-ops/learner/20261005-112812-experience-update.fallback-61998977d445ec424bae20b0adff3c225de9118d.checks.log。该树包含上述五个修复源，本轮集成代码/知识blob已与该固定树逐路径核对等同；复用有效检查，不重复运行。fix-batch独立外部完成事件尚未在本轮收到，按其后续事件归档。
- 本批3条proposed及运维3条shipped追加归档；0081/0082→S1.fix12，0086→S1.fix13，check：/home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 92 item(s), 0 problem(s)。不改游戏知识、经验正文、SL配置；只登记学习者结果。
- 报告列为需Dai的策略项已有Dai08:33决定及策略提案任务授权，保留给学习者任务推进，不重复索取授权或由运维提供机制/打法。根因证据不足、离线不能实测与性能专项项保留原队列，没有本轮新增可操作的Dai待定事项。

## fix-batch 独立完整检查完成

核对时间：2026-10-05 12:14 CST。12:13 调度器事件确认本批 `20261005-112812-fix-batch` 沙箱外完整 tsc + vitest exit 0；固定 live `72a6784f97c7feedcb6b305b79052dab2d5144cf`，树 `61998977d445ec424bae20b0adff3c225de9118d`，已核对为 live 祖先及匹配树。218 文件通过，2769 用例通过、2 跳过（总 2771）；开始 12:06:15，耗时 460.12 秒。日志：`ops/codex-ops/learner/20261005-112812-fix-batch.fallback-61998977d445ec424bae20b0adff3c225de9118d.checks.log`。这是本批独立补测，保留上节当时尚未收到事件的历史，与经验批次检查分别归档；补测待办完成，已有版本及 shipped 登记不重复更新。
