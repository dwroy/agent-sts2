# 只读取证命令失败记录

早期用历史manifest起点读取CA5首帧时，该帧在局开始阶段，`state.combat`为null；试图枚举combat键导致`TypeError: 'NoneType' object is not iterable`。输出曾过宽，未写生产文件或测试结果。

随后取证脚本将null按空值处理，只保存本任务相关楼层的COMBAT帧；原日志流重新核对成功，evidence-verification.rc和evidence-analysis.rc均为0。该失败不涉及策略、源码提交或游戏运行。
