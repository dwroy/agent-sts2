# 静默经验.12兜底合入检查

{
  "source": "e6ec56538c8fd8a048d49889df5f4d0ec8003716",
  "batch": "20261005-102754-experience-update",
  "live_before": "cf11fab807411ca919b40e045d46b5a7c16ed868",
  "refresh_commit": null,
  "retained_refresh": {
    "knowledge/characters/silent/boss-damage.json": "ed361b3fe9558fc91dba09386c3f1edc8d030d94",
    "knowledge/characters/silent/outcome-stats.json": "47b97564f48d6901cc414b3c36de091ea4eaa57a",
    "knowledge/characters/silent/monster-records.json": "b640aa96c86ec9ebff1a810098263917576f7624",
    "knowledge/common/card-upgrades.json": "3a2543af02ac52ebdc8cdb45efb8aeae4e9aa4a9",
    "knowledge/characters/silent/room-costs.json": "978b977e4d7d52ee34ba02987ab434ef133b3c9b",
    "knowledge/common/move-model.json": "f6520045a115a7f93a18c86447b2fa0e043b5328",
    "knowledge/common/monster-db.json": "14520cc9b5fcf5fdd7c87721c4974533add57075"
  },
  "version": "S1.exp12",
  "tested_tree": "bf13f7374b7e72166fedb1c54abd902baeb6807c",
  "checks_exit": 0,
  "tests": {
    "exit": 0,
    "files": 163,
    "cases": 1951,
    "log": "/tmp/sts2-1044-exp-live-sandbox.log"
  },
  "merge": "5f76a9dd7c696064241c48c6db32fdf975faeb3b",
  "after_refresh_commit": null,
  "release": "2a946ca5ec6bbad250bd43df599d77a84a9c0f05",
  "stamp": "2026-10-05 10:50",
  "main_merge": "1ee49f2c8f5c923bb1ee3bcfdbd78d271d52cfd3"
}

学习者原始自测：learner/runs/20261005-102755-experience-update/test-summary.json，tsc0/vitest0，157文件1939用例，首次通过。合后固定沙箱日志/tmp/sts2-1044-exp-live-sandbox.log；main代码与知识数据逐路径等于同一已测试live发布，未重复跑同树检查。固定源仅修改静默experience.json，来源F9PP859XZ3RJ A4及十四局本角色旧基线，新增4/更新8/退役0，active67、22759字符。

七项源生成数据等于继承main 24ccc37f的快照，非本批产出，保留live最新blob；日志及既有版本保留。12项经验shipped不代表计算下注/涂毒代码模型bug0081/0082已修，运维未改经验内容或提供游戏知识。完整沙箱外补测通过新learner-recheck白名单入口另行请求，结果随后追加。

补测请求结果（2026-10-05 10:52）：`bash ops/codex-ops-do.sh learner-recheck 20261005-102754-experience-update`，exit 2。完整原因：拒绝：没有这个动作：learner-recheck（可用：procs stall-check mod-state autoplay-start autoplay-stop play-stop kill launch-game win-procs win-kill postmortem experience-update fix-batch learner-merge eval-metrics learner-status scheduler-status）。新白名单代码已同步main，但当前broker拒绝该动作；已写收件箱并等待新manual事件。没有执行完整外部检查，不能把163/1951固定沙箱结果称作完整vitest结果。
