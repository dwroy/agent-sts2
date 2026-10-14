静默猎手策略学习最终回报

记录时间：2026-10-14T13:26:25+08:00；批次：20261014-124302-s2-strategy-proposal。

结果：完成三局证据及十个领取提案的逐项核验，找到并实现普通磨蚀候选输入遗漏；源码自测通过并提交，但live锁内完整分支合入预检有16个共享记录冲突，未合入。十个原父提案均继续waiting；新窄提案silent-proposal-d5c29f064f510af4为pending、账本silent-0470为proposed。没有上线号、shipped、经验库变更、自然局采用或收益声称。

基线 40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57，源码提交 d06acd4bcbf2c64608197b7d7b2e572c621bec61。git merge --no-edit main 在开工时已返回Already up to date；实际HEAD是该源码提交，其父等于基线，工作树干净。普通批次没有专题或实现请求绑定；只核本批十原ID，不领取其他队列。根notes/strategy-research-silent.json绑定另一个批次，专题条件不成立，不套纯研究口径。

本次源码只改card-model.ts及两个固定测试文件。普通磨蚀窄条件只适用于silent A10、普通Power、自目标、3费、无附魔、现场普通模板及动态量1/4。旧模型没有dexterity/thorns字段；新模型向既有求解及后继模拟传1敏/4荆棘，不倒补已有挡，后继合法挡牌才兑现敏捷。一般Power参考值及护栏、药水、SL、终局权重保持。其他角色与未观察等级、升级/费用/数值分支的旧行为通过固定控制核验；未修改角色知识或生成脚本。

证据：MTQ0EUBJ3R6T F20T3，states288760→288761→288762→288763。42HP/4能/0挡施普通磨蚀后建DEXTERITY_POWER1、THORNS_POWER4，HP及旧挡不变；随后毒雾建2、用尽4能，对现场19攻击仍实损19到23。敌已有8毒/37挡，净扣、反伤参考与挡吸收分账，不当单卡胜率因果。账本silent-0044是既有机制；新实现账本silent-0470只登记这个候选接口遗漏。原十四机制父提案silent-proposal-763a4b9d9f17b815仍未完成。完整提案、原反例、未知、回退见proposal.md和冻结的proposal-abrasive.md。

撤源码验证：最终五项夹具中，撤映射后exit1，4失败/1通过；恢复exit0，5通过。验证卡字段、不倒补旧挡、后继防御兑现1敏、两种rollout路径持久属性，以及其他角色/等级/升级/费用/值的旧分支。第一次测试将原卡index误当数组位置导致replay null，之后改用原卡index；原red与首green失败日志保留。测试不依赖刷新JSON，不调LLM、网络或游戏。

完整沙箱入口：agent目录中PATH含本地node、TMPDIR为本批scratch、SANDBOX_WORKERS=1，bash tools/test-sandbox.sh最终exit0。tsc0；主vitest389文件/3810例通过，1002.16秒；单独paths1文件/11例通过，合计3821例。单次完整入口成功，没有超时重跑；固定排除由仓库脚本规定，宿主完整套件和合后测试均未运行。本批既有消费者的41项原帧事实读回不能混作源码测试。

安全扫描：提交前staged gitleaks实际exit0，269100字节无发现；本批scratch扫描143074331字节exit0，无发现。提交只含三个源码/测试叶；使用全局Git身份及真实Codex gpt-6.1-sol Co-Authored-By，不推送、不运行play、不改配置、prompt、凭据或游戏文件。

live实际检查：在ops/live-merge.lock内，针对源码提交执行merge-tree预检，exit1；前后live HEAD均为093c68ac658980f53b9940756b3df925adfb49bb，source_is_live_ancestor=false。源码没有knowledge路径，刷新知识与源码路径无重叠；在发现共享记录冲突后提前停止，未提交无关刷新、未执行实际git merge、未覆盖记录或知识，也没有合后检查、eval版本、decision-log上线行或Roy双上线通知。完整清单与原输出见live-merge-preflight.json / .txt。冲突文件如下：

- notes/fix-queue-v4.md
- notes/lessons.md
- ops/inbox-dev.md
- paper/data/README.md
- paper/data/commits.csv
- paper/data/cost-curve-silent.csv
- paper/data/cost-silent.csv
- paper/data/cost-sources.json
- paper/data/cost-unattributed.csv
- paper/data/decisions_by_label.csv
- paper/data/learning-curve-silent.csv
- paper/data/runs.csv
- paper/data/summary.json
- paper/data/verification.json
- paper/materials/decision-log.md
- paper/materials/learning/ledger.jsonl

