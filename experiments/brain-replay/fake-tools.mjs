/**
 * A stand-in tool for the brain replay's smoke runs (tools/brain-replay.ts --fake-tools), until the knowledge
 * tools land in src/tools/registry.ts: it only proves that an engine reaches our tools and gets the context.
 */
export function buildTools() {
  return [
    {
      name: "kb_session_check",
      description: "冒烟测试用的假工具（知识库工具合入前的占位）：返回本次会话的核对码和进阶等级。回答之前先调用一次；它不含任何游戏数据，不影响决策。",
      inputSchema: { type: "object", properties: {} },
      run: (_input, ctx) => ({ text: `核对码 BRAIN-SMOKE-OK；A${ctx.ascension}；本工具不含游戏数据。` }),
    },
  ];
}
