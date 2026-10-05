# 最终组件成本分层发布核实

记录时间：2026-10-05 22:33 CST；事件：22:20 两件 manual。学习者按 Roy 已批准的统计架构自行自测并合入，运维只机械集成和归档。

五项源码 bd418431（安全额度采样）、637ed9dc（成本评估）、dafd280b（已登记升级爆发）、6bfbe3d2（TMPDIR测试兼容）、83b73312（日志库分层、规范采样名、每局刷新）均为固定最终发布 27f7a4d322766828bba34c72c22592b89637b04c 的祖先；最终代码 5ae08a3dfedbb1c7f7f8c627aa7556e3bda4e938，发布树 54560c457714274c6d35226b4427448232e4c6db。main 已同步 64c93b382d5bdca7c3607ce5d23a4f31555c6929，本次新增或改动源码 blob 与固定发布逐项相同，原有 main 独有 herdr 源码、测试和文档保持原样；四份旧额度/失败/阶段上线/复盘档案保留。旧90项源码祖先清单已核对；本轮未另设内容审核。

最终源 component-complete-sandbox.log 与合后 component-live-sandbox.log 均 tsc 0、178 文件 2013 用例通过。分层 Python 9 例随固定回归检查，撤源码出现失败、恢复通过；既有 component-existing-logdb-tests.log 为 Python 35 例 OK。component-final-sandbox.log 的 Inferno 指纹断言首次失败完整保留（177 文件：176通过/1失败；2001例通过/1失败）；component-settle-retry.log 单文件4例通过，随后 component-release-sandbox、component-complete-sandbox、component-live-sandbox 全套通过，未删除或改写首次日志。

完整外部检查已通过白名单提交 `bash ops/codex-ops-do.sh learner-recheck 20261005-204301-fix-batch`，结果另追加；未将此前 d5a4f6fc/b248ad37 完整228文件2820通过/2跳过冒记为最终分层树通过。原 ba54713b/TMPDIR 完整失败、固定环境对照和 d5 修后通过历史保留。

main 五分钟 tick 已开始向 logs/codex-usage.jsonl 追加规范额度样本。一次读取已存在的样本：2026-10-05T14:30:02.681Z 落盘，fresh，周窗口 10080 分钟、使用 47%、重置 2026-10-11T07:07:58.000Z；5h 未返回，旧缓存43%仍未知窗口/时点。兼容读取 logs/subscription-usage-snapshots.jsonl，旧历史未覆盖；刷新后的 cost-sources.json 已同时列出两者切点，bad_lines 为空。只读取已落盘样本，未等待下一 tick。

新 component_usage 导入学习批次与运维会话用量，与 llm_calls 统一查询；已有 knowledge refresh 自动同步，report 独立 nice 后台刷新成本。运维执行一次 `nice -n 19 python3 ops/refresh-costs.py --root /home/dw/Projects/agent-sts2 --code-root /home/dw/Projects/agent-sts2`，exit0；只刷新组件成本表/来源清单/说明页，未重建对局知识或再次全扫原始 states。成本表保留缺失服务局号的学习批次为 unattributed；Codex $500/月、Claude $200/月和月费×12/52方法沿用 Roy 决定，Jev TypeSafe价、Claude实时额度、早期日志覆盖及共享账号使用仍未知/部分覆盖，不把已知费用合计当完整总成本。

S1.fix21 仍唯一指向 e7370f88，证据 VN7RQJMJEFMX SILENT A6 F27 T6/机制0115；此前0115代码上线和0114普通版已 shipped 历史不重复登记、不重置。此批无对应 bug-infra，不补建或冒标游戏账本；日志统计不新增对局版本。本次未改台账、经验、提示或SL名单。

live 七项 tracked 知识刷新及 fight-value-gates.json、fight-value.json、notes/fight-value-backtest-silent.md 留在原处；main 合并后读取时10项 SHA256 均与合并前相同。未停止对局/调度、未运行 play；未来 live 合入继续在锁内保留在线刷新。其他工作区修改不随本轮提交。交接报告原件 learner/runs/20261005-204301-fix-batch/{report.json,report.md,handoff-ops.md} 保留。
