# #60 R448 实际入口与兼容闭包续核

2026-10-25T09:41:56+08:00，新集成员会话 01a170b2-a9ac-7572-be36-68152229effb（codex1）续核。工程来源7af8ef5a733cd5ad6b005e544663e2a4f08bc5f0的接收保留；本报告收窄旧6388588489“复用full/可发布”在实际部署上的适用范围，不改写旧成功和失败原件。

## 已核事实

实际 main=c1d92481aa9d4250c99095e6c5e6135d7e938314、live=d0d9da10063c623f3036a6910e83f4ae3c30c06e（R447/R448）。ops/paths.sh定义宿主ROOT与游戏LIVE；ops/run.sh使用ROOT下publication_gate及knowledge-runtime CLI，进入LIVE/agent运行游戏；普通codex-ops-learner.sh从ROOT/learner/run.ts启动，external批仍沿原worktree/持久选择，不热迁移。

旧ops候选将全部27叶三方移到live，遇到旧learner/ops祖先差异、externalDecision/candidateMode未定义，以及external-source/publication_gate缺失。保留paper/materials/20261025-issue60-ops/原失败；不应仅为弥补这种部署方式，将宿主未发布功能整体搬入游戏树。

本轮制作双入口候选deployment-manifest.json与game-source.patch：27正式叶在宿主物理文件全部精确同来源；13个agent叶为游戏安装候选、14个宿主/文档叶已在main。live全部agent/src与旧full冻结源码仅9个#60生产叶不同，无其他游戏源码差异。补丁对当时live的git apply --check返回0；未实际应用。13叶包括9生产叶与测试/工具/合同，非整棵验证树或知识数据安装。

## 旧full不能覆盖整个当前宿主

旧anchor caa480132a67dc94b24be231d889cf37aa7b67d1 / tree7371b47fd0bbe94d4e21236e4b8b37331e14ced0的679文件/6628过/0败/2跳、tsc0继续有效，精确限于原2788输入/1417依赖和原publication profile。游戏源码部分可精确对应。

最初从旧图比较当前字节发现5处宿主传递依赖差异；继续用esbuild bundle metadata对旧图和实际宿主分别解析，发现真实launcher从114叶扩大到129叶：5处旧叶变化及15个新增可达依赖；CLI为18叶，仅formats.ts一处差异。详见bundle-closure.json，20项差异逐叶SHA保留。模块未执行，无模型/游戏/生产读写；静态字面模块图不覆盖计算生成的子进程路径，不能代自然消费者验收。

因此，27直接叶相同不证明当前全部runtime与旧full输入相同。未证明这些宿主变化与#60语义等价；不回退宿主V6，不把静态打包成功或定向结果当新full。旧full不重跑，也不能称当前双入口组合完整检查已经通过。

## 本轮必要定向检查

当前物理宿主生产tsc（tsconfig.knowledge-runtime.json）退出0；Vitest knowledge-runtime.test.ts 1文件10项通过；Python test_knowledge_runtime*.py 19项通过，均使用固定夹具、nice19/TS单worker。各原日志和退出码保留。首次Vitest命令含本机v4不支持的--minWorkers，CLI在执行测试前退出1，原件host-targeted-cli-error保留；去掉该参数后才有上述10项实际执行结果，不把首败改绿。

下一检查窗现场已有原ops #27换号high放行测试：PID3391111 / birth31678036，cwd .worktrees/ops-27-codex1-high/agent，nice19/maxWorkers2；本角色没有并发第二轮full或打断它。#27主管6392062140已明确其检查后交集成员核验合入，按恢复流水线优先。

## 交接

下一步先接#27 high放行实际交付；随后本集成员与原ops核准#60按实际ROOT/LIVE部署合同，冻结当前宿主传递依赖输入，再判断补齐适用完整检查的范围。不能在依赖差异未纳入检查结论时沿旧“全部已检”迁移/启用生产控制。13叶补丁是可复核候选，非已获最终发布准入；原ops仍负责自然边界、真实已发布知识白名单、唯一writer及原batch绑定，游戏13叶改变后须在原发布锁内核部署后像。原有长期runtime验收、开发释放及科学父均不由本报告关闭。

本轮未改产品源码、live、STOP、DB/控制、账号配置、在途任务或他角色ACK。新隔离树integrator60-runtime-closure-20261025保持旧full anchor，保留供后续检查使用，未登记complete或删除。
