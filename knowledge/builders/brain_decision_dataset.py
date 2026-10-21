#!/usr/bin/env python3
"""Read frozen grep-F prefilters and extend the archived reward dataset. No model calls."""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path
from brain_card_distill import dumps, rows, digest, successful, write

TYPES = ('card_reward', 'event', 'rest', 'shop', 'act_plan')

def question_types(label, payload):
    result = []
    if label == 'reward/card': result.append('card_reward')
    elif label.startswith('event/'): result.append('event')
    elif label.startswith('rest/'): result.append('rest')
    elif label.startswith('shop/'): result.append('shop')
    trigger = (payload.get('run_state') or payload).get('trigger')
    merged = (payload.get('run_plan_task') or {}).get('trigger')
    if label == 'event/act-plan' or label == 'run-plan' and trigger in ('start', 'act') or merged in ('start', 'act'):
        result.append('act_plan')
    return result


OPTION_FIELDS = frozenset('option description lethal then card copies card_text hp_cost hp_after upgrade max_hp_cost relics enchanted cards_to_name eligible_cards not_on_selection_screen potion_slots discard_first discardable_potions buy kind type rarity cost price text affordable_now in_deck end discard slot not_removable_eternal upgraded'.split())

def option_facts(options):
    if options is None: return None
    result = {}
    for key, raw in options.items():
        try: value = json.loads(raw) if isinstance(raw, str) else raw
        except ValueError: value = raw
        result[key] = {k: v for k, v in value.items() if k in OPTION_FIELDS} if isinstance(value, dict) else value
    return result


def project(raw):
    p = raw.get('payload') or {}
    brief, facts, run = p.get('run_brief') or {}, p.get('facts') or {}, p.get('run_state') or {}
    merged = p.get('run_plan_task') or {}
    def get(k):
        return next((obj[k] for obj in (facts, p, run, merged, brief) if obj.get(k) is not None), None)
    question = {k: get(k) for k in ('act', 'floor', 'ascension', 'hp', 'gold', 'deck', 'deck_size', 'relics', 'potions')}
    question['act'] = int(question['act'])
    question['floor'] = int(question['floor'])
    question['character'] = '静默猎手'
    question['boss'] = get('act_boss')
    question['question'] = raw.get('question')
    question['options'] = option_facts(raw.get('options'))
    # Keep observed question data, not aggregate estimates, advice or model outputs.
    for k in ('situation', 'event', 'stock'):
        if k in p: question[k] = p[k]
    question['plan_trigger'] = run.get('trigger') or merged.get('trigger')
    return question


class Outcomes:
    def __init__(self, logs, openings, inventory):
        self.endings, self.configs, self.stops = {}, collections.defaultdict(list), {}
        self.fights = collections.defaultdict(dict)
        self.inventory = json.loads(Path(inventory).read_text())
        for r in rows(Path(logs) / 'runs.jsonl'):
            rid = r.get('run_id')
            if rid and r.get('ended') and (rid not in self.endings or r['ended'] < self.endings[rid]['ended']): self.endings[rid] = r
        for r in rows(Path(logs) / 'run-config.jsonl'):
            if r.get('run_id') and r.get('ts'): self.configs[r['run_id']].append(r)
        for r in rows(Path(logs) / 'sl-attempts.jsonl'):
            rid, ts = r.get('run_id'), r.get('ended_at') or r.get('ts')
            if rid and ts and r.get('result') == 'died' and (rid not in self.stops or ts < self.stops[rid]['_stop']): self.stops[rid] = {**r, '_stop': ts}
        for r in rows(openings):
            if r.get('run') and r.get('ended'):
                key = (int(r['input']['act']), int(r['input']['floor']))
                prior = self.fights[r['run']].get(key)
                if not prior or r['ts'] < prior['ts']: self.fights[r['run']][key] = r

    def config(self, rid, ts):
        eligible = [r for r in self.configs[rid] if r['ts'] <= ts]
        return max(eligible, key=lambda r: r['ts']) if eligible else {}

    def outcome(self, rid, q, ts):
        end, death = self.endings.get(rid), self.stops.get(rid)
        stop = min(end['ended'] if end else '9999', death['_stop'] if death else '9999')
        death = death if death and death['_stop'] == stop else None
        end = end if end and end['ended'] <= stop else None
        # The inventory and opening snapshot have independent coverage. Unknown never becomes zero.
        fs = self.fights[rid]
        future = [f for (act, floor), f in fs.items() if act == q['act'] and floor >= q['floor'] and f['ts'] > ts and f['ended'] <= stop]
        boss = next((f for f in future if f['kind'] == 'boss'), None)
        past = any(a == q['act'] and fl <= q['floor'] and f['kind'] == 'boss' and f['win'] and f['ended'] <= ts for (a, fl), f in fs.items())
        da = int(death['act']) + 1 if death and death.get('act') is not None else None
        next_act = any(a > q['act'] and f['ts'] <= stop for (a, _), f in fs.items()) or bool(da and da > q['act'])
        terminal_fight = fs.get((q['act'], end.get('floor'))) if end else None
        died_this_act = da == q['act'] or bool(terminal_fight and terminal_fight['ended'] <= stop and not terminal_fight['win'])
        boss_pass = None if past else bool(boss['win']) if boss else True if next_act or end and end.get('victory') else False if died_this_act else None
        final_floor = end.get('floor') if end else death.get('floor') if death else None
        limit = boss['input']['floor'] if boss else final_floor
        required = {int(f) for f, observed_ts in self.inventory.get(rid, {}).items() if (int(f) > q['floor'] or int(f) == q['floor'] and observed_ts > ts) and int(f) <= (limit if limit is not None else 999)}
        observed = {int(f['input']['floor']) for f in future}
        # A boss-inventory record is required to prevent an empty inventory from certifying coverage.
        complete = bool(not past and limit is not None and rid in self.inventory and (boss or final_floor is not None and not next_act) and required <= observed)
        available = stop if stop != '9999' else None
        return {'boss_pass': boss_pass, 'boss_already_passed': past,
                'remaining_hp_loss': sum(f['hp_loss'] for f in future) if complete else None,
                'observed_hp_loss': sum(f['hp_loss'] for f in future), 'observed_fights': len(future),
                'hp_complete': complete, 'final_floor': final_floor,
                'terminal_kind': 'first_sl_death' if death else 'run_end' if end else 'censored'}, available


