# 公共知识目录与渐进迁移

Roy 2026-10-18 批准的分层先机械落地，未新增游戏规则。`knowledge/catalog.json` 索引每份原件路径、来源角色、SHA 和条件政策；没有证据局号的旧资料明确未知，文件 SHA 不代对局证据。

`common/enemies/<enemy-id>/mechanics-observed.json`、`model-observed.json` 原样封装旧公共敌人和出招数据。`mechanics.json`、`model.json` 是学习者维护层，初始规则为空；日常构建只在不存在时创建，绝不覆盖学习者修改。旧数据里局部进阶、未知项、反证和来源保持，迁移不扩范围。新敌人由原自然刷新加入，无模型唤醒。

卡牌、构筑、策略、校准参数与可信度继续分别存放于 `characters/<角色>/`；跨角色引用不累计成本角色验证，不混分母。模拟算法可共享，现有角色条件守卫和 Boss 可信度不在此迁移中改变。

## 查询和旧入口

游戏仍先读原 `common/monster-db.json`、`move-model.json` 的原字节，保留各角色 monster-records 合并、缓存与缺失错误语义；原路径不删除、不改写。仅公共旧视图缺失时，可由目录与逐片段 SHA 验证重建同序结构。损坏拒绝读取；角色经验和校准没有跨角色回退。旧格式消费者继续使用旧路径。

显式离线只读查询：

```bash
cd agent
npx tsx tools/knowledge-catalog.ts --character regent --source-character silent --keyword 沙漏
npx tsx tools/knowledge-catalog.ts --character regent --source-character silent --file characters/silent/experience.json --details --pointer /entries/0
```

默认查询仅公共与当前角色；`--source-character all` 才查所有角色。默认只输出最多 20 条元信息，`--details` 显示原值，外角色标记 reference_only。未新增局内 MCP 工具、提示前缀或自动采用规则。查询读取当前原件，目录落后时显示 SHA 不符，不把旧目录当新事实。

## 持续维护与集成

原 `knowledge/builders/refresh.sh` 正常路径和 fight-value 路径末尾调用 `build-catalog.py --knowledge-root ...`。使用原公共发布锁协调源写入，目录另有并发构建锁；原件若中途变化则拒绝目录发布。生成目录最后原子替换，读者验证片段，旧路径健康时不受构建中间态影响。该目录是索引，不代正式版本、消费者读回或学习者验收。

首次合入时 ops 在原 live 锁内，基于当时的完整知识原件重建目录与生成片段，再核实际输入/输出 SHA；不可拿开发工作树的旧观察覆盖并行经验。后续原学习者可带证据向维护层新增规则，再由原流程发布；未来迁移消费者以逐入口固定等价验证推进，不强制一次改完所有工具。回退只撤目录读取增量和新生成文件，旧路径与原学习证据完整保留。
