#!/usr/bin/env python3
"""Read frozen raw Boss hands and audit the exact R364 disclosure predicate."""
import gzip
import hashlib
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OLD = ROOT / 'paper/materials/20261016-v5s-regression-diagnosis'


def clean(text):
    return re.sub(r'\s+', '', text or '')


def eligible(card):
    values = card.get('dynamic_values') or []
    value = values[0] if values else {}
    damage = value.get('current_value')
    return (card.get('card_id') == 'POUNCE' and card.get('upgraded') is True and card.get('energy_cost') == 2
            and card.get('costs_x') is False and card.get('star_costs_x') is False and card.get('star_cost') == 0
            and card.get('enchantment') is None and card.get('target_type') == 'AnyEnemy' and card.get('requires_target') is True
            and clean(card.get('rules_text')) == '造成{Damage:diff()}点伤害。你的下一张技能牌耗能变为0{energyPrefix:energyIcons(1)}。'
            and clean(card.get('resolved_rules_text')) == f'造成{damage}点伤害。你的下一张技能牌耗能变为0res://images/packed/sprite_fonts/silent_energy_icon.png。'
            and len(values) == 1 and value.get('name') == 'Damage' and value.get('base_value') == 20
            and value.get('enchanted_value') == 20 and damage in [16, 21, 23])


def main():
    freeze = json.loads((OLD / 'freeze.json').read_text())
    runs = {row['run_id']: row for row in freeze['runs']}
    by_run, matched, pounce = defaultdict(Counter), [], []
    covered_offs = []
    config_code = {}
    for run, row in runs.items():
        if row['cohort'] != 'post':
            continue
        config_code[run] = []
        for cfg in row['configurations']:
            sha = (cfg.get('code') or {}).get('commit')
            status = {}
            for name, source in [('R363', 'a78bb40ef73af8bb15f40f7fa302dd33a76c2907'), ('R364', 'd3e57c77ef32346af9f59494914bcf2bce2de4ec')]:
                status[name] = subprocess.run(['git', '-C', str(ROOT), 'merge-base', '--is-ancestor', source, sha], capture_output=True).returncode == 0 if sha else None
            config_code[run].append(dict(ts=cfg['ts'], code=sha, ancestor=status))
    with (ROOT / freeze['sources']['states']['path']).open('rb') as source, gzip.open(OLD/'inputs-lean/frames.jsonl.gz', 'rt') as index:
        for line in index:
            frame = json.loads(line)
            run = frame['run_id']
            if run not in config_code or frame['floor'] not in [17, 33, 48, 49] or not frame['in_combat']:
                continue
            assert frame['off'] + frame['len'] <= freeze['sources']['states']['complete_prefix_bytes']
            source.seek(frame['off'])
            raw = source.read(frame['len'])
            state = json.loads(raw)['state']
            assert state['run_id'] == run and state['run']['floor'] == frame['floor']
            stats = by_run[run]
            stats['frames'] += 1
            covered_offs.append(frame['off'])
            hand = (state.get('combat') or {}).get('hand') or []
            stats['hand_cards'] += len(hand)
            relics = state['run'].get('relics') or []
            if any(r.get('relic_id') == 'WHISPERING_EARRING' for r in relics):
                stats['earring_held_frames'] += 1
            for card in hand:
                if card.get('card_id') != 'POUNCE':
                    continue
                stats['pounce_hand_occurrences'] += 1
                triggered = eligible(card)
                stats['r364_predicate_matches'] += triggered
                item = dict(run_id=run, floor=frame['floor'], turn=frame['turn'], observed_ts=frame['observed_ts'], eligible=triggered,
                            card=card, source=dict(path='logs/states.jsonl', off=frame['off'], len=frame['len'], sha256=hashlib.sha256(raw).hexdigest()))
                pounce.append(item)
                if triggered:
                    matched.append(item)
    with gzip.open(HERE/'inputs/pounce-hands.jsonl.gz', 'wt') as out:
        for item in pounce:
            out.write(json.dumps(item, ensure_ascii=False) + '\n')
    result = dict(schema='r363-r364-observed-boss-coverage-v1', cutoff=freeze['at'], frames=sum(v['frames'] for v in by_run.values()),
                  hand_cards=sum(v['hand_cards'] for v in by_run.values()), pounce_occurrences=len(pounce), r364_matches=len(matched),
                  frame_offset_list_sha256=hashlib.sha256(json.dumps(covered_offs).encode()).hexdigest(),
                  by_run=dict(by_run), actual_config_sources=config_code,
                  scope='Observed hands only; not an execution trace of the private least-loss facts or unseen draw/search states. No model/simulation called.',
                  static_effect='R364 known=false can veto early least-loss reload and mark outcomes unknown; does not itself change HP/cost/damage or force death. R363 adds B3 disclosure, no direct SL judge input.')
    (HERE/'coverage-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k: result[k] for k in ['frames', 'hand_cards', 'pounce_occurrences', 'r364_matches']}))


if __name__ == '__main__':
    main()
