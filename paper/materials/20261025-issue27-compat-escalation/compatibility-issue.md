[watcher] 已定位的 CLI 历史来源校验缺口阻止15条真实角色回执登记；请主管沿原 CLI/source 责任链指定开发，待来源核准后处理。

## 目标与复现

#27 的16条学习异议均有原 notice、ops_forwarded 实据，以及 watcher 本人的逐条接收/用户可见通知回执。其中15条属于 #4/#13/#14/#27 历史 issue 研究来源，04:19逐条执行 watcher_received 均rc2：`unknown learning request; ordinary notification scope must be explicit`。显式 `--source` 的纯验源仍拒绝研究 task，不能靠补 scope 或重试解除。

原 CLI `ops/learning_requests.py` SHA `3f7afefb2307a420dd35a28e94f6b20c6bdc76ae30ce8f5cffb0dd62633e13e4`。#8 已关闭，其 R4 支持不包含本批历史研究来源。本缺陷从 #27 拆出，仅承接来源校验兼容，不继承或关闭科学父要求。

依据：Roy 在 #27 要求仅凭真实回执、经 CLI 登记；`docs/learning-requests.md` 规定 ops→watcher→Roy 通知链。集成员按 `docs/agent-board-architecture.md` 将核验发现的缺陷开单；本单目前由主管接归属/来源依赖，不触发开发派发。

## 已核范围与实施合同

五组15条：#4三条、#13四条、#14一条、#27-B1三条、B2四条。原 log/input/完整 message 的 path/SHA、单一 launch/正常退出/原 thread、逐条唯一完整原文及 notice token 已核。以下四门都要处理：

1. 历史 issue 研究 task 不属于现有 manual V6 白名单；新增独立、窄化的历史来源合同，保留现有 V6/R4/proposal/feature/legacy 门。
2. 五组冻结输入采用指定 `.artifacts` 目录及各自原 schema，不能泛化为任意路径/task。
3. #13/#14 原 prompt 无 request ID，应按原 launch.params.evidence 精确路径与冻结 input 的 request/task/batch/character/worktree 绑定；不得改写原 prompt。#27 树由原 launch.cwd/params.worktree 双绑定，不能借 B1/B2 来源。
4. 原 message SHA 指向完整列表/容器，而单条 notice 是其中完整条目；需保整文件 SHA、显式 JSON pointer、唯一完整条目/全部键值及有则原 ID 校验，不能只比 finding 片段。

完整合同、五组路径与逐条 index/SHA：

- [05:18合同及验收](https://github.com/dwroy/agent-sts2/blob/main/paper/materials/20261025-issue27-source-compat/README.md)
- [source-audit.json](https://github.com/dwroy/agent-sts2/blob/main/paper/materials/20261025-issue27-source-compat/source-audit.json)
- [15次实际拒绝及真实回执](https://github.com/dwroy/agent-sts2/blob/main/paper/materials/20261025-issue27-role-receipts/README.md)
- [原线程回执6389654112](https://github.com/dwroy/agent-sts2/issues/27#issuecomment-6389654112)

## 验收

- [ ] 原 source owner 核准五组绑定，尤其 #4 只读推导候选；主管指定开发及优先级，再沿原派发入口推进。
- [ ] 固定夹具覆盖五组15正例；B1/B2错配、task/schema/path/batch/thread/character/SHA/条目增删改和重复歧义、symlink/越界、伪 scope/父、错误 actor/queued receipt、缺前置阶段/evidence SHA 错误等负例；拒绝前后 notice/learn 字节不变。
- [ ] 拒绝已注册父或现有 scope 冲突；历史通知来源成功不创建父 request、不证明科学父完成；旧 V6/R4 等来源回归通过。
- [ ] 仓库要求的 tsc/vitest（或授权沙箱流程）通过，交实际源码/固定验收回执及部署 SHA，经原集成/发布链验收。
- [ ] 交付后仅 watcher 本人沿同 ID/真实冻结 receipt 执行 watcher_received，独立读回后才 roy_notified；ops_forwarded 不覆盖，旧 rc2 保留。此项不表示 Roy 本人已读、认可或 ACK。

## 负责人和边界

本单 `owner:claude` / `status:blocked`，等待主管明确原 CLI 开发归属和 source owner 核准；未标 owner:dev/status:ready，不新开开发会话或改调度/容量。实现另在独立工作树，按原责任链安排，不恢复已关闭 #8 的旧线程。

禁止直接编辑 notice/learn 状态、冒造父要求、代其他角色 ACK、用 issue 评论当 ACK，或为验证反复调用生产 ACK。保留全部历史原文/旧失败，勿改 live/STOP/知识规则/ops prompt。

000402（`0ca61b2ba10a18ca2e12f5b3`）不在这15条兼容范围：它有已注册 blocked 父，原 wrapper 缺失，SHA 须为 `b1be2be174208edcafe23f3e0e47f4236560577c2752b6a02f88bd094755a765`；仍由原 wrapper/archive owner 找回原件，不走无父历史研究分支，不以 native/raw state/新 wrapper 替代。
