import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseTask, renderTask, characterBuiltins } from '../../../.worktrees/integrator48-normal-20261024-1049/learner/lib/task.ts';

const dir = new URL('./', import.meta.url);
const before = parseTask(readFileSync(new URL('before.md', dir), 'utf8'), 'strategy-proposal', 'fixed-template');
const candidate = parseTask(readFileSync(new URL('candidate.md', dir), 'utf8'), 'strategy-proposal', 'fixed-template');
const { body: oldBody, ...oldMeta } = before;
const { body: newBody, ...newMeta } = candidate;
assert.deepEqual(newMeta, oldMeta);
const open = '{{^is_ironclad}}## 1.4';
const start = newBody.indexOf(open);
const end = newBody.indexOf('{{/is_ironclad}}', start);
assert(start >= 0 && end > start);
assert.equal(newBody.slice(0, start) + newBody.slice(end + '{{/is_ironclad}}'.length), oldBody);
const section = newBody.slice(start, end);
for (const binding of ['proposal_ids', 'proposal_repair', 'research_request', 'implementation_request', 'backfill_source', 'external_source']) {
  assert(section.includes(binding));
}
for (const term of ['character=silent', '其他角色保持原任务', '手动任务只有原规格明确授权', 'experience_ids', 'ledger_ids', 'source_refs', 'not_applicable', 'observational', '三输入', '不逐条改写旧经验', 'brain-strategies-v1', '原#28合同', '消费者合同缺口', 'fixes=[]', 'merged=null', 'tests=null']) {
  assert(section.includes(term), term);
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const cases = [];
for (const character of ['ironclad', 'silent', 'regent', 'defect', 'necrobinder']) {
  for (const batch of ['ordinary-fixed-batch', 'manual']) {
    const fixed = {
      cwd: '/fixed/project', project_root: '/fixed/project', worktree: '/fixed/project/.worktrees/review',
      logs_dir: '/fixed/project/logs', scratch: '/fixed/project/.worktrees/review/learner/runs/fixed',
      task: 'strategy-proposal', ...characterBuiltins(character),
    };
    const oldRendered = renderTask(before, { runs: 'FIXED_RUN', batch }, fixed);
    const rendered = renderTask(candidate, { runs: 'FIXED_RUN', batch }, fixed);
    const { experience_path: addedExperiencePath, ...existingValues } = rendered.values;
    assert(!Object.hasOwn(oldRendered.values, 'experience_path'));
    assert.deepEqual(existingValues, oldRendered.values);
    assert.equal(addedExperiencePath, characterBuiltins(character).experience_path);
    assert(!rendered.prompt.includes('{{'));
    const title = '## 1.4 静默普通策略提炼';
    if (character === 'ironclad') assert.equal(rendered.prompt, oldRendered.prompt);
    else {
      const a = rendered.prompt.indexOf(title);
      const b = rendered.prompt.indexOf('## 2. 边界与实现', a);
      assert(a >= 0 && b > a);
      assert.equal(rendered.prompt.slice(0, a) + rendered.prompt.slice(b), oldRendered.prompt);
      assert(rendered.prompt.includes('本节仅适用于 character=silent'));
    }
    cases.push({ character, batch, passed: true, prompt_bytes: Buffer.byteLength(rendered.prompt),
      before_sha256: hash(oldRendered.prompt), after_sha256: hash(rendered.prompt),
      ironclad_exact: character === 'ironclad', added_audit_experience_path: addedExperiencePath,
      applicability: character === 'silent' ? (batch === 'manual' ? 'original explicit authorization required' : 'ordinary unbound natural only') : 'not applicable',
    });
  }
}
const result = { passed: true, five_characters: true, render_cases: cases.length,
  same_metadata_defaults_tools_effort: true, existing_render_parameter_values_unchanged: true,
  added_audit_value: 'experience_path; placeholders are collected before conditional sections are rendered',
  initial_check: 'render-check.txt preserves the rejected overstrict assertion that all audit values are identical; corrected check allows only the existing built-in experience_path',
  only_inserted_section_changed: true, old_contract_and_report_json_unchanged: true,
  six_restricted_bindings_explicitly_excluded: true,
  non_silent_non_ironclad_receive_explicit_not_applicable_text: true,
  binding_checks_are_instruction_review_not_runtime_enforcement: true,
  native_starts: 0, full: 0, cases };
writeFileSync(new URL('render-check.json', dir), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
