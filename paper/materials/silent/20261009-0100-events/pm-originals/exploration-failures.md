# 探索失败与更正保留

- 初期两次工具编排输入出现JavaScript语法错误，未执行对应shell；已重新发起有效读取。
- 原抽取探索中曾因无questions、result为字符串、手牌无card_type而出现字段访问错误；改按实际记录结构解析，原抽取与analysis.txt保留。
- 搜索不存在的card-effects、thief-cost及机制文件路径未找到；后来通过实际目录和现有源码定位。最后检查中误查reflex/explorer.ts、src/decide.ts不存在，正确SL引用来自combat-plan.ts导入src/sl/explore.ts；没有据错误路径作结论。
- 正文草稿和核验脚本保留；追加后发现“Jev因此选择”含未证实因果，已另追加勘误。估值、HP、伤害与死亡数字不变。
- 本次账本T7连续三帧范围最初写308031—308032；另经ledger.py update追加说明正确完整范围308030—308032。旧行保留，正文没有该范围错误。
- 原始按局号抽取、资源工具输出、先验材料、提案JSON/Markdown、CLI标准输出与错误输出、追加字节收据及最终核验均留在本任务目录。CLI写入和最终核验均成功。
