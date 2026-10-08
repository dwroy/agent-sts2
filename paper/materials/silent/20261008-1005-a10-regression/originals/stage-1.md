# 静默 A10 回退排查：阶段一

冻结切点 2026-10-08T01:05:21Z；基线2e2b48aa6e954daf02aa7cfc6a82eddc58bcc5cf。83完局，K2JAGKVJAWZJ在局排除。77Codex-only、5DeepSeek、1mixed。按启动源码double-boss祖先分组：56/27，F33=25/56→15/27，F48=11/56→6/27；Codex-only 50/27，F33=24/50→15/27，F48=10/50→6/27。每组Wilson95、逐局启动/配置/独立局与SL见statistics.json和sample-table.json。不能以此宣称随机波动或无bug。

双boss源e1a467e门控角色SILENT/进阶10/act_id+1=3/LEVEL_10，F48终局估值只firstDoubleBoss，备战F<48。2488实际脑记录只有103第三幕payload连战标记、0一二幕标记；1条失败为KEN58SH9SLZ6 rest/plan overload，同题后由Codex恢复，无其他成功引擎。完整dirty知识树缺失，源码dirty_files未含agent/；两局启动与结束源码标签不同，需按启动/重启分段。

已保存冻结派生库、原日志前缀SHA/字节索引、metrics version/config原输出和tsx沙箱失败原件。后续继续出牌修复、执行闸/预测偏差、资源耗损和exp70→90历史blob及实际题面暴露核查，不仅统计结案。
