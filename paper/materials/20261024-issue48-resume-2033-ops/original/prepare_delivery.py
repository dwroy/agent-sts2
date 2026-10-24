import collections
import hashlib
import json
import subprocess
import sys
from pathlib import Path

P = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
TREE = P.parents[2]


def write(name, obj):
    (P / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


def ref(x):
    return {k: x[k] for k in ('source', 'source_size', 'line', 'offset', 'bytes', 'sha256') if k in x}


def records(name):
    with (P / ('evidence/' + name + '.evidence.jsonl')).open() as f:
        for line in f:
            yield json.loads(line)


whole = json.loads((P / 'whole-run-audit.json').read_text())
runs = list(whole)
batch = '20261024-164315-strategy-proposal'
dispatch = json.loads((ROOT / 'ops/codex-ops/learn.json').read_text())['batches'][batch]
assert dispatch['task'] == 'strategy-proposal' and dispatch['character'] == 'silent'
assert dispatch['worktree'] == str(TREE) and set(dispatch['runs']) == set(runs)
assert not any(k in dispatch for k in ('proposal_ids', 'proposal_repair', 'research_request',
                                     'implementation_request', 'backfill_source', 'external_source'))
write('dispatch-binding.json', {k: dispatch[k] for k in ('task', 'character', 'runs', 'reason',
    'worktree', 'ordinary_baseline', 'strategy_progress')})

extra = {}
raw_handles = {}
for stream in ('run-config', 'run-plans', 'sl-attempts', 'brain'):
    selected = []
    for x in records(stream):
        if x['source'] not in raw_handles:
            raw_handles[x['source']] = open(x['source'], 'rb')
        f = raw_handles[x['source']]
        f.seek(x['offset'])
        raw = f.read(x['bytes'])
        assert hashlib.sha256(raw).hexdigest() == x['sha256']
        row = json.loads(raw)
        if stream == 'sl-attempts':
            item = {k: row.get(k) for k in ('run_id', 'floor', 'encounter', 'attempt', 'result',
                    'turns', 'end_hp', 'end_block', 'incoming', 'reload', 'give_up_reason')}
        elif stream == 'run-config':
            item = {k: row.get(k) for k in ('run_id', 'ascension', 'character', 'code', 'v6',
                    'brain_native_receipt')}
        elif stream == 'run-plans':
            item = row
        else:
            item = {'keys': list(row), 'question_id': row.get('question_id'),
                    'label': row.get('label'), 'status': '原题/回答完整机械解析；非逐题人工精读'}
        selected.append({'run_id': x['run_id'], 'ref': ref(x), 'row': item})
    extra[stream] = {'count': len(selected), 'records': selected}
write('additional-stream-audit.json', extra)

support_refs = []
signature = {'SNAKEBITE', 'ACCELERANT', 'FOOTWORK'}
for rid in ('BKK8KAR3E83C', 'TB5YKELW0355'):
    z = whole[rid]
    s = next(s for s in z['deck_changes'] if signature <= {c['card_id'] for c in s['deck']})
    support_refs.append({'run_id': rid, 'kind': '首次持牌签名', 'floor': s['floor'], 'ref': s['ref']})
    for c in z['combats']:
        if c['entry']['floor'] in (17, 19, 24, 28, 30, 33) and c['boundary'] == 'observed_exit':
            support_refs.append({'run_id': rid, 'kind': '实际战斗窗口', 'floor': c['entry']['floor'],
                'entry': c['entry']['ref'], 'exit': c['exit']['ref'],
                'hp': [c['entry']['hp'], c['exit']['hp']]})
write('candidate-source-refs.json', support_refs)

candidate_id = 'silent-brain-poison-footwork-realization-review'
candidate = {'schema': 'brain-strategies-v1', 'character': 'silent', 'entries': [{
    'id': candidate_id, 'version': '2026-10-24.candidate1',
    'trigger': {'question_types': ['card_reward', 'shop', 'rest', 'act_plan', 'fight_plan'],
        'acts': [1, 2], 'deck_cards': [{'name': c, 'count': {'min': 1}}
                                      for c in ('SNAKEBITE', 'ACCELERANT', 'FOOTWORK')]},
    'strategy': '仅Silent A10观察：同时持有蛇咬、触媒、灵动步法时，补牌、购物、营火与备战仍分开核对持牌、实际建立和可重复生存；沿最近赢战的净HP与药槽变化检查下一场资源，不把签名齐备当作停止补强的依据。BKK在F6齐备，F17胜仍77→9，二幕F19胜63→30，F33四试失败；TB在F14齐备，F17胜61→26，二幕F28胜51→17、F30胜38→18，F32休至36后F33四试失败。两局都过首Boss，反对“组件齐备就必败”；终败也不能证明蛇咬、触媒、步法或休息选择导致失败。只复核眼前缺口，不指定必拿牌、血线、杀序或喝药时点；替代选择的整战收益未知，其他进阶和版本未验证。',
    'evidence': [{'type': 'own', 'run': rid, 'floor': floor,
        'ref': str(P / 'candidate-source-refs.json') + '#' + rid,
        'role': 'support'} for rid, floor in [('BKK8KAR3E83C', 6), ('TB5YKELW0355', 14)]],
    'source': 'own', 'confidence': 0.35,
    'design': 'observational', 'source_experience': ['silent-core-poison-defense-observation',
        'silent-route-hp-observation', 'silent-rest-buffer-observation'],
    'source_ledger': ['silent-0352', 'silent-0019', 'silent-0020'],
    'limitations': ['两个独立A10局；同一局SL不增加分母，首试与最终结果分列。',
        '非因果、无替线对照；首Boss胜是反对必败的实证，不是完整循环验证。',
        '两局F32原计划已经注明启动/持续防御缺口，本候选未证明能新增信息或纠正当局决策。',
        '本批未冻结读取外部统计及外部代表完整局，只能称自有局部候选。',
        '精确运行源码SHA缺失，版本未知；原题外部附件不计本系统验证。'],
    'publication': 'scratch_candidate_only'}]}
write('brain-strategy-candidates.json', candidate)

entries = []


def mapping(key, disposition, rr, ee, ll, kind, target, reason, limitations):
    refs = []
    for rid in rr:
        z = whole[rid]
        refs.append({'run_id': rid, 'first': z['first']['ref'], 'terminal': z['terminal']['ref'],
                     'windows': str(P / 'whole-run-audit.json') + '#/' + rid})
    entries.append({'id': key, 'experience_ids': ee, 'ledger_ids': ll, 'source_refs': refs,
        'target': {'kind': kind, 'id': target}, 'disposition': disposition,
        'candidate_file': str(P / 'brain-strategy-candidates.json') if disposition == 'new' else None,
        'json_pointer': '/entries/0' if disposition == 'new' else None,
        'reason': reason, 'counterevidence_and_limits': limitations,
        'independent_own_runs': len(rr), 'external_runs': None,
        'old_denominators_inherited': False, 'published': False, 'consumer_readback': None})

mapping('poison-footwork-resource-review', 'new', ['BKK8KAR3E83C', 'TB5YKELW0355'],
    candidate['entries'][0]['source_experience'], ['silent-0352', 'silent-0019', 'silent-0020'],
    'strategy', candidate_id, '原P经验保留；新增可查询的局部大脑候选，未新增固定数值或必选规则。',
    candidate['entries'][0]['limitations'])
mapping('incomplete-or-late-poison-playbook', 'waiting',
    ['QVDR4R3UWKXU', '5ZT1SKS66C1N', 'Q7SFDZSJLULD', 'EQLB6SK9W9H7', 'BP9C8K9NSRZ0', 'GJ81EPE4B8Z2', '37U27AS6JNJ0'],
    ['silent-core-poison-defense-observation'], ['silent-0352'], 'playbook', 'silent-core-poison-defense-observation',
    '逐局持牌和转向核查保存在主线；部分只有施毒，部分晚到触媒/防御，不能并入新候选的三牌触发分母。',
    ['缺本批绑定且实读的外部统计/同流派代表完整局；不称完整剧本或人类偏离已核。',
     'EQL在F30后才见蜃景，BP在F28才见触媒；没有以终局回填早期。'])
mapping('mixed-transition', 'waiting', ['XC9AHZH3CZVK'], ['silent-core-shiv-defense-observation'],
    ['silent-0354'], 'playbook', 'silent-core-shiv-defense-observation',
    '刀舞、蛇咬、单步法的未定过渡；完整刀或毒防签名未观察到。',
    ['未到Boss，缺完整核心和外部同前缀可比组，不能用F7死亡编造拿牌优先级。'])
mapping('route-resource-chain', 'reuse', runs, ['silent-route-hp-observation'], ['silent-0019'],
    'strategy', 'silent-route-hp-observation', '复用赢战消耗带入后战的观察；保留原ID及旧分母。',
    ['改路反事实未知；未观察到的营火不能预支，净掉血不是毛伤害。'])
mapping('rest-realization', 'reuse', [r for r in runs if r != 'XC9AHZH3CZVK'],
    ['silent-rest-buffer-observation'], ['silent-0020'], 'strategy', 'silent-rest-buffer-observation',
    '复用实际休息收益与下一战资源分账；未因终败把回血判作错误。', ['未控休息/锻造整战因果，不产生固定血线。'])
for key, rr, exp, ledger, target in [
    ('crab-budget', ['EQLB6SK9W9H7', 'TB5YKELW0355'], 'silent-kaiser-crab-facing-sl', 'silent-0570', 'silent-brain-crab-surviving-part-budget'),
    ('demon-budget', ['BKK8KAR3E83C'], 'silent-knowledge-demon-healing-sl-observation', 'silent-0102', 'silent-brain-knowledge-demon-external-tail-budget'),
    ('kin-budget', ['5ZT1SKS66C1N', 'GJ81EPE4B8Z2'], 'silent-kin-poison-sl-observation', 'silent-0568', 'silent-brain-kin-priest-exit-window'),
    ('subject-budget', ['BP9C8K9NSRZ0'], 'silent-core-poison-defense-observation', 'silent-0352', 'silent-brain-test-subject-external-tail-budget')]:
    mapping(key, 'reuse', rr, [exp], [ledger], 'strategy', target,
        '只复用已有备战入口，不复制其外部统计或将旧支持数算成本批验证。',
        ['已有条目正式身份不代表本批已消费；本批未验证其外部原件/效果。',
         '双蟹两体仍存活的失败不是残敌阶段证据；未执行分支不算收益。'])
mapping('giant-playbook', 'waiting', ['Q7SFDZSJLULD'], ['silent-giant-explosion-window'],
    ['silent-0017'], 'playbook', 'silent-giant-explosion-window',
    '复用本体与后场的原观察，但本局末试死于本体；本批不另造完整剧本。',
    ['缺同场获胜替线/外部完整对照，不能推出固定提速或清体时点。'])
mapping('discard-rk', 'not_applicable', ['QVDR4R3UWKXU'], ['silent-survivor-neutralize-discard'],
    ['silent-0418'], 'rk', None, '本题是CARD_SELECTION弃牌，#28的Boss/精英combat_line回放不能据此直接表达弃牌剧本；复用原经验链。',
    ['保留生存者的整战反事实未执行；重算已实际发生，不判新纯bug。'])
mapping('belt-potion-rk', 'waiting', ['37U27AS6JNJ0'],
    ['silent-belt-buckle-empty-slots-dexterity', 'silent-poison-potion-observed-application'],
    ['silent-0119', 'silent-0278'], 'rk', None,
    '最后一瓶饮后敏捷+2、旧12挡不追补；只复用机制，不将时序改成硬策略。',
    ['无#28原始候选Plan capture、配对完整结果、预注册留出回放及改善区间；不启开关、不调模型。',
     '本局普通蛞蝓不在本批Boss/精英回放范围；未执行提前喝药整战效果未知。'])

exp = json.loads((TREE / 'knowledge/characters/silent/experience.json').read_text())['entries']
available = {e['id']: e for e in exp}
checked = sorted({e for row in entries for e in row['experience_ids']})
assert set(checked) <= set(available), set(checked) - set(available)
write('checked-experience-originals.json', {'source': 'knowledge/characters/silent/experience.json',
    'sha256': hashlib.sha256((TREE / 'knowledge/characters/silent/experience.json').read_bytes()).hexdigest(),
    'entries': [available[e] for e in checked]})
write('experience-strategy-rk-map.json', {'schema': 'experience-strategy-rk-map-v1',
    'batch': batch, 'character': 'silent', 'checked_experience_ids': checked,
    'ledger_ids': sorted({i for row in entries for i in row['ledger_ids']}),
    'counts': dict(collections.Counter(e['disposition'] for e in entries)), 'entries': entries,
    'unread_scope': ['原244旧经验不回刷；未读其他角色知识。',
        '未读取新的外部原库；未声明外部统计/代表完整局三输入验收。',
        '1179题只有3个完整请求人工核读，其余逐题原因见question-coverage.json。'],
    'formal_publication': False, 'consumer_readback': None, 'natural_benefit': None})

write('ledger-candidate.json', {'character': 'silent', 'kind': 'other', 'first_run': 'BKK8KAR3E83C',
    'asc': 10, 'claim': '静默A10局部大脑候选：当蛇咬、触媒、灵动步法均已持有，构筑与备战仍分开核对持牌、实建和连续战资源。BKK F6签名后F17胜77→9、F19胜63→30、F33败；TB F14签名后F17胜61→26、F28胜51→17、F30胜38→18、F33败。两局过首Boss是反对组件必败的反证；不证明固定拿牌/血线或替线收益。',
    'evidence': [{'run': rid, 'floor': floor, 'role': 'support',
        'note': '原始offset/bytes/SHA及胜战窗口见candidate-source-refs.json；独立局，不将SL加分母。',
        'ref': str(P / 'candidate-source-refs.json')} for rid, floor in [('BKK8KAR3E83C', 6), ('TB5YKELW0355', 14)]],
    'prior': 'partly', 'prior_note': '复用silent-0352/0019/0020；原经验不删除、不继承旧分母；新增仅scratch可查询候选。',
    'status': 'proposed', 'confidence': 0.35, 'by': 'learner:strategy-proposal',
    'where': {'proposal': [str(P / 'proposal.md')],
              'knowledge': [str(P / 'brain-strategy-candidates.json') + '#/entries/0']},
    'note': '普通自然批次20261024-164315；无源码、无正式知识/发布/消费者。缺本批外部三输入与反事实，不关闭科学父。'})
print(json.dumps({'mapping_counts': dict(collections.Counter(e['disposition'] for e in entries)),
    'candidate': candidate_id, 'checked_experience': checked,
    'additional_raw_verified': {k: v['count'] for k, v in extra.items()}}, ensure_ascii=False))