运维兜底材料：实际源码提交d06acd4bcbf2c64608197b7d7b2e572c621bec61、源父40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57、source-candidate.json中三文件SHA、abrasive-source.patch、原字节夹具和完整沙箱日志均保留。合入未发生，不能用本分支提交冒称实际live源码祖先。后续由运维按原流程集成并补验、分配发布号、双通知与登记shipped；本报告不预先关闭父项或代填送达/消费者采用。

三局均从runs.jsonl核SILENT/A10，原运行code+dirty，不能重建完整当时树。已冻结1521状态、1456决策、14SL、3配置、89脑回答，共3083原行，全部按原offset/length/SHA核回。run-plans.jsonl没有这三局独立记录，不补造。KFR的一条map/route-change元数据没有decision_id，保留原文和排除原因；现有消费者只接1455有身份决策。

消费者读回：367候选片段、416可见相邻端点、249轮窗口中的50可核端点/199未知；完整候选实果全部null。MTQ0 F11 plan6→plan1候选血价14→6、伤14→16，弃牌后重问实际敌净扣20不能归原线；F23换线伤13→19/血价0→8，首三试T6预测截断与末T5实死分列。KFR F12护栏生成小刀后重问，完整候选0损不归后来实际6损；F33两试T6同15血/敌228/36毒/3覆甲，敌扣83→93、损6→12，两线仍败。奇巧所选爆发有余能但三牌满后锁住，毒药37→43当步不扣本体，末两结85后敌残74。这些证据支持资源事实和窄模型，不支持新的SL/药水权重或整战胜率。

逐项处置（等待理由保持具体，既有局部实现不当整项duplicate）：

| 派发ID | 状态 | 原因 |
| --- | --- | --- |
| silent-proposal-0802f69b28d25079 | waiting | MTQ0 F23T3换线净多伤6、多损8，前三试T6预测截断与末试T5实死分别保留；已有候选审计，缺完整实线可比排名、同条件整战反事实及时间后留出，不拟合SL/药水门槛。 |
| silent-proposal-f54e8de2381c1250 | waiting | 既有live离线消费者已关联MTQ0 F11T1 plan6到plan1及弃牌后的重问断点；实际6损/20扣属于后继不同线，完整候选实果及实际最优排名仍null，不能整项duplicate。 |
| silent-proposal-763a4b9d9f17b815 | waiting | 普通蛇咬8毒已在实际live祖先d385591f37cf2d09a032e3d3b998c4ff5ee5636e，本批另补普通磨蚀1敏/4荆棘窄子项；十四项联合消费者回放及头骨直接施毒/药水未知修饰条件尚未验全，父提案不关闭。 |
| silent-proposal-19a5cff2094e2d8f | waiting | 阶段/暂死重接及候选终局子项已有；7X0 F31完整身份接续、修正输入到实终局的联合校准和整战反事实不足，全败预测不能当实际必死或替线更安全。 |
| silent-proposal-3540bf4360bf80af | waiting | MTQ0/7X0跨幕回复和赢战耗血已核，HP增加观测子项已有；所有分源资源进入路线/休息消费者的完整读回和替路线结果不足，不改安全血线。 |
| silent-proposal-0ea5c0b9c030fdd6 | waiting | 奇巧名额/能量提示与知识恶魔毒药+6已在live祖先8bb53d6342b7e9a2adf96de231b53c36eaa943de；continuation_verified仍false，缺完整合法后继、替对象和提前用药整战对照。 |
| silent-proposal-f915ec544ab94b6e | waiting | KFR F33T6两试同15血/228敌/36毒/3覆甲，换线多伤10、多损6且均败；F12护栏生成小刀后重问，完整候选实果仍null，缺同种子整战校准，不调SL权重。 |
| silent-proposal-8fb51933639faf90 | waiting | 本局窄毒药+6已覆盖，敏捷2/触媒1现场结算已核；七项联合验证、覆甲完整减层触发与未知修饰条件仍不足，不能整包duplicate。 |
| silent-proposal-b3bc0eb09211af6c | waiting | 已有奇巧条件、SL候选比较及终局观测子项；尚缺合法后继到实际终结全链和替对象/顺序/提前饮毒的完整反事实，截断不补结毒，不改严格必死规则。 |
| silent-proposal-fdc3a505fe5e1a55 | waiting | KFR F29回血及F30/F31赢战消耗、F32实休至36/F33就绪38已核；尚缺分源路线/休息消费者对照及替路线/回血对锻造受控整战，不改阈值。 |

