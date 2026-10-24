# 集成员接续：未完成项

核对时间：2026-10-22 18:37 CST。账号切换由主管在本 pane 重启接续；本会话写完并提交即停，不开新任务。接续前只读核最新 issue 评论、main/候选/进程及下述动态回执，不把此快照当实时状态。集成员 pane 为 `wJ:p1HD`，不得向旧 watcher `wJ:pJT` 发消息。

完整检查/发布协调顺序：**#33 high → #40 → #35 → #28 → #37 → #36**。无对局时 Roy 允许两个重任务位，#33/#40 可并行；这是运行授权，不代表 #20 heavy 已启用。检查使用 nice19、单 worker；已有同源 full 不重复，不能把两棵独立树各自绿当精确组合绿。

## 在途候选及下一步

| Issue | 精确候选与位置 | 未完成项与下一步 |
|---|---|---|
| #33 high | 原窄修 **tree** `90c6d041640b1bec7082635f6344fc69dd260751`，基线 commit `0cd3629d3a7f3a3bcacd22fa0a4206acc4d81e78`；原件 `paper/materials/20261022-issue33-high-ops/checks.json`。当前与 #40 联合候选 **tree** `9e53f156c3e1662e2ab6cffe667610214b005ca4`，工作树 `.worktrees/ops-high40-live-20261022`。tree SHA 不能当 commit 做 ancestry 检查。 | ops 原唯一 runner `821586/start8890034`，18:19:32 开始该精确组合首次 full，tsc 已退出0；full 结果、输入前后校验与实际发布仍待。核 `paper/materials/20261022-high40-release-ops/checks.json`，不要另起 full、碰该工作树或占生产锁等测试。原整包失败及窄入口历史失败保留；自然首局原生 high 尚待读回。 |
| #40 | main 来源集成 `692242e71c599ddae8b5ae89fab68e8941511fc1`，记录 `cbbcfd7c4e98f3a12c6cd429781b38f831e320a0`；本角色受测候选 `31265530a748266feb87ce8953a89087f44bf0c3`，`.worktrees/integrator-40-20261022`；live 联合候选为上一行 `9e53f156…`。 | `waiting-release`。继续由原 ops 完成精确 live 组合检查/发布，不重跑已结束的 main 候选 full。联合树共27叶：high3、40原21、缺失依赖 `ops/report_log_cache.py`/`eval/jsonl_cache.py` 两叶、#41测试一叶，不含整包33/35/旧20/whole-main。冷缓存、暖缓存、触发训练周期的步骤/总耗时、发布锁等待/持有、模型消费者SHA与首局增量读回仍待自然验收。材料 `paper/materials/20261022-issue40-full-integrator/`；[集成结论](https://github.com/dwroy/agent-sts2/issues/40#issuecomment-6338211717)、[ops在途组合](https://github.com/dwroy/agent-sts2/issues/40#issuecomment-6338504390)。 |
| #35 | 源 `0485abd6f4d0ce8edefb9f747744528fadfbd85c`，main 集成/保留工作树 HEAD `c208665e6dbcc8244f2516b7c3d7d0f3fde7a00a`，`.worktrees/integrator-35-20261022`；ops 旧准备 **tree** `f01856a4ec1b083f3b49a3caa4d14ba7af602097`，`.worktrees/ops-issue35-after33-20261022`。 | `waiting-release`。#33 high/#40 实际发布后，ops 基于真实新 live/最新知识重核该 feature 与依赖并协调最终精确组合；旧准备树未受测/未武装，不能直接发布。自然构筑题核本局已确认选择、短理由/来源、跳过与固定说明；SL/重启仅自然发生才验。材料 `paper/materials/20261022-issue35-integrator-review/`、`paper/materials/20261022-issue35-release-prep-ops/receipt.json`。 |
| #28 | 源 `83ea9419187924c3a66b355b14f4b3664651844e`；本地候选 `7087caea9ee456953a060c0bf73846b6b5f0b249`，`.worktrees/integrator-28-20261022`。 | `review`，未 full/合 main。轮到后先核最新 main/前件、保留 CLI 测试创建 `.cache` 父目录修复及原85条，再冻结精确候选跑最终 tsc/full；通过后按绑定门合 main。真实两臂回放/独立局区间、学习者内容、Roy 开关决定与获准 A/B 尚待，V6_COMBAT_ENTRIES/REFLEX 原 off；合成测试不关闭科学父项。材料 `paper/materials/20261022-issue28-integrator-review/pending-window.json`；候选仅本地，勿误报已推送。 |
| #37 | 源 `9e8f900dde2df7829d73482bc8ac632af7128c65`；候选 `152a5cc4ddb314ae066616d30761642cbd017ce9`，`.worktrees/integrator-37-20261022`。 | `review`，未集成员 full/合 main。#28 后合最新 main/前件，重核来源叶与最终组合，跑 full 后按绑定门合 main，交 ops 自然首局核 Jev 无 open_book/无调用错误。共享 `v6-card-option-loop.test.ts` 必须保留 main 的 #41 完整计算时钟隔离、两组八终局与预算对照，不能被 #37 旧测试覆盖；以后保持 #37→#20 冲突顺序。材料 `paper/materials/20261022-issue37-integrator-review/`。 |
| #36 | 源 `386c8b224ba476f2319cc258fcdffb18b120f085`；候选 `1b0aeb68f70876809e761ea563f2b1195318a32a`，`.worktrees/integrator-36-r3-20261022`。 | `review`，未最终 full/合 main。#37 后先合最新 main/前件重核输入，再最终 full；通过才合 main/交 ops。自然学习 TUI 原任务/一次性提示/原生实际档位/产物/退场关tab、直播滚动与换局仍待；失权或不确定保留 `75/stopped=false`，brain_view 维持原 off，旧07325停用。材料 `paper/materials/20261022-issue36-r3-integrator-review/`、`paper/materials/20261022-issue36-r3-ops/natural-acceptance.json`。 |

