import bisect
import json
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
checks = []
def check(name, actual, expected):
    assert actual == expected, (name, actual, expected)
    checks.append({'项': name, '值': actual})
def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}
datasets = {}
for run, nd, ns in [('VAC6Z1PZ1QJG', 1185, 1212), ('NG1FBJTSRLHS', 121, 128)]:
    S = list(map(json.loads, (O/f'pm-{run}-states.jsonl').open()))
    D = list(map(json.loads, (O/f'pm-{run}-decisions.jsonl').open()))
    check(run+'决策/状态数', [len(D), len(S)], [nd, ns])
    check(run+'角色', {s['state']['run']['character_id'].lower() for s in S} == {'silent'}, True)
    for name, rows in [('states', S), ('decisions', D)]:
        with (ROOT/'logs'/f'{name}.jsonl').open('rb') as f:
            for row in rows:
                f.seek(row['_offset'])
                raw = json.loads(f.readline())
                assert raw == {k:v for k,v in row.items() if not k.startswith('_')}
        check(run+name+'原偏移seek核验', len(rows), len(rows))
    actual = list(map(json.loads, (O/run/'states.jsonl').open()))
    check(run+'独立时间窗抽帧全等', actual == [{k:v for k,v in s.items() if not k.startswith('_')} for s in S], True)
    datasets[run] = (S, D, {s['_line']:s['state'] for s in S})
V, VD, VS = datasets['VAC6Z1PZ1QJG']
N, ND, NS = datasets['NG1FBJTSRLHS']
check('女王末轮攻挡血', [VS[317941]['combat']['enemies'][0]['intents'][0]['total_damage'], VS[317941]['combat']['player']['block'], VS[317941]['run']['current_hp']], [45,14,8])
check('女王末轮敌毒/剩血/玩家', [powers(VS[317941]['combat']['enemies'][0])['POISON_POWER'], VS[317942]['combat']['enemies'][0]['current_hp'], VS[317942]['run']['current_hp']], [21,152,0])
check('女王持续三减益', [powers(VS[317941]['combat']['player'])[k] for k in ['FRAIL_POWER','WEAK_POWER','VULNERABLE_POWER']], [90]*3)
check('女王存活缺口', 45-14-8+1, 24)
check('痊愈当步能量/牌/血', [(NS[n]['combat']['player']['energy'], len(NS[n]['combat']['hand']), NS[n]['run']['current_hp']) for n in [318004,318005]], [(3,7,63),(4,9,63)])
check('安瓿当步直伤非施毒', [(NS[n]['combat']['enemies'][0]['current_hp'], powers(NS[n]['combat']['enemies'][0])['POISON_POWER']) for n in [318055,318056]], [(104,4),(94,4)])
check('雕像十力25攻', [powers(NS[318062]['combat']['enemies'][0])['STRENGTH_POWER'], NS[318062]['combat']['enemies'][0]['intents'][0]['total_damage']], [10,25])
check('雕像死亡敌剩血', NS[318073]['combat']['enemies'][0]['current_hp'], 28)
T = json.load(open(O/'pm-NG1FBJTSRLHS-turns.json'))
last = next(t for t in T if t['floor']==9 and t['turn']==5)
before_death = NS[318072]
check('雕像末轮攻挡血', [before_death['combat']['enemies'][0]['intents'][0]['total_damage'],before_death['combat']['player']['block'],before_death['run']['current_hp']], [25,10,12])
check('雕像存活缺口', 25-10-12+1, 4)
T = json.load(open(O/'pm-VAC6Z1PZ1QJG-turns.json'))
ten = next(t for t in T if t['seq']==27 and t['turn']==10)
eleven = next(t for t in T if t['seq']==27 and t['turn']==11)
check('预判临时敏捷与脆弱实挡', [powers(VS[317932]['combat']['player'])['DEXTERITY_POWER'],VS[317932]['combat']['player']['block'],powers(eleven['start']['player'])['DEXTERITY_POWER']], [5,23,1])
check('余像及坚韧末轮预算', [powers(VS[317941]['combat']['player'])['AFTERIMAGE_POWER'],VS[317941]['combat']['player']['block']], [1,14])
sl = list(map(json.loads, (O/'pm-VAC6Z1PZ1QJG-sl-attempts.jsonl').open()))
f48 = [s for s in sl if s['floor']==48]
check('女王六试结果', [s['result'] for s in f48], ['predicted_death']*5+['died'])
check('女王六试回合', [s['turns'] for s in f48], [12]*6)
(O/'new-verification.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2)+'\n')
print('新局原件及机制核验通过', len(checks), '项')
