# 静默策略批次回报：补丁保留，门禁未过，未提交/未合入

本批 `20261014-054301-s2-strategy-proposal`，角色 silent，基线 `2f739c28ca61513bd0baf14a2e84867ed99c2f3d`。已独立处理十个派发ID；没有承接别的专题/实现请求或领取其他队列。`git merge --no-edit main` 无变更。

## 可核成果与当前状态

已完成普通蛇咬8毒的有界源码补丁，所属原提案 `silent-proposal-763a4b9d9f17b815`，既有账本silent-0087，新增账本silent-0460 / 子提案silent-proposal-3e9b94fbf3a4c1a6。来源7X0W3U8TVA2A F30T3、F31T1/T13；修改只允许静默A10普通2费、无附魔、唯一动态值7/7/8且显示8的精确模板。沿现有施毒接口读取8，不再标未知，不重复加遗物数值。其他角色/等级与原7/升级10分支保持；没有新药水、护栏、SL或终局权重。

固定回放首轮18/18通过；撤源码3条实盘回归失败、15控制通过；恢复18/18通过。完整沙箱首轮tsc0，vitest1：378文件375过3败，3629项3626过3败，1612.93秒；因首阶段失败，paths阶段未运行。三项均为120秒/15秒测试超时或5秒子进程status=null，详sandbox-first-summary.json。原失败保留；同源码按脚本默认4 worker的一次整体复验已结束：tsc0、vitest1，378文件377过1败，3629项3628过1败，414.00秒；仍是rollout 120秒超时（实际129858ms），其余两项恢复通过。未改排除名单、断言、测试时限或生产预算。两轮paths阶段均因前段失败未运行。按提交前入口须exit0的要求，未创建任何源码提交；三个源码/固定材料文件保持staged改动，不能冒称干净的无源码批次。合入只读预检已有15个历史记录文件冲突，未覆盖live或其知识刷新，没有新版本、实际上线或shipped声明。

## 逐项处置

| 派发ID | 账本 | 处置及具体范围 |
|---|---|---|
| silent-proposal-0802f69b28d25079 | silent-0079, silent-0019, silent-0044, silent-0080, silent-0253, silent-0011, silent-0214, silent-0189, silent-0046, silent-0222, silent-0243, silent-0262 | waiting：已核MTQ0 F23四试T3实损0/0/0/8；少防御多6即时净扣而多损8。缺同条件整战成对反事实与独立留出，不能拟合SL或药水阈值；离线审计仅保留观测和预测。 |
| silent-proposal-f54e8de2381c1250 | silent-0125 | duplicate：原提案限定为记录与可比预测，不改护栏：实际live祖先的候选/派发/离线审计已分别保存plan6→plan1、14/6损、14/16伤、毒与持续收益字段、唯一同题预测排名，并在弃连续反弹/重问迷雾处截断。未执行完整候选的实际值保留null及原因正是原要求，不以缺胜线阻止这一记录项去重。；实际live源码祖先 `e75438488df159b2e8e9d3458cf219b39aadd933` |
| silent-proposal-763a4b9d9f17b815 | silent-0005, silent-0006, silent-0011, silent-0013, silent-0044, silent-0046, silent-0053, silent-0080, silent-0087, silent-0189, silent-0214, silent-0222, silent-0235, silent-0253 | waiting：本批已完成普通蛇咬7/7/8精确牌面子补丁并通过18项及撤码反证；十四机制宽项仍缺联合消费者校核。新子补丁两轮完整门禁未过，未提交；live历史记录冲突也未处理，不能整包implemented/duplicate。 |
| silent-proposal-19a5cff2094e2d8f | silent-0021, silent-0064, silent-0079, silent-0133, silent-0125 | waiting：MTQ0全败SL与7X0暂死重接已核，现有观测端点/阶段子项不等于完整终局校准；缺修正输入到实际终结的整链验证和独立整战反事实，不改终局/必死权重。 |
| silent-proposal-3540bf4360bf80af | silent-0019, silent-0020, silent-0243 | waiting：现有journal已记录已到回复和F19/F20赢战净HP，跨层仍标来源未隔离；缺回复/用药/SL恢复逐源到路线和休息消费者的完整绑定，不能当所有资源来源均已识别，也不拟合新安全线。 |
| silent-proposal-0ea5c0b9c030fdd6 | silent-0274, silent-0247, silent-0027, silent-0016 | waiting：奇巧剩余名额/能量提示与恶魔窄毒药+6已有真实live祖先，完整后继仍continuation_verified=false。缺选对象收益兑现、提前饮用整战受控对照；不把局部已实现当宽项关闭。 |
| silent-proposal-f915ec544ab94b6e | silent-0079, silent-0125 | waiting：KFR F12生成小刀后重问断点已能记录；F33首/第三试T6原帧仍为36毒、多10净扣/多损6且两线失败。当前整轮审计对这些T6开头记unknown，缺同条件完整执行/整战校准，不调整SL血价权重。 |
| silent-proposal-8fb51933639faf90 | silent-0005, silent-0006, silent-0027, silent-0189, silent-0276, silent-0277, silent-0278 | waiting：恶魔+6毒药已在live，不再使用旧仅双boss理由；七药效/能力宽项缺联合消费者校核，覆甲完整减层触发与未知修饰组合未隔离，不能整包duplicate。 |
| silent-proposal-b3bc0eb09211af6c | silent-0021, silent-0079, silent-0102, silent-0247, silent-0274 | waiting：奇巧资源/窄毒药/阶段候选子项已有，缺合法后继到真实终结的全链读回；替对象、提前饮毒、完整护栏替线未受控实打，不能从敌残更少拟合终局或宣称更安全。 |
| silent-proposal-fdc3a505fe5e1a55 | silent-0019, silent-0020, silent-0243 | waiting：KFR已到营火、幕间38及SL恢复的原帧均保留，现有HP增加观测不认证精确来源；缺所有实际喝药/恢复逐源对应路线与休息题面的完整读回，不把六次回血后失败归为休息策略因果。 |

