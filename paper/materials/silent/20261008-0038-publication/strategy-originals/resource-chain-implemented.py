#!/usr/bin/env python3
"""Stream one character's observed resource changes, preserving restarts and missing exits."""
import argparse
import json
import re
from pathlib import Path

RUN_ID = re.compile(r'^[A-Z0-9]{12}$')

def enemy_observation(state, current):
    """Retain every body; enemy_id identifies a type, not a persistent instance."""
    enemies = (state.get('combat') or {}).get('enemies')
    return {'line': current['line'], 'ts': current['ts'], 'turn': current['turn'],
            'enemies': None if enemies is None else [
                {k: enemy.get(k) for k in ('index', 'enemy_id', 'current_hp', 'max_hp', 'is_alive')}
                for enemy in enemies]}


def observed_enemy_hp(observation):
    enemies = observation['enemies']
    if enemies is None or any(type(e['current_hp']) is not int or type(e['is_alive']) is not bool for e in enemies):
        return None
    return sum(e['current_hp'] for e in enemies if e['is_alive'])


def enemy_hp_audit(observations):
    """Separate visible HP decreases from net live HP; never fill unobserved deaths."""
    turns = []
    for before, after in zip(observations, observations[1:]):
        if not turns or turns[-1]['turn'] != before['turn']:
            turns.append({'turn': before['turn'], 'start_line': before['line'],
                          'live_enemy_hp_start': observed_enemy_hp(before),
                          'visible_enemy_hp_loss_lower_bound': 0, 'observed_hp_added': 0,
                          'damage_total': None, 'gaps': [], 'transitions': []})
        turn = turns[-1]
        start, end = observed_enemy_hp(before), observed_enemy_hp(after)
        transition = {'from_line': before['line'], 'to_line': after['line'],
                      'visible_enemy_hp_loss_lower_bound': 0, 'observed_hp_added': 0,
                      'net_live_enemy_hp_loss': start - end if start is not None and end is not None else None,
                      'events': [], 'gaps': []}
        if before['enemies'] is None or after['enemies'] is None:
            transition['gaps'].append('missing_enemy_frame')
        else:
            def groups(enemies):
                result = {}
                for enemy in enemies:
                    result.setdefault(enemy['enemy_id'], []).append(enemy)
                return result
            old, new = groups(before['enemies']), groups(after['enemies'])
            for ident in sorted(set(old) | set(new), key=str):
                left, right = old.get(ident, []), new.get(ident, [])
                event = {'enemy_id': ident, 'before': left, 'after': right}
                if not ident or len(left) > 1 or len(right) > 1:
                    event['kind'] = 'identity_ambiguous'
                    transition['gaps'].append('ambiguous_enemy_identity')
                elif any(type(e['current_hp']) is not int or type(e['is_alive']) is not bool for e in left + right):
                    event['kind'] = 'unknown_hp'
                    transition['gaps'].append('unknown_enemy_hp')
                elif not left:
                    event['kind'] = 'newly_observed_body'
                    transition['observed_hp_added'] += right[0]['current_hp'] if right[0]['is_alive'] else 0
                elif not right:
                    event['kind'] = 'removed_body'
                    if left[0]['is_alive'] and left[0]['current_hp'] > 0:
                        transition['gaps'].append('body_removed_without_death_frame')
                elif left[0]['max_hp'] != right[0]['max_hp']:
                    event['kind'] = 'identity_ambiguous'
                    transition['gaps'].append('changed_max_hp_identity_unknown')
                else:
                    delta = left[0]['current_hp'] - right[0]['current_hp']
                    event['kind'] = 'visible_hp_decrease' if delta > 0 else 'hp_increase' if delta < 0 else 'unchanged'
                    transition['visible_enemy_hp_loss_lower_bound'] += max(0, delta)
                    transition['observed_hp_added'] += max(0, -delta)
                    if delta < 0:
                        if not left[0]['is_alive'] and right[0]['is_alive']:
                            event['kind'] = 'observed_revival'
                        else:
                            transition['gaps'].append('hp_increase_without_intermediate_death_frame')
                if event['kind'] != 'unchanged':
                    transition['events'].append(event)
        turn['transitions'].append(transition)
        turn['end_line'] = after['line']
        turn['live_enemy_hp_end'] = end
        initial = turn['live_enemy_hp_start']
        turn['net_live_enemy_hp_loss'] = initial - end if initial is not None and end is not None else None
        for key in ('visible_enemy_hp_loss_lower_bound', 'observed_hp_added'):
            turn[key] += transition[key]
        turn['gaps'] = sorted(set(turn['gaps'] + transition['gaps']))
    return {'observations': observations, 'turns': turns,
            'limitations': ['Visible HP decreases are a lower bound, not a complete damage log.',
                            'New bodies and HP increases are observed additions, not inferred healing or summon counts.',
                            'Unique enemy types can be aligned across index changes; repeated types remain ambiguous.',
                            'Missing deaths, revival intermediate frames and damage sources are not reconstructed.']}


def resources(state):
    run = state.get('run') or {}
    hp = run.get('current_hp')
    return {'hp': hp if type(hp) is int else None, 'max_hp': run.get('max_hp'),
            'potions': sorted([[p.get('index'), p.get('potion_id')] for p in run.get('potions', [])
                               if p.get('occupied') is True], key=lambda p: str(p[0]))}

