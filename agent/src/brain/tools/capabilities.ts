/** Render the definitions registered on this very request, without duplicating schemas or knowledge. */
import type { ToolDef } from "./types.js";

export function toolCapabilities(tools: readonly ToolDef[]): string {
  if (!tools.length) return "";
  return "\n可用知识工具（按当前问题需要自行选择；正式参数约束随工具提供）：\n" + tools.map(tool => {
    const inputs = Object.entries(tool.inputSchema.properties ?? {}).filter(([name]) => !["limit", "offset"].includes(name)).map(([name, schema]) =>
      `${name}${tool.inputSchema.required?.includes(name) ? "（必填）" : "（可选）"}${schema.enum ? `=${schema.enum.join("/")}` : ""}`);
    return `${tool.name} — ${tool.description}\n主要输入：${inputs.join("；") || "无"}。`;
  }).join("\n");
}

/** Final-answer and re-ask phases close tools; do not advertise the previous query phase's live capabilities. */
export function withoutToolCapabilities(system: string, tools: readonly ToolDef[]): string {
  const catalog = toolCapabilities(tools);
  return catalog && system.includes(catalog)
    ? system.replace(catalog, "\n本阶段知识工具已关闭，使用题内事实和已取得资料作答，未知保持未知。") : system;
}
