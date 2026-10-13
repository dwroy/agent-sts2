# 本批验证诊断原件

- 首次蛇咬定向验证 exit1：4项中1失败。测试钩子捕获了后续模拟的最后一次 solve 输入，而不是首个生产输入；修正为仅捕获第一次 solve。此错误原件 snakebite-targeted.txt 保留，第二次4项通过，未修改生产行为来迎合测试。
- 原指定目录下撤蛇咬实现 exit1：3失败/1通过；恢复 exit0：4通过。原件 snakebite-withdrawn.txt、snakebite-restored.txt；辅助源码仅用 .txt 保存。
- 首次全套命令将 TMPDIR 用agent工作目录解析成不存在的 agent/learner/runs/...；shell重定向先失败，tsc/vitest均未启动，exit1不作为代码或沙箱测试失败。纠正为任务指定scratch绝对路径后启动原 bash tools/test-sandbox.sh，未削减固定名单或超时。该错误仅终端日志记录，未在错误位置建立目录/临时文件。
- 开工 main 合并为 Already up to date；初次只读 live 合并预检 exit1：15个既有记录冲突，源/记录未修改。预检是集成诊断，不是源码测试。
- 本批原生启动日志核 model=gpt-6.1-sol；原请求参数为 xhigh / service_tier=default，实际thread保留。未把任务模板的high文字冒报为运行参数、未改账号/权限/模型。

- 首轮蛇咬完整沙箱：tsc0；vitest1，378文件376通过/2失败，3613通过/2失败，630.73秒。ops-herdr原夹具超时15000ms、rollout-live原矩阵超时120000ms，均明确Test timed out，无数值断言失败。原名单不变，以SANDBOX_WORKERS=1单次重跑原全套脚本，原失败原件保留；不把重跑启动当通过。

- 06:14左右一次只读检查在命令执行前被sandbox构建拒绝：rg遍历另一修复工作树正在回收的loop-time-cap临时目录出现ENOENT。相同只读命令原权限重试成功，不降低权限/屏蔽边界；正在运行的完整沙箱重试未因此中断。不把此拒绝记为源码或测试失败。

- 原源码单worker重跑 tsc0/vitest1：378文件377通过/1失败，3614通过/1失败，1367.12秒；首轮两题已通过，新失败是 strategy-research-scheduling 外层15秒超时（内层spawnSync本来允许30秒）。未倒写首轮结果或称全套通过。
- 药水首轮定向7项中2失败/5通过：新守卫错误假定空手。逐帧核原件后确认实际剩打击/致命毒药/带毒刺击三牌均playable=false，energy=0；改为精确无可打手牌条件，不改实测输入。初稿和失败保留；修正后7项全过。
- 完成第二项源码后，对最终固定工作区再跑原sandbox全套，SANDBOX_WORKERS=1、Vitest外层testTimeout=60000；所有原测试与固定排除保持。原夹具内部30秒子进程上限、显式120秒rollout矩阵限制及生产推演预算均不变，不新增排除、不修改运维测试源码。此结果只报告实际本次检查，不覆盖原两轮失败。
