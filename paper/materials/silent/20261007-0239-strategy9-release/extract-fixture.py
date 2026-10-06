import json
from pathlib import Path
scratch = Path('/home/dw/Projects/agent-sts2/learner/runs/20261007-021220-strategy-proposal')
frames = json.loads((scratch / 'ls8035-selected-states.json').read_text())
decisions = json.loads((scratch / 'ls8035-rest-decisions.json').read_text())
brain = json.loads((scratch / 'ls8035-rest-brain.json').read_text())[0]
boards = {}
for floor in [16, 40]:
    before = next(r for r in frames if r['state']['run']['floor'] == floor and r['state']['rest']['options'])
    after = next(r for r in frames if r['state']['run']['floor'] == floor and not r['state']['rest']['options'])
    raw = before['state']; run = raw['run']
    assert raw['run_id'] == 'LS8035TB32P3' and run['character_id'] == 'SILENT'
    decision = next(r for r in decisions if r['floor'] == floor and r['label'] == 'rest/plan')
    slim = {k: raw[k] for k in ['state_version', 'run_id', 'screen', 'session', 'in_combat', 'turn', 'available_actions', 'rest']}
    slim['run'] = {k: run[k] for k in ['character_id', 'character_name', 'ascension', 'floor', 'current_hp', 'max_hp', 'gold', 'max_energy', 'act_id', 'boss_id']}
    slim['run']['potions'] = []; slim['run']['relics'] = []
    # One logged card is enough to exercise the production smith branch; no deck simulation is claimed.
    slim['run']['deck'] = [run['deck'][0]]
    boards[str(floor)] = dict(state=slim, before_offset=before['offset'], after_offset=after['offset'],
        before_ts=before.get('observed_ts', before['ts']), after_ts=after.get('observed_ts', after['ts']),
        observed_after_hp=after['state']['run']['current_hp'], boss_sim=decision['boss_sim'],
        original_criteria=decision['questions']['pick']['criteria'])
assert boards['40']['observed_after_hp'] == 28 and boards['16']['observed_after_hp'] == 65
rr = brain['payload']['route_review']
assert '22.5/28' in rr['room_costs'] and '57.4/57.4' in rr['room_costs']
boards['40']['route_facts'] = rr['plan_facts']
fixture = dict(source='LS8035TB32P3 SILENT A10 F16/F40; silent-0201/0019/0020/0139',
    boards=boards, costs=dict(act=3, maxHp=82,
        monster=dict(median=22.5, p75=28, source='frozen F40: A10 n=20'),
        elite=dict(median=57.4, p75=57.4, source='frozen F40: existing fallback'),
        unknown=dict(median=0, p75=0, source='frozen F40: A10 n=19')))
target = Path('/home/dw/Projects/agent-sts2/.worktrees/codex-dev/agent/tests/silent-rest-sim-hp-evidence.json')
target.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + '\n')
print('fixture: frozen two rest boards, observed HP, original simulation values and room costs')
