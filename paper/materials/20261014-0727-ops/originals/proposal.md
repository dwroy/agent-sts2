# 本批十项静默猎手策略提案核查与有界实现

本批：20261014-054301-strategy-proposal；来源任务与原提案保持，当前实现任务 strategy-proposal。基线 2f739c28ca61513bd0baf14a2e84867ed99c2f3d；普通队列，非手动专题。已核 learn.json 的 character、worktree、十 proposal_ids，main 合并为 Already up to date。

## 有界实现：普通蛇咬与异蛇头骨

原 ID silent-proposal-e09a3905a3922b95，账本 silent-0087，来源 20261008-044302-postmortem。证据 7X0W3U8TVA2A A10 F17T3 的无头骨动态 7/7/7；F31T1、T13 的普通蛇咬 base7/current8/enchanted7，分别实使前段零毒→8（states 288402→288405、288467→288470）。T13前段12→4，是8毒结算，不是9毒。原提案SHA与编号不变。

旧行为：生产手牌入口只认普通动态7，当前8未建模；离手牌使用基础7。新行为：仅已观察静默A10、完整八遗物集合、已见玩家状态、未附魔普通2费蛇咬的精确模板和动态值，手牌读取已含头骨的8；牌组/抽弃堆从基础7得到组合总量8。不给8再加1，不扩展升级蛇咬、其他角色、进阶、未知遗物/能力/附魔或牌堆修改。

反例与未知：同局末战失败不能证明8毒足够通关；T1的弃牌/整轮37净扣另有因素，不把全部误差归蛇咬。不改变SL、药价、终局排序或固定出牌序。只有一个独立局，T13为同局保留验证，非独立留出；不拟合任何权重。

验证：固定七帧取自原静默复盘的 states-numbered.jsonl，逐帧核 run_id/character/A10，并保存原行SHA与行号。冻结知识输入并阻断生成知识JSON读取。生产planCombatTurn捕获实际SolverInput；另核牌组、抽/弃堆与两轮重抽结算，撤源码后必须失败，恢复后通过。未知组合与铁甲保持原模型；每次提交前跑原沙箱套件。回退为逆向本项独立提交，保留全部证据。预期只补已观察毒数值，无通关收益结论。

## 有界实现：异蛇头骨组合毒药水

原 ID silent-proposal-292f6731bdb9b669，账本 silent-0087、silent-0020，来源同一复盘。证据 7X0W3U8TVA2A A10 F31T13，decisions 282021；states 288470→288471 后段零毒→7且HP不变；288472后段25→18，前段12→4、中段接续25，玩家仍死。只有一次真实饮用，不拟早喝/持有价。

旧行为：observedPoison已有窄入口但本组合不覆盖，保留独立饮用选项。拟议新行为：同一已观察完整组合的末轮无可打手牌、零能量、只有槽0单瓶毒药条件下，对已见后段零毒/无人工制品及已见增益条件提供组合总量7，保留其他目标的未知独立饮用选项。更早回合与牌共同作用、同目标叠毒或多瓶仍未验证，保留原未知分支，不把末轮子实现关闭完整宽项。不从7拆推基础药效或通用头骨加成；不改药价，未知仍未知。不把有7毒等同活过末轮，未喝早期反事实不当真实胜线。

验证：生产入口的7毒候选与无药候选、合法独立饮药选项同时保留；部分目标已建模不将整瓶药视为所有目标已建模，末轮无可打手牌且全数候选致死仍向Jev并列展示已测效果与未知目标；精确末轮回放仍18后段HP、玩家死亡。未知修饰/有毒或人工制品目标走旧未知分支。撤码失败/恢复通过、原沙箱检查后单独提交。回退逆向本项提交。

## 合入边界

首次只读 git merge-tree --write-tree HEAD live 退出1，发现15个既有记录文件冲突，详见 live-preflight.txt；未修改live/知识刷新/原历史。最终稳定只读预检冲突已为0，但三次55秒未取得合并锁；两项候选已本分支提交/自测，未实际上线。只完成本工作树的有界实现和验证，合入前重新核实时HEAD及冲突，不擅自解决只读记录。未实际live合入的候选不得登记implemented/duplicate/shipped、发版本或规则上线通知。

