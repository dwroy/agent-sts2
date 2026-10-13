# 静默猎手策略批次报告

任务 strategy-proposal；batch 20261014-054301-strategy-proposal；角色 silent。普通十提案队列，不是专题研究/冻结实现请求；本批未派下级agent。开工干净，main合并Already up to date；完整base：2f739c28ca61513bd0baf14a2e84867ed99c2f3d。实际原生模型gpt-6.1-sol，启动xhigh/default，原thread保留；详见native-runtime.json。

## 结果

完成两项有界源码补丁并分别提交；实际live未合入，merged=null，无版本/上线记录/实际运行采用或shipped。三次各55秒未获得合并锁（首次默认超时exit1，后两次明确exit75）；锁内命令均未执行，未提交刷新数据或修改live源码/记录。

初始只读合并预检存在15个记录冲突（live-preflight.txt）；运维在本批期间推进live后，最终稳定只读预检的live HEAD为30e5cd77bdc740deb3066f0703a766fb6fc8cee2、前后相同，冲突数已为0。后续第3次等待时live已到19b02dcc884825226c193ac1616f0c397f38fae9，锁仍未获得。不能把旧冲突当现存阻塞，也不把只读预检当锁内集成验收。当前具体阻塞为live锁不可得；需运维沿原批接续本两份已测提交。未覆盖历史、未修改知识刷新或原脏统计记录。

## 两项实现与证据

- a7484217e26a24fcbce6e570fb99e524fbc49c4c：silent-proposal-e09a3905a3922b95，账本silent-0087；7X0W3U8TVA2A A10 F31T1/T13：普通蛇咬base7/current8/enchanted7，前段零毒→8；F17T3无头骨当前7作schema控制。只核完整已观察遗物/玩家状态及普通2费模板，手牌8与牌堆基础7分源，牌组/抽弃堆重抽使用组合总8，不重复加1。未观察角色/等级/升级/增益保留原分支。
- b2a30ea6ebadda351fcc345b65b0c0e870bc5d65：silent-proposal-292f6731bdb9b669，账本silent-0087、silent-0020；同局F31T13，decisions282021、states288470→288471→288472：后段零毒→7，立刻HP仍25，结算25→18，玩家1→0。零能量、剩余三牌均不可打、只有槽0毒药、后段无毒/人工制品的已观察条件提供总7。只认证已测目标，保留前段等未知目标独立饮药选项，以及无药/模型线；由Jev选，不自动饮用。更早共用、多瓶、叠毒、持有价与通关收益未知，晚轮子实现不关闭宽项。

七帧固定输入存agent/tests/silent-skull-evidence.json，来源静默原复盘states-numbered的原行SHA/行号，逐帧核角色/进阶/run_id；原MD SHA核实，未改原文或重复复盘。冻结帧十项核验见evidence-verification.json。一个独立局，两次施毒为同局重复观察；T13同局保留验证不冒称独立留出，无权重拟合/完整胜率结论。未用预训练补游戏事实。

## 验证

- 蛇咬撤实现：exit1，3失败/1过；恢复exit0、4过。药水撤实现：exit1、2失败/1过；恢复整个两文件exit0、7过。生产planCombatTurn实际SolverInput和Jev题面检查、原七毒控制、两轮重抽、未知条件/铁甲等价均用固定资料；禁止新测试读取生成知识JSON，无LLM或网络。
- 最终原sandbox脚本：tsc0/vitest0，379文件3618项通过；另外fork路径文件11项通过，共3629。SANDBOX_WORKERS=1，testTimeout=60000；原排除名单、夹具内部30秒限制、显式120秒矩阵限制和生产预算不变。完整宿主套件未跑，交既有调度器后续，不冒称宿主全绿。
- 首轮原默认检查：tsc0/vitest1，376文件过/2失败，3613项过/2超时，630.73秒；原源码单worker重跑：tsc0/vitest1，377文件过/1失败，3614项过/1超时，1367.12秒。均为既有夹具外层超时，无数值断言失败；原件全部保留，未倒写成功。完成第二项源码后重新对最终固定工作区运行全套，外层60秒允许原内部30秒子进程完成。
- 提交前同一最终工作区全套通过，两个独立提交之间未改执行文件；七文件指纹前后相同，实际最终HEAD源码与受测源码一致，不为中间提交树虚报另一次全套。两份staged差异和最终559732字节综合差异的gitleaks均0；git diff --check通过。
- 初次钩子取末次solve输入、初次TMPDIR工作目录错误、药水初稿误判空手及一次sandbox构建ENOENT均见diagnostics.md；失败初稿/日志保留。末轮实为三牌不可打，不是空手，未修改证据迎合测试。

