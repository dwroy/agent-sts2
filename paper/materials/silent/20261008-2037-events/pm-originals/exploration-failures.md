# 抽取过程保留记录

初次摘要脚本直接取每条决策的chosen，遇到map/route-change的记录没有该字段，报KeyError: chosen；该脚本未修改原始日志或授权记录。随后改为读取可选字段，成功生成decisions-summary.txt并完成444条核对。

首次按猜测文件名检索reflex/potion-model.ts及reflex/potions.ts，rg返回文件不存在；随后用rg --files找到真实入口card-model.ts／combat-plan.ts，核对observedPoison接线。未修改代码，没有把检索失败认作游戏bug。

终端的早期长输出曾被截断；随后保留按局号抽取的完整JSON及专用摘要，不用截断片段补数字。原始日志保持只读，复盘追加后重新grep所得states／decisions与初次抽取逐字一致。验证原复盘前缀保持、追加稿逐字一致、ledger检查0问题，未需追加勘误。
