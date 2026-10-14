# R3 限定实轨数据验证接续回执

时间：2026-10-15T02:04:53+08:00。原线程 `01a13753-c032-73f0-aa3f-ddc0e14809cd`，父批 `20261014-061302-fix-batch`；本次数据目录 `20261015-001838-fix-batch`。本限定验证包已经实际执行并封存，宽 R3 需要接续：缺完整强制动作轨迹接口、初始抽序及独立敌伤归属，不能宣称真实 S/胜率校准成功或发布。没有新增父请求，没有生产源码/知识/配置/台账/开关写入，也没有合入、版本或 API 请求。

## 输入与代码冻结

- 交接输入清单 SHA `5ffbb2947cf1996448f766f4fc1bc1be69d44aa67104547af683f7b14684721e`：23项路径、字节数和SHA全部核实；只读项目原件，工作树历史文件的缺失没有被当作证据缺失。输入复制和核验见 input-verification.json。
- 工作树原 HEAD `e00dbd473312bd05f4fa0e2fc4439baffdaba638` 保持，git status干净、git diff --binary为空；不合main/live，不借主ops权限。
- R346实际冻结发布快照 HEAD `473b9c0e1563e88d174cc24d6007eda5c5a9a9f9` / tree `3b6d1a3bbc53057c896f1f14b33e53fdd19467e4`，捕获时正式编号 `V5-R346`；源tar SHA `8234c7fc5839473b9ec3b3732cd70cbd16e7e55ee1162001afc65dd853c54b9a`，228文件逐SHA校验并只解压一次，没有整个仓库tar/完整checkout。
- 已实现S归属修复 `e5d07f4a5a45ff3cf2cb44d09dfa89fa1ebf46ad` 是该快照祖先。当前自然控制器在捕获时是1GN7WFBWC2E3 / 8035f8223+dirty；它的代码标记、冻结发布号和后来编号分列，不冒称已结束两局验收。另有9个已冻结知识叶子与捕获HEAD不同，原字节保持。
- 原已发布工具 backtest-board.ts从捕获Git提交读取；现有game-data.json目录另冻结SHA。源码/知识/依赖清单在 model-freeze.json、additional-model-dependencies.json。所有模块从私有frozen-model加载，只含public common和Silent私有知识。
- 原57af和7e1193历史源码/模型/报告没有改写；7e1193只是冻结知识中沿用的旧boss-trust实验来源，绝不充作R346当前模型。

## R2和Jev原件读回

54/54原参考组和54 paired材料逐实际路径/SHA核过，每组1000个唯一共同ID。仍为30题分母、27支持/3不支持，旧11000ms和4-worker离线profiling保持；1000是收敛参照，终局DPR/core另有条件分母，不是1000个有效实盘终局或胜率准确性。category/representation/profiling已读取；undefined→JSON字段省略的旧表征差异不当作机制失败。未重算固定30题、54参考组或旧性能基线。

Jev已有144返回与144请求/开始记录逐文件SHA和ID/请求SHA链核过，均复用；32 followup中27题在所选run内，7题与boss实轨重合，2题三种题面返回不同选项。原答案、guard预测、SL前后、实际请求/完成回执和后继动作分别保存在 jev-overlap.json。新返回没有真实执行，未选线没有真实收益。原P0/B2 sign gate和S符号/排序/英文请求/adapter仍归watcher独占；只读取提供的门禁，没有并行实现或重开同题全史审计。

## 实轨范围与预声明holdout

16个已结束SILENT局：原30题的12个关联局，加旧校准3个no-solve局及1个知识恶魔反证局。截点 `2026-10-14T16:18:27+00:00`；先冻结228源文件/角色知识及整局10/6划分，再运行模型。早10局diagnostic/train、晚6局holdout，同局/牌组/SL不跨侧，没有调参或移动切点。划分是回顾性当前模型验证，不冒称未见自然样本；相关局和SL不当独立胜率试验。

共73次boss尝试，首次32 / SL后继41；事件标签won25、died7、predicted_death截断41，截断不填成败。3494原战斗/边界帧加241战内CARD_SELECTION帧；3251主请求加234补齐选择请求，合计3485。来源窗口、Boss/双方入口HP、实际动作、原合法候选、原件offset/bytes/SHA、版本、attempt、重问、SL全部保留于索引和原始gzip。选择子流程不是新独立胜败样本。

train：K3676LU8B0UH, 54G5683J0E5S, Y8GDTNWG4R3X, Y82C2NV7WM2M, 32VSST9UX7MN, YP428GT9ZLL3, WA7FRJ7UABCV, 4U3WNL3JRRCX, 1269Y20SKHUM, E5L15SK6ZHZB

holdout：4YPGHGJD393H, 8AGEGLG40SV3, EEVP0QTLMSX9, LKC9YXKZWTKR, Q9FM7A80E4BZ, 6ZGMGEQ5YDVK

## 实际重放及三层分离

历史预测保存在 executions.jsonl；R346重放保存在 replay-results.jsonl / whole-turn-results.jsonl；实际前后帧和资源标签独立保存，不把模拟输出当实盘标签。

2996个主动作具有完成回执及准确观察时间/同attempt前后帧。当前模型实际重放2883个动作；255个请求绑定未知，113个既有输入/映射/重放限制仍保留。保存原始失败，不补0。补充选择241次（234新增）保留动作/合法选项/失败/等待边界，不伪装成已经全部机械重放。

