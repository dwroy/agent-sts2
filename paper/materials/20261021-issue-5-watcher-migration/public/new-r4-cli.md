[watcher] 交接第 4 项迁移：Roy 已接受 R4 四项异议，manual CLI 兼容及角色登记仍未完成。

## Goal

支持原 `v6-reflex-distill-r4` 任务的通知登记，让各角色依据真实回执完成原通知链；沿 #5 接续，不新建学习父要求。授权与边界见 `docs/learning-protocol.md`、`handoff/watcher-20261021.md` 第 4 项及 `paper/materials/20261021-090x-Roy-and-CEN-ops/R4-Roy-explicit-confirmation.json`。

## Acceptance

- [ ] 修复 `ack_manual_notice` 对原 R4 task 的白名单兼容，保留旧拒绝回执和旧 false flags。
- [ ] 保留四个 question id 与原 notice SHA 的绑定；各角色根据真实回执自行登记，禁止代 ACK。
- [ ] 若改代码，按 AGENTS.md 完成 tsc、固定数据测试及发前 gitleaks；交付提交、测试和回退方法，交 watcher/ops 沿原链集成。

## Owner and boundaries

owner:dev；开发时本 issue 新会话、独立工作树。ops 协调原通知链，各角色自行确认。原批次已退出、draft0；三个估计区间全跨 0、缺真实 source_experience。REFLEX 保持 off，不续批、不模拟，通知完成不关闭科学父、不冒称正式知识发布。

## Evidence

- `paper/materials/20261021-090x-Roy-and-CEN-ops/R4-manual-CLI-compatibility.json`（交接里 compatibility.json 的实际文件名）
- 同目录 `R4-Roy-explicit-confirmation.json`
- `paper/materials/20261020-2358-ops/R4-learning-notice-proposal.json`，SHA256 `4e6e78ab3504f55fc100f72082bb42b6e17397a50268555c1ad14497bc61cfe4`
- 四原 question id：`r4-no-supported-pick-advice`、`r4-genuine-source-experience-missing`、`r4-old-combat-scope-retained`、`r4-unavailable-provenance-and-damage`。
