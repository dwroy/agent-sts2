/**
 * DeepSeek Harness plugin (Cordis) for the STS2 decision experiment, arm C.
 *
 * Registers ONE model-facing tool (the question kind's decision tool, same JSON Schema as arm B) and uses the
 * harness loop to enforce a valid answer:
 *  - tool body: validates the arguments with the experiment's shared validator; invalid -> throws, so the
 *    harness returns an isError tool result carrying the exact problem and the valid values, and the agent
 *    loop asks the model again; valid -> records it and concludes the turn (no further model call);
 *  - agent/turn-stopping: the model ended its turn without a valid submission (answered in text) -> steer
 *    it back ("call the tool"), which keeps the turn open for one more step;
 *  - agent/pre-step: once the retry cap is spent, rejects further steps so the turn ends.
 * Attempts = the first answer + at most STS2_MAX_RETRIES corrections (tool errors and text answers together).
 *
 * Inputs (env): STS2_SPEC_FILE (the question's AnswerSpec JSON), STS2_OUT_FILE (JSONL log of attempts),
 * STS2_VALIDATE_MODULE (absolute path of lib/validate.ts), DSH_LLM_MODULE (absolute path of dsh-llm's entry),
 * STS2_MAX_RETRIES (default 2).
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const name = 'sts2-decision'
export const inject = ['tools']

const log = (entry) => appendFileSync(process.env.STS2_OUT_FILE, `${JSON.stringify({ t: Date.now(), ...entry })}\n`)

export async function apply(ctx) {
  const spec = JSON.parse(readFileSync(process.env.STS2_SPEC_FILE, 'utf8'))
  const { validate, repairText } = await import(pathToFileURL(process.env.STS2_VALIDATE_MODULE).href)
  const { createUserMessage } = await import(pathToFileURL(process.env.DSH_LLM_MODULE).href)
  const maxRetries = Number(process.env.STS2_MAX_RETRIES ?? '2')
  const state = { attempts: 0, accepted: false, exhausted: false }
  const spend = (kind, detail) => {
    state.attempts += 1
    if (state.attempts > maxRetries) state.exhausted = true
    log({ event: kind, attempt: state.attempts, ...detail })
  }

  ctx.tools.register({
    name: spec.toolName,
    description: spec.toolDescription,
    parameters: spec.schema,
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: String(value.message) }],
    },
    async execute(args, exec) {
      if (state.accepted || state.exhausted) {
        throw new Error('No further submissions are accepted for this question.')
      }
      const verdict = validate(args, spec)
      if (verdict.ok) {
        state.accepted = true
        state.attempts += 1
        log({ event: 'accepted', attempt: state.attempts, args, warnings: verdict.warnings })
        exec.concludeTurn()
        return { accepted: true, message: 'Decision recorded.' }
      }
      spend('invalid', { args, errors: verdict.errors, classes: verdict.classes })
      if (state.exhausted) throw new Error(`${repairText(verdict, spec)} (no retries left)`)
      throw new Error(repairText(verdict, spec))
    },
  })

  ctx.on('agent/turn-stopping', ({ agent }) => {
    if (state.accepted || state.exhausted) return
    spend('no_tool_call', {})
    if (state.exhausted) return
    agent.steer(createUserMessage({
      content: [{ type: 'text', text: `You have not submitted a valid answer. Call the tool ${spec.toolName} now with your answer as its arguments; do not answer in text.` }],
      source: { kind: 'sts2-decision' },
    }))
  })

  ctx.on('agent/pre-step', async (payload, next) => {
    if (state.exhausted && !state.accepted) {
      log({ event: 'pre_step_rejected', step: payload.step })
      return { kind: 'reject' }
    }
    return next()
  })

  log({ event: 'plugin_ready', tool: spec.toolName, maxRetries })
}
