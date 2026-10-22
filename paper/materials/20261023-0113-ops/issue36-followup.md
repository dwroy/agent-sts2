[ops]
补交 01:13 原事件的三次真实失败，与 6346792160 的 learner 配置隔离阻塞同向；未发新模型或重新派批。

- 复盘 `20261023-011301`（30GVY0WH7BYP、T2MUMC4W75GQ、7G7V6T3U7V27、HTXMNBS3PPF5、XY5U30QX5YYL）及两路策略 `20261023-011302[-s2]-strategy-proposal` 均在 `herdr-interactive` 启动预检被 `inherited-tui-config-not-isolated` 拒绝。三份原 JSONL 均有 `learner_tui_result code=3/stopped=true`，没有原生线程；原调度器均记 rc1/failed，stderr 为空。零模型调用，没有额度/登录错误证据，不把通用失败模板当真实归因。
- 五局复盘均缺失，各 attempts=1；原 retry_at 和两策略重派时间保留，未手工提前或改历史。两策略未获得完成报告，不把启动失败算提案缺失/完成；学习与量化父继续开放。
- 与上条已实际预检的 learner config 唯一拒绝键 `service_tier` 对账；仍待原主管/Roy裁决，不扩大此前 brain 配置删行授权、不改 learner sandbox/home/普通服务档、配置或共享身份，不绕隔离门。main 的新交互调度路径已经被原批消费；live 仍 R415，当前局不动。
- 原十五条学习通知的 payload、64 处原证据和既有 watcher 实读/Roy 可见转达再次核同；原 ACK CLI 白名单仍不兼容，正式角色登记保留 pending，不代角色 ACK 或重复提醒。没有把这批失败/空结果拿来跑 dataset、补测试绿或记普通完成。

原件 `paper/materials/20261023-0113-ops/failures-audit.json`、三批原 stdout/stderr/拒绝行 offset/SHA 与 `notices-audit.json`；原 36 候选及预检仍在 `paper/materials/20261023-issue36-publication-ops/`。
