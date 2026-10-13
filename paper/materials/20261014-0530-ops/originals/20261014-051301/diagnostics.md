临时审查诊断：最近局枚举曾对character=null调用lower，抛AttributeError；改为str(value or "").lower()后读回成功。一次读取原始JSONL前105物理行产生超长输出，后续改为解析摘要；未读取整份日志、未改变生产源码。两项证据核验脚本退出0，分别1588记录/20断言。