## 发布与恢复门仍待原 ops 完成

Roy 独立暂停 `roy-check-window-20261022-172x` 与换号自有 LLM_DRAIN/PAUSE 分开；#33 high 和 #40 实际 live、换号核验及自然边界之前不开局/生产刷新。只原 ops 按最新明确授权处理暂停，不因换号结束自行移 STOP。联合组合检查通过后由原有限脚本核最新 catalog/知识、精确预像、输入不变和绑定，沿 K→L 短锁一次发布/核号/双通知；失败保暂停与原件，已提交阶段先对账，不能重放。首局沿正常 broker 恢复，不造实验局。接续先看 `publication.json`、`roy-pause-release.json` 是否已生成及真实内容，不由检查绿推定已发布。

动态原件 `paper/materials/20261022-high40-release-ops/`：`prepared.json`、`launch-readback.json`、`checks.json`、`drain-exception-readback.json`、`controller-role-correction.json`。账号事务原唯一接续 `826698/start8899747` 由 ops 持有；不信号/热切其他会话或重启控制器。当前 PID 仅为定位，操作前核 PID/start/boot/角色。主检出并行脏记录全部保留；未来合 main 前持原 L 锁，`python3 ops/instance_binding_backup.py backup --root "$PWD"`，finally `restore`/`verify` 并核 SHA/权限，不能覆盖改绑。

## 其他未完成依赖

- **#20 / #39**：#20 当前 `in-progress`。新架构公共交付 `6d358727981e057fc7992425dee7072594790809`、私有 kit `63f1dde60fb70f38cb46982e040210eb8ab0818c` 已在 issue 留交付，但本集成员尚未核验；其后主管补充需求5（Claude收件箱、配置路径、三类触发与journal去重测试）仍须看后续补交。收到 review 后先读完整新要求再核公共+私有精确组合；不得因为看到早先交付就合旧版。旧公共bfcb/候选5c、含旧20的238只作历史证据，禁止合入。核每项目独立实例、跨派单器真实执行进程持槽flock/退出释放、全机优先级FIFO、任一有效游戏1位否则2位及陈旧声明失效、双实例/临时第二项目回放、各项目相同协议/SHA owner回执。#39 启动环境隔离/实际 source-run-config 仍待新最终组合；heavy/pin/安装未完成，不能称生产队列启用。
- **#20 与 #40/#37 交集**：未来精确组合保留 report ablation/cost队列，combined driver恰好入队一次、旧live外层learner兼容；旧kit夹具不代新协议证明。#41 来源 `c6428609c0f0a2e40ad0660532393c244df5a766` 的修复必须保留，#41 本身仍待主管设计验收关闭；不能把旧20组合238当其必要合入祖先。
- **#26**：main 工具层已交 ops，精确 live 挂载/查询角色隔离及自然读回仍待；不追加已取消的前后指标对比，沿原 #33 发布门核实。
- **#4/#11/#13/#14 科学链**：原研究 task CLI 角色登记、补证与父要求仍待，不套只兼容R4的 #8，不代其他角色 ACK。#13/#14 代码/固定回放/反例与收益未齐，材料 `paper/materials/20261021-issues-13-14-integrator-review/`。#8 余下由主管验收关闭，集成员不重转已有异议。未确认学习通知按 `ops/codex-ops/learning-notices/` 原ID核，不把排队当已送达。
- **#18 回收**：旧冻结0可回收/219保留/56待补证不构成当前 apply 授权；实际树已变，若重启此项须新核清单/角色/进程/唯一产物，不放宽或强删。

需主管裁决、P0阻断超过20分钟无人推进，或停局且常备授权无法恢复时，向主检出 `ops/codex-ops/inbox-claude.md` 只追加一行 `HH:MM [watcher] #N 一句话`，细节写 issue。公开评论首行 `[watcher]`，发前 gitleaks 并核作者/全文读回；herdr只发一行提醒，working时按原机制排队，不代填接收ACK。集成员只核验/合main/协调检查，不派活、不碰生产。
