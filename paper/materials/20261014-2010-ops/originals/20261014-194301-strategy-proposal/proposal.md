# 静默 A10：余像附魔的独立即时 3 挡

本批为普通 strategy-proposal：20261014-194301-strategy-proposal，工作树 codex-strategy-silent-20261014-194301。派发未带 proposal_ids、proposal_repair、research_request 或 implementation_request，reason=tick；牌数专题绑定另一个批次，不适用。开工 HEAD/main 均为 9199bf7ae5162c772de053e162955aad6f7b9a6a，git merge --no-edit main 返回 Already up to date。十个派发局均在 runs.jsonl 核实为 SILENT/A10，不能以派发 key 的 A11 宣称本批观察过 A11。

选择既有待定提案 silent-proposal-0137566a28b900e1，原文与原 ID 保留，不建立重复 ID。来源复盘 20261014-094303-postmortem，既有学习账本 silent-0467、silent-0468。当前实现任务为本批 strategy-proposal，涉及 combat/sl/terminal 的共同求解输入；只修数值模型，不改变这些领域的策略阈值。

## 证据与旧行为

证据局 6ZGMGEQ5YDVK，A10。F37T1：s398960→s398961，余像+当步玩家格挡 10→20；F39 第二试 T1：s399084→s399085 同样 10→20；F45 首试 T1：s399207→s399208 同样 10→20，后续打击、偏折+、带毒刺击到 s399211 为 30 挡。F39 d387142 完整三步原报新增 9，实新增 12；F45 d387236 完整四步原报新增 17，实新增 20。三个窗口均为同局样本，不当三个独立实验。

原始行通过旧索引的 offset/bytes/SHA 从只读 logs 重新取回，身份均为本局；11 行及原字节索引保存 selected-original-evidence.json。当前统一提取入口另冻结本批十局六流及逐行身份/offset/bytes/SHA，输出 evidence/evidence-manifest.json；提取范围大于实际研究范围，不把全部提取局冒称本机制支持局。

精确牌面：AFTERIMAGE、升级、1 费、Self、0 星费；rules_text 为余像逐牌效果；resolved_rules_text 为「固有。你每打出一张牌，都获得1点格挡。获得3点格挡。」；唯一动态值 AfterimagePower 的 base/current/enchanted 均为 1，无 Block。旧模型即时 block=0，既有永冻首次能力 7 挡已计算，余像后续逐牌 1 挡也已计算；缺的是独立 3 挡，不能把永冻常量改成 10，也不能把余像自身算一次逐牌触发。

## 实现边界与预期行为

card-model 对 silent/A10 的精确上述签名添加独立效果标记，保持原 block 和 afterImage 字段含义。turn-solver 在实际打牌时复核：单次手动、实付 1 费、首次永冻 7 挡尚可用、原余像为 0、无敏捷变化/脆弱/影遁/坚不可摧/无法格挡/暴怒反伤式格挡触发/柔嫩。通过时将本次独立 3 挡送入既有格挡结算，永冻仍给 7，后续每牌仍给 1。该求解结果和保留标记沿现有 rollout 使用，不重设永冻。

未观察交互保留旧数值并添加「附魔格挡交互未验证」。无附魔、显式 Block 动态值、别的牌文/数值、其他角色或未观察进阶不获得此标记；显式 Block 不再重复加 3。未出余像的线不补挡。只消除已确认的数值差额，不删合法选项、不改 HP 护栏、药价、SL 次数/触发、终局权重或其他角色行为。

## 反例、未知、拟合与切分

F45 原总挡 27 与实 30 都足以抵住当轮 24 攻，不能称额外 3 挡必然省血或能救整局。F39 原血损与直接伤害并未因此变化；末试未出余像不能补这 3 挡。没有不持永冻、已有余像、敏捷/脆弱/重放等组合的独立实盘，本次明确不推广。没有受控整战反事实或修后自然消费者结果，不宣称提高胜率。

不拟合参数或权重。F37/F39 为数值来源，F45 为同局后段留出，仍非独立局外验证。后续新完局自然出现同签名后，再核玩家资源、候选实际执行及结果；本次不更新经验库或冒称大脑已采用。

## 验证与回退

固定三个原始状态保存 agent/tests/silent-enchanted-afterimage-state.json；静态知识只由这些状态的本局牌表构造。通过实际 planCombatTurn 捕获 SolverInput，再 replaySteps 验证即时 10、完整 12/20；另核无附魔/未施放/其他角色等级/显式 Block/未观察修饰/重放及后续回合保留与消耗首次永冻。后续回合用固定合成敌人验证传播，不当本局整战校准或实际胜负。

源码撤去的固定回归为 exit 1，6 失败/2 通过；恢复为 exit 0，8 通过。完整检查及合入状态以 report.md 为准。旧源码逐字节保存为 card-model.before.txt、turn-solver.before.txt，不在 scratch 放可执行 TS。回退只撤本次两个源码增量及对应固定夹具，保留既有永冻/余像模型、原日志/账本/提案和失败记录。实际部署成功才由 ops 核号并登记 shipped；未合入时不造发布版本。
