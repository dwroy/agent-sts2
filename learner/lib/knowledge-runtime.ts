/** Opt-in runtime content tasks. Source-changing work keeps its original delivery protocol. */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { KnowledgeStore } from "../../agent/src/knowledge/runtime/store.js";
import { PROJECT_ROOT } from "../../agent/src/core/paths.js";
import { classificationLearningInstructions } from "./knowledge-classification.js";

export function runtimeLearningInstructions(env: NodeJS.ProcessEnv, task: string, character: string, scratch: string, projectRoot = PROJECT_ROOT): string {
 const runtime = env["STS2_KNOWLEDGE_RUNTIME"];
 if (!runtime || !["experience-update", "strategy-proposal"].includes(task)) return "";
 if (!env["LEARNER_BATCH_ID"] || !env["LEARNER_STATE_FILE"]) throw new Error("runtime learning requires an original registered batch");
 const batch = JSON.parse(readFileSync(env["LEARNER_STATE_FILE"], "utf8")).batches[env["LEARNER_BATCH_ID"]];
 if (!batch || batch.character !== character || batch.implementation_request || batch.research_request || batch.proposal_ids?.length || batch.proposal_repair) return "";
 const store = new KnowledgeStore(resolve(runtime), { readOnly: true });
 let version: string | null;
 try { version = store.current(); } finally { store.close(); }
 if (!version) throw new Error("runtime knowledge has no migrated published baseline");
 return `\n\n## 本批 runtime 知识交付合同（覆盖旧内容提交/合入/完整代码测试章节）
本批知识基线 ${version}，batch=${env["LEARNER_BATCH_ID"]}。只从已绑定证据学习；迁移不提升可信度或扩大角色/进阶。普通内容更新不修改正式Git知识、源码、main/live，不commit/merge，不跑完整代码回归；需代码改动则按原代码提案链另交研发，不借候选发布执行规则。
先用只读命令 node --import tsx ${join(projectRoot, "agent/tools/knowledge-runtime.ts")} query --runtime ${runtime} --version ${version} --character ${character} --limit 100 查询正式数据；完整文档用同一CLI export --runtime ${runtime} --version ${version} --character ${character} --destination ${join(scratch, "published.json")}。不从旧Git副本覆盖新知识。保存 ${join(scratch, "knowledge-candidate.json")}：{schema:"knowledge-candidate-v1",id:本批batch,base:"${version}",character:"${character}",source:原学习任务/来源标识,files:{"characters/${character}/experience.json":完整替换文档的JSON字符串}}。只填实际更新的文档；strategy-entries/reflex及必要vocab/core按原schema提交，同一候选内保持引用齐全。不能删除旧证据、反证、条目或静默扩大scope；证据冲突保留并交原owner。程序校验失败保留原件，不伪造发布。
保留原账本、代码提案、来源/逐ID去向和报告要求。外部/回刷任务仍完整履行原native与冻结来源合同；destinations指向scratch内真实候选条目，runtime核每个变动与原产物一致。最终JSON带 knowledge_candidate=${join(scratch, "knowledge-candidate.json")}、commit:null、merged:null、implementation_domains:[]；报告中记录知识基线，tests如实为null。没有有效内容增量则不填knowledge_candidate，沿原无变更回报。候选由完成回调提交、校验、事务发布；生产工具读回/自然采用及原父要求保持开放。${classificationLearningInstructions(character)}`;
}
