# 本次只读检查与临时脚本限制

1. 首次按scratch时间查调度batch键20261008-064305-strategy-proposal得到KeyError；实际batch为20261008-064303-strategy-proposal。随后仅选择本时间段、silent、strategy-proposal的唯一batch并保存原件，未改调度状态。
2. 数次rg定位使用了不存在的路径agent/src/reflex/*.test.ts、agent/src/telemetry等，返回路径错误。实际路径在agent/tests和agent/src/eye、agent/src/hand中；没有改变源码。
3. 早期打印旧核验行或run结构的范围过大，工具截断输出。后续仅保存原件，并按本批六局与指定层/回合输出固定字段；不从无关角色摘录学习或搬用规则。
4. 原日志冻结脚本在最后打印debug键时遇到run=null而TypeError。之前六局states、decisions、run-config、sl-attempts及source-evidence-manifest.json已完整写出；后续独立重新解析原件、核对角色和counts并完成成对验证。该退出1不代表源码或测试失败，不报测试通过。
5. 初版evidence-summary.json在相邻两个纳入的层之间沿用了尝试计数，已在同一scratch纠正为换层重置、同层turn回退递增。最终成对样本还独立匹配sl_attempt与相同fingerprint；原始逐帧证据未改变。初稿摘要曾被原位修正，现按原算法从未改变的原帧重建并另存evidence-summary-initial-reconstructed.json，明确为重建件，不冒称保留了原文件的原始字节。
6. base-merge-preview.txt由只读git merge-tree生成，其冲突不是现场live合并失败。没有运行live merge、reset或覆盖记录。