def build(args):
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    history = list(rows(args.rewards))
    dataset = [{**r, 'question_type': 'card_reward', 'question_types': ['card_reward'], 'label': 'reward/card',
                'source': 'own', 'engine': 'codex', 'observation': 'accepted_and_dispatch_verified',
                'archived_reward_id': r['id']} for r in history]
    outcomes = Outcomes(args.logs, args.openings, args.inventory)
    rejected, seen = collections.Counter(), set()
    for r in rows(args.brain):
        if r.get('_bad_json'): rejected['bad_json'] += 1; continue
        p, label = r.get('payload') or {}, r.get('label', '')
        types = question_types(label, p)
        # The reward archive is immutable, including its original dispatch/split checks.
        if not types or label == 'reward/card': continue
        rid, ts = r.get('run_id'), r.get('ts')
        if not rid or not ts: rejected['missing_identity'] += 1; continue
        config = outcomes.config(rid, ts)
        character = (p.get('run_brief') or {}).get('character') or config.get('character')
        if character not in ('静默猎手', 'SILENT', 'silent'): rejected['other_or_unknown_character'] += 1; continue
        if not successful(r): rejected['unsuccessful_answer'] += 1; continue
        if rid in outcomes.stops and ts >= outcomes.stops[rid]['_stop']: rejected['after_first_sl_death'] += 1; continue
        try: q = project(r)
        except (KeyError, TypeError, ValueError): rejected['malformed_question'] += 1; continue
        # Same floor can contain multiple event/shop questions. Deduplicate identical log rows only.
        sha = hashlib.sha256(dumps(r).encode()).hexdigest()
        if sha in seen: rejected['duplicate_log_row'] += 1; continue
        seen.add(sha)
        outcome, available = outcomes.outcome(rid, q, ts)
        code = config.get('code') or {}
        answer = r['answer']
        primary = 'act_plan' if label in ('event/act-plan', 'run-plan') else types[0]
        dataset.append({'id': f'{rid}/{q["act"]}/{q["floor"]}/{label}/{sha[:16]}', 'run': rid, 'ts': ts,
                        'question_type': primary, 'question_types': types, 'label': label, 'question': q,
                        'choice': answer.get('choice') if 'choice' in answer else answer.get('plan', answer),
                        'answer': answer, 'reason': answer.get('reason', answer.get('summary', '')),
                        'outcome': outcome, 'label_available_at': available,
                        'version': code.get('commit') or code.get('code'), 'brain_model': r.get('model'),
                        'engine': r.get('engine'), 'source': 'own', 'source_sha256': sha,
                        'observation': 'brain_accepted_dispatch_unverified'})
    dataset.sort(key=lambda r: (r['ts'], r['id']))
    with gzip.open(out / 'dataset.jsonl.gz', 'wt') as dest:
        for r in dataset: dest.write(dumps(r) + '\n')
    def describe(rs):
        return {'rows': len(rs), 'runs': len({r['run'] for r in rs}),
                'versions': dict(collections.Counter(r['version'] or 'unknown' for r in rs)),
                'missing': {k: sum(r['outcome'].get(k) is None for r in rs) for k in ('remaining_hp_loss', 'boss_pass', 'final_floor')},
                'missing_question': {k: sum(r['question'].get(k) is None for r in rs) for k in ('deck', 'boss', 'hp', 'options')},
                'unknown_version': sum(not r['version'] for r in rs), 'unknown_reason': sum(not r['reason'] for r in rs)}
    inputs = [args.rewards, args.brain, args.inventory, args.openings] + [str(Path(args.logs)/f) for f in ('runs.jsonl', 'run-config.jsonl', 'sl-attempts.jsonl')]
    manifest = {'schema': 'brain-decisions-v1', **describe(dataset), 'archived_reward_rows': len(history),
                'primary_types': {t: describe([r for r in dataset if r['question_type'] == t]) for t in TYPES},
                'type_membership': {t: len([r for r in dataset if t in r['question_types']]) for t in TYPES},
                'labels': dict(collections.Counter(r['label'] for r in dataset)), 'rejected': dict(rejected),
                'min_ts': min(r['ts'] for r in dataset), 'max_ts': max(r['ts'] for r in dataset),
                'inputs': {Path(p).name: {'bytes': Path(p).stat().st_size, 'sha256': digest(p)} for p in inputs},
                'dataset_sha256': digest(out/'dataset.jsonl.gz')}
    write(out/'manifest.json', manifest)
    print(dumps({k: manifest[k] for k in ('rows', 'runs', 'archived_reward_rows', 'type_membership', 'missing', 'rejected')}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('rewards', 'brain', 'logs', 'openings', 'inventory', 'out'): parser.add_argument('--'+name, required=True)
    build(parser.parse_args())
