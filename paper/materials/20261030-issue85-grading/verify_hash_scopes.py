"""Keep file/member hashes distinct from log-range hashes embedded in prose refs."""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parent
mapping = json.loads((OUT / 'source-map.json').read_text())
claims, false_file_comparisons, additional = [], [], []
known = {(x['path'], x['offset'], x['length'], x['sha256']) for x in mapping['windows']}
for entry in mapping['entries']:
    for ref in entry['evidence']:
        if 'source' not in ref:
            continue
        text = ref.get('original_ref', '')
        digest = re.search(r'(?<![A-Za-z0-9_])sha256[=:]([a-f0-9]{64})', text, re.I)
        if not digest:
            continue
        row = {'id': entry['id'], 'original_ref': text, 'expected_sha256': digest[1]}
        interval = re.search(r'\b(states|decisions) off=(\d+) bytes=(\d+) sha256=', text)
        if interval:
            path = 'logs/' + interval[1] + '.jsonl'
            offset, length = int(interval[2]), int(interval[3])
            with (ROOT / path).open('rb') as stream:
                stream.seek(offset)
                raw = stream.read(length)
            actual = hashlib.sha256(raw).hexdigest()
            assert actual == digest[1] and len(raw) == length
            row.update(scope='original_log_range', path=path, offset=offset, length=length, sha256=actual)
            if (path, offset, length, actual) not in known:
                additional.append(row)
                known.add((path, offset, length, actual))
        else:
            assert ref['source']['sha256'] == digest[1], (entry['id'], ref['source']['path'])
            row.update(scope='whole_source_file', path=ref['source']['path'], sha256=ref['source']['sha256'])
        if ref['source']['sha256'] != digest[1]:
            false_file_comparisons.append({'id': entry['id'], 'original_ref': text,
                                           'range_sha256': digest[1], 'container_file_sha256': ref['source']['sha256']})
        claims.append(row)
result = {'checks_passed': True, 'literal_hash_claims': len(claims),
          'whole_file_claims': sum(x['scope'] == 'whole_source_file' for x in claims),
          'log_range_claims': sum(x['scope'] == 'original_log_range' for x in claims),
          'additional_unique_verified_ranges': additional, 'claims': claims,
          'retained_probe_failure': {'kind': 'incorrect_hash_scope_assertion', 'assertion_failed': True,
                                     'cause': 'The first final probe compared inline states/decisions off/bytes SHA with review-cases.json container SHA. A second probe recognized decisions only and rejected the states reference. Both failures were probe scope errors; the correct raw ranges are now verified independently.',
                                     'incorrect_comparisons': false_file_comparisons},
          'runtime_mutation': False}
(OUT / 'hash-scope-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k not in ['claims', 'retained_probe_failure', 'additional_unique_verified_ranges']} |
                 {'additional_unique_verified_ranges': len(additional)}))
