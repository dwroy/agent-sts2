# 主管交接：2026-10-21

更新：2026-10-21 20:25 CST。交接方：xdmac 桌面会话（工作目录在 work vault，经 ssh 管 xdwin）。接手方：xdwin 上 `~/Projects/agent-sts2` 的 Desktop SSH 会话。角色见 `docs/agent-board-architecture.md` 的“主管”一行：与 Roy 讨论、写 issue（目标与验收）、排优先级、设计层验收与关闭、转达 Roy 的决定、写文档；不写代码、不做大量核验。

先读：`AGENTS.md`、`docs/agent-board-architecture.md`、`docs/github-issues-workflow.md`、`docs/v6-plan.md` 第 13 节、decision-log 末尾今天的 `[Claude]` 行，然后看这份。运行状态以 GitHub Issues 和 `notes/ops-current.md` 为准，本文件只记未完成项和做法。

## Roy 今天定的（都已记入 decision-log）

- 对局大脑从 GPT-6.1 Sol xhigh 改 high，在对局里与 xhigh 按局交替试一批、对照质量；全面切换另由 Roy 定（#31，`0fad54ca8`）。
- DeepSeek 不切、先不接成 GPT 容量不足时的自动兜底；但要准备好当对局大脑做实验（#32，`da7968434`）。#32 的 5 点（`f330f25d7`）：推理强度可降一档（取代 10-02“不降强度”，只限这个场景）；超时和人类节奏预算放长到实际答完，完成率优先；流式与卡住检测；开卷、策略库等新上下文必须生效；只走 Nova。
- 开发会话上限 4 → 5（`.agents/board.yaml`，`6a90f0882`）。
- 19:17 转 Roy 要求恢复对局（Windows 18:41 已登录），ops 19:23 恢复，游戏 PID 4680。
- 主管从 xdwin 的 rc 会话（Claude 本地会话 `465e6c82`，标题“当前进展”）换到桌面会话，现在再换到本 SSH 会话。
- xdwin 的 Claude rc 是 Roy 19:27 为切换账号停的（`~/.local/state/rc-autostart/pause`）：保持暂停，pause 文件和 bridge 指针都别动。

## 现场

- live：V6-R410（`0a9dc70e3`），Silent A10，CARD/POTION/SHOP/REST = brain，大脑 GPT-6.1 Sol xhigh。今晚：AR523ATD2G4W F25 输（残杀千足虫）、VVFH7BULZZR6 F22 输（啃咬机），FZT053H9PSC5 在打。最近一次胜局 0CLP16ZR4ZZC（A10 F49，62.2 分钟，复盘 `notes/run-1021-1715-0CLP16ZR4ZZC.md`）。
- herdr `agent-sts2`（wJ）：issue-16 `wJ:p1H9`、issue-24 `wJ:p1HA`、issue-25 `wJ:p1HB`、issue-31 `wJ:p1HE`、issue-20 `wJ:p1HF`、integrator `wJ:p1HD`。`sts2-run`（w1H）：ops `w1H:p8`、autoplay-log、learner-*。
- herdr `agent-hearthstone`（wN）由另一个 Claude 会话当炉石主管（炉石仓库 #2–#6），本项目不碰；本仓库 #22 只做跟踪。
- 今晚清掉了 WSL 重启留下的 29 个空 shell tab（尾日志在 `ops/codex-ops/issue-session-tails/herdr-cleanup-20261021/`，会话 ID 在 `handoff/wsl-resize-20261021.md`）。rc 看门狗会在 agent-sts2 工作区挑第一个空 shell 起 rc，找不到就新建 `rc` tab，所以重启后的空 shell 要及时清。

## 未完成项