已有源码核验保存在source-verification.json：17叶中12叶base/live blob相同、5叶不同，各叶实际live祖先提交已核；不把局部相同泛称整树等价。普通蛇咬8毒已实际补齐，旧理由已更新。原十份提案Markdown SHA与队列一致，完整角色/证据/账本/来源路径留在queue-selected.json与queue-history.json。

账本闭环：先CLI新增silent-0470 proposed及真实窄代码提案silent-proposal-d5c29f064f510af4；随后CLI对31既有账本和新条目追加32行。原31条claim/evidence/first_run/prior/status/version逐项前后相同，29旧shipped/2旧proposed含义保留；新条目仍proposed、源码commit和阻塞真实登记，未标shipped。物理行offset/length/SHA及读回见ledger-update-readback.json。未直接改队列或账本，未覆盖原提案Markdown，未重复写复盘。

限制与结论变化：十四机制联合回放、头骨/药水未知修饰、完整后继、覆甲完整减层条件、完整候选实际最优、同条件整战反事实和独立留出仍不足。先判定十父项待证，进一步核具体模型后发现普通磨蚀漏传1/4，遂补窄子项；单子项不关闭宽父请求。初探测共享日志格式误输出其他角色首行，已排除、不用于结论；之后只按三锚点字节筛选并逐帧核角色。首次仅读队列末事件造成缺原字段，按add/update折叠及SHA核实纠正，原诊断保留。前次commentary冲突计数17有误，实际两次预检清单均16。

实际原生线程01a138b9-11b4-7292-b4dd-bf5127a3d886为gpt-6.1-sol/xhigh/workspace-write/never，启动器服务档default；未将题面high偏好冒称实际high，未改会话参数或降低强度。没有下级agent，也不删除仍运行的自身工作树或失败材料。

最终JSON：

