# 静默 A10 普通蛇咬的赌徒替换消费修正

本批：20261012-104302-strategy-proposal；来源任务：20261012-101301-postmortem；实现任务：strategy-proposal。授权 Roy-2026-10-07-learning。普通批次 reason=tick，无 research_request / implementation_request / proposal_ids / proposal_repair；根 deck-size 请求绑定另一批，不承接专题。初始工作树干净，git merge --no-edit main 返回 Already up to date；base=e4ae8046c7d776882b9b9382a408df4e851d04e7。

沿用既有 CLI 提案 silent-proposal-54bd844abc57bb62，不另建重复 id。原文在 /home/dw/Projects/agent-sts2/learner/runs/20261012-101301-postmortem/poison-discard-proposal.md。本次本角色原帧支持账本 silent-0425；原提案另关联 silent-0220 和早期6D0M76419BU7，均保留原文，本批不据此扩大实施范围。

## 身份和证据

派发的十局在 logs/runs.jsonl 均为 SILENT、实际 A10；调度键 silent:A11:238 不能当实盘 A11。只深入 CMS8QL9E3C5U，不冒称十局都验证了结论。

- CMS8QL9E3C5U A10 F19T1：d357514 饮赌徒特酿；s367870 两蛇咬均普通版、2费、可打、文本保留/7毒，玩家7能量。d357515 先弃进阶之灾；s367872 剩余选项6张，选项索引4已是蛇咬，combat.hand索引4仍是进阶之灾。d357516、357517 均自动选索引3，理由 no value this turn；s367873剩一蛇咬，s367874蛇咬已全被选择，d357518确认，s367875实际手牌无蛇咬。
- F17T1：d357454，s367809→367810，普通蛇咬使目标毒0→7，目标HP233不变，能量3→1。F19T5：d357540，s367896→367897，目标毒0→7，目标HP39不变，能量3→1。F17为较早机制校验，F19为消费者复现和同场后续对照；同一局不是独立样本。
- 原帧从上次复盘提供的偏移逐字回读根logs，17条全部一致；每条原始byte offset/长度/SHA保存evidence-verification.json。固定夹具保存原始state及动作。未使用刷新知识或网络。

## 旧规则与新行为

旧：discardPick用thisTurnScore的直伤、格挡等总分推断无价值；当前该分数不读取poison，2费普通蛇咬得-4，未提供Jev选择即自动弃牌。

新：仅静默A10、同战同轮赌徒特酿打开的可选替换界面，在旧自动候选恰为已观察普通2费7毒蛇咬且有足够能量、原手牌可打和合法单一存活目标时，回到现有Jev选择器。显示全部剩余选项、确认选项、每张牌原文/费用、当前血挡能量和敌人状态；蛇咬另列7毒、当步HP直伤0、弃后剩余同效果蛇咬数和长期血价未知。所有选项并列，不加毒权重、不强制保留、不删弃牌选项。

只接受无玩家powers/无敌powers的已见无阻挡范围。升级、改变费用/变量/文本、未知副本、未知来源、未观察进阶及其他角色仍走旧路。状态/诅咒自动弃牌、已有显式计划弃牌子集与已无蛇咬后的确认均保持。选择索引重排时按完整效果签名核对原手牌；相同副本必须都可打且目标一致，不按card_id猜物理UID。确认后继续原真实手牌重算流程。

文件：agent/src/hand/screens/selection.ts（原入口接线）；silent-snakebite-discard.ts（有限条件和题面）；tests/silent-snakebite-discard.test.ts、silent-snakebite-discard-evidence.json（固定原帧验证）。未修改thisTurnScore及共享求解规则。

## 反例、未知和预期影响

本局F19T5还会再拿到并实际打出蛇咬，证明弃牌不等永久丢失；两张保留会改变替换结果与后继，没有保留两张的受控实打，不能宣称追回F19的46血损或改变F23终局胜负。无参数拟合，不把同局两窗口当时间外验证。此次只修正自动宣告无效果；自然Jev采用、伤害/胜率收益待新silent/A10对局按完整饮药→选择→确认→重算→实际结果检验。其他纯施毒牌、升级、带阻挡或额外触发组合不外推。

## 验证和回退

固定测试20例通过；撤去selection入口修正，3例失败/17例通过；恢复原字节，20例通过。涵盖两次原误弃、索引重排、全部选项resolve、确认、缺回答不代选、旧显式计划/诅咒行为，以及角色/进阶/升级/可支付/可打/目标/副本身份边界。

完整沙箱自测、gitleaks、源码commit、合入和版本结果见同目录report.md；未完成前不记上线。实际上线后回退仅revert本次源码提交及版本记录，保留日志/账本/提案历史。若live预检冲突，保留源提交交运维集成，不覆盖并行记录。
