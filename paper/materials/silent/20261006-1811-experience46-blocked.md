# 第46批经验更新未上线

2026-10-06 18:15，处理18:11 experience-done 20261006-174301-experience-update。任务exit0表示学习者完成回报；最终tests.vitest=1、merged=null，未通过合后检查，不能登记为成功上线。

- 学习者源620513afddeae6cf3cfc14cf0adabce4be7f9e40已提交，仅修改静默experience.json。版本2026-10-06.20→.21，新增1、更新8、退役0，分支active121、55094字；来源XBD8Z9XLPCPN SILENT A10，另含学习者引用的旧本角色证据。运维仅归档，不审核或补写策略。
- 源固定沙箱tsc0、203文件2194例通过。尝试live a6e7c05d33d628ce68ec8d999fbd0e5bfe9a409d，合后首轮和重跑均tsc0、201文件2182例通过/1失败（共202文件2183例），paths池未运行。唯一失败boss-clock.test.ts:191要求>=9、实值8；回退3599ab0ae3be80d13b77f57f5af8b785cb09c437后同单例仍失败，1失败32未选择，原.rc=1保留。这是已有基线检查阻塞，根因交修复批次；不据该失败证明经验导致回归。
- 锁内预检0、知识重叠为空；学习者保留刷新及实时工作区并回退。运维只读观察live当前ae8008c9bc6a43c846de9d50df523f6b707371e9，源不是main/live祖先，尚无S1.exp46。后续运行的fix批次可能正在推进live，不能将其未完成阶段当本经验发布。
- 原第46节22491字节、SHA256 af95a0806e72f1995d51837b05d4d35393f320ea4feada278f3e63ad6009f97c；原11行CLI/by=learner:experience-update proposed、SHA256 e5ecb997e269e4a05d76a4b6064003aa8d311cfe6a86e338eb8c219c118a056b，一并归档。旧first_run/prior/evidence/claim/旧版本及shipped_at历史保持；0186待合策略及0187/0188复盘记录独立，不代登记shipped。
- /home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 188 item(s), 0 problem(s)。17:55已派的20261006-175455-fix-batch（PID3607978）本轮读取为running，继续处理最高优先同一基线问题，不重派、不抢工作树。

后续从修复完成事件续办：确认基础测试修复和合后检查通过，再核源是否已携带；若仍缺，按锁内live流程保留刷新、合入已提交源、合后通过后登记唯一行为版本及11项CLI/by=ops shipped、同步main并请求完整外部检查。待合0186策略另行登记。保留所有原失败记录，不改断言阈值、排除名单、机制公式或刷新数据来过测；后续学习者压缩仍按原预算，不由运维改知识。无新Roy待定，不停对局。

原字节证据：

- paper/materials/silent/20261006-1811-experience46-blocked/handoff-ops.md：2124字节，SHA256 36bb2d4bf1a5cf9ffef27a355b400b045b3e00135acdd25f0896e19a35a42a9f。
- paper/materials/silent/20261006-1811-experience46-blocked/report.json：821字节，SHA256 16ead33c201a1851ac4dcb87a1b7ea3c475d9bb75694ec3119521a4782a3bb9e。
- paper/materials/silent/20261006-1811-experience46-blocked/live-merge.json：4354字节，SHA256 6f6e0d3b27a8b9b3397da019917b2ed17c92483190f7fe9a14852179715175d1。
- paper/materials/silent/20261006-1811-experience46-blocked/commit.txt：41字节，SHA256 7ca447721750c6923daa0cf7bbaeda1d5900a2f33a279d90d9e480a3704f28d4。
- paper/materials/silent/20261006-1811-experience46-blocked/baseline-live-case.rc：2字节，SHA256 4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865。
- paper/materials/silent/20261006-1811-experience46-blocked/test-source.txt：491字节，SHA256 32ab2e3ec4f61e49557c85993c921f79170daa7c3a5a6fc5a2839c884cb2704e。
- paper/materials/silent/20261006-1811-experience46-blocked/test-live.txt：1177字节，SHA256 1c51d607d9630411f21dc97a9146938cc906b9cba65b161a91db9f7f434ced4d。
- paper/materials/silent/20261006-1811-experience46-blocked/test-live-retry.txt：1177字节，SHA256 ca75078dafe01742abbad08ce0398f29a2e154195e84b7fb1fe8a0a6c7dd3058。
- paper/materials/silent/20261006-1811-experience46-blocked/baseline-live-case.txt：1163字节，SHA256 c4d245cd18932e131769781813f70d80d29cab4f4a59a762c1e751ac2b32ceea。

- 2026-10-06 18:50 追加实际去向：原第46批620513afddeae6cf3cfc14cf0adabce4be7f9e40/.21已随第47批0723092c1d575122896945935e5b55d89983c57d/.22实际合入live a95d92ecee0152abcb433b00b3aa0305d3fa2e43、固定发布0020f8f5e720b274069e0102814ad45056e883fb/唯一S1.exp47，main同步6fb21697765cc012c44ee1d13dc75045e8a340fd。源203文件2194例及合后204文件2203例通过；原46的11项proposed映射机械核对后，同本批20项去重共23项由CLI/by=ops登记S1.exp47 shipped（原46独有0079/0184/0185）。未新增S1.exp46版本，以上失败/回退/基线复现历史完整保留，不改此前blocked事实；完整外部补测等第47批learner-checks，详情paper/materials/silent/20261006-1843-experience47-release.md。
