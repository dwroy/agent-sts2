# #60 接线与 fresh-process 恢复补交

基线为原交付 `5d7bc13c3c420a9e6a8adcf0ec9a83da6db2b0a7`。本批处理 ops 评论6387394548第4项，以及集成员/主管指定的恢复检查点6387535331；未修改或重跑 #58 组合。最终固定提交在本 issue 补交评论中登记，源码/合同叶 SHA 见本目录 source-inputs.json。

## 原缺口与现在的入口

原 `production-runtime.sh` 只被新局入口读取，不能证明父调度、学习者和完成回调继承 runtime 选择。新增只读 `ops/knowledge_runtime_env.py`，以本实例 `ops/codex-ops/knowledge-runtime.json` 为统一设置（CODEX_OPS_DIR 另设时沿该目录）。缺文件默认关闭；仅无控制文件时保留原显式环境调用。

控制合同 `knowledge-runtime-control-v1` 包含实际 root、enabled 与 data 子目录内的 runtime_dir。禁止未知字段、异根/越界、超4KB、symlink/非普通控制文件；不执行配置文本、不创建目录或打开 DB。原 Python 调度 CLI 的新准入命令和新局入口读取同一设置；不改 cron、服务档、home、账号、权限或原 prompt。源码组合、实际已发布数据迁移/回退与旧写者结算后，由原 ops 在自然边界写控制文件；本开发会话未创建生产配置。

原 `learner_jobs.start_learner` 的 setsid、Herdr命令宿主、原生TUI传递链已有 STS2_* 继承/白名单，本批复用。目录、实例根、控制 SHA 与来源随原 wrapper/entry 到 launcher；launcher、完成回报、新局 run-config 记录控制 SHA，供 ops 核真实三端，不靠给 broker 客户端加前缀推定生效。详细 schema、命令与切换合同见 `docs/knowledge-runtime.md`。

## 6387535331：持久化原选择而非重读新控制

早期工作稿只有继承环境，无法保证全新进程回到原库；未将该稿提交或当作检查通过。现在普通写批次与复盘派发在启动前捕获选择，连同原 batch/注册事务持久化 `knowledge_runtime`：schema=knowledge-runtime-selection-v1、canonical root/directory、enabled/disabled、control_sha256、source。原 PID、barrier、锁、fsync 和学习租约合同保持。

`finish/recheck` 的 runtime 完成分支必须从原 batch 恢复选择，不读取调用者的 B/disabled 控制来选库；仅在回调作用域注入原环境，之后还原调用者。恢复会核 root/字段/目录身份，原目录若被重定向则 held，不能跟到另一库。旧未捕获报告没有 runtime 候选时继续旧合同；若声称 runtime 候选但缺原绑定、原 disabled 或身份有误，则 awaiting_review 保留原件，不按新设置补造旧绑定。CLI complete 还要求原数据库是已存在普通文件，不在恢复时初始化一个空实例。

## 固定检查与真实隔离恢复

- 生产 tsc、runtime专项 tsc、供 probe 使用的独立 CLI 编译均退出0；类型检查日志保留。
- TypeScript定向5文件 **45项通过**：runtime、reflex、strategy、run-config、导入检查；包含原数据库缺失时不初始化的回归。
- Python **19项通过**：原 CLI handler 前读取、默认关闭/错误配置78、三种原传递、引号路径、dispatch_write真实行持久化、fresh recheck的A→B/A→disabled、原disabled/未捕获→enabled不重绑、原目录重定向拒绝、代码提案义务及原完成控制。测试替换 handler/宿主启动器，不执行生产 tick/模型。
- `bash -n ops/run.sh` 与代码 diff 格式检查通过。本轮按主管指示未另跑 full；最终 main/live 发布组合仍由原集成员沿唯一检查入口核验，原5d7大组合失败/复验历史保持。

`ops/tests/knowledge_runtime_recheck_probe.py` 另做实际 SQLite 恢复：准备进程创建隔离 A/B 库，调用编译后的真实 CLI，在 A 实际提交后模拟超时丢回执，把 pending batch 序列化落盘并退出；另起独立 Python 进程，确认没有继承 runtime 环境，分别在控制切 B 和 disabled 后恢复原 finish/recheck。该进程仅从原 batch 取 A，真实 Node 子进程执行发布器与 SQLite；Git身份是固定夹具，原代码提案检查使用固定 route-only 条目。无生产 DB、模型、游戏或强 tick。

最终 `recheck-probe.json` 证明：所有 complete 调用仍使用 A；两种控制情形都返回原 K1，重复回调各只一通知；A共 **2版（迁移+一次发布）**，B仍 **1版（仅迁移）**。Python准备/恢复是不同进程，Node后端每次也是独立进程；使用预编译 CLI 保持 Python+Node 最多两个进程，不产生额外 esbuild 子进程。早期测量与准备回执另存 earlier/initial 文件，不覆盖旧实测。

可重现步骤（本树、隔离产物，所有后台命令nice19）：

```bash
cd agent
node node_modules/typescript/bin/tsc -p tsconfig.knowledge-runtime.json --outDir ../.cache/issue60-wiring-build
cd ..
# Set {"type":"module"} in the rebuildable build directory's package.json.
python3 ops/tests/knowledge_runtime_recheck_probe.py --node "$NODE" --cli .cache/issue60-wiring-build/agent/tools/knowledge-runtime.js
# In a separate process with the four STS2_KNOWLEDGE_RUNTIME* selection fields absent:
python3 ops/tests/knowledge_runtime_recheck_probe.py --node "$NODE" --cli .cache/issue60-wiring-build/agent/tools/knowledge-runtime.js --recover '<prepared_fixture returned above>'
```

## 交给原发布链

原9文档/765修订只是开发基线隔离测量；ops已观察实际live为8/764，缺未发布几何叶且策略顺序不同。此补丁不导入 main 数据，也不增加几何、知识或置信度。最后仍在原 C5/58 结清及本批组合通过后，由原 ops 冻结当时真实已发布字节和 pre60 回退点，核唯一有效写者，再自然切换。旧 D/C3 产物保原合同；复用合法未发布候选时走原核验与显式 runtime 发布，不能为补新字段重写旧批。

生产三端控制 SHA、知识版本/代码版本、重复回调和同局绑定、真实候选→生产tools正负例→自然局消费尚待原 ops。原 kb_reflex整体约197ms的校验瓶颈、旧失败/反证/通知ACK与学习父要求继续开放，不以本次隔离恢复或源码交付代实际采用/收益。
