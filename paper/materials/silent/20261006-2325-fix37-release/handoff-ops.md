# fix-batch 运维交接

本批已经实际合入 live：源码 f6ff3a9ce42337972b19ee227b2d51432e929f50 → 代码合并 65a7e115afa9baef94f1db0c100fe249ebcaba13 → 固定发布 06b52ef8f3b19d288044acc91ca895fd29a53a7f，版本 S1.fix37。
来源 fix-queue-v4.md:595–597、notes/lessons.md:5162，账本 silent-0195；KUZVERN40NGK SILENT A10 F17 第3次T5／第5次T6及末次T6-T7。
本批只补静默判官攻击前的毒触发上界和既有HP阈值眩晕检查；计数类眩晕仍需原hit、铁甲及无毒等价。不扩展未知后继，不改SL策略或药水、路线、休息、时钟规则。11／23仅被读档打断的预测，末次9＋8＝17到156且玩家3血保留是实况；不声称整场可转胜。

最终撤源5失败3通过/exit1，恢复新8例通过、相关6文件56例通过。源及合后固定沙箱tsc0、vitest0，均209文件2245例首过，无高负载超时重跑；完整沙箱外套件请由调度器按本批fix-done补跑。全部原红绿及第一版日志保留，见verification.json和*-sandbox.log。

合前刷新保留点 346fcdae6adf5aca3ed5d1a508fd2f76a8fabd04，本轮无待提交知识刷新。知识不同blob重叠0，合前后已提交知识blob完全一致；live仅decision-log冲突，使用union并按行计数验证双方所有非空行保持，原两侧字节保存在live-log-*.md。后台notes/monster-db-check.md及未跟踪notes/fight-value-backtest-silent.md保持。无生成器改动，不重建。源码/合并/发布gitleaks均0。队列未手改，不停对局、不运行play、不推送。

silent-0195已经只经CLI/by=learner:fix-batch追加proposed和真实源码提交；请据实际合入登记shipped/S1.fix37，不改旧0133/0127或其他条目。特别勘误：本批第一次提交去向误写PLACEHOLDER，已追加note明确此占位符无效，并登记唯一有效源码f6ff3a9ce42337972b19ee227b2d51432e929f50；旧原行按只追加协议保留，不能把PLACEHOLDER当提交或版本。ledger-0195-proposed.json保留原fold快照。账本check为196项0问题；本批不自行标shipped。

125项旧修复均为源码基线/main/live祖先，对应提交见already-fixed.json/md；未划掉的眩晕后继631f9485和Inferno195869aa已修，未重复提交。永冻0172仍缺跨帧可靠首次能力消耗状态、需恢复与SL生命周期专项，交开发会话；其他未定位/性能/策略事项见skipped.json。

本批完成事件由启动器生成fix-done；本文件给运维提供实际提交、版本和原始验证去向。
