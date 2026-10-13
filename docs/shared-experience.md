# 公共经验共享

Roy 2026-10-13 要求「能通用的经验应该是需要大家共享的」。这是共享范围和架构授权，具体游戏结论仍从实盘学习。

## 存储与读取

knowledge/common/shared-experience.json 是已核实通用经验库，根对象为 version、entries。条目沿用 ExperienceEntry，并增加 shared：independent_of_character=true、reason（通用性理由）、conditions（条件）、sources。每个 source 记录 character、run_id、experience_id、evidence_path、evidence_sha256。ID 为 common- 前缀，证据局逐项有来源；不能依赖源角色统计占位符。

agent/src/knowledge/shared-experience.ts 校验记录完整性，不能代替学习者证明通用性。缺文件表示尚无已发布条目，存在但损坏必须报告。

全量知识提示、知识查询、普通经验切片和战斗经验提示读取公共经验加本角色专属经验。条件/来源随公共条目显示，不读其他角色原始复盘、不把来源局冒称消费角色验证。有效状态和进阶范围沿原规则筛选，文件变化使缓存刷新。实际 full 大脑请求记录 shared_experience_version/shared_experience_ids；读取成功不证明自然采用或胜率收益。

## 学习与发布

学习者从新复盘及授权旧经验筛选通用结论，解释角色无关性和限制；general 范围不是证明。牌值/构筑/胜率、房间代价、药水换算等角色统计保持分账。限定结论和反证可共享，缺证留候选；原条目/账本/反例保留。

主 ops 在主 live 集成锁内精确合入公共经验叶子及关联已测源码并登记正式发布编号。独立通道候选交主 ops，不相互覆盖公共库、整分支合入。各通道精确同步主 live 已发布公共文件，保存源提交、版本、文件 SHA、消费者读取回执；日志和角色数据保持私有。自动事实构建器不得清空/重建此提炼库。

首次回填按 notes/shared-experience-request.json 持续跟进：已有经验筛选、去重/限制、实际发布、所有当前角色通道消费者读回。单批/报告完成不关闭父要求；缺证/异议沿 ops→watcher→Roy。每次后续经验批继续共享通用部分，新角色默认消费已发布公共库。
