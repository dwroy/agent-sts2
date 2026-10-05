# 静默经验.11兜底合入检查

{
  "source": "a1d6ccc2d40b744c4ae24fa107239a46d41fea55",
  "batch": "20261005-095918-experience-update",
  "live_before": "ab5218d5f31f0f79831eb57f8bf56ffcb216635a",
  "refresh_commit": null,
  "retained_refresh": {
    "knowledge/characters/silent/boss-damage.json": "ed361b3fe9558fc91dba09386c3f1edc8d030d94",
    "knowledge/characters/silent/outcome-stats.json": "47b97564f48d6901cc414b3c36de091ea4eaa57a",
    "knowledge/characters/silent/monster-records.json": "b640aa96c86ec9ebff1a810098263917576f7624",
    "knowledge/common/card-upgrades.json": "3a2543af02ac52ebdc8cdb45efb8aeae4e9aa4a9",
    "knowledge/common/monster-db.json": "14520cc9b5fcf5fdd7c87721c4974533add57075",
    "knowledge/characters/silent/room-costs.json": "978b977e4d7d52ee34ba02987ab434ef133b3c9b",
    "knowledge/common/move-model.json": "f6520045a115a7f93a18c86447b2fa0e043b5328"
  },
  "version": "S1.exp11",
  "tested_tree": "f263a44009127bc2fd03414653b22bc9c215e7d7",
  "checks_exit": 0,
  "tests": {
    "exit": 0,
    "files": 157,
    "cases": 1939,
    "log": "/tmp/sts2-1013-exp-live-sandbox.log"
  },
  "merge": "1b4c4c64c0fc7fd05d36296d038129d5700794bf",
  "after_refresh_commit": null,
  "release": "536e37d9f86b19ffc7afcfa11d71a41803a7cc09",
  "stamp": "2026-10-05 10:20",
  "main_merge": "085d287ba1c55962a7475a456b28ce4581410fdf"
}

学习者自测来源learner/runs/20261005-095918-experience-update/test-exp.log及test-exp.exit：tsc0、157文件1939用例，首次通过。合后固定沙箱原始日志/tmp/sts2-1013-exp-live-sandbox.log；主目录代码与知识数据逐路径等于同一已测试live发布，未重复跑测试。两个批次17/13项去重21条shipped；经验.9直接到.11，无单独.10上线时刻；纯模型bug0078未修。

七项源生成数据均等于继承main 71e677e2的旧快照，不是本批改动；合入时逐blob保留live ab5218d5的更新并在同步main时再次核对。双方决定、版本和角色数据历史保留，运维未编辑经验内容或提供游戏知识。

沙箱外完整tsc/vitest尚未运行本次经验树，不能复用上一个模型批次的208/2747结果充作本批完整检查；缺少补测白名单动作，已写收件箱请求。
