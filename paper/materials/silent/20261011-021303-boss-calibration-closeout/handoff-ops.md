
## 本批测试与实际发布状态

2026-10-11 02:26:48 CST：固定模型候选已完成，尚未发布。锁内live=56268f61928e0330d91293e585efab075839bb4a，他人MERGE_HEAD=a83d9ab675560a177249aa638e99df40bcfb5553，19个未解冲突；本批未改live索引/刷新，未启动自己的合并。
这是已有合并现场阻塞，无需Roy重新批准；只有原合并拥有者完成/撤回其合并后才能继续本批锁内发布。
没有本批源码合入可回退，刷新和原冲突全保留；实际源码合入、固定发布commit/tree、新eval版本均null。
现有live仍为S1.boss-calibration11。本批账本silent-0398只经CLI记fight/proposed及来源提交，shipped交运维确认。

开工git status干净，git merge --no-edit main为Already up to date；base=d85a84afe56f8aaee428ef74f89ec6f73cce3717。
最终原沙箱入口含tsc退出0、265文件/2681用例通过；Python12校准和8调度固定夹具通过。
生产源码、测试及固定排除名单不变。全套外部检查交实际合入后的调度器，未冒称运行。
固定模型210输入SHA、398完整开场状态、977来源offset/len/SHA核实，两控制战四起点除耗时外完全一致。
107调参keys、UTC切点、Platt与模型选择均不变；同内容与更新previous门槛两种幂等检查通过。
预检判断仍按四指标，A0–4/A5–9各0独立验证且各差10场；F49数量已足、质量仍不达标。
A10输入审计中48项攻击伤害取A10记录，TEST_SUBJECT/BIG_POUNCE一项沿固定模型的A9估值；不冒称本批已验证其机制。
A10汇总打穿比B2/B3为1.287/1.302，B3略超1.3；原门槛逐boss分别执行，不能把整体胜率残差合格当作全体可信。

任务原始refresh命令成功提取，但默认以当前树模型重放；为维持固定已发布模型，中断未发布重放exit130，
原始部分结果保留在scratch/177c505ffdb8ca493d13b2a563a63f4b4645e2cddd5e41b210ee8caf124a75c8，未消费。
后续仍用原refresh入口，额外传--dataset/--results/--provenance并用已核固定模型结果。
一次记录中断原因的前置Python相对路径错误未写文件，独立固定重放继续；错误回执保留，已从正确路径记录。
最早Python/调度夹具临时目录曾使用默认/tmp，原输出保留；最终在scratch/.test-tmp重跑同固定夹具，均通过。

本批只有静默校准数据、来源、论文及记录变化；不修其他队列bug、不改费用/药水/保血/目标/SL阈值。
code_proposals=[]、implementation_domains=[]。现有实现cdf75af64和固定模型7e1193cef均核为live祖先。
本表只验证固定模型，不证明后续生产模型变化或整局通关收益。

后续按锁内完整流程先保存刷新含新增数据、检查重叠/预检、合入固定源、合后沙箱测试，再登记唯一eval版本及通知。
合后失败须保留日志并回退本批合入、保留原刷新。原件与最终源提交回执见scratch/result.json及source-commit.txt。
