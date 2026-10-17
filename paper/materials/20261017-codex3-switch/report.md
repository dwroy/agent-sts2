# codex3 主线换号事务

Roy 2026-10-17 23:29 经Claude授权，23:32明确暂停regent不在事务。唯一id=codex3-20261017；watcher原native01a13dcd仍留codex1，等待Claude另行换号。原用户消息的原生offset/长度/SHA及精确项目副本见original-task-native-bindings.json。

## 已完成准备与控制器修复

两个新隔离home在ops/codex-ops/accounts/codex3/{learner,brain}。auth只软链接/home/dw/.codex3/auth.json，未读/复制凭据；没有全局AGENTS、hooks或插件。profile为gpt-6.1-sol/xhigh/default，原两个实际checkCodex均模型可用，learner/brain各9项key隔离通过，CLI0.163.0。learner仅补与原隔离home等价的本仓库trust，避免interactive bootstrap信任对话；模型/权限/服务档未变。参考OpenAI Docs配置说明https://learn.chatgpt.com/docs/config-file/config-basic，实际验收以本项目检查/原生会话为准。

R355只允许原main Silent及codex1 brain home，codex3不命中；原run.sh也只在codex1 home设置该例外。普通额度保护继续，不为换号降低门槛。原codex1历史profile及本watcher配置未改。

首次prepare/run后已阻断新准入，当前局和学习者自然结束，未创建STOP、未重启局或停止任何LLM/学习者。原ops本人完成ready_to_drain交接；旧控制器误把暂停regent（共用旧learner home）和主ops常驻code-mode-host当旧账号在途，形成永远等不到的排空。实际PID/父链与独立runtime证据留原件。

独立WT llm-switch-scope-20261017最小修复两叶：用显式实例选择器或私有binding/runtime证明区分外实例；只有官方source ops foreground及其常驻code-mode-host不作为待排空任务，真正ops子模型、main brain/learner/play、unsettled仍阻止ready，身份冲突失败关闭。source e4a07e30f86c6bb639fb4e43cc808e9d599220f3已窄集成main bb7f17d00989f142bb495cb63cada2eab9351eda；其他暂存项逐条保留，live/regent源码和配置没改。

20 Python固定题0、独立tsc0/gitleaks0。初版范围收窄时仅自有测试runner被SIGINT，原130保留；最终完整入口full1仅新WT缺既有logdb解释器（其余479文件4405题过），链接补好后同源原失败题+paths12题0。原ops本人正式接受组合证据；不称full0，不重未变源全检。

原控制器PID1889073/birth见controller-reconcile-interruption.json，在真实draining/无activation、原旗/target仍归本id时，仅向该一次性控制器发SIGINT，确认退出。未向模型、对局、学习者或宿主检查发信号。之后才在Herdr启动同ID唯一接续控制器（controller-resume-start.txt），不存在重叠控制器或第二事务。

## 当前验收边界

控制器继续等待原H2唯一精确树宿主worker1992633自然收尾，之后才能正常quit空闲旧ops、安装home/cron选择器并新建codex3 ops UUID。新模型/强度/home/服务及本事务owned flags释放需实际回执，不由本记录预填完成。完整结束状态以completion.md及最终controller读回为准。

regent的STOP/PAUSE/home/session原字节基线已保存；不得恢复或移除其标记。watcher本会话不属于事务，不跨账号resume。控制面complete不等于新learning完成或自然采用；新brain/learner原生消费由原正常派发记录，不能为证明换号额外开局/模型。

## H2并行交付

H2 A/B/C source89bec47ab4已由原ops窄合live017453260488d82709423fe76dbd1152d22de2c7/treef53b07d7ed22b7c25d72c9c3965ad742ad8e889e，纯shadow不加号，R388保持。42题历史回放与Jev结果见../20261017-human-pace-h2-fix/report.md；仅同三历史局，Jev一致18/37未提升，不转on、无自然监听/其他新阶段。

## 最终结果（2026-10-18T00:17:58.463510+08:00）

事务已complete，bootstrap0，新原生ops `01a14a9f-38e7-78e2-95d0-ba274d4b3e19`，实际模型/强度/服务、两home、cron、auth symlink和regent原字节已核；两owned旗释放。详情final-controller-readback.json/completion.md。H2实际精确宿主532文件5229过2跳/0已独立核log SHA。历史source full1、scope prelim130及所选补验0永久分别保留。