## 原始证据与消费者

三局runs.jsonl均SILENT/A10：7X0 445决策/461状态，MTQ0 424/440，KFR 587/620。冻结合计1456决策/1521状态；原字节与每行offset/length/SHA已保存。蛇咬夹具的12处来源字节切片重新seek核SHA，九个完整状态对象与原日志逐值相等。

沿实际live已有离线审计源码读回三局；同一权限下改用 `node --import tsx` 绕开tsx CLI自身需要的IPC监听，不变更沙箱。KFR原行282561是无decision_id的map/route-change，离线输入只排除此行，保留其原字节与原行号缺口；并未虚构身份。其余1455条决策进入审计：367个候选段、249个回合窗口，其中50端点可核、199个因开头/结束边界不全记未知。MTQ0 F23四试T3观测净HP差0/0/0/-8；重复异螨类型不强认实体，敌净变化保持null。KFR F33T6开头未获当前审计认证，仍unknown，不把原帧局部差当完整候选因果。 具体断点见demon-t6-openings.json：每试T5最后记录为selection/curse，下一动作已T6；当前工具只认前一动作是end_turn，故不认证该开头。这里是消费者的保守边界，不泛称原日志整段缺失。

原guard记录提案f54的要求是保存原选、最终候选、可比预测和重问断点，明确允许无法验证的实际结果为null。现有消费者在MTQ0 F11原行282138已给plan6→plan1、14/6预测损、14/16预测伤和同题预测排名false，并在弃连续反弹/重问迷雾处截断；20实际伤没有归给原完整plan1。这一记录范围按原文去重；不以缺整场赢线继续阻塞它，也不把原护栏取舍经验或宽SL父项关闭。其余宽项明确缺口见表。

既有live消费者祖先和blob已核：e75438488df159b2e8e9d3458cf219b39aadd933的离线执行/整轮审计当前main/live blob相同；c4a4f4a94b48dff9b30aaa7228624c1092150145的奇巧与恶魔药水帮助器相同；5c3dd2ea1500aa0eb8ebc4de73669c083d0a0452的HP观测在live，当前journal差异仅三处Roy/Dai注释，不覆盖这些注释。局部机制或观测功能不冒作完整宽提案。

