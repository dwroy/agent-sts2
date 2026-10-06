# 静默猎手策略提案：休息题单列南瓜蜡烛的现场充能与续火条件

建立时间：2026-10-06 17:31 CST（写入前已执行 date）。工作树开工干净，git merge --no-edit main 无冲突快进到7a12f63eacd5c1c07ac43d9091e972333a78593b；新分支strategy-proposal-20261006-172733。独立执行，不派子agent。

十个指定来源局均逐行核对logs/runs.jsonl为SILENT A10：PJ2LL9KU7FHD、L9SGRBB5R698、D4LJ9QMGFB8Q、S9UZAK0JP0C0、UJ0K3G10609Y、U8K28UUGYP3U、MCCK2602T1SR、0NZXA12NLDMH、4ANT8D00TP72、XBD8Z9XLPCPN。只从静默日志、复盘及本角色账本学习。

## 来源及证据

选择fix-queue-v4.md的08:33已批准「路线和休息」事实子项。已读既有策略1—6提案及当前实现，本项不重复它们。既有账本silent-0184（续火计划与实际分账）、silent-0185（充能/能量观察）、silent-0020（休息缓冲）。本项另登记独立策略条目，旧条目状态与历史保持。

通过extract-evidence.py重新读取原始states.jsonl的两个限定字节窗口，逐帧核对局号、SILENT与原始现场，证据留在candle-evidence.json。958帧UJ局及552帧XBD局（seek跳过首个边界帧，不冒记完整553帧）；多次SL同场不计独立样本。

| 局号 | 层／回合 | 观察 | 用途 |
| --- | --- | --- | --- |
| UJ0K3G10609Y | F29，回合不适用 | KINDLE添火前0充能、77血；动作后5充能、仍77血，随后MAP也5充能。 | 已执行的0→5充能和添火本身不回血。 |
| XBD8Z9XLPCPN | F24／F28／F32，回合不适用 | 营火现场分别3／2／0充能，HEAL、SMITH、KINDLE均启用；F24锻造后仍3，F28回血30→51且仍2，F32回血2→23且仍0。 | 回血、升级与续火分开；当前事实应展示充能而非仅通用遗物模板。 |
| XBD8Z9XLPCPN | F19／23／27／30／31 T2 | 轮初充能5／4／3／2／1，能量均4，run.max_energy均3；各战后扣一层。 | 正充能的额外1能量观察及战斗消耗；不凭持有遗物承诺永久能量。 |
| XBD8Z9XLPCPN | F33 T2 | 0充能、能量3；六次失败。 | 熄灭的能量不能预支；F32回血未被证明错误。 |

当前rest题只给HEAL的条件血量、遗物通用描述和原始动作描述；relicFacts不展示stack。KINDLE的构筑模拟返回「这个休息点动作不改变牌组和血量：不模拟」，没有说明充能／能量收益也未模拟。本项增加现场充能与可追溯的条件事实，避免把未来续火计划误读为已充能，或把「未模拟」理解为没有效果。

## 反例及限制

F32只有2血，回血实到23后仍败，没有添火后的受控整场结果，不规定添火优先级或固定血线。正充能时再次添火、上限、其他营火触发组合和跨路线的充能预测未验证；KINDLE仅在当前0充能时给出已见的5充能条件结果，正数和缺失stack不猜数值。UJ局还有其他能量来源，不能把该局4／5能量全部归给蜡烛；能量对照只用XBD五战和沙虫现场，不给任意遗物组合计算总能量。

## 预期行为

仅在静默持有未熔化PUMPKIN_CANDLE且休息题有可用合法索引KINDLE时，在rest_site加中文candle_refuel事实：现场充能（未知保持null）、原动作键、按已见机制的动作后充能参考、已执行的观察及来源。HEAL／SMITH的参考保持当前充能；当前0充能的KINDLE条件结果为5；其他未验证动作或正充能KINDLE为null。数值相同的充能参考标该指标并列，不把整场推演标相同。

明确当前路线HP投影与boss_sim没有模拟KINDLE的续火收益，也没有沿路线消耗蜡烛充能；不改模拟或叠加虚构收益。全部原选项、评分、HP和动作保持，大脑决定休息／构筑／路线，Jev执行战斗；不自动添火、不兑现未选动作。铁甲题面不增加字段，行为等价。

怪物当前进阶第一样本取数、房间代价五样本门槛保持；药水不加代价、不删选项、不否决，不写提前／留药规则。无生成器或架构改动，无需重建。

## 验证计划

从原帧缩减固定静默REST夹具，隔离刷新知识路径并注入空怪物库，无网络／LLM。验证两种休息模式生产题面真正接收事实、原HEAL／SMITH／KINDLE及额外选项和动作保持，F29的0→5、F32的2→23HP不变、F24正充能添火仍未知、充能同值指标并列、缺失／坏stack、熔化／缺遗物／其他角色、禁用／坏索引KINDLE。保留测试撤去生产接线必须失败，恢复后通过；源与合后固定沙箱入口、gitleaks及正式live锁内流程随后记录。

## 未实现

统一保血／全死排序权重、固定击杀顺序、巨兽拖延、SL范围／探索门槛、路线／休息血线和完整boss时钟校准：指定局仍缺受控替代胜负或阈值证据。永冻0172为独立跨帧首次触发模型专项，不在本项内实现。已有精确切击、毒上限、钨棍、士兵等模型补丁不重复发布。

