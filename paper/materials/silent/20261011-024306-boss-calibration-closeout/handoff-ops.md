
## 本批测试与实际发布状态

2026-10-11 02:50:39 CST：固定模型候选已完成，尚未发布。锁内live=56268f61928e0330d91293e585efab075839bb4a，他人MERGE_HEAD=a83d9ab675560a177249aa638e99df40bcfb5553，19个未解冲突；本批未改live索引/刷新，未启动自己的合并。
这是已有合并现场阻塞，无需Roy重新批准；只有原合并拥有者完成/撤回其合并后才能继续本批锁内发布。
没有本批源码合入可回退，刷新和原冲突全保留；实际源码合入、固定发布commit/tree、新eval版本均null。
现有live仍为S1.boss-calibration11。本批账本silent-0399只经CLI记fight/proposed及来源提交，shipped交运维确认。

开工git status干净，git merge --no-edit main为Already up to date；base=69aa49a9085a693a67388fb529d48530d8f0bc54。
最终原沙箱入口含tsc退出0、265文件/2681用例通过；Python12校准和8调度固定夹具通过。
生产源码、测试及固定排除名单不变。全套外部检查交实际合入后的调度器，未冒称运行。
固定模型210输入SHA、399完整开场状态、978来源offset/len/SHA核实，两控制战四起点除耗时外完全一致。
107调参keys、UTC切点、Platt与模型选择均不变；同内容与更新previous门槛两种幂等检查通过。
预检判断仍按四指标，A0–4/A5–9各0独立验证且各差10场；F49数量已足、质量仍不达标。
A10输入审计中48项攻击伤害取A10记录，TEST_SUBJECT/BIG_POUNCE一项沿固定模型的A9估值；不冒称本批已验证其机制。
A10汇总打穿比B2/B3为1.289/1.303；原门槛逐boss分别执行，不能把整体胜率残差合格当作全体可信。

本批直接先以原character_extract.py冻结数据，再按210输入SHA恢复已发布固定模型，用原refresh入口的
--dataset/--results/--provenance参数完成刷新。没有启动当前生产模型的不同参数回放。
第一次准备脚本提前于提取结束读取fights/extraction文件，FileNotFoundError/exit1原记录和脚本保留；
待提取exit0后复用已恢复模型并核210项SHA，准备重跑通过，未消费部分模拟结果。
Python/调度固定夹具和沙箱测试的TMPDIR始终位于本scratch/tmp。

本批只有静默校准数据、来源、论文及记录变化；不修其他队列bug、不改费用/药水/保血/目标/SL阈值。
code_proposals=[]、implementation_domains=[]。现有实现cdf75af64和固定模型7e1193cef均核为live祖先。
本表只验证固定模型，不证明后续生产模型变化或整局通关收益。

后续按锁内完整流程先保存刷新含新增数据、检查重叠/预检、合入固定源、合后沙箱测试，再登记唯一eval版本及通知。
合后失败须保留日志并回退本批合入、保留原刷新。原件与最终源提交回执见scratch/result.json及source-commit.txt。
