# 静默营火超时与真实回血的勘误

来源experience-update，batch 2c0cf792-6128-4fec-b4a2-9c70e9f935f1；实现strategy-proposal，silent/A10，授权Roy-2026-10-07-learning。账本silent-0020，经验silent-rest-buffer-observation。

原提案silent-proposal-d8b438b597e9fb6c中的本批营火总数40、32HEAL、回血771是初次completed过滤的遗漏，原件保留；更正为41个实际选择、33HEAL/8SMITH、回血792。9W38TRGPJW9Q F16 d428897 result明确failed(wait)/请求超时，但原后继states显示34→55（+21），此前两火各38→59。请求超时不等动作未生效，亦不能反向将回执改成completed；按真实状态与原回执分账。原动作ref、完整状态见rest-actions.json；初错数保存在rest-actions-initial.json、experience-draft-before-rest-correction.json。

旧/新行为：保持现有打法规则；知识和离线统计不再按completed过滤漏真实恢复，不预支未到营火。独立实现应先核当前完整回执链是否已有覆盖；证据不足不强制定重试或新回血策略，避免重复下达已成功动作。无参数拟合、无训练验证切分、无对照胜局，其他角色及未观察范围等价。

验证用固定原始34→55状态与exact decision_id、指纹和offset/bytes/SHA重放，只核资源观察，不发在线题、不运行play。预期修正统计口径，获胜收益未知。回退为本批experience-before.json单叶并保留后续并行经验。当前未提交、未合live、没有implemented_commit，不登记implemented/shipped。
