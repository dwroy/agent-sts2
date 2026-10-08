import collections
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
S = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'agent/tools/logdb'))
import query
import sync

def rows(path):
    return [json.loads(l) for l in Path(path).read_text().splitlines() if l.strip()]

def write(name, value):
    (S / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

fights = [r for r in rows(S / 'dataset/fights.jsonl') if r['encounter'] == 'QUEEN+TORCH_HEAD_AMALGAM']
sources = [r for r in rows(S / 'dataset/sources.jsonl') if r.get('encounter') == 'QUEEN+TORCH_HEAD_AMALGAM']
split = json.loads((S / 'split.json').read_text())
evidence = json.loads((S / 'evidence.original.json').read_text())
assert evidence['key'] == hashlib.sha256(json.dumps({k: v for k, v in evidence.items() if k not in ('key', 'dispatch_base')}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
assert evidence['character'] == 'silent' and evidence['boss'] == 'QUEEN' and evidence['mode'] == 'b5'
run_rows = [r for r in rows(S / 'dataset/runs-snapshot.jsonl') if r.get('character') == 'SILENT' and r.get('ended')]
recent = sorted([r for r in run_rows if r.get('ascension') == 10], key=lambda r: r['ended'])[-20:]
deaths = [r['run_id'] for r in run_rows if r.get('victory') is False and '女王' in r.get('death_fight', [])]
recent_deaths = [r['run_id'] for r in recent if r.get('victory') is False and '女王' in r.get('death_fight', [])]
assert sorted(deaths) == evidence['death_runs']
assert sorted(recent_deaths) == evidence['recent_death_runs']
assert set(evidence['logged_keys']) <= {r['key'] for r in fights}
write('trigger-audit.json', {'character': 'silent', 'boss': 'QUEEN', 'mode': 'b5', 'key_verified': True,
    'dispatch_base': evidence['dispatch_base'], 'death_runs': sorted(deaths), 'recent_death_runs': sorted(recent_deaths),
    'sources': len(sources), 'actual_usable_fights': len(fights), 'actual_by_split': dict(collections.Counter('tune' if r['key'] in split['tune'] else 'val' for r in fights)),
    'excluded': dict(collections.Counter(r['excluded'] for r in sources if r.get('excluded'))),
    'death_run_metadata': [r for r in run_rows if r['run_id'] in deaths]})

db = '/home/dw/Projects/agent-sts2/data/logdb'
with sync.read_lock(db, shared=True):
    con = query.connect(db, threads=1)
    states, decisions, inventory = [], [], []
    with open('/home/dw/Projects/agent-sts2/logs/states.jsonl', 'rb') as sh, open('/home/dw/Projects/agent-sts2/logs/decisions.jsonl', 'rb') as dh:
        for r in fights:
            fs = con.execute('SELECT off,len,ts,turn,observed FROM frames WHERE run_id=? AND floor=? AND off>=? AND off<=? ORDER BY off', [r['run_id'], r['floor'], r['source']['first_off'], r['source']['last_off']]).fetchall()
            begin, end = fs[0][2], fs[-1][2]
            for off, length, ts, turn, observed in fs:
                sh.seek(off); raw = sh.read(length); line = json.loads(raw); state = line['state']
                assert state['run']['character_id'] == 'SILENT'
                combat = state.get('combat') or {}; player = combat.get('player') or {}
                rec = {'key': r['key'], 'side': 'tune' if r['key'] in split['tune'] else 'val', 'off': off, 'len': length,
                    'sha256': hashlib.sha256(raw).hexdigest(), 'ts': line['ts'], 'turn': turn, 'observed': observed,
                    'hp': player.get('current_hp'), 'block': player.get('block'), 'player_powers': powers(player),
                    'enemies': [{'id': x['enemy_id'], 'index': x['index'], 'hp': x['current_hp'], 'block': x['block'],
                                 'alive': x['is_alive'], 'move': x.get('move_id'), 'powers': powers(x), 'intents': x.get('intents')} for x in combat.get('enemies', [])]}
                states.append(rec)
            ds = con.execute('SELECT off,len,ts,turn FROM decisions WHERE run_id=? AND floor=? AND ts>=? AND ts<=? ORDER BY off', [r['run_id'], r['floor'], begin, end]).fetchall()
            for off, length, ts, turn in ds:
                dh.seek(off); raw = dh.read(length); d = json.loads(raw)
                inventory.append({'key': r['key'], 'off': off, 'len': length, 'sha256': hashlib.sha256(raw).hexdigest(), 'ts': d['ts'], 'turn': turn, 'has_boss_sim': 'boss_sim' in d})
                if isinstance(d.get('boss_sim'), dict):
                    decisions.append({'key': r['key'], 'side': 'tune' if r['key'] in split['tune'] else 'val', 'off': off, 'len': length, 'sha256': hashlib.sha256(raw).hexdigest(), 'raw': d})
write('queen-states.compact.json', states)
write('queen-decisions.inventory.json', inventory)
write('queen-boss-decisions.json', decisions)
first_last = []
for r in fights:
    mine = [s for s in states if s['key'] == r['key']]
    for t in sorted({s['turn'] for s in mine if s['turn']}):
        at = [s for s in mine if s['turn'] == t]
        first_last.append({'key': r['key'], 'side': 'tune' if r['key'] in split['tune'] else 'val', 'turn': t, 'first': at[0], 'last': at[-1]})
write('queen-turn-boundaries.json', first_last)
print(json.dumps({'queen_fights': len(fights), 'state_frames': len(states), 'decision_frames': len(inventory), 'boss_sim_frames': len(decisions)}))