## 其他八项：范围、反例与待验证缺口

### silent-proposal-03754e1265894000

账本：silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253；证据：RC61MFQM63Y6。

RC61MFQM63Y6 F17T2/T11、F23T3/T4、F29T3/T4、F33T1/T4支持逐牌属性、折扇与首刀局部效果；缺八组件联合消费者回放、首刀/被动挡事件归属。完整dirty树未知；整战败不能反驳已见局部效果，不能仅凭已有文本关闭整项。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-e5ea36df117ca9b7

账本：silent-0164；证据：XTSV1U9JD34T。

XTSV1U9JD34T F49T1首个稳定可行动状态只有不可打牌/3能量/16挡；接管内部动作和耗能轨迹未记录，未发现当前题面确定误述。持耳环的F35/F39/F45/F46获胜，不支持禁取遗物或推断自由启动顺序。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-ab055ef7dfbb44e5

账本：silent-0140,silent-0069,silent-0005,silent-0206；证据：XTSV1U9JD34T。

XTSV1U9JD34T F49T1幽灵一层已有窄实现；末T4夜魇建立三复制后死亡，次轮未兑现。缺夜魇收益存活条件的联合消费者验证和延后饮药整战对照，T1实零损是已兑现收益，不能凭六次同局失败认定必须晚喝。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-0129c465c6f5bd79

账本：silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271；证据：BTSRF7JL1W1Y,XTSV1U9JD34T。

BTSRF7JL1W1Y F31T2强制弃唯一后继牌，XTSV1U9JD34T F48T8毒胜仍凋萎耗9血、F49T4复制未兑现；窄弃牌/保血实现不覆盖接管内部顺序、复制次轮及同条件SL整战，缺完整联合回放。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-abe9d5d0be109a9f

账本：silent-0019,silent-0020；证据：BTSRF7JL1W1Y,XTSV1U9JD34T。

BTSRF7JL1W1Y F30赢70→42，F31入42；XTSV1U9JD34T F47满97、F48赢97→23直F49。缺同资源改线/留药/锻造完整后继及路线/休息/SL分源联合消费者，不能拟安全血线。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-f16527e59b5cc1e0

账本：silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241；证据：BTSRF7JL1W1Y,XTSV1U9JD34T。

BTSRF7JL1W1Y F31T2牌挡/覆甲与临时减力，XTSV1U9JD34T F49T1/T3/T4幽灵/钳子/敏捷局部帧支持；缺整轮多组件联合回放及延后幽灵同条件对照，不拟用药时机或药价。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-7a8e9ccb7e646538

账本：silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221；证据：9Z9H2EXKLF3T。

9Z9H2EXKLF3T F48末试T10预计余血−9而实18→3/37挡，T11毒77与荆棘3后残32；缺原dirty完整源码、逐击毛伤/持牌伤/复活/截断归属。24/24全败是有限推演，不能证明必死或设新SL阈值。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

### silent-proposal-cd9f76184de6e29a

账本：silent-0019,silent-0020,silent-0243；证据：HMVJKM56S4Q8,F4QKG4J1AJJZ,G403VCZ3BH1B,25226ZFLNR1J,JLN5SK17W4FQ,JMH5C51RLN4E,9TG1RP5LFAAK,JQPT83P8KDSZ,S9UZAK0JP0C0,9Z9H2EXKLF3T。

原十局16对A9/A10跨幕同上限回复支持floor(缺血×80%)；跨幕、营火、赢战耗血、上限改变、SL复药仍须联合消费者验收与同条件路线后继。9Z9H2EXKLF3T F35上限77→69与当前血66→30分源，既有公式不能关闭完整复合范围。

处置 waiting；保留旧行为。验证路径沿原提案固定完整动作/结算/接续输入，未知处继续等新证据，已有子项不冒称整项duplicate。来源Markdown与SHA保存在 dispatched-proposals.json。

