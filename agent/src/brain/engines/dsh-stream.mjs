/** Observe actual stream progress; headless --json otherwise emits only committed steps. No tools are registered. */
export const name = "sts2-brain-stream";
export function apply(ctx) {
  ctx.on("agent/assistant-stream", ({ frame }) => {
    if (frame.chunk) {
      const chunk = frame.chunk;
      if (["reasoning-delta", "text-delta", "tool-call-delta"].includes(chunk?.type)) {
        process.stdout.write(`${JSON.stringify({ type: "sts2_stream", kind: chunk.type, chars: String(chunk.text ?? "").length })}\n`);
      }
    }
  });
}
