# #60 实际 ROOT/LIVE 双入口兼容检查

本批接主管6392203982，先核收#27，再检查当前实际宿主与保留的游戏源码组合。正式#60来源7af8ef5a733cd5ad6b005e544663e2a4f08bc5f0；main接收6970b9f；当前宿主冻结main21e8bb09def1f59129b3646a9d6d07be05e2d177，anchor832139b7efa597b2c059409f9ea773c43e4a2dda，tree541cfc2bd4dc4ccba64bdd745c7399313f5f8c06。

实际入口为ROOT/ops/run.sh读取ROOT发布准入和runtime控制，cd LIVE/agent，调用ROOT/agent/tools/knowledge-runtime.ts绑定版本并启动LIVE游戏。普通学习从ROOT/learner/run.ts进入；完成回调留在ROOT/ops。原批次沿原持久选择，不热迁移。

assembly.json逐叶记录14宿主叶与13游戏叶、实际物理SHA、来源SHA和LIVE原像。宿主test_llm_handoff.py保留#27 high合法后像，不回退。13游戏叶含9生产叶、4测试/工具/配置叶，game-source.patch保留在上一批runtime-closure-integrator材料；不把宿主全learner/ops搬进LIVE。

本批宿主隔离树integrator60-dual-root-20261025的.worktrees/live仅指向隔离游戏树integrator60-runtime-closure-20261025。2848输入/1417依赖全部冻结；8份历史必要夹具从原Git真字节恢复。未复制凭据或生产控制/DB。隔离游戏全部324生产源码精确同旧caa4801完整检查镜像。旧679文件6628通过/2跳/tsc0仅保留其原2788输入profile，不冒当前宿主适用范围。assembly.json中的new_full_runs=0是冻结时快照；实际执行以full-state.json与终态独立复核为准。

10:05启动唯一新完整检查PID3490642/birth31846038，原integrator-full-check.lock，nice19、单fork worker、无文件并行；10:30:16终态rc0，687文件、6689测试通过、0失败、2跳过，耗时1476.81秒。生产tsc与runtime专项tsc均退出0。full.json SHA256 37160e3d10cf64319982a4ea8b7caaedb8b83e6fe4e2149c1c3f03e41803ec01。10:30:33独立核原PID已退出、原锁可用，2848输入/1417依赖无变化、tree及index条目/flags均同。Git index原始字节受stat缓存影响变化，未将原始index字节冒称不变；语义条目/flags和tree精确不变。四个相关wrapper（account-drain、external-build-stats、own-build-stats、publication-admission）逐断言全过，见full-terminal-verification.json。

10:31固定探针已全部通过，共16次命令rc0：当前ROOT模块与隔离LIVE游戏模块的真实launcher dry-run合同、ROOT CLI从LIVE/agent跨目录启动、tools正负例、版本来源标记、非迁移路径、5次同run/新run跨发布/回滚绑定、幂等完成/回滚及独立Python进程finish/recheck恢复均已核。当前控制B或disabled时原批仍用A，两种回调顺序各通知1次，A/B发布数2/1。实际launcher129叶、CLI18叶与冻结树图及每次打包所有输入/输出最终重哈希相同；命令退出回执见probe-command-receipts.json，终态汇总见probe-final-verification.json。CLI/模块打包只为避免额外tsx/esbuild常驻进程；core/paths.ts的import.meta.url在harness替换为原模块URL，保留真实未打包路径语义，不替换产品逻辑。所有数据为synthetic格式夹具，不产生游戏知识，也不是生产迁移或自然消费验收。

ops6392268296已核实际LIVE8可迁移文档的隔离导入/备份/恢复，生产控制尚未启用，原writer边界仍待收敛。本角色仅交兼容检查和精确清单；生产上线、迁移源重冻、单一writer、合法自然候选及自然局由原ops沿publication-admission合同接续。固定场景不能关闭未遇自然场景或科学父项。

10:31:15再次核实际LIVE仍d0d9da10063c623f3036a6910e83f4ae3c30c06e、13叶原像不变，324游戏生产叶除9补丁叶精确同，192宿主Python/Shell输入核同，game-source.patch apply --check=0。deployment-handoff.json给出精确部署清单、逐叶SHA/原像、补丁SHA与终态SHA；14宿主叶留ROOT，仅13游戏叶安装LIVE。10:31公开交付#60/6392491158已逐字读回，原ops w1H:p8一行提醒agent_prompted，只记传输不代实收。主管6392481899另行独立读回本次full。后续生产实际切换由原ops负责，不再full。
