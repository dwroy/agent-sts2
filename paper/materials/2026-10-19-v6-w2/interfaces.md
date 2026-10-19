# V6 W2 离线学习接口

请求 roy-20261019-v6，依据 main b5ae4d6f4 的第9.2节及本次 Claude 指派。这里只实现任务/格式，不编写任何游戏知识。

- `learner/tasks/v6-reflex-distill.md`：一次性手动派发获授权，codex1、gpt-6.1-sol/high、240分钟；与9.1隔离工作树、冻结输入，不读取对方在途产物。
- `learner/tasks/v6-direction-cards.md`：仅准备，尚未派发；9.1完成并核验后由Claude指派。
- `knowledge/builders/validate-v6.ts reflex|directions DRAFT.json CONTEXT.json`：只读，exit0/1，JSON输出含两个输入SHA，不写库、不提升发布状态。用 `agent/node_modules/.bin/tsx` 运行。
- `agent/src/v6/draft.ts` 复用W1 `reflexFile` / `directionFile` / vocab与predicate严格格式，增加完整去重经验覆盖、scope、来源/方向/标签引用、冻结局号和数值审计一致性。严格draft外壳与metadata字段见源码/任务模板；schema不接受的未知信息留报告，不伪造占位机制。
- context严格字段：character、experienceIds、directionIds、runIds。须从冻结正式经验、construction-templates和manifest提取，另记来源SHA；CLI验证列表不重复，审计员仍须核对来源。格式通过不等于因果/效应/统计正确、内容有证据或生产消费者读回。
- reflex numeric原W1条目不增加n/method等字段；这些单独在metrics逐条记录。无已知数值不补0；可留text_only/disputed或有证据的tag。空entries可通过，但报告必须明确无可发布知识。
- 方向卡未满足W1严格必填字段时保留未完成草稿与限制，不能用编造的core/ideal补齐。

W1既有格式、字段白名单、开关默认值与运行消费者未改；只有两个file schema改为export供同一校验器复用。原先三角色off题面/动作/config_sha固定字节测试继续锁住。新增模块没有运行接入。STOP保持、live不重建、Regent不恢复；正式知识和发布编号不改。

测试包含：完整固定草稿、漏条/重复条、越白名单、越冻结局、跨角色、未知source/标签、转换缺引用、signal/audit不一致、频率分母、证据不足空条目、方向卡及实际CLI正反例。CLI独立tsconfig只类型检查，不改依赖/安装包。早期类型检查路径/ESM设置失败原件保留.artifacts，修正结果另存。

验收（2026-10-19 17:08 CST）：agent tsc、独立CLI tsc通过；完整vitest561文件、5372通过、2原有跳过（198.15秒），含15项新增草稿/CLI固定数据测试及原三角色off等价测试；staged gitleaks无泄漏。原始输出保留本工作树.artifacts；归档成功摘要见checks.txt。