学习账本只经项目根learner/ledger.py add/update，status=proposed、by=learner:strategy-proposal；实际shipped由运维核实后登记。结果与交接随后追加。

## 固定验证结果

项目根ledger.py add已登记独立提案silent-0186，by=learner:strategy-proposal、status=proposed。源实现只改rest.ts及本项固定夹具／测试；模型知识文字中文，注释英文。

targeted-initial.log/.exit：8例全部因缩减夹具缺必填session对象／mode／phase失败，未通过协议解析。extract-evidence.py补保留原始session并断言singleplayer/run，再生成缩减夹具；targeted-corrected.log/.exit为8通过、exit0。不改源实现或数值断言，不把夹具错误记作高负载超时。

冻结夹具后，仅撤去rest.ts的生产调用，保留辅助函数和测试：source-withdrawn.log/.exit为7失败／1通过、exit1，失败包括真实休息题面缺candle_refuel。恢复原调用：source-restored.log/.exit为8通过、exit0。覆盖两种休息模式、真实0→5及77血不变、原HP／全部选项与动作保持、正充能再添火未知、坏stack／熔化／角色／索引边界和额外未知动作。知识路径隔离，未调LLM或网络。

一次apply_patch被沙箱的全局glob扫描竞态阻塞，工具报告另一项目消失目录，未修改文件；正常重试原操作成功。这不是代码测试失败，也没有改变权限或读取该项目。

源固定沙箱source-suite.log正在执行；实际提交、合入及版本结果随后追加。

## 源检查与独立提交

source-suite.log/.exit：入口exit0、tsc0、主vitest203文件2191例（261.77秒）及paths单fork1文件11例，共204文件2202例首过，没有高负载超时或重跑。gitleaks-source.log/.exit为exit0、扫描32382字节、无泄漏；git diff --check通过。

源码独立提交9a865dbe87b4e64a5d50c59b389d99ed73bebb52，英文信息列明两局、各层／回合与silent-0186/0184/0185/0020，Co-Authored-By为Codex GPT-6。提交后工作树干净，ledger.py仅追加0186 proposed及源码去向。

源检查期间main正常快进同步到88a52203，再到5dc88705（已测经验45发布及运维记录）。这些同步没有agent源码／测试、learner脚本或知识生成器差异，本项三个blob保持；沙箱测试期间本项源码未变化。后一同步保留最新知识，未自行覆盖live刷新。正式锁内合入重新检查重叠，实际结果随后追加。

## 合后检查失败与最终回退

提案：/home/dw/Projects/agent-sts2/learner/runs/20261006-172733-strategy-proposal/proposal.md。来源UJ0K3G10609Y SILENT A10 F29（回合不适用）；XBD8Z9XLPCPN SILENT A10 F24/28/32（回合不适用）及F19/23/27/30/31/33 T2。既有账本0184/0185/0020，独立提案silent-0186。十指定局角色核对与原帧证据均落盘。

源码：9a865dbe87b4e64a5d50c59b389d99ed73bebb52（strategy-proposal-20261006-172733，干净）。仅补休息题现场充能、已见0→5的续火条件、充能指标并列及当前未模拟收益的说明；正充能再添火与坏stack未知，原HP、全部选项、评分、动作和模拟保持，铁甲等价。无新药水、SL或自动添火规则，无生成器修改。

撤生产接线：7失败1通过、exit1；恢复：8通过、exit0。源码沙箱入口exit0、tsc0、vitest主203文件2191例＋paths1文件11例，共204文件2202例；首过，无负载超时。初稿缺session夹具8失败、补齐原字段后8通过历史保留。源码／刷新／合入差异gitleaks各0。

正式flock内刷新七份知识提交3599ab0ae3be80d13b77f57f5af8b785cb09c437，incoming知识／重叠为空、merge-tree预检0。失败代码合入6b2a582dda7c8d745e092280724c0b94e5aca2af；合后tsc0，主vitest202文件2190例通过、1文件1例失败（共203文件2191例），276.03秒，入口exit1。失败为boss-clock.test.ts:191的ERPH既有断言，fightTurns实际8、期望>=9；不是高负载超时。入口set -e，paths没有运行，不记完整通过。

已用git reset --merge回退3599ab0ae3be80d13b77f57f5af8b785cb09c437（rollback_exit0），七份刷新数据与两个既有notes工作区差异保留；没有eval版本、上线记录或shipped。合后失败原日志live-suite.log/live-result.json/live-merge.log保留，没有重复跑完整套件冒称成功。

随后在相同刷新提交的锁内固定基线核对：knowledge工作区在前后均与HEAD一致，boss-clock源码、该测试及全部knowledge在失败合入与回退提交之间diff为空；回退源码也重现同一8>=9失败（baseline-targeted.log，exit1，1失败32未选择）。基线核对流程exit0，不表示测试通过。没有阅读或借用其他角色知识来修改公式/断言，没有放宽测试或新增排除；根因尚未定位。

请运维处理这项基线检查阻塞后兜底合入已测源码，实际通过及发布后再登记版本与silent-0186 shipped。目前仅经ledger.py/by=learner:strategy-proposal追加proposed及阻塞去向，旧0184/0185/0020首次证据／先验／历史保持。启动器strategy-done完成事件和本交接通知运维；不重复将已回退的6b2a582dda7c8d745e092280724c0b94e5aca2af当实际发布。未停对局、未运行play、未推送。
