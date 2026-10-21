拿牌 v2 正式候选只包含 source-manifest.json 列出的 14 叶（工程 / 固定测试 / Python 构建器 / 一个派生模型包）。base 为 492ac69f998801d0b42e6982ef972ed9992051bf；正式 source SHA、tree、patch 和逐叶 SHA / Git blob 在 checks/source-receipt.json 与 checks/source-manifest.json。材料独立提交，不能整 cherry-pick 父 / main / 805。

本轮不申请切 V6_CARD_DECIDER=jev。保持 CARDbrain、REFLEXoff、P2 暂停。准备性能、模型 / 题面工程检查已过；候选增量排序的质量门未过，具体数据见 report.md。请将“全部候选处于误差带内、Jev 跳过 60% 对大脑 20%、历史增量相关性很弱”如实交 Claude / watcher 转 Roy，不把本候选上线授权解释为质量已经通过。

沿原单点流程，若安排工程完整检查，请以实际 live 源码 / 最新知识冻结窄组合后只跑一次 tsc + full；本 owner 仅跑最终 tsc / 定向 / Python / gitleaks，没有并行完整 vitest。不要重跑这 60 次 Nova，不新派学习或模型批次。保留旧失败原件和 SOURCE 前后 SHA；当前工作树未改 live、STOP、对局或开关。

六个修改旧叶中，loop 只增 v2 提供方调用，card-pick 只增 v2 criteria 分支与日志；W8 cardPickReflex 的筛选 hunk 原样保留。construction-safety 保留 live 原通用 coverage 默认，新 v2 分支显式 cardValueKnown。projection-runtime 只追加可选提供方 / 生产审计和跳过 v2 不再使用的旧后台；现有 directionSnapshots / knowledge / onBrainWait / peekCompletedCore 不删。memory/types 只加可选字段。build-fight-value.py 只加 opening-* 子命令分流，原回合模型路径不改。详细运输时应三方保留 live 非重叠改动，不能整叶回退其他修复。

新模型包从当前候选构建器和固定训练行派生，角色限定 Silent，局内只读；其他角色继续旧路径。实际上线前仍需原实际消费者 / 版本 / 双通知 / 边界流程，本交付不代这些读回，不登记 release 或关闭学习父要求。正式合入与实际 live 采用后再沿原 retention 登记，当前未删除工作树 / 原始证据。
