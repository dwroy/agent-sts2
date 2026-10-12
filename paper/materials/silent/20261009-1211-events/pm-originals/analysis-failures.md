# 临时抽取失败保留

- 首次概要检查把questions当列表，实际为字典，报AttributeError；改按字典读取后继续。
- 首次details.py假定每条决策有chosen，遇元数据行报KeyError；改用get后继续，初版脚本输出和后续派生文件保留。
- 首次账本汇总把所有检索结果按同一类型处理，报AttributeError；随后区分find列表和show对象，未通过该失败写入账本。
- build_tables.py的打印计数变量未累计，显示药水表0条；文件实际25行，numbers-audit-v1已按行数和资源变化校验，不把该打印当真实药瓶数。
- 草稿v1中融合事件表述不够准确，正式版v2改为原决策中的两次融合选项；v1保留。

这些是离线抽取脚本问题，不是对局代码bug；失败阶段尚未追加lessons或账本。

- 两项提案CLI写入已成功，后置汇总误把纯文本id当JSON读取，报JSONDecodeError；按文本读id后核注册队列与Markdown指纹一致，没有重复登记。
- 首次追加后grep核验写死JSON冒号后的空格，原状态为紧凑JSON，导致筛选为空并AssertionError；改为允许可选空白的regex后关键数字核验通过。正式复盘数字未错，不需勘误；字节seek复核2121项始终通过。
