# #20 / #39 启动环境隔离补交

依据 [#20 核验退回](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6333797029) 与 [#39](https://github.com/dwroy/agent-sts2/issues/39)。原核验报告/测试来源 `6d512e54f5de342c5faf4bf7e2603cbd5d4e8726`。**影响 live 启动：是。** 原交付 `fdab9aeb9`、kit `f1cc7285d` 及前轮失败/中断/全检材料保留，旧结果不改写。

`launch_runtime.py` 补齐 SIM/S 和其他实际消费者：构筑/战斗规划、机制/模拟、BRAIN/V6/SL、模型/非秘密 provider endpoint、请求/输出预算及数据/知识/日志路径。未发布父覆盖清除；非秘密覆盖可在实际 live 的 launch-settings.json 登记，发布并 pin 后采用。TOKEN 子串不再冒充凭据，BRAIN_CODEX_FIRST_TOKEN_MS、MAX_TOKENS 等行为预算也受隔离。

真实 API key/key-file、token/password、BRAIN_CODEX_HOME/CODEX_HOME/CLAUDE_CONFIG_DIR/LEARNER_CODEX_HOME/JEV_SHARED_ENV_FILE 等账号与凭据引用仍保留；实例 endpoint/PID/profile/超时、宿主和重载握手沿原运维边界，不允许冒充发布覆盖。trial 不继承；paid-credits 仍由固定 run.sh 按实际角色/账号生成。没有采集或记录真实环境值，没有读取凭据或账号文件，没有修改 provider/账号配置、游戏算法、开关语义或默认值。

## 消费者盘点

新增只读源码工具 `ops/launch_environment_audit.py`，扫描全部 agent/src TS 与16份启动/重载/路径/实例/trial/控制台/report helper；327源码、285键，分类为205发布行为、50运行绑定/宿主、18脚本派生、10凭据/账号引用、2单独授权/生成，未分类0。`consumer-inventory.json` 保存键名、读点、源码SHA、动态族；扫描源字节在最终检查后核同。

显式覆盖 literal reader、readEnv/pick、V6 choice/numeric、BRAIN引擎模板/分题映射、CLI host转发。新静态键未分类或已盘点直接动态读取点变化会失败；新增alias/helper等读取方式仍须代码审阅、更新审计，不把词法盘点当通用数据流证明。CI 常规桥接已接入盘点回归。

## 验证

- 最终生产 tsc 退出0；定向14文件117项通过，见 final-targeted.log.gz。
- 原核验测试原样保留为 review-regression.py；修前13项为1失败/2错误，修后最终21项通过（当前18项启动基类+原3反例）。前后原日志均保留。
- 启动18项、盘点5项由常规 board-resources 桥接复验；新增实际TS消费者测试核 Silent/Ironclad 原默认值、角色范围及显式发布采用。固定临时Git/live与实际Bash头部核父覆盖清除、main改设置不穿透、发布后采用；没有游戏、模型或生产动作。
- 第一轮14文件116过/1超时：原桥接外层15秒短于子进程30秒，现对齐35秒，保留子超时和所有断言；native桥接外层同样对齐其20秒子时限。原失败日志保留。阶段性直接Python22项发生在补Bash用例之前，不冒称最终23项独立运行；最终18+5已由常规桥接复验。

输入与日志明文/压缩SHA见 inputs.json、logs.json，结果与历史见 verification.json。gitleaks 对源码/交付材料及压缩日志的明文扫描；评论正文另在发布前扫描。

## 变基与交接

原交付只重放一提交至最新检查点 main `0eeb33ae7431039ebbcdb5860aa8be674ab00602`。只冲突 decision-log，保留上游全部记录与本角色原行。首次误选落后、分叉的远端 main 已中止，没有重放历史或修改其他工作树。变基后的原交付父提交为 `04f7300faf417632518105cc0b806e386f678fb2`；原来源保留引用及旧材料。

**#37 → #20** 顺序不变；本轮没有再次修改共享文件 agent/tests/v6-card-option-loop.test.ts。#37 尚待原集成员完整检查/合入，后续按先合结果核最终组合。本轮依核验意见补 tsc/定向，不另开 full 或等位进程，不占 #33→#35→#28→#37 原窗口。前轮开发656文件全绿不是此修复/变基树或集成员准入证明；最终组合 full、合 main 和 #39 独立复核仍待原角色，不提前关闭旧自然派发/通知/生命周期待办。

生产 heavy 仍未启用，本轮未 pin，未改 main/live/STOP、运维prompt、其他会话或运行账号。首次发布仍须原ops自然边界保持下一局准入，核实际配置、live协议、pin、安全接续及首局 source/run-config。回退按实际 live 版本恢复并重新 pin，不删除清单退回 main。开发补交与生产采用分列。
