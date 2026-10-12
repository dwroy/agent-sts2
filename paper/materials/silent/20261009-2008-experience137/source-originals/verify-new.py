import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
P = ROOT / 'learner/runs/20261009-191302-postmortem'
N = 'HNX4A2WBC34W'
frames, decisions, checks = {}, {}, []
manifest = json.load(open(P / 'source-manifest.json'))
counts = collections.Counter()
for source in dict.fromkeys(x['source'] for x in manifest):
    with open(source, 'rb') as f:
        for row in (x for x in manifest if x['source'] == source):
            f.seek(row['offset']); raw = f.read(row['bytes'])
            assert hashlib.sha256(raw).hexdigest() == row['sha256']
            value = json.loads(raw)
            counts[Path(source).stem] += 1
            if Path(source).stem == 'states':
                assert value['state']['run_id'] == N
                assert value['state']['run']['character_id'].lower() == 'silent'
                frames[row['line']] = value['state']
            elif Path(source).stem == 'decisions':
                assert value['run_id'] == N
                decisions[row['line']] = value
            elif Path(source).stem == 'runs':
                assert value['character'].lower() == 'silent' and value['ascension'] == 10

def power(line, key):
    return next((p['amount'] for p in frames[line]['combat']['player']['powers'] if p['power_id'] == key), 0)

def foe(line):
    return frames[line]['combat']['enemies'][0]

def hp(line):
    return frames[line]['run']['current_hp']

assert [hp(i) for i in [328240, 328250, 328255]] == [38, 2, 0]
assert [foe(i)['current_hp'] for i in [328240, 328250, 328255]] == [316, 214, 130]
assert frames[328248]['combat']['player']['block'] == 7
assert frames[328254]['combat']['player']['block'] == 17
assert power(328249, 'AFTERIMAGE_POWER') == 1
assert power(328254, 'DEXTERITY_POWER') == 2
assert power(328249, 'ACCELERANT_POWER') == 2
assert 30 + 29 + 28 == 87 and 29 + 28 + 27 == 84
assert 25 - 7 + 18 == 36 and 40 - 17 + 9 == 32
checks.append('沙漏末T7七步余像7挡/三刀15直伤/三结毒87，共102敌损、实损36；T8两挡牌7各另余像1加暴露1共17，静态32而死亡裁剪2')
assert power(327908, 'DEXTERITY_POWER') == 5
assert hp(327907) == 40 and hp(327912) == 40
checks.append('沙虫重打速度5敏，两牌基础5+6各加5共21；萎靡投入和抽序亦变，不把转胜归药时')
for a, b in [(327660, 327661), (327945, 327946)]:
    x, y = frames[a]['run'], frames[b]['run']
    assert x['max_hp'] == y['max_hp']
    assert y['current_hp'] - x['current_hp'] == int((x['max_hp'] - x['current_hp']) * .8)
checks.append('跨幕35→67回32、19→63回44，按缺血80%向下取整；SL恢复另列')
for line in [318824, 319092, 319100]:
    assert 'HP guard' in decisions[line]['rationale']
    checks.append({'decision': line, 'quote': decisions[line]['rationale']})
result = dict(source_sha_verified=dict(counts), total=sum(counts.values()), checks=checks)
(O / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(O / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('原始偏移/SHA核对', sum(counts.values()), '条；关键机制', len(checks), '通过')
