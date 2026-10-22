/** Offline kernel inspection only. This plugin does not enqueue a user message or invoke an LLM. */
export const name = "sts2-offline-inspect";
export const inject = ["tools", "systemPrompt", "agents", "sessions", "agentDefaultModel"];
export function apply(ctx) {
  setImmediate(async () => {
    try {
      await ctx.loader.await();
      const tools = ctx.tools.schemas().map(t => t.name);
      const model = ctx.agentDefaultModel.currentSelection();
      process.stdout.write(`${JSON.stringify({ offline: true, tools, model, kernel_ready: true })}\n`);
      ctx.appExit(0);
    } catch {
      process.stdout.write(`${JSON.stringify({ offline: true, kernel_ready: false })}\n`);
      ctx.appExit(1);
    }
  });
}
