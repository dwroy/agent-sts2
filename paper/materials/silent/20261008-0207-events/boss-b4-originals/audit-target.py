import collections
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query
import sync

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

sources = [r for r in rows(OUT / 'dataset/sources.jsonl') if r.get('encounter') == 'THE_INSATIABLE']
fights = {r['key']: r for r in rows(OUT / 'dataset/fights.jsonl') if r['encounter'] == 'THE_INSATIABLE'}
split = json.loads((OUT / 'split.json').read_text())
with sync.read_lock('/home/dw/Projects/agent-sts2/data/logdb', shared=True):
    con = query.connect('/home/dw/Projects/agent-sts2/data/logdb', threads=1)
    result = con.execute('SELECT off,len,run_id,turn,observed,screen FROM frames WHERE character = ? AND floor = 33 AND run_id IN (SELECT unnest(?::VARCHAR[])) ORDER BY off', ['SILENT', sorted({r['run_id'] for r in sources})])
    frames = [dict(zip([c[0] for c in result.description], row)) for row in result.fetchall()]
    con.close()
audited = []
raw_manifest = []
with open('/home/dw/Projects/agent-sts2/logs/states.jsonl', 'rb') as handle:
    for src in sources:
        mine = [f for f in frames if src['source']['first_off'] <= f['off'] <= src['source']['last_off'] and f['run_id'] == src['run_id'] and f['screen'] == 'COMBAT']
        by_turn = collections.defaultdict(list)
        for f in mine:
            handle.seek(f['off'])
            raw = handle.read(f['len'])
            row = json.loads(raw)
            state = row['state']
            assert state['run']['character_id'] == 'SILENT'
            combat = state.get('combat') or {}
            enemies = combat.get('enemies') or []
            boss = next((e for e in enemies if e['enemy_id'] == 'THE_INSATIABLE'), None)
            if not boss:
                continue
            player = combat['player']
            record = {'key': src['key'], 'off': f['off'], 'len': f['len'], 'sha256': hashlib.sha256(raw).hexdigest(), 'turn': f['turn'], 'observed': f['observed'], 'hp': player['current_hp'], 'block': player['block'], 'player_powers': powers(player), 'boss_hp': boss['current_hp'], 'boss_block': boss['block'], 'boss_powers': powers(boss), 'move': boss.get('move_id'), 'intents': boss.get('intents'), 'hand': [{'id': c.get('card_id'), 'cost': c.get('cost')} for c in combat.get('hand', [])]}
            by_turn[f['turn']].append(record)
            raw_manifest.append(record)
        turns = []
        for turn, fs in sorted(by_turn.items()):
            opening = next((f for f in fs if not f['observed']), fs[0])
            end = fs[-1]
            next_fs = by_turn.get(turn + 1)
            turns.append({'turn': turn, 'frames': len(fs), 'opening': opening, 'last': end, 'next_hp': next_fs[0]['hp'] if next_fs else src.get('end_hp'), 'enemy_turn_loss': end['hp'] - next_fs[0]['hp'] if next_fs else None})
        audited.append({'key': src['key'], 'run_id': src['run_id'], 'asc': src['asc'], 'attempt': src['attempt'], 'outcome': src['outcome'], 'sl': src['sl'], 'excluded': src['excluded'], 'usable': src['key'] in fights, 'split': 'tune' if src['key'] in split['tune'] else 'val' if src['key'] in split['val'] else 'censored', 'turns': turns})
(OUT / 'target-frames.jsonl').write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in raw_manifest))
(OUT / 'target-audit.json').write_text(json.dumps(audited, ensure_ascii=False, indent=1) + '\n')
summary = {'attempts': len(audited), 'usable': len(fights), 'outcomes': dict(collections.Counter(r['outcome'] for r in audited)), 'usable_outcomes': dict(collections.Counter(r['outcome'] for r in audited if r['usable'])), 'verified_frames': len(raw_manifest), 'turn_coverage': dict(sorted(collections.Counter(t['turn'] for r in audited if r['usable'] for t in r['turns']).items())), 'censored_turn_coverage': dict(sorted(collections.Counter(t['turn'] for r in audited if not r['usable'] for t in r['turns']).items()))}
(OUT / 'target-audit-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(summary))
