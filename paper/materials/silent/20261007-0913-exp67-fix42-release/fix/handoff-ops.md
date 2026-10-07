# 本批纯 bug 修复交接

- 任务：20261007-081302-fix-batch；分支 fix-batch-20261007-081302。
- 基线 main 合并后：401bce0bdcafdf85983ec01d6e66f951886d4a1e；唯一修复提交：ffa23c2fba13c1fad114bbdc27dbc8c32f2d8fab。
- 修复：队列 2026-10-07 08:00 的已建模中毒仍触发攻击八折；仅补 POISON_POWER 模型覆盖声明。
- 证据与账本：silent-0216；K3676LU8B0UH SILENT A1 F17 T2，T3FW7R2R2306 SILENT A10 F8 T3/T4/T5。固定总伤害 23/18/13/23，不声称整场转胜。
- 红绿：撤源码 6 失败/1 通过，恢复 7 通过；相关两文件 17 例通过。未知增益仍保留原折扣，毒结算不变。
- 铁甲影响：共用敌人适配器对同型中毒局面也解除错误折扣，未导入其他角色知识；原因在提交内说明。
- 旧绷带用例的 23 伤害断言混入错误折扣，现限定原本验证的弃牌格挡和损血。原直接伤害观察不改写，新四个固定证据验证总伤害。
- 自测：最终 bash tools/test-sandbox.sh --no-file-parallelism 退出 0；tsc 0，217 文件/2315 例通过，保留固定排除名单，完整沙箱外检查待实际合入后的调度器。
- 原失败保留：source-suite.txt 两失败；source-suite-retry.txt 重复 maxWorkers 参数未执行测试；source-suite-final.txt 一个 20 秒多敌超时。rollout-load-retry.txt 与 target-options-load-retry.txt 分别单例通过；最终完整顺序套件通过。
- 源提交前 gitleaks 0；工作区干净。没有修改生成脚本，不重建知识数据。
- 账本：仅经项目根 learner/ledger.py/by=learner:fix-batch 给 silent-0216 追加提交号并置 proposed；首证/先验/claim/证据/历史保持，未标 shipped。
- live 流程：{"lock_acquired": true, "before_refresh": "1a5e1217a024ffa10321660028f65b602d7d9296", "refreshed_paths": [], "before_merge": "1a5e1217a024ffa10321660028f65b602d7d9296", "source": "ffa23c2fba13c1fad114bbdc27dbc8c32f2d8fab", "knowledge_conflicts": ["knowledge/characters/silent/boss-damage.json", "knowledge/characters/silent/experience.json", "knowledge/characters/silent/monster-records.json", "knowledge/characters/silent/outcome-stats.json", "knowledge/characters/silent/room-costs.json", "knowledge/common/card-upgrades.json", "knowledge/common/monster-db.json", "knowledge/common/move-model.json"], "blocked": "knowledge changes overlap with different blobs; refresh preserved"}。
- 实际合入：未合入；版本：未分配。无实际代码上线时不写上线记录、不创建 eval 版本。
- 如未合入，请运维据 fix-done 先处理锁内列出的知识重叠，保留 live 最新经验与刷新表。此前未持锁记录预检还发现 decision-log.md 并行历史冲突；该旧预检不冒称最终锁内结果。按 live 流程兜底时保留双方原记录；实际发布后再经 ledger.py 登记 silent-0216 shipped。
- 旧 131 项提交逐项祖先核验见 already-fixed.json；已测旧发布与本批基线的 agent/src、agent/tests 完全一致，旧修复不重做。
- 队列未修改。独立静默 boss 校准与策略不混批；未补游戏机制或用药规则，未运行 play、停对局或推送。
- 开工队列快照保存在 queue-snapshot.md；执行期间新增的0217/0218/0219未核证，因锁内知识冲突已触发停止，交下一批。08:44 codex暂停和统计口径为独立已授权架构任务，不混本批。

```json
{
  "task": "fix-batch",
  "base": "401bce0bdcafdf85983ec01d6e66f951886d4a1e",
  "fixes": [
    {
      "item": "已建模中毒仍触发攻击八折（silent-0216）",
      "commit": "ffa23c2fba13c1fad114bbdc27dbc8c32f2d8fab",
      "test": "agent/tests/silent-poison-coverage.test.ts",
      "fails_without_fix": true
    }
  ],
  "skipped": [
    {
      "item": "mod选牌屏及其他屏幕请求超时自愈",
      "reason": "证据不足：未定位mod内部根因；已修重复提问及稳定等待不重复修改。"
    },
    {
      "item": "Codex大脑缓存命中偏低及实测对比",
      "reason": "证据不足：离线任务不能调用真实LLM或网络，没有受控对比。"
    },
    {
      "item": "boss整场模拟耗时、样本不足及CPU争用",
      "reason": "太大：需独立固定性能基准和跨模拟器定位；已修预算截止不重复实现。"
    },
    {
      "item": "保血、留药、全死排序/巨兽拖延、SL范围、boss时钟校准、路线预估、休息、小偷优先、A10第三幕第二boss、无色牌估值、懒惰平均出牌估值",
      "reason": "策略类：交Dai或独立策略任务，本批不改；已批准事实子项保持。"
    },
    {
      "item": "静默boss模拟跨进阶校准",
      "reason": "太大：队列明确要求独立高优先功能批次；本次授权仅批量纯bug，交专用任务。"
    },
    {
      "item": "执行期间新增：升级预览丢关键词（silent-0217）",
      "reason": "本批启动后入队，证据尚未核验；锁内知识冲突已触发停止，交下一批。"
    },
    {
      "item": "执行期间新增：勒紧后续格挡漏算（silent-0218）",
      "reason": "本批启动后入队，证据尚未核验；锁内知识冲突已触发停止，交下一批。"
    },
    {
      "item": "执行期间新增：蛇咬施毒遗漏（silent-0219）",
      "reason": "本批启动后入队，证据尚未核验；锁内知识冲突已触发停止，交下一批。"
    },
    {
      "item": "执行期间新增：codex不可用时暂停及引擎统计口径",
      "reason": "太大：属于独立已授权架构和统计任务，本批只修纯bug，未混入。"
    },
    {
      "item": "合入 live",
      "reason": "锁内检查发现 8 个知识文件双方改动后的 blob 不同，按任务要求停止；保留 live 最新数据。"
    }
  ],
  "merged": null,
  "tests": {
    "tsc": 0,
    "vitest": 0,
    "cases": 2315
  }
}
```
