# Silent 策略提案核证与未发布窄修复

本批 `20261021-051301-s2-strategy-proposal`，来源十局均经 runs.jsonl 原始行核实为已结束 Silent，A9 三局、A10 七局。普通队列，原 batch 完全没有 research_request 或 implementation_request；旧手动请求绑定另一批，不作为本批身份。开工工作树干净，HEAD=2ddf207c0fbdbde86df343661e88c8a42bdcb6c5；`git merge --no-edit main` 返回 Already up to date。未派下级 agent，未联网、未运行 play、未读取游戏二进制或凭据文件。

已实现一个有当前生产复现的窄修正：原 CLI 提案 `silent-proposal-7a8e9ccb7e646538` 中，9Z9H2EXKLF3T A10 F48 T10 的士兵翻倍预览/熔炉升级组合由错误的 50 挡修正到实测 37 挡。账本 `silent-0180`、新诊断 `silent-0546`（仅 proposed）。**规定沙箱套件有 8 项基线失败，撤本源码后同 8 项失败复现，因此本批未提交、未合入 live、无版本、无 shipped。** 三个修改文件与补丁留现场供原运维/调度器兜底；不以已有局部实现关闭宽父提案。

## 原文与冻结证据

`proposal-originals-manifest.json` 记录全部十份原 Markdown 的路径、SHA；SHA 全部与专用 CLI 队列登记相符。七份原路径随共享 exp 检出消失，但 Git 原件仍存在，本批按精确 blob 取出 scratch 的 `.original.md`，没有用旧报告替代原文。规定 materialize 对七条精确路径均返回 retained/persistent runtime retained，未覆盖任何原件或恢复整个工作树。其余三份直接从保存的原路径读取并核 SHA。

先运行指定 evidence_summary；再运行指定 V6/Jev 提证及原任务默认提证。完整冻结切点、全前缀 SHA、逐行 offset/bytes/SHA、身份字段与计数分别在 `evidence-summary.json`、`v6-evidence/evidence-manifest.json`、`evidence/evidence-manifest.json`；原脚本 stdout 同时保存。本批用实际原日志 seek/read 核回了 1,946 条 Jev、7,501 条 decisions、11 条 run-config；另核回 94 个选择/资源状态窗口及 8 个去重额外计数来源，共 102 条状态原行。extract 全量流式处理 7,800 个本角色状态，但模型没有整份阅读。主窗口由精确 run_id 和原题的 observed_ts 在该已知局内定位后果，身份不从时间邻近或正文推断。

所有已归属行均为显式 run_id/state.run_id/fingerprint.run 同一身份；Jev 同时保留 decisions 原始行的精确 decision_id 关联。未用 question_id 相似字符串或正文提及建立归属。两次提证冻结切点不同（运行日志继续追加），但本批四条共有流的逐行 offset/bytes/SHA/角色清单完全一致，详 `cross-cut-consistency.json`。不重写摘要切点。

### 每局机械覆盖

|局号|进阶/终层/胜负|decisions|Jev request|V6匹配|
|---|---|---:|---:|---|
|RC61MFQM63Y6|A10 / F33 / 败|674|147|no_match|
|XTSV1U9JD34T|A10 / F49 / 败|775|219|no_match|
|BTSRF7JL1W1Y|A10 / F31 / 败|635|139|no_match|
|9Z9H2EXKLF3T|A10 / F48 / 败|932|281|no_match|
|HMVJKM56S4Q8|A9 / F33 / 败|642|187|no_match|
|F4QKG4J1AJJZ|A9 / F38 / 败|703|167|no_match|
|G403VCZ3BH1B|A9 / F48 / 胜|635|153|no_match|
|25226ZFLNR1J|A10 / F48 / 败|862|184|no_match|
|JLN5SK17W4FQ|A10 / F33 / 败|790|147|no_match|
|JMH5C51RLN4E|A10 / F49 / 败|853|322|no_match|

