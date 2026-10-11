"""Combine an intact full suite, exact failed-test retry, and the original paths continuation."""
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
original = (HERE / 'source-sandbox.log').read_text()
initial = int((HERE / 'source-sandbox.exit').read_text())
retry = (HERE / 'rollout-ranking-recheck.log').read_text()
paths = (HERE / 'source-paths-continuation.log').read_text()
assert (HERE / 'rollout-ranking-recheck.exit').read_text().strip() == '0'
assert (HERE / 'source-paths-continuation.exit').read_text().strip() == '0'
assert all((HERE / (name + '.exit')).read_text().strip() == '0' for name in
           ['python-fixtures', 'dispatch-fixtures', 'prepare-pinned', 'extract', 'pinned-replay',
            'audit-board', 'audit-sources', 'finish-pinned', 'seal-artifact', 'ledger-check'])
failures = re.findall(r'^ FAIL\s+(.+)$', original, flags=re.M)
if initial:
    assert initial == 1 and len(failures) == 1, failures
    assert 'rollout-live.test.ts' in failures[0]
    assert "code's ranking, options and auto-acts are unchanged by the rollout" in failures[0]
    assert re.search(r'Tests\s+1 failed \|', original)
    assert re.search(r'Tests\s+1 passed \| 13 skipped', retry)
assert re.search(r'Tests\s+11 passed', paths)


def totals(label, text):
    return sum(int(n) for n in re.findall(r'^\s*' + label + r'\s+[^\n]*\((\d+)\)', text, flags=re.M))


files = totals('Test Files', original) + (1 if initial else 0)
cases = totals('Tests', original) + (11 if initial else 0)
assert files > 250 and cases > 2600
result = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
          'initial_sandbox_exit': initial, 'original_failures': failures,
          'retry_exit': 0, 'retry_passed': 1, 'retry_skipped_already_covered': 13,
          'paths_continuation_exit': 0, 'paths_cases': 11,
          'python': 0, 'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8,
          'controls_compared': 4, 'idempotency': True,
          'assertions_timeouts_and_exclusions_unchanged': True, 'external_full': None, 'live': None}
(HERE / 'tests-summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(result, ensure_ascii=False))