def resource_chain(entries, run_id, character, attempt_starts=None):
    windows, changes = [], []
    active, previous = None, None
    sequence = 0
    attempt_starts = attempt_starts or {}
    for row in entries:
        state = row.get('state') or {}
        run = state.get('run') or {}
        if state.get('run_id', row.get('run_id')) != run_id or str(run.get('character_id', 'IRONCLAD')).lower() != character:
            continue
        floor, turn = run.get('floor'), state.get('turn')
        current = {**resources(state), 'floor': floor, 'turn': turn, 'ts': row.get('ts'),
                   'line': row.get('_line'), 'screen': state.get('screen')}
        enemies = (state.get('combat') or {}).get('enemies') or []
        combat = state.get('in_combat') is True and bool(enemies)
        sl_restart = bool(active and previous and previous.get('ts') and current.get('ts') and
                          any(previous['ts'] < ts <= current['ts'] for ts in attempt_starts.get(floor, [])))
        restart = (active is not None and combat and floor == active['floor'] and
                   type(turn) is int and turn == 1 and type(active['last'].get('turn')) is int and active['last']['turn'] > 1) or sl_restart
        closed = None
        if active is not None and (not combat or floor != active['floor'] or restart):
            if character == 'silent':
                if not combat and floor == active['floor']:
                    active['enemy_observations'].append(enemy_observation(state, current))
                active['enemy_hp_audit'] = enemy_hp_audit(active.pop('enemy_observations'))
            active['exit'] = current if not combat and floor == active['floor'] else None
            active['end'] = 'observed_exit' if active['exit'] else 'restart_observed' if restart else 'missing_exit'
            active['observed_net_hp_loss'] = (active['entry']['hp'] - active['exit']['hp']
                if active['exit'] and active['entry']['hp'] is not None and active['exit']['hp'] is not None else None)
            closed = active if active['exit'] else None
            windows.append(active)
            active = None
        opened = combat and active is None
        if opened:
            sequence += 1
            active = {'sequence': sequence, 'floor': floor, 'entry': current, 'entry_is_turn_one': turn == 1,
                      'enemies': sorted({e.get('enemy_id') for e in enemies if e.get('enemy_id')}),
                      'last': current, 'changes': [], 'outcome': 'unclassified; verify combat/SL evidence'}
            if character == 'silent':
                active['enemy_observations'] = []
        if previous and (current['hp'] != previous['hp'] or current['potions'] != previous['potions']):
            owner = closed or (active if not opened and not restart else None)
            event = {'from': previous, 'to': current, 'combat_sequence': owner['sequence'] if owner else None,
                     'restart_boundary': restart}
            changes.append(event)
            if owner and not restart and previous['floor'] == floor:
                owner['changes'].append(event)
        if active:
            active['last'] = current
            if character == 'silent':
                active['enemy_observations'].append(enemy_observation(state, current))
        previous = current
    if active:
        if character == 'silent':
            active['enemy_hp_audit'] = enemy_hp_audit(active.pop('enemy_observations'))
        active.update(exit=None, end='missing_exit', observed_net_hp_loss=None)
        windows.append(active)
    return {'run': run_id, 'character': character, 'combats': windows, 'resource_changes': changes,
            'limitations': ['Observed HP changes include healing and self damage; net loss is not enemy damage.',
                            'Belt changes do not identify drinking versus discarding without decisions.',
                            'Restart boundaries are separate; no counterfactual win is inferred.',
                            'Unclassified outcomes and missing entry/exit frames require explicit log evidence.']}

def selected_entries(path, run_id):
    needle = re.compile(rb'"run_id"\s*:\s*"' + run_id.encode() + rb'"')
    cutoff = path.stat().st_size
    offset = 0
    with path.open('rb') as handle:
        for line_no, line in enumerate(handle, 1):
            offset += len(line)
            if offset > cutoff:
                break
            if not needle.search(line):
                continue
            try: row = json.loads(line)
            except ValueError: continue
            row['_line'] = line_no
            yield row

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--logs', type=Path, required=True)
    parser.add_argument('--run', required=True)
    parser.add_argument('--character', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if not RUN_ID.fullmatch(args.run) or not re.fullmatch('[a-z][a-z0-9_]*', args.character):
        parser.error('invalid run or character')
    known = None
    with (args.logs / 'runs.jsonl').open() as handle:
        for line in handle:
            try: row = json.loads(line)
            except ValueError: continue
            if row.get('run_id') == args.run: known = row
    if known is None or str(known.get('character', 'IRONCLAD')).lower() != args.character:
        parser.error('run is not a finished run of this character')
    starts, attempts = {}, []
    sl = args.logs / 'sl-attempts.jsonl'
    if sl.exists():
        with sl.open() as handle:
            for line in handle:
                if args.run not in line: continue
                try: row = json.loads(line)
                except ValueError: continue
                if row.get('run_id') == args.run:
                    attempts.append({k:row.get(k) for k in ('floor','attempt','started_at','ended_at','result')})
                    if row.get('attempt', 1) > 1 and row.get('started_at'):
                        starts.setdefault(row.get('floor'), []).append(row['started_at'])
    report = resource_chain(selected_entries(args.logs / 'states.jsonl', args.run), args.run, args.character, starts)
    report['sl_events'] = attempts
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'run': args.run, 'combats': len(report['combats']), 'output': str(args.out)}))

if __name__ == '__main__': main()
