抽取初稿失败记录：

1. inspect-initial.py.txt 因两条 map/route-change 无 chosen 字段抛 KeyError: chosen；初名 inspect.py 还遮蔽了标准库 inspect，异常回调出现 signature 属性错误。改名 audit_run.py，改用 get 后原始抽取数据不变，重跑成功。
2. metrics-initial.py.txt 将样本不足时的 act_boss_sim 字符串当字典，抛 AttributeError: str object has no attribute get。增加类型检查后重跑；原脚本初稿保留，数字仅采用成功产物。
