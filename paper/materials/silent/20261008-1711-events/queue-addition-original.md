
## 2026-10-08 17:14 — Y5H4CFAQ2WTG复盘新增非阻塞纯bug（抽牌入口漏认全弃重抽标记）

- **silent-0300**：仅转录学习者回报，`agent/src/reflex/turn-solver.ts:3615` 的 drawsCards 遗漏计算下注的 drawDiscardedHand，最少损选线未将可打的零费全弃重抽纳入抽牌优先。证据 Y5H4CFAQ2WTG/A10/F33T10；学习者回溯 L704TLETMZBM/F48T6 为首证，本局 repeat，保留原先验和首证，不记上线后重犯。对局正常结束，非阻塞，不由运维修机制。
- 沿已注册 silent-proposal-1cb36e182078a20e 自动策略链，交学习者按原固定帧实现、验证和自测合入；实际重抽胜负、完整 dirty 源码及整场受控结果未记录，不承诺补入获胜，不改变 SL/药水/权重规则。另两提案 fab06d987903ee52/54f7ee6b632cab26 沿原自动链，不复派或标实现。原报告及11项学习证据见 paper/materials/silent/20261008-1711-events/pm-originals/report.md。
