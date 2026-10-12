# 保留的抽取失败与纠正

初次 summarize.py 在map/route-change没有chosen字段时出现 KeyError: 'chosen'；summary.txt保留原已输出部分，后续summary-v2.txt保留使用get后的完整原件，最终数字以numbers.json、audit.txt和numbers-audit.json为准。一次临时状态摘要在非战帧event为null时出现 AttributeError: 'NoneType' object has no attribute 'get'；该读操作未改变原始数据，所需名字随后从states.lines及metrics.txt直接核实。两处敌人中文名首次追加时不准确，已在原小节后追加勘误，没有修改原文；数字复核没有发现不一致。
