# 抽取过程保留事项

第一次detail.py在读取没有questions字段的代码自主决策时返回KeyError: 'questions'。已经产生的detail.txt保留；初始inspect.py与Python标准库inspect重名，异常处理曾附加AttributeError，初稿现以inspect-initial.py原字节保存，未删除。后续按get('questions', {})读取，关键数字另由verify.py直接回查原始偏移和断言验证。

一次工具启动因另一个并行工作树的.codex路径瞬时不存在而在bubblewrap准备阶段失败，返回“ripgrep unreadable glob scan failed”。原命令未执行；同一只读检索随后成功。没有申请扩大权限、改别人的工作树或删除失败产物。

以上是抽取工具过程问题，不是对局纯bug。复盘追加后发现同族T9攻击时点描述和F8事件中文名两处表述不准，均在本局尾部追加勘误，未修改已写正文。