## 反例、未知与边界

三个蛇咬动作只有一个相关对局；F30定位、F31后续检查不算独立时间留出或胜率验证。原局三次已实打蛇咬，不能由当前漏模推断当时大脑不会使用；原运行dirty知识记录保留。本局末战仍失败，没有证实本补丁能使其获胜。毒药、覆甲、奇巧先后顺序、休息/锻造和替路线缺受控整战反事实，不补参数或通用公式。

## 失败原件与复现

- snakebite-withdrawn.log、snakebite-restored.log与withdraw-restore.json保存撤码失败/恢复通过；源副本只有.txt，不是可导入生产.ts。
- sandbox-check.log保留完整入口原输出；首轮完整失败及三项明细已保存；底层调度Python单独复验29项过（19.260秒），不替代完整门禁。一次整体复验另存sandbox-retry.log / sandbox-retry-summary.json，最终exit1；不把定向通过当完整门禁通过。
- tsx CLI三次IPC listen EPERM原失败保留在启动转录；三个node-loader重试的独立stderr、退出码见audit-exits.json，均0。
- 第一次date的bubblewrap构建因并发工作树消失ENOENT而失败，下一次实际date成功；这是入口限制，没有改游戏源码。
- gitleaks-staged.log/exit：本次三文件655640字节，未检出泄漏，exit0；最终提交前若源码发生变化会重新核。

## 交付与回退

总提案 proposal.md；窄实现 proposal-snakebite-preview.md；新账本/代码提案真实CLI输入与stdout分别保留。最终HEAD仍为基线2f739c28ca61513bd0baf14a2e84867ed99c2f3d；源码提交=null、merged=null、release_id=null。新增固定测试cases命令exit0、18/18通过；撤源码exit1、3败15过，恢复exit0、18过。完整tsc0/vitest1，两轮原日志均保留。预期只有已观察8毒进入参考推演，实际自然采用和收益未知。实际live合入前不增加eval版本、不发规则已上线双通知、不标implemented/shipped。若部署，回退只撤对应三文件源码提交，不覆盖知识刷新和原账本。

运行参数来源补记：本任务原生启动记录的launch参数为gpt-6.1-sol、model_reasoning_effort="xhigh"（runtime-model-evidence.json），与任务模板的high字样存在差异；没有修改配置或重启线程，不把launch参数冒称已核实际原生请求返回模型。


## 最终阻塞与运维接续

- 完整门禁：首轮1 worker，tsc0/vitest1、3626过3败；按任务要求仅做一次整体复验（脚本默认4 worker），tsc0/vitest1、3628过1败，唯一剩余失败是既有rollout-live的120秒超时。当前main与本树这三个失败测试文件及原card-model基线没有新的差异可合；没有修改测试或降低门禁。超时不直接认定补丁功能错误，但退出码仍按1保留，未提交。
- 在ops/live-merge.lock内只读核当前live caa27990d46ac612a54eea03135b7152ccf93e9b，三文件补丁git apply --check=0；本基线到live的merge-tree=1，共15个历史记录冲突，见live-final-preflight.json / live-final-merge-tree.txt。因源码仍未提交，未制造虚拟源码commit，未实际merge，未提交live知识刷新，未改变live任何文件。
- 供运维接续的精确材料：snakebite-preview.patch（三文件，gitleaks0）、card-model.before.txt / card-model.patched.txt、commit-message.txt（仅预备稿，未用于提交）、源码/证据manifest、两轮完整失败日志和18项红绿回归。修复并通过完整门禁后才按原流程提交/核live；十五历史记录冲突由运维协调，不覆盖历史或刷新数据。
- 原十ID最终1 duplicate（仅原guard记录范围）、9 waiting；子提案silent-proposal-3e9b94fbf3a4c1a6保持pending，silent-0460保持proposed。没有原ID被本任务虚标implemented、没有shipped，没有源码commit或新eval版本。未关闭量化/经验入库等父要求。