## 原十项处置

- silent-proposal-03754e1265894000 — waiting；账本 silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253；来源局 RC61MFQM63Y6。局部逐牌证据成立，但缺八组件联合消费者回放及首刀/被动挡事件归属；不能用已有经验文本关闭复合提案。
- silent-proposal-e5ea36df117ca9b7 — waiting；账本 silent-0164；来源局 XTSV1U9JD34T。只核首个稳定可行动状态；接管内部动作顺序、耗能轨迹未记录，未定位现题面确定误述。
- silent-proposal-ab055ef7dfbb44e5 — waiting；账本 silent-0140,silent-0069,silent-0005,silent-0206；来源局 XTSV1U9JD34T。幽灵一层已有子实现；夜魇复制收益存活窗口及延后饮药整战对照未齐，不能关闭复合范围。
- silent-proposal-0129c465c6f5bd79 — waiting；账本 silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271；来源局 BTSRF7JL1W1Y,XTSV1U9JD34T。弃牌和毒胜保血有窄实现；接管内部顺序、次轮复制兑现、同条件SL整战及联合消费者尚缺。
- silent-proposal-abe9d5d0be109a9f — waiting；账本 silent-0019,silent-0020；来源局 BTSRF7JL1W1Y,XTSV1U9JD34T。实际前后战资源可追溯；缺同资源改线/留药/锻造完整后继及路线/休息/SL分源联合消费者，不拟安全血线。
- silent-proposal-f16527e59b5cc1e0 — waiting；账本 silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241；来源局 BTSRF7JL1W1Y,XTSV1U9JD34T。局部分源状态支持；缺敏捷/脆弱/覆甲、临时减力、钳子留挡联合回放及延后幽灵同条件对照，不改药价。
- silent-proposal-7a8e9ccb7e646538 — waiting；账本 silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221；来源局 9Z9H2EXKLF3T。末试T10实18→3/37挡仍需原dirty完整源码与逐击毛伤、持牌伤、复活/截断归属；24/24全败不证明必死。
- silent-proposal-cd9f76184de6e29a — waiting；账本 silent-0019,silent-0020,silent-0243；来源局 HMVJKM56S4Q8,F4QKG4J1AJJZ,G403VCZ3BH1B,25226ZFLNR1J,JLN5SK17W4FQ,JMH5C51RLN4E,9TG1RP5LFAAK,JQPT83P8KDSZ,S9UZAK0JP0C0,9Z9H2EXKLF3T。原提案列十局16对跨幕回复支持旧公式；缺跨幕/营火/赢战耗血/上限变化/SL复药联合消费者与同条件路线后继。
- silent-proposal-292f6731bdb9b669 — waiting；账本 silent-0087,silent-0020；来源局 7X0W3U8TVA2A。无可打手牌、零能量单瓶药对零毒后段实加7子项已实现，候选源码b2a30ea6ebadda351fcc345b65b0c0e870bc5d65；撤码2失败/恢复全7项通过。三次55秒锁超时未合入；最新只读预检0冲突。更早共用/叠毒/多瓶及持有价仍未验证，不能关闭宽项。
- silent-proposal-e09a3905a3922b95 — waiting；账本 silent-0087；来源局 7X0W3U8TVA2A。普通蛇咬8毒的手牌/牌堆/牌组有界实现已完成，候选源码a7484217e26a24fcbce6e570fb99e524fbc49c4c；撤码3失败/恢复4通过，最终沙箱3629项通过。三次各55秒未获得live锁，未合入、尚无实际live祖先实现；最新稳定只读预检0冲突，需运维沿原批接续。

完整层/回合、旧/新行为、反例、限制、验证/回退方法均在proposal.md。幽灵一层及毒胜保血窄子实现已核真实live祖先a8b1f8be153fe4f3a34146117546c2178f2e446b（existing-live-consumers.json）；不把它们标成整项duplicate。已发布经验与完整消费者/反事实是两种验收；未关闭量化、宽策略或学习入库父要求。

## 账本与接续

只经根learner/ledger.py update对39个原账本条目追加本批提案/报告链接与具体处置；原claim/status/version/历史证据保留，候选提交只写为未上线提案，不标shipped或伪造新提案id。code_proposals沿十个原CLI id。实际合入与发布编号/上线记录、规则双通知、ledger shipped由运维核实后完成。回退两源码提交时按potion→snakebite逆序，不覆盖刷新数据或原历史。

JSON回报见result.json。
