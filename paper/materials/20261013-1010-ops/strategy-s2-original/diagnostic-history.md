# 本批读取、分析与初稿历史

以下均为本批工具/分析过程，不是生产bug，也没有改变游戏代码。原宿主工具输出保留；对应成功复核材料在本目录。

1. 首次递归找learn.json批次时把包含批次key的父对象输出，造成大量输出截断；没有以截断对象作身份判断。下一次直接按根对象key取值报`KeyError: '20261013-094149-s2-strategy-proposal'`，随后按真实`batches[batch]`完整读回，保存dispatch.json。没有修改learn.json。
2. 首次批量读文档/原提案输出预算导致截断，随后重新分别读协议、最新STATE和十份保存的原提案。第一次源码定位用不存在的`agent/src/brain/combat-plan.ts`，rg报No such file；后按真实`agent/src/reflex/combat-plan.ts`读取。不将不存在的旧路径当当前缺代码。
3. 原日志schema探针初次取文件首行，读到了非本角色的结构示例；仅查看字段结构，未使用其游戏值作任何结论。随后所有实证先核15局SILENT，再按实际run字段过滤；没有读取或搬用其他角色知识文件。首个非战斗state的combat=null时探针报`TypeError: 'NoneType' object is not iterable`，之后只选本角色COMBAT和nullable字段处理。
4. rg按局号文本第一次抽取命中Jev知识文本里的引用及后续其他run记录，初次raw文件保留；正式summary和selected-raw均验证顶层run归属。选中日志21758行逐offset源字节核验，不把文本命中数当本批题数。
5. 狡诈动作探针对chosen=null取.get，报`AttributeError: 'NoneType' object has no attribute 'get'`；改用`(chosen or {})`后九局42条实际use_potion全部逐帧核验。原失败不作为药水接口错误。
6. 沙坑探针先在玩家powers取SANDPIT_POWER，输出None；确认真实字段在敌方powers后，第2次T7末4、第6次末5，独立断言通过。没有把初查None解释成缺沙坑。
7. 资源概览先显示1913 F31最后COMBAT的20HP；明确终态282783 GAME_OVER为0，报告使用真实退出。Q6 F9同理采用282921终态0，不把末可操作2HP当退出。
8. proposal.md第一版的精确切击说明含一处无意义转录字符串，已立即改为原帧7→6→5手数、敌262→256→250→245及实打5。此处是文字更正；没有影响原始证据或24项独立断言。

9. 正式source-provenance.json捕获live为5e85bbf9，而此前单独git查询为e8773abf，期间live并行前进。初稿误把此前查询写为源码快照，最终独立核验发现差异后更正为正式固定5e85bbf9；旧report.initial.md保留。祖先、blob与源码.txt都按正式固定提交核，不混用两个head。

最终无新源码/规则、没有撤源码红绿测试或tsc/vitest，不能从上述分析器修正冒称策略实现成功。原十份提案Markdown、原日志抽取、字段初查结果与源/base/live指纹保持。
