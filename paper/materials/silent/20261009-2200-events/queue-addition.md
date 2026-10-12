
## 2026-10-09 22:16 — 20261009-204301复盘新非阻塞纯 bug（仅转录学习者）

- [ ] **silent-0347**：证据局 54G5683J0E5S；定位 `agent/src/reflex/rollout-live.ts:831`；学习者原回报“组装师攻击召唤未接入五回合推演；活体召唤只读ILLUSION_MOVE”。完整证据、反例与未知范围见 `learner/runs/20261009-204303-postmortem/report.md`，原提案 silent-proposal-43156dee9f23ae43。不是卡死、崩溃或非法动作，交原学习者提案链；不由运维补机制或实现，不据此宣称该局能赢，不重派或标 shipped。

## 2026-10-09 22:16 — 20261009-211301复盘新非阻塞纯 bug（仅转录学习者）

- [ ] **silent-0349**：证据局 9663Y88TYK73；定位 `agent/src/reflex/turn-solver.ts:2684`；学习者原回报“已有虚弱后临时减力直接减显示攻击，末次尖啸方案报损3，实际需损5并死亡。”。完整证据、反例与未知范围见 `learner/runs/20261009-211302-postmortem/report.md`，原提案 silent-proposal-bb7597d8a1fe63ff。不是卡死、崩溃或非法动作，交原学习者提案链；不由运维补机制或实现，不据此宣称该局能赢，不重派或标 shipped。
