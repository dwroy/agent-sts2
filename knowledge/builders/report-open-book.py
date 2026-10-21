#!/usr/bin/env python3
"""Compare the reviewed external inventory against a fixed mod catalogue, without game/model calls."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

KINDS = ('cards', 'relics', 'monsters', 'events')
OTHER = {'ironclad', 'defect', 'necrobinder', 'regent'}


def clean(value):
    return re.sub(r'\s+|\[/?[^\]]+\]', '', value or '')


def report(root, mod_path, out):
    libraries = [json.loads((root / 'knowledge' / scope / 'open-book.json').read_text()) for scope in ('common', 'characters/silent')]
    entries = sum((data['entries'] for data in libraries), [])
    raw = mod_path.read_bytes()
    mod = json.loads(raw)
    provenance = {'catalog_sha256': hashlib.sha256(raw).hexdigest(), 'mod_version': mod.get('mod_version'),
                  'fetched_at': mod.get('fetched_at'), 'game_version': mod.get('health', {}).get('game_version'),
                  'limits': '固定 mod 导出缓存，不是当前现场；mod_version 不等于游戏版本，未知游戏版本保持 null。'}
    coverage = {'schema': 'open-book-coverage-v1', 'source': libraries[0]['sources'], 'comparison': provenance, 'inventory': {}}
    conflicts = []
    for kind in KINDS:
        local = {e['id']: e for e in entries if e['kind'] == kind}
        actual = {e['id']: e for e in mod['collections'].get(kind, [])}
        # A conservative upper bound: all exported pools except explicitly other-character pools.
        eligible = {ident: e for ident, e in actual.items() if (e.get('color') not in OTHER if kind == 'cards' else
                    not any(f'.{pool}_' in e.get('pool', '').lower() for pool in OTHER) if kind == 'relics' else True)}
        coverage['inventory'][kind] = {
            'external_total': len(local), 'external_pools': dict(sorted(Counter(e['origin_pool'] for e in local.values()).items())),
            'mod_total': len(actual), 'mod_upper_bound_silent': len(eligible),
            'covered_mod_upper_bound': len(eligible.keys() & local.keys()),
            'missing_mod_upper_bound': sorted(eligible.keys() - local.keys()),
            'missing_all_mod_ids': sorted(actual.keys() - local.keys()),
            'external_only_ids': sorted(local.keys() - actual.keys()),
            'limits': '分母为固定 mod 目录的保守可遇上界，含事件/生成/多人专属；不是实际 encounter 概率或已验证实盘样本。其他角色池仅在跨池获得时条件可遇，单列，不当成本角色验证。',
            'conditional_other_pool': sorted(e['id'] for e in local.values() if e['origin_pool'] in OTHER),
        }
        for ident in sorted(local.keys() & actual.keys()):
            entry, live = local[ident], actual[ident]
            compare = []
            if kind in ('cards', 'relics'):
                compare.append(('description', live.get('description'), entry.get('description')))
                for field in ('cost', 'damage', 'block') if kind == 'cards' else ():
                    a, b = live.get(field), entry['facts'].get(field)
                    if a is not None and b is not None and a != b:
                        compare.append((field, a, b))
            elif kind == 'monsters':
                for field in ('min_hp', 'max_hp'):
                    a, b = live.get(field), entry['facts'].get(field)
                    if a is not None and b is not None and a != b:
                        compare.append((field, a, b))
            elif kind == 'events':
                ext_options = {e['id']: e for e in entry['facts']['options']}
                for option in live.get('options', []):
                    if option['id'] in ext_options:
                        compare.append((f"options.{option['id']}", option.get('description'), ext_options[option['id']].get('description')))
            for field, a, b in compare:
                if a is None or b is None or (clean(a) == clean(b) if isinstance(a, str) and isinstance(b, str) else a == b):
                    continue
                template = isinstance(a, str) and '{' in a
                conflicts.append({'kind': kind, 'id': ident, 'field': field, 'mod': a, 'external': b,
                                  'classification': 'mod-template-vs-resolved-external' if template else 'text-or-number-difference; version/keywords/ascension need review',
                                  'resolution': 'mod 优先；不以外部覆盖已知现场值，不据此改策略或模拟机制'})
    out.mkdir(parents=True, exist_ok=True)
    for name, value in [('coverage.json', coverage), ('conflicts.json', {'schema': 'open-book-conflicts-v1', 'source': libraries[0]['sources'], 'comparison': provenance,
            'counts': dict(Counter(c['kind'] for c in conflicts)), 'conflicts': conflicts})]:
        (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: {f: v[f] for f in ('external_total', 'mod_upper_bound_silent', 'covered_mod_upper_bound', 'missing_mod_upper_bound')} for k, v in coverage['inventory'].items()}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--mod', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report(args.root, args.mod, args.output)
