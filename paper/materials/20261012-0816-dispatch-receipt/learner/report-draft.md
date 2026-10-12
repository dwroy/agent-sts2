# 本批验证过程草稿（最终以 report.md 为准）

普通队列、silent/A10六局、十个原ID，证据与逐项缺口见proposal.md。只实现共同的单步派发审计子项，不关闭任何宽提案，不改动作/排序/权重或题面。

- 首次固定测试：PlanOutcome测试桩缺decision包装，4失败/8通过；修测试桩后12通过，补真实身份闸拒绝后13通过。原日志dispatch-first.log、dispatch-second.log均保留。
- 四个相关测试文件32例通过。撤消费者loop接线时4失败/9通过；恢复原字节13通过，见dispatch-withdrawn.log、dispatch-restored.log和red-green.json。
- 首次完整入口在tsc暴露requested_action的unknown/JsonValue不兼容；改为显式toJsonValue，原失败sandbox-before-commit.log保留。
- 修正后完整入口tsc通过，vitest为322文件通过/1文件失败、3188例通过/1例失败。唯一失败是既有ops-autoplay-reload.test.ts的old_loop_resumes_even_if_restoring_the_pidfile_fails子进程5秒超时（实耗5670ms，status=null）。没有改原测试、排除名单、阈值或生产规则。
- 按任务高负载重跑一次，SANDBOX_WORKERS=2，仍调用原bash tools/test-sandbox.sh；结果待真实回执，不能提前记成功。
- gitleaks暂存扫描退出0；尚未提交或合入。工具层一次bubblewrap构建因项目外失效路径失败，未执行该命令；同工作树安全重试成功，没有读写项目外文件。
