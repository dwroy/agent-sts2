# #56 注册屏障修复集成核验

时间：2026-10-24T22:57:55+08:00。正式源56800c0500a4ba06b491bb2a0061da0e8ca04113（原分支issue-56-learn-four-lanes）；原P0截止23:30、产出窗21:34:30—23:34:30均保留。

## 检查范围

隔离锚dde83c1fa0152d40e0dbaaf41739d6f9a658f163/tree b24eb48dad54c864a6bcf00a519d3dd1e972ded2；原已核实际运行代码＋live R443知识56964c16c733137a1688dabb9d175c4e2387b519＋精确10叶修复/文档。未上线的main V6模块不混入运行基线，不把这次结果扩成整main/live所有组合。2762输入（含8个原固定材料）、1417依赖冻结，详见full-assembly、host-sources-baseline及输入/依赖SHA清单。

唯一full：生产tsc0；676文件，6604过/0败/2历史跳。原worker496421/birth27697081已退出；独立重新取得原full-check锁并释放，全部输入/依赖重哈希、tree、索引entries/flags语义及结果SHA核同。原完整输出/full.json及终态复核均保留；未重跑或混用其他组合的完整结果。

full使用0d4a20c031b3f9663bc15d2b49a5efc019e604f9。正式56800c05仅删除ops/tests/test_learner_registration_pipeline.py的尾空格，独立逐字去尾空格比较及Python AST严格同一；正式文件两项实际wrapper固定回归另跑通过。运行源码字节无差异，full冻结输入未动。原SHA与最终SHA分开保留在formal-format-verification/final-source-integration，不改写原冻结。

## 行为与边界

新批次在真实supervisor PID和完整原租约、binding/lane/policy登记原子保存并fsync后释放逐批屏障；父全局learn.lock仍保调度串行化，后续来源校验不挡已注册wrapper。未完整字段/保存失败不假放行；旧手动路径仍走原全局门，入口仍核PID/出生身份、原租约与120秒门。来源在事务内按空道惰性选择与复用校验，任一文件身份/时戳变化触发原SHA/来源/版本/隐私重验，binding独立复制，跨事务/独立wrapper不继承缓存。

独立固定2项走实际父state_lock/cmd_tick/check_jobs/dispatch/start_learner/wrapper/entry，四外部＋自有均在下一来源校验前看到完整登记；未启动模型。固定测试不代自然五槽、实际tier或吞吐。原窗口5单元A214314/B214315/C221312/B221315/D221313已逐批独立核原生终态、session/turn/提示绑定、上下文、产物SHA及原退役合同，达到原窗至少4单元的数量门（window-five-independent.json）。均为补丁前产出，不能证明修复效果或五槽同时运行；失败A221314/续批223228、C/D旧未起模型与窗前211311不凑数。

拟持原tick-learn/learn/发布锁、核240宿主来源基线和10叶精确前像后安装配套helper/父调度/wrapper/来源模块。实际main提交、安装区间/后像、推送与ops交接另见integration-commit和delivery-verification，不能凭本报告冒已部署/自然加载。保全部后续知识、在途行与owner历史，不改live/STOP，不强tick/finish/重派/新模型/对局，不回收仍工作会话。

## 同轮其他核验

#36 A214314/B214315普通自然终态：原session/turn/提示/上下文、task_complete与原TUI结果、产物SHA、native/supervisor退出及原退役合同独立通过；tier=null未知。6385404782已逐字读回，异常75/人工草稿/有界监督仍待原ops。#20真实24h至10-25T14:49:42、kit00:15:05及Roy门未到。

#57 ce3e9b860独立13项通过，但新增准入块固定等待父全局learn.lock，与56逐批放行冲突。真实flock固定复现已退6385470519并改in-progress，一行原pane提醒仅agent_prompted，不冒已读。等原dev在56组合补实际五wrapper/准入回归；57未合/未跑full。原件20261024-integrator-resume-2227/。学习notice17条至少一环未确认，仅清点不代填ACK，#27与学习/科学父保持。

## 实际交付回执

2026-10-24T22:58:56+08:00：main `f6238c41211b3a2734d7f5e9a644d4071216f235` 已经Windows SSH推送并远端核同；宿主配套10叶于2026-10-24T22:58:04+08:00—2026-10-24T22:58:04+08:00持原锁安装/逐项SHA后读回，live前后相同且本角色未写。公开交接6385710329已逐字读回，标签waiting-release，原ops提醒只返回agent_prompted。deployment_verified/natural_invocation_observed均仍false，待原ops自然核收。