677个回合组中173个可重建整回合已用traceSteps和simulateFight(maxTurns=1、强制真实计划、seed7)实际执行。正确captureCore遥测核173组全部动作身份/目标一致，policyTurns全0；追加遥测与旧物理输出逐值相同。504组结构/重放缺口保留；严格观察手牌窗口为160组，其余13组的真实手牌变化另标unknown。没有独立整场从入口到终局的强制动作序列重放，不用后续自主策略模拟自证准确率。

以下是未调参的端点残差（预测减实框），不等同于全窗口DPR或安全/通关证据：

| 分侧 | 字段 | n | mean | MAE | min / max | exact |
|---|---|---:|---:|---:|---:|---:|
| train | player_hp | 2059 | -0.1024769305488101 | 0.1024769305488101 | -44 / 0 | 2048 |
| train | block | 1704 | -0.028755868544600938 | 0.028755868544600938 | -7 / 0 | 1697 |
| train | energy | 1704 | 0.0 | 0.0 | 0 / 0 | 1704 |
| train | named_enemy_active_pool_hp | 2078 | 0.06785370548604427 | 0.06785370548604427 | 0.0 / 12.0 | 2026 |
| holdout | player_hp | 824 | -0.04004854368932039 | 0.04004854368932039 | -18 / 0 | 822 |
| holdout | block | 674 | 0.008902077151335312 | 0.008902077151335312 | 0 / 3 | 672 |
| holdout | energy | 674 | -0.005934718100890208 | 0.005934718100890208 | -1 / 0 | 670 |
| holdout | named_enemy_active_pool_hp | 913 | 0.0963855421686747 | 0.0963855421686747 | 0.0 / 4.0 | 874 |

原槽位HP残差另保留；27动作发生敌人槽位移位/消失，不能按旧index冒认目标，named active-pool只比较实际存在的同名池，不补失踪实体HP。320动作观察手牌与回放不同，保持抽序/生成/模型缺口。死亡回合模型nominal HP -24/-18与实框显示0的差异不当成实际敌伤，也没有从cap hpLoss反推raw伤害。scope/window审计见 replay-endpoint-audit.json、whole-turn-window-audit.json。

## 资源、启动和连续Boss

resource-window-ledger.json按73attempt分列入口资源、真实manual首次施放、74明确drink请求及实际槽位/HP变化、HP净增、遗物资源变化和SL。回血、药水、复活、自伤、敌伤无法完整拆分时为null，不把净HP升降补成敌伤或把遗物变化冒认为复活次数。核心manual出现不是自动效果数、完整四核心资格或无限循环证明；完整资格保持unknown。当前面板有1个观察到的F48→F49边界，入口资源分列，联合通关率/中间回血归属未知。

新框架独立实际raw敌伤完整窗口为0，真实S有效窗口为0；没有拟合新Platt、分组可信度或胜率，没有用holdout追通过。>=90%仍只是原固定支持集工程目标；2883动作或173回合的完成数量不是它的实盘成功门槛。

## 具体反例和后继建议

- 6ZGMGEQ5YDVK/A10/F33/attempt1/T4，ESCAPE_PLAN，decision ff00975b：稳定实框block2→3且手牌实际新增NEUTRALIZE；当前模型初始对齐、known/no-unknown，却draw=0、回放block6、未出现新牌。原件decision offset1328227105/1569 bytes SHA5fe9075693ea778989db9c65e490bf936239219e5a5a12b822cb6d759ebc4c43；完整前后状态范围和SHA在counterexamples.json。只结论该条件下模型转移不复现实框，不从单例补通用机制或S符号反证。
- LKC9YXKZWTKR/A10/F33/attempt1/T2，POISONED_STAB，decision5ec6f66e：输入energy1、当前模型到0，稳定实际仍1；需独立支付/退款/遗物字段核因果，不能把净变化归因成新固定收益。

原知识恶魔B2撤可信1.325、B3低可信1.347历史/证据保持；捕获知识内后续固定7e实验为n41、1.357/1.388，也仍低可信，未当作新R346校准。Queen重复+2反证和原失败保持；本面板没有完成的QueenT1严格整回合，不能宣称已修复。新的观察/holdout/自然验收独立，不强行支持架构示例。

新不同意见/反例与原观点、条件、影响/旧ledger0463及后继建议在counterexamples.json。只在scratch准备ops-forwarding-request.json，通过原必要ops→watcher→Roy链交付；当前任务禁止写其他目录/台账，未代填ops/watcher/Roy ACK。若反例被用于修改新模型，原6局不得再称未见holdout；保留此分组，另冻结独立后继自然窗口。没有注册code-proposal、改源/排序/接口或宣布上线。

## 原失败与接续

R2旧generic空fix失败/rc0/mergednull在接受原件中保留，不伪造commit/tests绕过。此次初稿logged_ts/observed_ts绑定误用、options数组猜测、expected.upgraded缺失误作false、potion option_index绑定和captureCore字段诊断均留原输出/源码。只定向修正81动作与71回合，并对173已强制回合补已有遥测；相同solver输入SHA核过，原物理输出保持，没有调参、重抽原包或重复API。

checkpoint为最终输入/结果清单、source审计及report.json。后继仍同原R3：补可强制完整真实轨迹的已有接口绑定、真实初始抽序和损伤/回血/药水/复活归属，再单独核实际S及整场模型误差；缺数据继续低可信。P0/排序/adapter原owner保持，宽R3/P1/P2及自然两局验收未结束，无新增父请求、发布、全套测试或清理。