### 冻结切点

|提证|流|source_size|冻结前缀SHA256|
|---|---|---:|---|
|evidence|states|14936286885|52a57a7793e7e3d42231fe1a864e7f8d7b89754e30df397e14b9f260c99eb0e1|
|evidence|decisions|3119981459|1f463b32c4858571b5b90248ae8084fcc2a8fb0864c9b8659aeebfea5c441830|
|evidence|sl-attempts|50936701|182bd27b4fab0877b5d5f82ee601657b83fc0293b9da62aa2c5e6adb3c79c3c8|
|evidence|run-config|2324973|85d81fc6f86caeb6e78ca30a6b4535fb0caec2bae5f87bd7e6f509fef18498aa|
|evidence|run-plans|10236061|7eca15e728d23c10ed5f599db15638a74175fbc7ca5b538794756d54c6f3989b|
|evidence|brain|1156223342|5b17e1985537d19f5a4049e052e4c7826e520e118b78f75fbdd25458838e6b31|
|evidence|v6-build|64678849|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|evidence|jev-prompts|2278815293|946a6d9b99c47245b578eed8f854aca4c8a239998ceb516e7ab241dbb34afeba|
|v6-evidence|v6-build|64678849|f7619da65cfb9bd7dfb1055ea534004bc381a233d11c2116b23250e6f25c02da|
|v6-evidence|jev-prompts|2277717292|1235c0605cb0e3a8cb9f6c24b7728cbbdea5abece9ea1ee52956e5394e687aae|
|v6-evidence|decisions|3119146272|71a671f17cec4a108924c60ae54b73c7994737c36cd63d026d96c4575fa0ed3f|
|v6-evidence|run-config|2324973|85d81fc6f86caeb6e78ca30a6b4535fb0caec2bae5f87bd7e6f509fef18498aa|

V6 源文件存在且冻结前缀有 660 行，但本批十局均 no_match；不是缺文件，不是 entries/jev_answer/fallback/unknown 的零值测量。11 条配置没有 V6 字段，未核得显式 off 记录，实际 V6 启用状态不倒填；保留历史流覆盖缺口。本批无法比较 V6 构筑 entries、jev_answer、fallback、unknown，也不证明任何 V6 正式发布、下一局消费或自然收益。

Jev 1,946 请求分为 1,933 个 answers 行和 13 个 error 行。13 错误均为 JMH5C51RLN4E F17 的重试（12×503、1×529），不是十三次独立决定；`jev-error-raw.json` 保留原行，错误元数据已读，但这些题面未完整语义精读、不作策略结论。JMH 的请求322与 runs 的成功 jev_calls309因此不能混用。全源 decisions 有2坏JSON、Jev有1坏JSON，states/brain各2坏JSON，无截点不完整行；manifest保留原错误出处。decisions 全源还有 unknown_identity/unmatched_decision_id，其有限 gap_refs 不是完整覆盖，本批未将这些未知行分配给本角色。缺失不是零。

### 完整精读的八题与后继

`question-coverage.json` 列出全部1,946请求逐行出处、full_read及未读理由。本批完整精读8题，未完整精读1,938题；不把最后五条当完整覆盖。每份 `question-N.json` 保存完整 request、answers/error、精确身份与原行指纹；`decision-windows.json`、`selected-decisions.json`、`state-windows.json` 保留 chosen/result、SL替换、后继状态。以下窗口内旧日志 `gate_reject`、`selection_dispatch` 字段均不存在；这只是字段缺失，不主张全批无拒绝/无选择派发。后续重新提问的完整题面不自动算进本次八题覆盖。

