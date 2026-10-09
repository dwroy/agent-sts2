# 静默 AEONGLASS B4 代码提案（20261009-180724-fix-batch）

来源任务是 Roy 已授权自动 B4；不可变 dispatch_base 为 2e037b7bfb7ed1a2bf3f8599736bd9846fb3e328，证据 key 为 31b945d5ed7d9926026e8a6668b42ac677fd9638358c2942763ace6c8dc12646。关联旧机制条目 silent-0236；旧 rejected 记录和 be703ec1 历史保持。本批只从根目录静默日志重新核实。

24 个 tune 战斗边界验证了以下三项：力量增益随使用次数逐次 +1；已有凋萎持牌伤每次 +3，新生成凋萎使用当前阶段伤害；A10 的招式新增 2 张，其他 tune 已观察进阶新增 1 张。LRN0HPZ0FZS1 F48 T3→4/T6→7：力量 0→3→7，持牌伤 3→6→9，每次 +1 张；25226ZFLNR1J F48 T3→4/T6→7：力量 0→4→9，持牌伤 3→6→9，每次 +2 张。原始字节边界、SHA256、牌堆文本、反例过滤见 mechanic-tune-evidence-withers.json 与 raw/。排除了临时减力量仍存在的边界。

旧 fullFight 固定使用表中 strength、状态牌数量和生成模型 heldPenalty，已有凋萎也不随该招升级。新字段 fightAeonglassIntensity 仅由 SILENT、AEONGLASS、已观察 0/1/5/6/7/10 级生成，保存首个力量增益、此前使用次数、每次新增数。仅 fullFight 初始化计数、递增力量、更新牌堆/保留牌的持牌伤并使用当前阶段的新增牌；整场专用前瞻使用相同力量增益。未观察进阶保持原行为。不是实盘规则上线，也不把机制修准等同于胜负预测合格。

源码范围只有 agent/src/reflex/rollout.ts 和 rollout-live.ts；solver、其他实盘源码、验收工具、调度器、原测试均未改。固定机制测试证明实盘 solver 和五回合不读取专用字段，铁甲不生成字段。固定基准 runner 另做提交级逐字节隔离。撤码红/恢复绿和原 bash tools/test-sandbox.sh 日志留存。

冻结数据有 323 场实际结局，107 tune、216 val；触发档案原 321 场和行索引保留，新两场仅进入 val。SL predicted_death 截尾不当败局。数值模型钉触发档案 provenance 的输入字节（可从 9ce029b6 源提交恢复，并已验证与 dispatch_base 的所有数值源码相同），之后 live 知识刷新单独留档，不能和旧样本混算。两个起点、200 样本、seed=1+原始完整数据行索引*101；before/after 的全局校准仅在 tune 拟合。其他 boss 原始结果只有在源码、数值模型、状态、行索引一致且控制重放验证后才复用；目标 boss 重放全部 tune/val，不根据 val 调机制或策略参数。

验收后更新本条目和正式报告。失败保留分支，不合 live、不造版本；回退候选可恢复两个源码文件到 dispatch_base。实际上线需走锁内保存 live 刷新、最终组合配对验收及校准流程；本报告不预报发布。

2026-10-09 19:24 更新：实际候选源 436f338f11601fe89d5ef6c8445692706c7d797b。最终原沙箱 tsc/vitest=0，252 文件/2655 例；最终撤码17红/恢复28绿，原首轮失败日志留存。基准固定 runner 预检两侧实盘/五回合输出逐字节一致，SHA256 1bce9c63060eb08d4225bb1facb368d0f52c6b9e1fc3ff80ca35350ad08d6bc0。24 边界再按根目录 states 原字节核对通过，见 mechanic-original-byte-recheck.json。本条仍 proposed；正式验收未运行，不预报上线。