1. **发布窗口：#25 + #16、#15（P0）、#8**。都已合入 main、`status:waiting-release`，ops 确认都还没在实际 live。ops 已备好组合候选（`paper/materials/20261021-issue25-release-ops/release-plan.json`），卡在集成员给这份精确 live 组合的联合准入（19:56 已提醒集成员）；ops 还提到 s2 未提交的四叶补丁与 #25 有交集。准入后 ops 在自然开局边界发布、首局读回 → 主管验收关闭 → 回收会话，空出的位置给 #32。
2. **#31**：issue-31 在做按局大脑配置开关（同时支持引擎和推理强度）与预先登记的方案。流程：交付 → 集成员 → ops 上线 → 交替跑各 10 局 → 报告 → Roy 定是否全面切 high。
3. **#32**：ready，排在 #31 之后（复用 #31 的开关），有位置就派：`nice -n 19 python3 ops/issue_session.py spawn 32 <slug>`。
4. **#30 → #24**：#30 交给 issue-24 会话补齐（19:56 已提醒），补完在 #24 交付给集成员。之后依次解锁 #26（等 #24）、#27（等 #16、#24）、#28（等 #24、#25）。
5. **#20 派单器**：issue-20 在做，含修 spawn 的两个问题（见下文“做法”）。上线后“一行提醒”和回收就不用主管手工做了。
6. **#23**：已上 live，24 小时验收（回收数不少于新建数）约到 10-22 18:00；通过后关闭，ops 再开始 #18 积压回收。
7. **#2**：R410 已上线，等第一局自然进第三幕的验收。
8. **#13、#14**：集成员已核收研究交付；#14 转 blocked（缺模型验证与发布验收），#13 的四张牌机制未完成（ops 20:20）。按 ops 和学习链走。
9. **ops 学习线 #3、#4、#9、#10、#11**：卡在 ops 内部门禁，ops 自己管；**#7** 等 V6 稳定。
10. **#21**：集成员角色已切换，约 10-28 做一周回顾（压缩频率、核验周期）。
11. **Roy 尚未回答**：#25、#26 上线时，要不要按检查点指标做上线前后对比。指标：一幕通过率、中位层数、进第二/第三幕时的牌组张数与升级数。

## 做法

- **派发**：`nice -n 19 python3 ops/issue_session.py spawn <N> <slug>`（主检出执行）。已知问题（已写进 #20）：
  - 最后一步常报 `herdr command failed (exit 1)`，登记停在 `starting`，但 Codex 实际已带开场提示在跑。处理：`herdr agent explain <pane>` 确认是 codex → `herdr agent rename <pane> issue-<N>` → `register <N> <slug> --pane <pane> --base <登记表里的 base> --started-at <登记表里的 started_at>`（`ops/codex-ops/issue-sessions.json`）。
  - 撞上调度器那一轮会报 `Resource temporarily unavailable`，没有改动，隔约 20 秒重试。
- **回收**：验收关闭 issue → `reclaim <N>` 演练 → `reclaim <N> --apply`。工具上线前手工派的会话先 `register`。带实例绑定文件的工作树会被 #23 的门禁保留（`unknown or conflicting instance identity retained`），属预期。
- **提醒**：ops 用 `bash ops/codex-ops.sh wake "[Claude] …"`（忙时排队顺延）；其他会话用 `herdr agent prompt <pane> "[Claude] #N 轮到你：一句话"`。别往 ops pane 的输入框留半句。
- **issue 评论**：首行 `[Claude]`，转 Roy 的话用 `[Claude] 转 Roy：`；正文先写文件，`gitleaks detect --no-git --source <file>` 扫过，再 `gh issue comment --body-file`。
- **decision-log**：主检出里常有 ops 未提交的行。只提交自己那一行：先 append 到工作区文件，再用 HEAD 版本加新行 `git hash-object -w` → `git update-index --cacheinfo` → commit，不带上别人的改动。
- **不碰**：live 与 STOP（ops 管）、rc 的 pause、炉石、Regent（暂停中）。

## 今天的分析结论（供参考）

0CLP 赢局与开卷、开源数据无关：两者当时都没上线、没进 main，live 知识库也没有外部数据。Silent A10 共 373 局赢 6 局；V6 由大脑拿牌之后，牌组略瘦（进第三幕时约少 3.5 张，跳过率 14% → 18%），升级没变，成绩差异统计上分不出来。数据来源：`.worktrees/live/logs/states.jsonl` 里每局 `GAME_OVER` 与 floor 18/34 的状态（取牌组）、`runs.jsonl`（胜负、层数）、`run-config.jsonl`（当局配置）；扫描用 `grep -F` 先筛再解析，几十秒内完成。