|Jev原行|精确decision_id|局/层/轮|答案、执行与后果|
|---:|---|---|---|
|29260|1518201d-a071-417f-988c-68b93913b4fe|RC61MFQM63Y6 F23T3|plan3；decisions278933—278937均completed。12旧挡→刺击后仍12→防御21→打击仍21→零直伤小刀后25；次轮37血、属性撤回。模型补13挡与实补13相符，不把历史题面携带的跨角色统计当本角色证据。|
|29312|d099bee5-d92b-453c-8376-ce1a2aa3209c|RC61MFQM63Y6 F33T4第三试|Jev plan1，但sl_explore改目标到爪；毒雾/刺击/预判/生存者完成，唯一剩余打击被弃、未转向火箭。45HP/7挡仍对57；end_turn实际未派发而SL回T1，不能写成敌回合实扣50。|
|29480|895ecd5e-3d2a-4915-8774-a7194aa3db51|BTSRF7JL1W1Y F31T2|plan1声称13伤/损4且杀丝；实际镣铐石16→7、中和甲18→13、防御5、生存者8后突然一拳被弃。35→21，丝仍5血；石虫后轮眩晕。当前普通单弃已有窄修复，不重复归因。|
|29682|fd78839e-8f93-4b35-9382-69a5c1258501|XTSV1U9JD34T F49T1首试|p1、use_potion槽1 completed。药水题面明确未模拟、药表未加载零占位；实际新增一层无实体，26→1，16挡后仍23HP并带10挡。早喝有该轮兑现，不能推出晚喝必优。|
|29702|b39ffa82-b067-4e44-9062-ac5b7bbe3fa2|XTSV1U9JD34T F49T3末试|plan1药瓶/回响/步法完成，旧5挡不因新3敏追补；净敌扣32，23→1，吻合该轮损22。另候选猎杀者的整场胜负未独立验证。|
|29703|5787f501-2c1d-4c21-88a9-6d7452297f43|XTSV1U9JD34T F49T4末试|pick card2防御，select_deck_card completed；NIGHTMARE_POWER3建立，防御6，剩1血对尖啸后16。末帧GAME_OVER，无次轮复制；此前夜魇动作pending由状态确认，不把pending当失败或已完整兑现。|
|29973|530711d5-8dfe-4fce-b6c6-108072132ded|9Z9H2EXKLF3T F48T7第三试|Jev plan5被SL改早有准备线；原题全24/24败、即时损8/15与伤42/58分列。首动作pending后实际进入弃牌，弃打击；后续重新规划/弃凋萎/改刺击/喝混沌，末20→11、敌393→322。实际不是初览整线，不据此拟合SL权重。|
|29984|96daa796-8173-4db1-b222-c81d696622cc|9Z9H2EXKLF3T F48T10第三试|Jev plan1后先偏折+18；随后least-loss重规划喝熔炉，打击+、偏折+9、防御+10；两凋萎各12与28攻使18→3。原题50挡与实37形成本次窄实现证据，完整代码前后实验见下节。|

另读取 X F48T8 的原 decisions280547 chosen=end_turn/result=completed，states286893—286898：32血且有合法挡牌，毒胜后23直进F49；此窗口支持资源接续的已知局部问题，不冒作Jev题。十局16对跨幕端点逐帧核回，见 `act-transitions.json`；各对补血符合原A9/A10缺血80%观察，不能替原115/116局全资源消费者校准或同条件路线干预。

## 窄修正与范围

源码只改 `agent/src/reflex/combat-plan.ts`。既有士兵识别仅普通防御0/3敏；加入已观察A10 F48单个AEONGLASS、2敏、未消费士兵、三张未附魔DEFLECT+/DEFLECT/DEFEND面值的范围，排除额外玩家修饰、其他进阶/敌人/楼层、士兵休眠与VAMBRACE。首张消费一次预览，熔炉升级增量保持该翻倍预览尺度，后继再由既有求解器消费倍率。真实首张后状态已是普通面值，不重复识别。没有改牌值、选项合法性、药价/时机、SL或终局阈值；不删候选。铁甲固定对照仍算原50挡，旧士兵6项回归不变。

