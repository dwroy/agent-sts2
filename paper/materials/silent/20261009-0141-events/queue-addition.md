
## 2026-10-09 01:46 — HEMND3SMQYB8复盘新增非阻塞纯bug（升级计算下注遗漏全弃重抽）

- [ ] **silent-0317**：仅转录学习者回报，`agent/src/reflex/card-model.ts:920` 将 calculatedGamble 限于未升级牌，`:1108` 未为升级分支写入 discardsHand/drawDiscardedHand，`turn-solver.ts:1676` 因而保留已弃旧手牌。HEMND3SMQYB8/A10/F48T3 d301206、F49末试T1 d301332—301335（s308992→308993弃7抽7）后缀无法执行，实际执行器重读新手牌另选；原局正常结束，非阻塞。首证R0HEV5E3QT6G/A0/F25T3 d209753—209757、s213813→213814；UACFSW4VDDLD/F48T2为学习者历史repeat。保持原prior=no/首证/observed。普通版0081已修、0300抽牌入口漏认drawDiscardedHand为另外旧条目，本升级分支单列。
- 沿已注册 `silent-proposal-2d2fa55483ceb71c`（0317/0318）自动strategy-proposal链，由学习者按原提案与固定帧实现、自测、实际合入；先查共享租约避免并发重复。范围仅本角色已观察升级文本，跨抽牌边界重算、未知新手牌不能按旧后缀确定计收益；保留未升级控制及其他角色等价。未执行的替代线和整场胜线未记录，不承诺修后转胜，不由运维修游戏机制。
- 旧0297/0079 repeat及紧勒0260补证沿原队列；其他三提案463d1c44f5e7efa8/c154ecfdf3ad6f65/b1100cb810a53d18由自动链处理，不重复派发。0318机制保持学习者原记录，不登记代码实现、shipped或新版本。原报告、固定帧和未记录限制见 `paper/materials/silent/20261009-0141-events/pm-originals/report.md`。
