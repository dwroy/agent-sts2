# 本批复现与限制

任务20261011-021303-silent-boss-calibration；Roy授权新功能校准刷新，fix-batch仅是通道名。

1. git status干净，git merge --no-edit main返回Already up to date；base见base.txt。
2. 保存实际live静默boss-trust原字节、refresh和split；比live新增34个实际结局，A10，无升阶。
3. 按任务给定refresh-silent.py命令提取220完局/979尝试/398可用。默认随后以当前树模型重放；发现与固定已发布模型的69个输入不同，于未发布阶段中断，原exit130和4个部分结果保留，完全不消费它们。
4. prepare-pinned.py核缓存28f6fa91、210模型输入SHA和395历史开场/回合全等；git archive仅恢复agent源码/工具、common与silent，既有node_modules软链接；不读取其他角色知识。
5. 固定7e1193cef模型，仅重放G2QCF2R3A57K的F17/F33/F48及2控制场，--keys保持全量原始行号和逐场seed=1+index*101，每起点200样本，B2=t1/B3=pre。
6. audit-calibration-board.ts核398开场按进阶来源；audit-sources.py核977个开场offset/len/SHA和严格角色/进阶，2缺帧保持；398个完整状态与原日志完全一致。
7. finish-pinned.py仍调用指定refresh-silent.py，额外传--dataset --results --provenance，previous为live原字节。核切点/107调参keys/Platt/选择完全不变；同指纹与新previous门槛跳过均不启子进程。
8. Python12校准、8调度固定夹具；agent/原bash tools/test-sandbox.sh含tsc，PATH加入~/.local/node/bin，TMPDIR在本scratch/.test-tmp。不改测试/生产代码/门槛，不用真实LLM。
9. record-candidate.py保存新内容指纹及完整来源，不覆盖旧档案；只经根learner/ledger.py写fight/proposed及来源提交。
10. check-live.py持根ops/live-merge.lock复核；有他人未完成合并时不修改其索引/刷新/现场，不能声称已合入。通过gitleaks扫描精确暂存文件后提交，带Co-Authored-By；实际合入/发布树/版本如实回报。

首个记录中断原因的shell前置Python使用错误相对路径，FileNotFoundError未写文件；独立固定重放继续。已从正确工作树写回执，记录initial-shell-path-error.json，不隐藏失败。
不运行play/不停止对局/不联网/不安装依赖/不推送；固定外部完整检查交调度器。