固定测试输入直接来自 states287999、288000、288001，逐行引用及原SHA保留于测试夹具；升级差值取同次实喝前后的4→7/5→8，不依赖刷新的知识表。完整原状态仍在 scratch 保留。独立局n=1，同盘SL不增加分母；这不是留出收益验证。原dirty树未完整保存；第一帧跨轮计数只重建到已观测计数40，与首牌即新增凋萎仍不闭合，`incomplete-fight-counter-history.json` 保留这一限制，未凭空加1。首帧回归只断言可确定的37挡；首张后原帧已经有两凋萎，回放额外19挡、损15余3均吻合。其余源模型误差不随此补丁关闭。

## 验证、失败与提交阻塞

- 单独生产 TypeScript 检查退出0：`tsc.txt`。规定入口 `bash tools/test-sandbox.sh --configLoader runner` 内的 tsc 也通过。
- 默认Vite配置加载因共享只读node_modules/.vite-temp报EROFS；原件 `legion-baseline-test.txt`、`legion-baseline-wrapped-test.txt` 保留。仅改用Vitest自带配置加载器runner，不改规定排除名单、预算、断言或生产配置。
- 基线新回归确实失败：50≠37，`legion-baseline-runner-test.txt`。
- 修正后两文件10项通过：`legion-final-targeted-tests.txt`。
- 规定沙箱套件：586文件中581过/5败；5,196项中5,188过/8败，退出1，322.59秒。`sandbox-tests.txt`。因前一段退出1，脚本最后单fork paths阶段未执行，不填成功。
- 撤掉**全部本次生产源码**，同五个失败文件仍8败/10过：`baseline-full-failures.txt`。其中V6三文件四败为null/known-mass/coverage断言，content-store一败为retained而非sealed，temp-lifecycle三败含明确spawnSync EPERM/输出断言。根因没有全部确定，不把八项全称沙箱故障，也不私自修与本批无关的队列/架构。
- 撤源码后本次新四项回归中两项失败；恢复原修正后与旧士兵回归共10项通过：`withdraw-source-tests.txt`、`restored-source-tests.txt`、`withdraw-restore-results.json`。恢复用finally保证，前后原字节副本为 `.txt`，未放可执行源码副本。
- 提交候选patch经gitleaks stdin --redact扫描0，`gitleaks-source.txt`；`git diff --check`通过。没有npm install或网络调用。

本任务明确要求规定自测退出0才可提交。当前8项非本补丁引入的失败仍使这一门未通，故**不提交、不合入、不制造eval版本或上线通知**。完整四十位base仍为2ddf207c0fbdbde86df343661e88c8a42bdcb6c5，source commit/merged/version均无。三文件已暂存，源码diff及夹具/test保留本树；`source.patch`可独立复核。原ops可按现有兜底流程解决基线门禁后接续自测、提交/live与发布核号；不能把本报告或排队等同上线。撤补丁即可回到base行为，原知识/日志均未修改。

## 逐项处置

所有派发id均有 `proposal-results.json`，状态仍waiting；局部已在live的三源码提交已经实际核祖先，原live核验点150890f8bac0253f4e9216af3259784705c7550e，四关键源码叶与本批base逐字节相同，详 `source-audit.json`。它们只证明相应子项，不证明宽父项全部实现：幽灵96f17377a331e50ea5b6a3fe8d2b605932ed1bd4，普通单弃bf423c173d3be348a4ad714e1d26516df619ff41，毒胜保血222445a9bb6bf56cb4f3ceea2cc8b20fba54128f。

