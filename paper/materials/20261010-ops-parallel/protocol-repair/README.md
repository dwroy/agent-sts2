# 学习批次启动失败修复

2026-10-10 独立运维子任务；只修基础设施，游戏知识、模型和推理强度保持。

## 核实的根因

本次 18 个 rc3 失败全部没有输出完成回报：17 个 stderr 明确为 `recursive Codex Fast launcher`，另 1 个（20261010-001301-fix-batch）为沙箱启动前 unreadable glob 扫描错误。原 `.out` / `.err` 按原字节另存并记 SHA，本任务没有写 learn.json / 队列；并行调度可继续更新，读入时整文件 SHA 仅用于索引。

递归来自 `ops/codex-ops-learner.sh`：一批任务的 wrapper 导出 `LEARNER_CODEX_BIN=.../codex-fast.sh`，完成通道继续派任务时继承该值，随后旧脚本又把它赋给 `STS2_CODEX_FAST_BIN`。于是权限预检调用 Fast wrapper 时被递归保护直接拒绝，模型题尚未开始。无条件审计空回报再附加 `missing string code_proposals array` / `missing source commit for proposal audit`，错误地生成了游戏提案补链记录。

## 修复

- 嵌套启动识别已有 wrapper（包括同 inode 的 symlink），复用原 native Codex。两个指针都已被旧逻辑污染时，使用 PATH 中的 native Codex；原显式 native override 保留。
- Fast wrapper 本身对 symlink 同样拒绝递归；继续强制一次 priority，模型、xhigh、sandbox 参数和任务输入不变。
- 非零退出且无完成回报时，保留 failed / 原 rc / 空 report，并记录 stderr 路径；不凭空补提案或来源提交，不派游戏提案补链。有真实回报（即使 rc 非零）仍完整审计；rc0 缺回报也仍按协议失败。

## 验证与限制

固定假 CLI / 假完成通道专项 8 例：原实现 4 例红，修复后 8 例绿；不启动真实模型或对局。现有学习闭环专项 24 例通过。固定沙箱全套结果见 `sandbox-checks.log`，完整检查 exit 0：TypeScript 通过、Vitest 共 263 个文件 / 2674 例通过。最终状态另记 `validation.json`。

本任务没有改写 18 个原失败或 pending 补链对象，没有重派、合入 main/live 或 push。发布与现有错误补链的串行纠正由主 ops 核实，原错误状态先保持。001301 的 glob 扫描失败是另一个外部环境问题，未绕过 key 隔离或改变外部路径。旧模型完成但合入冲突、无源码却 main/live 不等价的批次是独立问题，不能用本修复冒称验收通过。当前补丁覆盖普通写批次的无报告分类；复盘/升阶/核心构筑各自既有完成通道保持。

论文原件索引为 `failure-evidence.json`，旧新实现为 `source-diff.patch`，红/绿/完整日志保留；本次是基础设施修复，不造游戏版本或 shipped。
