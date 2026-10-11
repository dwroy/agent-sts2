request_id=roy-20261010-silent-core-reuse-experience-integration；同请求 scope revision 2，关联 roy-20261010-silent-core-output-value 与 roy-20261010-silent-deck-size-value，不再派第二个历史研究。

204 局核心输出研究 20261010-205441-strategy-proposal 已 done/rc0，七项范围和原件 SHA 验收通过；新候选 silent-0385，报告 SHA 9c47fea393bdc79c64b388ef8210bfe3ff4cdc6360efbe6b60e892b4153d37fd。已与旧 0374/0376 合并为唯一既有经验入库请求，现行绑定 notes/experience-integration-silent.json，scope_revision=2、state=pending、batch=null；任务说明与全部归档在 paper/materials/silent/20261010-core-output-value/result-review/。旧四核心 done 请求完整另存，0376 revision1 pending 原件保留但由同请求 revision2 接续，不复派旧范围。

接收时先读最新 canonical 请求、learn.json、exp 租约和宿主进程，若相同请求已有实际批次/入库映射则仅承接该批，不能重派；不要用旧 revision1 覆写现行请求。当前观察占用者是 20261010-214303-experience-update / wJ:pEG，宿主 wrapper PID332203、launcher PID332214 已核活；不改其任务，不清 exp 暂存。该批结束后，经原 host write 入口优先派本请求的九个 dispatch_runs，固定绑定实际 batch/PID/pane 和请求/spec SHA。原入口命令为 bash ops/codex-ops-do.sh experience-update ZZMYZ5UBCG72,C48LLXBGKXQ9,K3676LU8B0UH,L704TLETMZBM,4Y94N8RDPGPM,KV0JHNJCKXLS,J8PHG72DGD90,4XLZURXMD872,49HL2N70CHMU 。根模板已有全历史报告入库补充，已核 exp 模板同 SHA 46e507d7187678251f7fe0e0cfa1c10c4902120367ed3984b1579a03de4688d0；无需再次修改入口源码。

旧经验批 20261010-205441 源 ef12130b05eff7998f7360fc54ce34afffbebbaa 自测0但 live 有19项冲突未合入，沿原兜底通道保存双方并核实实际发布，不能把运行中的 exp 树当固定源或强覆盖 live；当前新候选尚不在 live 2026-10-10.8/208条中。三研究仅形成少量综合经验及必要旧机制修订，不是 ops 写游戏结论；学习者按证据裁定，原提案沿既有链，未实现不写 shipped。

用户最新设置为仅 learner gpt-6-astra/xhigh 且关闭 fast，部署记录见 paper/materials/20261010-learner-astra-xhigh/。派发时核实 root 启动入口已有该设置，保留 ops/对局模型和fast。新 tab 与 ops 同 space，正常完成后自动关闭。报告完成、条目入库、实际 live/版本、消费者读取、自然采用和效果分别记录；实际发布后给 Roy 最终经验原文，双收件箱关联 batch/report SHA，并更新既有效果跟踪，按自然20局窗口保留失败/反例和未验证范围。

continuation_id=roy-20261010-silent-core-reuse-experience-integration-r2-publication
本轮标准宿主派发实际返回 exit1 / dispatched:null；原 exp 批 20261010-214303 仍登记 running、占用 exp，未派新批。入口已在 main b857f299fa14e62eb9aab55100174d2a1d09d3f2 激活 Astra/xhigh/fast关闭，265文件2681测试+10启动测试通过。若本事件到达时仍占用，保留此唯一pending，随原批完成事件接续；不要重排相同manual造成循环，也不要创建重复研究或打断当前任务。
