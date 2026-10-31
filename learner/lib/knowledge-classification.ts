/** Reusable injection for registered pure knowledge tasks; no operational completion policy here. */
export function classificationLearningInstructions(character: string): string {
 return `\n显式分类可另交 characters/${character}/classification.json（公共知识用 common/classification.json），schema=knowledge-classification-v1；和目标内容一起放 knowledge-candidate-v1.files，沿原 batch/base/source 发布。每项保留稳定元数据id、target{path,type,id,parent_id?,sha256}、topics、entities、aliases、evidence、rationale；sha256为目标条目递归键排序规范JSON的SHA256，工具 classification-draft 可生成空壳。主题只用 startup/boss/double_boss/build_route/climb_route，可多选或明确空数组；别名和分类必须由你核证据，不能从ID/标题自动猜。未分类仍unknown，主题不能代替角色/进阶/游戏版本/幕/题型/动态条件。修正文档或嵌套组合时，同候选更新其分类目标SHA；保留旧证据、反证、置信度、原ID及适用范围。严格格式不允许topics时不加字段；独立元数据不改变原内容。详见 docs/knowledge-classification.md。`;
}