```json
{
  "task": "strategy-proposal",
  "character": "silent",
  "batch": "20261014-124302-s2-strategy-proposal",
  "base": "40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57",
  "runs": [
    "MTQ0EUBJ3R6T",
    "7X0W3U8TVA2A",
    "KFRDELW2TH2P"
  ],
  "fixes": [
    {
      "id": "silent-proposal-d5c29f064f510af4",
      "parent_proposal": "silent-proposal-763a4b9d9f17b815",
      "summary": "静默A10普通磨蚀1敏捷/4荆棘预览传入既有求解和后继消费者；保留旧Power参考值及条件外行为。",
      "ledger": [
        "silent-0470",
        "silent-0044"
      ],
      "run": "MTQ0EUBJ3R6T",
      "floor": 20,
      "turn": 3,
      "commit": "d06acd4bcbf2c64608197b7d7b2e572c621bec61",
      "source_parent": "40d6bc976cf7ffeae28a72a7e0b47d71cadc7d57"
    }
  ],
  "skipped": [],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 0
  },
  "code_proposals": [
    "silent-proposal-0802f69b28d25079",
    "silent-proposal-f54e8de2381c1250",
    "silent-proposal-763a4b9d9f17b815",
    "silent-proposal-19a5cff2094e2d8f",
    "silent-proposal-3540bf4360bf80af",
    "silent-proposal-0ea5c0b9c030fdd6",
    "silent-proposal-f915ec544ab94b6e",
    "silent-proposal-8fb51933639faf90",
    "silent-proposal-b3bc0eb09211af6c",
    "silent-proposal-fdc3a505fe5e1a55",
    "silent-proposal-d5c29f064f510af4"
  ],
  "implementation_domains": [
    "combat"
  ],
  "proposal_results": [
    {
      "id": "silent-proposal-0802f69b28d25079",
      "state": "waiting",
      "reason": "MTQ0 F23T3换线净多伤6、多损8，前三试T6预测截断与末试T5实死分别保留；已有候选审计，缺完整实线可比排名、同条件整战反事实及时间后留出，不拟合SL/药水门槛。"
    },
    {
      "id": "silent-proposal-f54e8de2381c1250",
      "state": "waiting",
      "reason": "既有live离线消费者已关联MTQ0 F11T1 plan6到plan1及弃牌后的重问断点；实际6损/20扣属于后继不同线，完整候选实果及实际最优排名仍null，不能整项duplicate。"
    },
    {
      "id": "silent-proposal-763a4b9d9f17b815",
      "state": "waiting",
      "reason": "普通蛇咬8毒已在实际live祖先d385591f37cf2d09a032e3d3b998c4ff5ee5636e，本批另补普通磨蚀1敏/4荆棘窄子项；十四项联合消费者回放及头骨直接施毒/药水未知修饰条件尚未验全，父提案不关闭。"
    },
    {
      "id": "silent-proposal-19a5cff2094e2d8f",
      "state": "waiting",
      "reason": "阶段/暂死重接及候选终局子项已有；7X0 F31完整身份接续、修正输入到实终局的联合校准和整战反事实不足，全败预测不能当实际必死或替线更安全。"
    },
    {
      "id": "silent-proposal-3540bf4360bf80af",
      "state": "waiting",
      "reason": "MTQ0/7X0跨幕回复和赢战耗血已核，HP增加观测子项已有；所有分源资源进入路线/休息消费者的完整读回和替路线结果不足，不改安全血线。"
    },
    {
      "id": "silent-proposal-0ea5c0b9c030fdd6",
      "state": "waiting",
      "reason": "奇巧名额/能量提示与知识恶魔毒药+6已在live祖先8bb53d6342b7e9a2adf96de231b53c36eaa943de；continuation_verified仍false，缺完整合法后继、替对象和提前用药整战对照。"
    },
    {
      "id": "silent-proposal-f915ec544ab94b6e",
      "state": "waiting",
      "reason": "KFR F33T6两试同15血/228敌/36毒/3覆甲，换线多伤10、多损6且均败；F12护栏生成小刀后重问，完整候选实果仍null，缺同种子整战校准，不调SL权重。"
    },
    {
      "id": "silent-proposal-8fb51933639faf90",
      "state": "waiting",
      "reason": "本局窄毒药+6已覆盖，敏捷2/触媒1现场结算已核；七项联合验证、覆甲完整减层触发与未知修饰条件仍不足，不能整包duplicate。"
    },
    {
      "id": "silent-proposal-b3bc0eb09211af6c",
      "state": "waiting",
      "reason": "已有奇巧条件、SL候选比较及终局观测子项；尚缺合法后继到实际终结全链和替对象/顺序/提前饮毒的完整反事实，截断不补结毒，不改严格必死规则。"
    },
    {
      "id": "silent-proposal-fdc3a505fe5e1a55",
      "state": "waiting",
      "reason": "KFR F29回血及F30/F31赢战消耗、F32实休至36/F33就绪38已核；尚缺分源路线/休息消费者对照及替路线/回血对锻造受控整战，不改阈值。"
    }
  ],
  "report": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-124302-s2/learner/runs/20261014-124329-strategy-proposal/report.md",
  "proposal": "/home/dw/Projects/agent-sts2/.worktrees/codex-strategy-silent-20261014-124302-s2/learner/runs/20261014-124329-strategy-proposal/proposal.md",
  "version": null,
  "shipped": false,
  "withdrawn_source": {
    "exit": 1,
    "failed": 4,
    "passed": 1
  },
  "restored_source": {
    "exit": 0,
    "passed": 5
  },
  "sandbox_checks": {
    "exit": 0,
    "test_files": 389,
    "cases": 3810,
    "paths_files": 1,
    "paths_cases": 11,
    "workers": 1,
    "main_suite_seconds": 1002.16
  },
  "live_merge_blocked": {
    "stage": "locked_preflight",
    "live_head": "093c68ac658980f53b9940756b3df925adfb49bb",
    "source_is_live_ancestor": false,
    "actual_merge_executed": false,
    "conflicts": [
      "notes/fix-queue-v4.md",
      "notes/lessons.md",
      "ops/inbox-dev.md",
      "paper/data/README.md",
      "paper/data/commits.csv",
      "paper/data/cost-curve-silent.csv",
      "paper/data/cost-silent.csv",
      "paper/data/cost-sources.json",
      "paper/data/cost-unattributed.csv",
      "paper/data/decisions_by_label.csv",
      "paper/data/learning-curve-silent.csv",
      "paper/data/runs.csv",
      "paper/data/summary.json",
      "paper/data/verification.json",
      "paper/materials/decision-log.md",
      "paper/materials/learning/ledger.jsonl"
    ]
  },
  "new_proposal_state": "pending",
  "new_ledger_status": "proposed"
}
```
