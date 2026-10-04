# 论文档案：LLM 分层代理自动游玩《杀戮尖塔 2》

实验：用"代码求解器 + 小模型（TypeSafe Jev）+ 大模型兜底（DeepSeek）"三层架构自动游玩《杀戮尖塔 2》（铁甲战士），并由监督者（Claude）根据每局复盘持续迭代规则与模型知识。目标是进阶 10。

- **档案建立**：2026-09-25 18:00（北京时间）。
- **截至建档**：67 局；3 胜，分别在进阶 0、1、2；8 局打到最终 boss。

## 目录

| 路径 | 内容 |
|---|---|
| `timeline.md` | 分阶段的迭代时间线：每次改动的内容、原因、提交号、结果，以及全部 67 局的列表和测量注意事项 |
| `data/` | 可复现的数据集，由 `ops/paper_dataset.py` 生成：`runs.csv`（每局）、`escalations.csv`（每次兜底调用）、`decisions_by_label.csv`、`commits.csv`、`summary.json`；数据字典见 `data/README.md` |
| `raw/` | 原始日志的压缩快照：`decisions`、`states`（730 MB 原始）、`deepseek-reasoning`、`runs`、console、Claude 时期的交接文件，附 `SHA256SUMS` 和截断位置 `SOURCE_CUT.json` |
| `materials/decision-log.md` | 人工指令与设计决策日志：谁在什么时候决定了什么、为什么 |
| `materials/prompts/` | DeepSeek 客户端代码、攻略、经验手册的**每个历史版本**（文件名带时间和提交号），Jev 问题模板，一次真实调用的完整请求样本 |
| `materials/architecture-review/` | 架构评审工作流：3 份调研（Jev 提示能力、开源杀戮尖塔 AI、硬编码规则盘点）、3 个方案、最终综合，以及工作流脚本和日志 |
| `materials/analysis/` | 三层（代码、Jev、DeepSeek）错误归因分析脚本 |
| `materials/reports/` | 过程中给出的报告：阶段报告 PDF、10 小时总结（PDF 和网页）、通关总结页、DeepSeek 透视页、架构评审页 |
| `materials/session/` | 会话原始记录：主会话、上一会话、全部子 agent 记录、记忆快照、HANDOFF.md。已检查，不含 API key |
| `materials/code/` | 代码仓库完整历史（git bundle，169 个提交）以及 notes/、ops/ 的快照 |

复盘全文在 `../notes/lessons.md`，快照在 `materials/code/notes-and-ops-snapshot.tar.gz` 里。

## 更新机制

档案随实验自动更新，不会丢失历史：
- **每局复盘后**：`python3 ops/paper_dataset.py --no-raw` 刷新 `data/`。
- **每天 04:07**：完整快照，包括刷新 `raw/` 和校验和、归档会话记录、重新生成 git bundle，并用 rsync 同步到 Windows 盘 `C:\Users\XD\Documents\sts2-jev-paper\`，作为异盘备份。
- **每次规则调整**：在 `materials/decision-log.md` 末尾追加一行。
- 原始日志 `jev-sts2/logs/` 只追加、不轮转、不删除。

## 已知的测量问题（写论文时需说明）

- **每局的代码版本**：局中重启会加载新代码，所以一局可能跨多个版本。请用 `runs.csv` 的 `code_version_console` 列和 `timeline.md` 的"进程段数"列，不要用 `runs.jsonl` 的 `code` 字段。
- **规则调整的批次数**：批次编号有一部分是按提交时间推断的。`autoplay.log` 里的重启行会让"每 5 局"的计数偏大。一共 10 批。
- **记录缺失的局**：3 局缺少结束记录，结果取自 console 日志：TQX5JJX3UD39（败）、V5S6QVVQYL37、3MDJW1UAD5M6。CRRPX9MWJZGM 的胜利同样由 console 日志补记。
- **记忆实验有混杂因素**：记忆 v1 上线时，游戏已因第三胜把进阶升到 3，而对照组是进阶 2 的局。
- **兜底模型的切换时间**：Claude 与 DeepSeek 兜底的切换、以及思考档的调整，是通过改 `.env` 完成的，不在 git 历史里，时间由日志推定。
