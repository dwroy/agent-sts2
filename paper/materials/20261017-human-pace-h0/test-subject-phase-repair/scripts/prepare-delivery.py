"""Merge the measured bounded conclusions; associate the new fight claim through the root CLI."""
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
WORK = OUT.parents[2]
ROOT = Path('/home/dw/Projects/agent-sts2')
PAPER = WORK / 'paper/materials/20261017-human-pace-h0/test-subject-phase-repair'
TARGETS = {'TEST_SUBJECT': 'silent-g1a-test-subject-calibration-boundary', 'AEONGLASS': 'silent-g1a-aeonglass-calibration-boundary',
           'QUEEN': 'silent-g1a-queen-calibration-boundary', 'KAISER_CRAB': 'silent-h0-kaiser-crab-calibration-boundary',
           'KNOWLEDGE_DEMON': 'silent-h0-knowledge-demon-calibration-boundary', 'THE_INSATIABLE': 'silent-h0-insatiable-calibration-boundary'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    assert not path.exists(), path
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    completed = json.loads((HERE / 'calibration-completed.json').read_text())
    archive = Path(completed['archive'])
    metrics = json.loads((archive / 'boss-trust-candidate.json').read_text())
    original = json.loads((WORK / 'paper/materials/20261017-human-pace-h0/inputs-r1/live-boss-trust.json').read_text())
    assert metrics['criteria'] == original['criteria'], 'Preserve all original admission criteria.'
    comparison = json.loads((archive / 'before-after.json').read_text())
    baseline = json.loads((OUT / 'validation-phase-2/validation-completed.json').read_text())
    before_path = HERE / 'experience.before.json'
    assert not before_path.exists()
    before_path.write_bytes((WORK / 'knowledge/characters/silent/experience.json').read_bytes())
    before = json.loads(before_path.read_text()); data = copy.deepcopy(before)
    by = {e['id']: e for e in data['entries']}; changed = []
    for boss, ident in TARGETS.items():
        entry = by[ident]; prefix = entry['lesson'].partition('H0/r1限定')[0].rstrip()
        details = []
        for label, start in [('B2/T1', 't1'), ('B3/pre', 'pre')]:
            c = comparison[boss][start]; m = c['after_phase_repair']; b = c['before_v2']
            gap = round(m['mean_pred'] - m['actual_win'], 3)
            details.append(f"{label}有效{m['n']}独立局/源{c['candidate_runs']}（模拟缺{c['candidate_runs']-m['n']}，距10缺{m['missing']}）；Brier修前{b['brier']}→{m['brier']}，预测/实际{m['mean_pred']}/{m['actual_win']}（差{gap:+.3f}），leak修前{b['leak_ratio']}→{m['leak_ratio']}，失败{','.join(m['failed']) or '无'}")
        explanation = ('实验体换相静态激怒/痛苦刺击残留已定位并只在已见Silent A10单目标111→212→313签名的whole-fight修正；核心两次换相证据JMH调参局，F48三局与F49五局第一换相/一局第三相另核。'
                       if boss == 'TEST_SUBJECT' else '本阶段未隔离新的A10招式/阶段因果缺口；不得从高leak或单轮净HP相符推定完整模型正确。')
        if boss == 'QUEEN': explanation += '原纸鹤窄修仍只A2/1独立局，不充A10女王已修。'
        entry['lesson'] = (prefix + ' H0/r1完成限定：新固定模型' + completed['receipt']['model_sha256'][:12] + '、原107调参/481验证，' + '；'.join(details) + '。' + explanation +
                           '原四闸、胜败/缺失与leak口径不变，质量还需多少局未知。该full对象与旧7e1193及当前H1有限前缀/刷新输入分列；固定候选过闸不等于当前生产认证，生产trust未由本表替换，F49联合/自然效果仍未知。').strip()
        entry['confidence'] = 'low'; entry['last_seen'] = '2026-10-17'; changed.append(ident)
    ident = 'silent-g1a-fixed-production-boundary'; entry = by[ident]
    prefix = entry['lesson'].partition(' H0/r1另冻结')[0]
    residual = []
    for start in ['t1', 'pre']:
        r = metrics['residuals'][start]['val']['A10']
        residual.append(f"{start} A10有效{r['n']}、预测差{r['gap']:+.3f}、Brier{r['brier']}、leak{r['leak_ratio']}")
    entry['lesson'] = (prefix + ' H0/r1完整固定校准：原不可变86f9bd67完成481keys×T1/pre共962条验证后，基于真实阶段能力缺口建立新source/data指纹；只重新计算2调参/29验证共62条，557个谓词外keys/1114条预测有源码与实际编译隔离证明后复用，未重跑旧107或旧7e1193全量。原107/481切点/keys/200样本/588原行seed/Platt方法和四闸不动；新训练Platt在29验证前冻结。' +
                       '；'.join(residual) + '。A0–4/A5–9验证各0，组内样本外残差无法估计（逐boss总体原四闸保持）；F49单战指标另表，联合率unknown，不用平均HP补。原R366的107/460/70差、校准21的107/481/73旧输入差、当前H1/刷新叶逐SHA边界均保留，不把逐叶观测冒原子运行树。当前有限前缀/其他生产输入、完整Wound资源、自然效果/0332及宽父未由本full对象认证；生产trust未替换。')
    entry['last_seen'] = '2026-10-17'; changed.append(ident)
    ident = 'silent-h0-end-turn-measurement-boundary'; entry = by[ident]
    entry['lesson'] += (' H0后继核查：同24战203窗口中262个有后继敌帧的招式转移在原表内，另帝王蟹2处缺后继；不是阶段概率/资源等价证明。实验体跨相静态能力残留说明：每轮从真实帧重建的单轮净血可相符，仍会漏掉从前相推进后的字段错误。新窄修只处理有源的阶段字段，旧17时点问题/24 no solve及0332资源缺口保持原限制；不换标签过闸。')
    changed.append(ident)
    ident = 'silent-test-subject-phase-reset'; entry = by[ident]
    f49 = json.loads((HERE / 'f49-phase-evidence.json').read_text())
    f48 = {'JMH5C51RLN4E', 'UJ0K3G10609Y', 'YZWV37N2MU6N'}
    evidence = sorted(set(entry['evidence']) | f48 | {r['run'] for r in f49['evidence']})
    old_n = entry['n_support']; new_n = len(evidence)
    entry['lesson'] = entry['lesson'].replace(f'{old_n}支持/0反例', f'{new_n}支持/0反例').replace(f'（n={old_n}）', f'（n={new_n}）')
    entry['lesson'] += (' H0模型消费复核：F48三局、F49五局见111血激怒3→212血痛苦刺击1且激怒消失；第三相清痛苦刺击有F48两局、F49一局。核心JMH局属于原调参；其他原帧不增加拟合样本、SL/固定probe不增独立局。旧整场模型还继承前相的激怒/旧痛苦刺击；现仅实际Silent A10单实验体、已见HP/能力签名的整场换相更新状态，其他角色/阶/未知签名/短推演保持原路。固定编译回归证明旧后继技能虚构+3力而修后0，阶段状态相符不等于全资源或胜率可信；没有新增伤口入牌堆规则，原代价/药水/保血/SL阈值未改。')
    entry['evidence'] = evidence; entry['n_support'] = new_n; entry['last_seen'] = '2026-10-17'; changed.append(ident)
    assert len(changed) == 9
    old_entries = {e['id']: e for e in before['entries']}
    for ident in changed:
        if ident != 'silent-test-subject-phase-reset':
            assert by[ident]['evidence'] == old_entries[ident]['evidence']
            assert by[ident]['n_support'] == old_entries[ident]['n_support']
    assert by['silent-paper-krane-weak-multihit'] == old_entries['silent-paper-krane-weak-multihit']
    data['version'] = '2026-10-17.h0-r1-phase2'
    (WORK / 'knowledge/characters/silent/experience.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    owned = set(changed) | {'silent-paper-krane-weak-multihit'}
    objects = [{'entry': e, 'sha256': hashlib.sha256(json.dumps(e, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
               for e in data['entries'] if e['id'] in owned]
    save(HERE / 'candidate-experience-objects.json', {'experience_version': data['version'], 'before_sha256': sha(before_path), 'entries': objects})
    save(HERE / 'experience-changes.json', {'changed_ids': changed, 'unchanged_paper': True, 'objects': len(objects),
                                           'old_phase_fact_support': old_n, 'new_phase_fact_support': new_n,
                                           'new_unique_real_evidence': new_n-old_n, 'simulation_support_added': 0})
    for name in ['consumer-v2.mts', 'run-consumer.py', 'input-read-guard.mjs']:
        shutil.copyfile(OUT / name, HERE / name)
    wrapper = HERE / 'run-consumer.py'; code = wrapper.read_text(); assert '==9' in code
    code = code.replace('==9', '==10')
    code = code.replace("parser.add_argument('--expected-head');args=parser.parse_args()", "parser.add_argument('--expected-head');parser.add_argument('--expected',type=Path);args=parser.parse_args()")
    code = code.replace("(OUT/'candidate-experience-objects.json').read_text()", "(args.expected or OUT/'candidate-experience-objects.json').read_text()")
    wrapper.write_text(code)
    assert sha(HERE / 'consumer-v2.mts') == sha(OUT / 'consumer-v2.mts')
    save(HERE / 'publish-model.json', {'archive': str(archive), 'artifact': completed['artifact'],
                                      'model_sha256': completed['receipt']['model_sha256'],
                                      'previous_preserved_artifact': baseline['artifact']})
    source_fights = [json.loads(line) for line in (WORK / 'experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b/fights.jsonl').open()]
    split = metrics['split']; evidence_rows = []
    for enc in ['TEST_SUBJECT', 'AEONGLASS', 'QUEEN+TORCH_HEAD_AMALGAM', 'CRUSHER+ROCKET', 'KNOWLEDGE_DEMON', 'THE_INSATIABLE']:
        first = next(r for r in source_fights if r['key'] in split['val'] and r['encounter'] == enc)
        evidence_rows.append({'run': first['run_id'], 'floor': first['floor'], 'turn': first['t1']['turn'], 'role': 'support',
                              'note': enc + '真实结局与固定来源；汇总按原完整key集独立局计，不单凭本局证明总体。'})
    row = {'character': 'silent', 'kind': 'fight', 'claim': 'H0/r1原固定86f9bd67的481验证962行完成；发现A10实验体跨相静态能力残留后，新对象只重算2调参/29验证62行，557谓词外keys/1114行按源码及编译隔离复用。新训练Platt只由原107调参产生、在新验证前冻结；原107/481切点/keys/200次/全行种子/四闸/leak/胜败标签不动。逐Boss修前后、共同key、独立n/缺失及A10/F49分列，数量足够不抵消质量失败；当前H1有限前缀/刷新输入/联合/完整Wound资源/自然/0332未认证，生产trust不被固定候选冒充。',
           'evidence': evidence_rows, 'first_run': evidence_rows[0]['run'], 'asc': 10, 'prior': 'partly',
           'prior_note': '旧R366、G1a及已shipped0500/0501阶段历史保留；不是重新登记旧研究，也不把模拟行当独立实盘。',
           'status': 'proposed', 'by': 'learner:strategy-proposal',
           'where': {'experience': changed, 'knowledge': ['experiments/boss-sim/silent/' + completed['artifact']],
                     'proposal': ['silent-proposal-7b0badc658e4fb1b', 'silent-proposal-2d57d88e790a9bf3']},
           'note': '原H0/r1同owner/thread；新的完整固定校准和限定经验，assay及未隔离目标仍在原提案范围waiting，不另造研究父。实际源码/live/消费者另由CLI追溯，shipped交ops；报告' + str(HERE / 'report.md')}
    save(HERE / 'fight-ledger-input.json', row)
    argv = ['python3', str(ROOT / 'learner/ledger.py'), 'add', '--character', 'silent']
    result = subprocess.run(argv, input=json.dumps(row, ensure_ascii=False) + '\n', text=True, capture_output=True)
    save(HERE / 'fight-ledger-receipt.json', {'argv': argv, 'exit': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr})
    assert result.returncode == 0, result.stderr
    save(HERE / 'delivery-ledger.json', {'ids': ['silent-0502', result.stdout.strip()], 'status': 'proposed', 'no_old_status_changes': True})
    print(json.dumps({'version': data['version'], 'changed': len(changed), 'objects': len(objects), 'ledger': result.stdout.strip(), 'new_real_phase_support': new_n-old_n}, ensure_ascii=False))


if __name__ == '__main__':
    main()
