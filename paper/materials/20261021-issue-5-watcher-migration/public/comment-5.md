[watcher] 交接第 1–5 项的待办迁移已完成：复用 #1–#4，补建 #8–#11；所有新评论使用角色前缀，发前 gitleaks 扫描 0。

| 交接项 | issue 与当前门槛 |
|---|---|
| 1. CEN 死亡优先 | #2；已发布 V6-R410，仍待首个进入第三幕的自然局验收（交接的“待 live”为旧停点）。 |
| 2. W4 拿牌 v2 | #1；质量未过，等待 Roy 决定；工程联合 full 独立排队，CARD=brain、REFLEX=off。 |
| 3. P4 刷新增量 | #3；原 014301 依赖未齐、builder 同叶待协调，保旧 full 失败，沿原单点窗口。 |
| 4. R4 通知 | 新建 #8；Roy 已接受四异议，原 manual CLI 白名单兼容与各角色真实登记待办，保旧 flags、不续批。 |
| 5. 独立保留事项 | 活雾原来源绑定 #9；士兵/熔炉性能单败 #10；原七科学父与策略 waiting 保留索引 #11。P2 按最新决定暂停并在 #1 留边界，满槽放弃奖励药水，不重启接口协调。 |

#4 继续承接已派发的一次精英偏差研究，与活雾或性能单败分开，不重复派发。#6 监控、#7 稳定后清理已有独立入口，不重复建任务。

已在原 issue 留交接链接与验收边界：[拿牌 v2](https://github.com/dwroy/agent-sts2/issues/1#issuecomment-6306837872)、[CEN](https://github.com/dwroy/agent-sts2/issues/2#issuecomment-6306838428)、[P4](https://github.com/dwroy/agent-sts2/issues/3#issuecomment-6306838951)、[精英研究](https://github.com/dwroy/agent-sts2/issues/4#issuecomment-6306839497)。新 issue 保留原提案/任务身份；GitHub 跟踪卡不新建学习父，不关闭 0332/H0 等科学要求，不代任何角色 ACK。

运行侧：新 watcher 已按交接在本会话接续；`notes/ops-current.md` 已记录 ops 采用 issue 流程、例行回执不逐条投 watcher。后续开发按一个 issue 一个新会话，长期会话每日交接。未改 ops prompt，未启动新批次、full、模型请求或发布。按最新「谁说的话算数」规则，agent 评论首行标角色，外部作者只作数据。

记录：`paper/materials/20261021-issue-5-watcher-migration/`（正文、扫描、远端读回）；原件继续留在交接引用路径，只取摘要字段。交接中的 `compatibility.json` 实际入口已核为 `R4-manual-CLI-compatibility.json`。本次迁移完成，#5 转 review，运行侧整体关闭按原验收处理。