|原CLI提案|账本|本批处置与缺口|
|---|---|---|
|silent-proposal-03754e1265894000|silent-0006,silent-0011,silent-0013,silent-0080,silent-0088,silent-0101,silent-0232,silent-0253|RC F23逐牌/临时敏捷/折扇窗口已重核；八组件原其他窗口及联合生产回放未齐，不能以本批局部窗口关闭整项。|
|silent-proposal-ab055ef7dfbb44e5|silent-0140,silent-0069,silent-0005,silent-0206|幽灵本轮效果已有live祖先96f17377a331e50ea5b6a3fe8d2b605932ed1bd4；夜魇未兑现不等于禁用有收益，仍缺其他复制对象和延后饮用的同条件完整后继。|
|silent-proposal-0129c465c6f5bd79|silent-0009,silent-0021,silent-0024,silent-0057,silent-0079,silent-0090,silent-0140,silent-0164,silent-0205,silent-0268,silent-0271|普通单弃已有live祖先bf423c173d3be348a4ad714e1d26516df619ff41，毒胜保血已有222445a9bb6bf56cb4f3ceea2cc8b20fba54128f；抽弃绑定、接管首轮及复制后继未联合核验。|
|silent-proposal-abe9d5d0be109a9f|silent-0019,silent-0020|本批重核X F48T8 32→23无恢复进入F49；缺原115局全资源消费者校准和同条件改线/休息/耗药对照，不能拟合阈值。|
|silent-proposal-f16527e59b5cc1e0|silent-0005,silent-0006,silent-0011,silent-0013,silent-0016,silent-0027,silent-0046,silent-0069,silent-0095,silent-0128,silent-0196,silent-0241|B F31减力/格挡/强制弃牌和X幽灵窗口已核；全部期限、多增益及留挡跨轮生产联合回放仍不完整。|
|silent-proposal-7a8e9ccb7e646538|silent-0005,silent-0006,silent-0011,silent-0021,silent-0024,silent-0027,silent-0034,silent-0077,silent-0079,silent-0123,silent-0129,silent-0180,silent-0221|已完成T10士兵/熔炉子项窄修正，当前生产原帧50挡→实37挡；撤源码失败、恢复后10项通过。规定沙箱套件8败且撤本补丁仍同8败，提交/合入受阻，源码补丁留本树；其余组合/毒/持牌伤/反伤/SL和原dirty输入未全部核验，整项保持waiting。|
|silent-proposal-cd9f76184de6e29a|silent-0019,silent-0020,silent-0243|十局16对跨幕端点重核均符合原A9/A10观察；原请求另含3个非本批支持局及116局资源模型联合校准，本批没有同条件路线收益干预。|
|silent-proposal-292f6731bdb9b669|silent-0087,silent-0020|支持局7X0W3U8TVA2A不在本批冻结输入；本批其他毒窗口不能代证头骨组合总7毒或早用/持有价值。|
|silent-proposal-0802f69b28d25079|silent-0079,silent-0019,silent-0044,silent-0080,silent-0253,silent-0011,silent-0214,silent-0189,silent-0046,silent-0222,silent-0243,silent-0262|支持局MTQ0EUBJ3R6T不在本批；四次SL固定输入及独立时间留出验证未补齐，不能用本批其他SL拟合即时血价。|
|silent-proposal-763a4b9d9f17b815|silent-0005,silent-0006,silent-0011,silent-0013,silent-0044,silent-0046,silent-0053,silent-0080,silent-0087,silent-0189,silent-0214,silent-0222,silent-0235,silent-0253|两支持局7X0W3U8TVA2A、MTQ0EUBJ3R6T均不在本批；十四组件及昏眩合法窗口无本批精确支持，不能跨局代证。|

三项原支持局不在本批的提案没有借用其他毒/SL窗口代证；资源宽提案包含的另外三局也未扩大提取。本次没有新增支持局或把重复审计计成学习收益。未新增重复代码提案id；原CLI提案与本次材料/新账本关联，均由现有ledger CLI追加，不直接修改队列/账本。经验库未变，尚未自然消费、未证明收益、未关闭任何量化/学习父要求。

运维接续入口：同目录 `proposal.md`、`report.json`、`source.patch`。本批为有源码修改但提交门禁受阻的实现现场，不能按无源码纯报告的干净工作树验收或回收；原失败日志和补丁均须保留。
