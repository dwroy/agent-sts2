# #77 ops 与新外部学习普通速度后继

本次接续保留旧交付 `2eee93f7b3ae39f938941fcaa40e8b8b9c9cc034`，只落实 [#56/6458903164](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6458903164) 转 Roy 授权及 [#77/6458921843](https://github.com/dwroy/agent-sts2/issues/77#issuecomment-6458921843) 共享叶交接；同会话追加 [#56/6459185537](https://github.com/dwroy/agent-sts2/issues/56#issuecomment-6459185537) 的 ops 启动普通速度要求。codex3 新会话沿原树工作，旧线程/原生日志的恢复索引仍在主检出 `paper/materials/20261028-issue56-external-codex3-ops/sessions/77/pre-release.json`。本报告不声明新会话原生档位已验收；实际回执由原 ops 另核。

## 改动与合同

`external_learning_policy.snapshot` 对可核额度统一登记 `service_tier=default`；原周用量 ≤70% 四 workers、>70% 且 <90% 两 workers、≥90% 零 workers及去重请求原 ops 换号保持。未知、失效/过期、账号不符、磁盘/容量/发布/权限与同题去重门保持。`selected_home`、workers AST 和旧 `own_status` 与旧交付逐项等价，见 `source-verification.json`。

TypeScript launcher 的显式/省略档位都为 default；CLI、TUI 环境传递与原生包装器只允许新 default 请求。冻结策略、launcher requested/effective 与原生参数一致。旧 fast/ultrafast 注册不重写，新的启动尝试拒绝后仍沿原租约和失败/重试门。快照跨 workers 档仍拒绝，留原登记；同档刷新继续。已运行批次不热切，历史原生 fast/ultrafast 读回及 observed 缺失为 null 的逻辑不改，不能用请求参数回填实际档位。

本后继六个生产叶：`ops/external_learning_policy.py`、`ops/codex-policy.sh`、`learner/lib/external-source.ts`、`learner/lib/launcher.ts`、`learner/lib/herdr.ts`、`ops/codex/lib.ts`。均为 ROOT/宿主及未来外部冻结源码工作树消费；没有 LIVE 游戏消费者差量。前后 blob、模式及逐叶回退声明见 `source-verification.json`。旧交付的五叶/新增 `own_learning_slot.py` 仍须原集成按实际组合带齐，不用本后继覆盖原交付或其他并行补丁。

`ops/codex/lib.ts` 的 init/resume/herdr 新建与 resume 共用 default 启动参数，默认 high、显式推理和原权限保持；沿原 herdrWake 空闲参数哈希接续，不修改唤醒流程、账号或会话登记。账号切换仍由原 ops 按原事务核收。

同步文档为 `docs/learner-retention.md`、`docs/external-strategy-source.md`、`docs/codex-fast.md`、`docs/codex-ops.md`；旧提速要求标明被新授权覆盖。历史材料、旧失败/批次、原角色/权限和科学父保持。

## 自测

最终生产 `tsc` 退出0（含 learner 导入链及 ops lib）；最终定向 **8文件78项通过**。覆盖 ops init/exec resume/herdr 新建与 resume 参数、模型/推理/权限、外部默认/显式参数及回执、历史提速请求拒绝、原生历史档位读回、快照/账号及 workers/90% 拒绝边界、注册屏障、发布准入与 paths。两处共享注册夹具同步为 default，并断言登记与 wrapper 实际传参一致。原始外部 Python22项及首轮定向两文件19项通过。

`SANDBOX_WORKERS=1`、nice19 的沙箱首轮 **644文件642过/2败，5946项过/2败**（1393.47秒），两败都来自共享 `publication_registration_fixture.py` 的旧 ultrafast 断言。首轮在追加 ops lib 授权变更前执行，期间未修改源文件；首轮原红 `sandbox.log` 保留，脚本因该轮失败尚未进入 paths 阶段。夹具与新增 ops 参数同步后，最终定向8文件78项包含这两处失败点及 paths，全部通过；没有重跑整轮沙箱，不把定向绿冒成宿主/组合 full。首次编辑误用 agent cwd、在写入前报路径不存在的记录及随后旧源码 tsc0也独立保留，见 `validation-history.json`。

完整日志与范围见 `validation-history.json`、`final-tsc.log`、`final-targeted-vitest.log`；提交与公开评论均须经 gitleaks。

## 交原集成与 ops

ops 的独立账号作用域候选 `.artifacts/ops-issue56-external-codex3-20261028/source.patch` 仍由原 owner 维护。未应用或修改候选；只做初版及最终后继树上的 `git apply --check`（均0），补丁 SHA 见 `source-verification.json`。共享叶中本后继只改 `snapshot.service_tier`；组合时须保留其 `selected_home`、`learner_jobs._start_learner`、统一采样及文档差量，其旧 fast/ultrafast 测试预期由本后继 default 合同取代。此只读检查不冒原唯一 full 或组合运行验收（该候选原红及冷夹具复核仍归原 owner 保留）。

原集成员按实际最新 ROOT/宿主/未来冻结源码组合核安装映射与唯一检查；原 ops 沿自然入口核新批次账号、模型/推理、原沙箱、default 请求及真正可取得的原生档位。外部首批仍受库存 #71 及原 A owner 等独立门，本次不手放 owner、不强 tick、不重派同题。只源码交付，不 submit 队列、安装生产、改 main/live/STOP/账号或配置，不运行 play、不使用 /fast 或 /ultrafast，不分游戏发布号或关闭科学父。

回退仅反向本后继六叶与相应文档差量，保留 ops 账号选择差量及原任务/失败/rc/输入/回执；不得恢复新 fast/ultrafast 派发，授权未变时须继续暂停对应新启动直至普通速度策略恢复。
