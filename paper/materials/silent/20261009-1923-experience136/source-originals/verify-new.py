import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
P = ROOT / 'learner/runs/20261009-181302-postmortem'
N = 'R6WDLYS19ZTY'
result = {}
frames = {}
decisions = {}
for local, raw in [('states', 'states'), ('decisions', 'decisions'), ('brain', 'brain'), ('sl', 'sl-attempts'), ('plans', 'run-plans')]:
    rows = json.load(open(P / (local + '.json')))
    with (ROOT / 'logs' / (raw + '.jsonl')).open('rb') as f:
        for row in rows:
            off, line = row['_offset'], row['_line']
            expected = {k: v for k, v in row.items() if k not in ['_offset', '_line']}
            f.seek(off)
            actual = json.loads(f.readline())
            assert expected == actual, (raw, line)
            if local == 'states':
                assert actual['state']['run_id'] == N
                assert actual['state']['run']['character_id'].lower() == 'silent'
                frames[line] = actual['state']
            if local == 'decisions':
                decisions[line] = actual
    result[raw] = dict(raw_offset_equal=len(rows))

def power(n, key):
    return next((p['amount'] for p in frames[n]['combat']['player']['powers'] if p['power_id'] == key), 0)

def enemy(n, key):
    return next(e for e in frames[n]['combat']['enemies'] if e['enemy_id'] == key)

checks = []
assert power(327309, 'DEXTERITY_POWER') == 3
assert power(327310, 'DEXTERITY_POWER') == 8
assert power(327313, 'DEXTERITY_POWER') == 3
assert power(327325, 'DEXTERITY_POWER') == 5
assert frames[327325]['combat']['player']['block'] == 26
assert frames[327326]['run']['current_hp'] == 38
checks.append('步法3+普通2、临时速度5撤回；T3带入7加防御10和普通偏折9=26，43攻实损17')
assert frames[327335]['combat']['player']['cards_played_this_turn'] == 4
assert frames[327336]['combat']['player']['cards_played_this_turn'] == 5
assert power(327335, 'PANACHE_POWER') == 10
assert [(enemy(327335,k)['current_hp'], enemy(327336,k)['current_hp']) for k in ['FLAIL_KNIGHT','SPECTRAL_KNIGHT','MAGI_KNIGHT']] == [(29,13),(59,49),(70,69)]
assert enemy(327335,'MAGI_KNIGHT')['block'] == 9 and enemy(327336,'MAGI_KNIGHT')['block'] == 0
checks.append('第5张切割6伤之外三敌各10群伤：实血21/耗挡9')
assert frames[327339]['run']['current_hp'] == 36
assert frames[327339]['combat']['player']['block'] == 10
assert enemy(327339,'FLAIL_KNIGHT')['current_hp'] == 1
assert frames[327340]['run']['current_hp'] == 0
assert enemy(327340,'SPECTRAL_KNIGHT')['current_hp'] == 35 and enemy(327340,'MAGI_KNIGHT')['current_hp'] == 61
checks.append('毒杀连枷后剩52攻、10挡需42；36血至少差7存活血，实际只扣36')
assert power(327315,'STRENGTH_POWER') == 3 and power(327315,'REPTILE_TRINKET_POWER') == 3
assert power(327322,'STRENGTH_POWER') == 0
checks.append('饮技能药饰品临时3力次轮撤；药水自身另源')
for a,b in [(326880,326881),(327248,327249)]:
    x,y=frames[a]['run'],frames[b]['run']
    assert y['max_hp']==x['max_hp'] and y['current_hp']-x['current_hp']==int((x['max_hp']-x['current_hp'])*.8)
checks.append('跨幕12→58与1→56分别回46/55')
for n in [318224,318257]:
    assert 'guard' in decisions[n]['rationale'].lower() or '护栏' in decisions[n]['rationale']
    checks.append(dict(decision=n,quote=decisions[n]['rationale']))
result['checks'] = checks
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('原始字节偏移核验',sum(x['raw_offset_equal'] for x in result.values() if isinstance(x,dict)),'；关键机制',len(checks),'通过')
