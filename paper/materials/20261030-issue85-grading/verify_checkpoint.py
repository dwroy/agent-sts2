"""Independently check source integrity and the intermediate grading invariants."""
import collections
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parent
mapping = json.loads((OUT / 'source-map.json').read_text())
hash_scopes = json.loads((OUT / 'hash-scope-verification.json').read_text())
assert hash_scopes['checks_passed'] and hash_scopes['literal_hash_claims'] == 63
assessment = json.loads((OUT / 'assessments.json').read_text())
rows = assessment['entries']
bound = json.loads((ROOT / mapping['bound_document']['path']).read_text())['entries']
assert len(rows) == len(bound) == 173
assert len({r['id'] for r in rows}) == 173
assert [r['id'] for r in rows] == [r['id'] for r in mapping['entries']] == [r['id'] for r in bound]
sources = {s['path']: s for s in mapping['sources']}
for source in json.loads((OUT / 'grading-sources.json').read_text())['sources']:
    sources[source['path']] = source
for source in sources.values():
    path = Path(source['local_cache']) if 'local_cache' in source else ROOT / source['path']
    raw = path.read_bytes()
    assert len(raw) == source['bytes'] and hashlib.sha256(raw).hexdigest() == source['sha256'], source['path']

for i, row in enumerate(rows):
    assert row['source_map_entry'] == i and row['exact_mapped_evidence_count'] > 0
    assert row['counterevidence_preserved'] is True and row['published'] is False
    raw = json.dumps(bound[i], ensure_ascii=False, separators=(',', ':')).encode()
    assert hashlib.sha256(raw).hexdigest() == row['original_entry_audit_sha256']
    if row['grade'] == 'B+':
        assert 0 < row['confidence'] < .35 and row['proposed_summary_prefix'].endswith('，非对照：')
        p = row['claim_population']
        if p:
            assert p['n'] >= (10 if p['source'] == 'own' else 50)
        else:
            assert row['limited_fact_if_eligible'] and any(e.get('type') != 'external_aggregate' for e in bound[i]['evidence'])
    elif row['grade'] == 'B−':
        assert row['confidence'] == 0 and row['reason'] not in ('pending', 'unpublished', 'no_formal_publication')
    else:
        assert row['grade'] == 'A' and row['claim_population']['n'] >= 200

assert rows[137]['grade'] == rows[140]['grade'] == 'B+'
assert all(rows[i]['grade'] == 'B−' for i in [138, 139, 141])
assert all(rows[i]['grade'] == 'B+' for i in range(142, 152))
assert rows[154]['grade'] == rows[155]['grade'] == 'A'
assert all(rows[i]['grade'] == 'B−' for i in [152, 153, 157])

# Reconstruct both HP arms and every old-version/SL consistency comparison from
# the learner's original table, independently of the assessment builder.
table = json.loads((ROOT / '.worktrees/issue80-study-routes-20261026/review-output/tables.json').read_text())
hp_checks = []
for key in ['external_boss_thresholds', 'own_boss_thresholds_by_sl']:
    groups = collections.defaultdict(dict)
    for r in table[key]:
        if key.startswith('external'):
            if r['position'] != 1 or (r['act'], r['threshold']) not in [(2, .7), (3, .9)]:
                continue
            scope = tuple((k, r[k]) for k in ['version', 'act', 'position', 'threshold'])
        else:
            if r['subset'] != 'quality_subset' or (r['floor'], r['threshold']) not in [(33, .7), (48, .9)]:
                continue
            scope = tuple((k, r[k]) for k in ['subset', 'sl_stratum', 'floor', 'retry_on_floor', 'threshold'])
        groups[scope][r['side']] = r['local_pass']
    for scope, arms in groups.items():
        assert 'at_or_above' in arms and 'below' in arms
        upper, lower = arms['at_or_above'], arms['below']
        assert upper['rate'] >= lower['rate']
        if dict(scope).get('version') == 'v0.111':
            assert min(upper['n'], lower['n']) >= 200
        hp_checks.append({'scope': dict(scope), 'upper': upper, 'lower': lower})
assert len(hp_checks) == 16

result = {'checks_passed': True, 'entries': 173, 'verified_source_objects': len(sources),
          'retention_members_verified': sum(s.get('storage') == 'verified_retention_member' for s in sources.values()),
          'raw_ranges_verified_by_source_audit': len(mapping['windows']),
          'additional_hash_scope_ranges': len(hash_scopes['additional_unique_verified_ranges']),
          'total_verified_ranges': len(mapping['windows']) + len(hash_scopes['additional_unique_verified_ranges']),
          'original_document_and_all_entry_hashes': 'passed', 'hp_consistency_checks': hp_checks,
          'runtime_source_changed': False, 'knowledge_publication_performed': False}
(OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')

lines = ['# #85 逐条重判索引（检查点，未发布）', '',
         '原K1、原ID/修订、主证据指针与字节SHA见 source-map.json / assessments.json；低样本事实的限定内容见 limited_fact_if_eligible，不能将整个旧策略改称已验证机制。', '',
         '|序号|原ID|类别|档|证据类型|依据/保留问题|', '|---:|---|---|---|---|---|']
for r in rows:
    text = r['limited_fact_if_eligible'] or r['rationale']
    lines.append(f"|{r['original_index']}|{r['id']}|{r['category']}|{r['grade']}|{r['evidence_type']}|{text.replace('|', '/')}|")
(OUT / 'entry-index.md').write_text('\n'.join(lines) + '\n')

# A complete A list and five varied B+ examples per display class are prepared
# for the supervisor. This is a review aid, never a publication approval receipt.
samples = {'构筑组合': [142, 143, 144, 145, 51], 'Boss打法': [146, 149, 151, 96, 124],
           '路线资源': [26, 34, 35, 156, 172], '单牌选牌': [137, 140, 75, 83, 102],
           '其他决策': [61, 64, 65, 164, 121]}
review = {'A_all': [r['id'] for r in rows if r['grade'] == 'A'],
          'B_plus_five_per_category': {k: [rows[i]['id'] for i in indexes] for k, indexes in samples.items()},
          'review_completed': False, 'publication_authorized_by_this_artifact': False}
assert len(review['A_all']) == 2
for category, indexes in samples.items():
    assert len(indexes) == 5 and all(rows[i]['grade'] == 'B+' and rows[i]['category'] == category for i in indexes)
(OUT / 'review-list.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'hp_consistency_checks'}, ensure_ascii=False))
