/** Dispatch-bound archival output; never inject operational reports into brain knowledge. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

export function operationalLaunchRecord(env: NodeJS.ProcessEnv): Record<string, unknown> | undefined {
  if (!env["LEARNER_BATCH_ID"] || !env["LEARNER_STATE_FILE"]) return undefined;
  const selected = JSON.parse(readFileSync(env["LEARNER_STATE_FILE"], "utf8")).batches[env["LEARNER_BATCH_ID"]]?.operational_runtime;
  if (!selected || !selected.enabled && !selected.read_directories?.length) return undefined;
  return { batch: env["LEARNER_BATCH_ID"], selection: selected, selection_sha256: createHash("sha256").update(JSON.stringify(selected)).digest("hex") };
}

export function hasOperationalContract(env: NodeJS.ProcessEnv, task: string): boolean {
  if (!env["LEARNER_BATCH_ID"] || !env["LEARNER_STATE_FILE"]) return false;
  const batch = JSON.parse(readFileSync(env["LEARNER_STATE_FILE"], "utf8")).batches[env["LEARNER_BATCH_ID"]];
  return batch?.operational_runtime?.enabled === true && batch.operational_runtime.entries?.includes(task) === true;
}

export function operationalReadInstructions(env: NodeJS.ProcessEnv, character: string, scratch: string, root: string): string {
  if (!env["LEARNER_BATCH_ID"] || !env["LEARNER_STATE_FILE"]) return "";
  const batch = JSON.parse(readFileSync(env["LEARNER_STATE_FILE"], "utf8")).batches[env["LEARNER_BATCH_ID"]];
  const selected = batch?.operational_runtime;
  if (!selected || selected.schema !== "operational-runtime-selection-v1" || selected.root !== resolve(root) || batch.character !== character) return "";
  const directories: unknown = selected.read_directories ?? (selected.directory ? [selected.directory] : []);
  if (!Array.isArray(directories) || directories.some(p => typeof p !== "string" || !resolve(p).startsWith(join(resolve(root), "data") + "/"))) throw new Error("invalid operational read sources");
  if (!directories.length) return "";
  return `\n\n本批只读运营来源（原派发绑定）：${JSON.stringify(directories)}。本批已指定局号的复盘可能只在SQLite，不能把notes/lessons.md缺标题当未复盘。逐目录用 python3 ${join(root, "ops/learning_runtime.py")} query --runtime <directory> --character ${character} --kind postmortem --run <原局号> --limit 100 --offset 0 查真实completion，再用同一CLI report --runtime <directory> --id <completion> --destination ${join(scratch, "<completion>-postmortem.md")} 导出原字节。分页读完本批局号；只读与原自有角色证据核同。运营读取不自动将报告变成正式知识，提炼仍经原K1/ledger/提案与限制合同；源库缺失/坏SHA明确报错，不从旧Git补造。`;
}

export function operationalInstructions(env: NodeJS.ProcessEnv, task: string, character: string, scratch: string, cwd: string, root: string): string {
  if (!env["LEARNER_BATCH_ID"] || !env["LEARNER_STATE_FILE"]) return "";
  const batch = JSON.parse(readFileSync(env["LEARNER_STATE_FILE"], "utf8")).batches[env["LEARNER_BATCH_ID"]];
  const contract = batch?.operational_runtime;
  if (!contract || !contract.enabled) return "";
  if (contract.schema !== "operational-runtime-selection-v1" || contract.root !== resolve(root)
    || batch.character !== character || (batch.learner_task ?? batch.task ?? "postmortem") !== task
    || resolve(batch.worktree ?? root) !== resolve(cwd) || !contract.entries?.includes(task)) throw new Error("original operational runtime contract mismatch");
  const base = execFileSync("git", ["-C", cwd, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const parents = ["learning_request", "research_request", "implementation_request", "audit_key", "feature_request"].flatMap(k => batch[k] ? [batch[k]] : []);
  const path = join(scratch, "operational-candidate.json");
  const example = { schema: "operational-candidate-v1", id: env["LEARNER_BATCH_ID"], task, character,
    base, runs: batch.runs ?? [], parents, proposals: [], ledger_ids: [], report: { path: join(scratch, "report.md"), sha256: "报告原字节SHA256" },
    records: [{ id: `${env["LEARNER_BATCH_ID"]}:report`, kind: task === "postmortem" ? "postmortem" : "audit",
      payload: { summary: "本批发现、反证、适用限制和未完项；不冒称正式知识", status: "observed" },
      evidence: (batch.runs?.length ? batch.runs : [null]).map((run: string | null) => ({ path: "原证据文件绝对路径", sha256: "原字节SHA256", character, ...(run ? { run } : {}) })) }] };
  return `\n\n## 本批运营 runtime 合同（覆盖旧报告提交/合入/完整代码检查章节）
原batch=${env["LEARNER_BATCH_ID"]}、原HEAD=${base}；运营库=${contract.directory}，合同SHA=${contract.control_sha256}。此合同仅适用本批，历史批次不转换。
按实际产物区分：复盘正文、审计发现、来源/反证、限制、待验证项、提案链接是运营记录；写提案不等于实现代码。纯运营只写本树scratch与原授权ledger/code_proposals CLI，不改正式Git知识、不commit/merge、不跑源码full。postmortem不追加共享notes/lessons.md，完整逐局正文（保留原## 局号标题）写 ${join(scratch, "report.md")}，appended仍列实际完成的原局号。mechanics-audit的旧out改为scratch内提案，输入report/summary仍只读；experience-asc-audit的正式经验修订另经已注入knowledge_candidate合同，运营审计与正式知识分别记录，禁止为了提交而修改Git经验。若未注入知识合同，仅保存候选待原owner，不提前激活。
保存 ${path}，严格格式参考：${JSON.stringify(example)}。records按postmortem/audit/finding/evidence/counterevidence/proposal-link/audit-status拆分，ID稳定、payload仅归档JSON，每项evidence必须真实文件+SHA；自有证据带run/character/ascension并核原日志，不能伪造。巨大追加日志用成对offset/length指定最多32MiB的原字节区间，sha256只核该区间，不能把整文件SHA填给区间。proposals填写原code_proposals CLI ID且与最终报告一致；ledger_ids保留实际账本ID；parents保留上述所有原父项。完整报告与原证据由程序原字节入库；不会自动进入大脑正式知识。代码提案、异议通知及父要求保持，不代其他角色ACK，不将记录入库称知识shipped。
若同批需要代码实现，独立运营记录仍可保存，实际代码/规则算子/模型/方法变更继续原工程路径，不能用JSON夹脚本或声明能力替代实现；依赖新能力的正式知识交knowledge_candidate原合同并保留候选。固定构建器/校准刷新只经程序固定producer入口，不手工伪造数据发布凭据；研究方法/冻结样本/科学准入门不变。silent-boss-calibration必须调用当前已安装的 python3 ${join(root, "agent/tools/boss-sim/refresh-silent.py")}（不要调用保留旧树中的旧脚本），--report改为本scratch/report.md，--out保留 ${join(cwd, "knowledge/characters/silent/boss-trust.json")} 作为原树核SHA的兼容视图。先用 python3 ${join(root, "ops/learning_runtime.py")} fixed-current --runtime ${contract.directory} 取当前D1路径，以该版boss-trust作--previous，不能拿陈旧Git校准覆盖。原定期cadence及冻结split/tune/val不变，程序另给fixed_data回执；最终task仍为fix-batch以保旧身份，不造fix commit/行为号。保留的旧树不merge源码；模型仍沿原previous的冻结source恢复，不把当前包装脚本版本冒作原模型版本。
最终JSON保留原task及审计覆盖、ledger/code_proposals、report等字段，新增operational_candidate=${path}、base=${base}。纯运营填commit:null、merged:null、tests:null、implementation_domains:[]；实际混合源码若另有现有消费者已能读取的K1知识，声明knowledge_independent:true，程序只对知识子产物保留原提案链并用当前已安装校验器发布，原commit/merged/工程域与源码完整检查仍继续。依赖尚未安装能力的知识不能声明独立，保留候选与版本依赖。程序验证/事务完成后才算运营入库，失败保留同ID原件并交原owner，不重学。后续经验提炼用 python3 ${join(root, "ops/learning_runtime.py")} query --runtime ${contract.directory} --character ${character} --kind postmortem --limit 100 --offset 0 查运营记录；按结果completion运行同一CLI report --runtime ${contract.directory} --id <completion> --destination <本scratch新文件> 读取原正文；export可导出JSON视图。不得从旧Git复盘缺失断言尚未完成。`;
}
