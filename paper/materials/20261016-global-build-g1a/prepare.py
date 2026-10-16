"""Prepare the G1a knowledge delivery from audited, already-computed evidence."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2]
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
OUT = WORK / 'learner/runs/20261016-global-build-g1a-r1'
OLD = ROOT / 'learner/runs/20261016-050122-21c48aea-19f1-459a-b67e-e18af997b998-silent-boss-calibration'


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    audit = json.loads((HERE / 'calibration-readback.json').read_text())
    contract = json.loads((HERE / 'continuous-resource-contract.json').read_text())
    provenance = json.loads((OLD / 'provenance.json').read_text())
    current = {}
    for name, pinned in provenance['input_files'].items():
        assert '.env' not in Path(name).parts and not name.endswith(('.dll', '.pck'))
        path = LIVE / name
        actual = digest(path.read_bytes()) if path.exists() else None
        current[name] = {'pinned': pinned, 'actual': actual, 'different': pinned != actual}
    boundary = {'original_release': 'V5-R366', 'original_fixed_model': audit['model_commit'],
                'original_release_commit': '4dfac2702bf1ce63199d4579c7d5cda136f13d3d',
                'original_production_differences': 70,
                'current_live_commit': subprocess.check_output(['git','-C',str(LIVE),'rev-parse','HEAD'],text=True).strip(),
                'current_live_tree': subprocess.check_output(['git','-C',str(LIVE),'rev-parse','HEAD^{tree}'],text=True).strip(),
                'current_production_input_differences': sum(r['different'] for r in current.values()),
                'current_inputs': current,
                'status': 'production uncalibrated; file fingerprints establish difference, not causal equivalence or validity'}
    save(HERE / 'production-boundary.json', boundary)
    exp_path = WORK / 'knowledge/characters/silent/experience.json'
    before = exp_path.read_bytes()
    assert before == (LIVE / 'knowledge/characters/silent/experience.json').read_bytes()
    (OUT / 'before.json').write_bytes(before)
    data = json.loads(before)
    fights = [json.loads(l) for l in (OLD / 'dataset/fights.jsonl').open()]
    results = [json.loads(l) for l in (OLD / 'results.jsonl').open()]
    good = {r['key'] for r in results if r['start'] == 't1' and 'sim' in r}
    val = set(audit['split']['val'])
    new = []
    for boss, title in [('AEONGLASS','永世沙漏'), ('QUEEN','女王'), ('TEST_SUBJECT','实验体')]:
        r = audit['bosses'][boss]
        b2, b3 = r['metrics']['b2'], r['metrics']['b3']
        aliases = {'QUEEN+TORCH_HEAD_AMALGAM':'QUEEN'}
        evidence = sorted({f['run_id'] for f in fights if aliases.get(f['encounter'],f['encounter']) == boss and f['key'] in val & good})
        gap2 = b2['mean_pred'] - b2['actual_win']
        gap3 = b3['mean_pred'] - b3['actual_win']
        new.append({'id': 'silent-g1a-' + boss.lower().replace('_','-') + '-calibration-boundary',
                    'scope': 'boss:' + boss, 'name': title, 'asc': [10,10],
                    'lesson': f'限定：R366固定7e1193模型验证{b2["n"]}场/{len(evidence)}局，数量距10场差0，仍低可信。B2/B3 Brier为{b2["brier"]}/{b3["brier"]}（整体1.25倍上限0.1385/0.1414），预测减实际胜率{gap2:+.3f}/{gap3:+.3f}（限±0.15），被打穿血比{b2["leak_ratio"]}/{b3["leak_ratio"]}（限0.7–1.3）；失败分别为{"、".join(b2["failed"])}/{"、".join(b3["failed"])}。数量达标不抵消质量失败，无法保证再加固定几场就通过。样本仅真实结局，首试/SL分列，截断不算负局；只评价单战，F49或连战须另核。该表107调参/460验证、固定切点；原生产有70输入SHA差，不证明当前模型或当前构筑S可信。',
                    'evidence': evidence, 'n_support': len(evidence), 'n_contradict': 0,
                    'confidence': 'low', 'last_seen': '2026-10-15', 'status':'active'})
    evidence = sorted({f['run_id'] for f in fights if f['asc'] == 10})
    new.append({'id':'silent-g1a-fixed-production-boundary', 'scope':'general:plan', 'asc':[10,10],
                'lesson':'限定：R366仅校准固定7e1193模型，107调参/460验证（有效458），原发布有70输入SHA不同；文件差不是可转移校准的证明。A10 B2/B3预测偏差+0.035/+0.039、被打穿血比1.313/1.329；F49单列29例，偏差+0.300/+0.256、血比2.681/2.774，均低可信。A0–4/A5–9验证各0，不跨进阶借信度。THE_INSATIABLE B2从43例血比1.296到44例1.316而撤可信，数量增加不能保证通过。首王胜不是整局胜，平均出口HP与四局double-boss曲线不等联合胜率；当前生产及两场联合率未知，不补零，不据此设必死/SL或药水保血阈值。',
                'evidence':evidence, 'n_support':len(evidence), 'n_contradict':0,
                'confidence':'low', 'last_seen':'2026-10-15', 'status':'active'})
    assert not ({e['id'] for e in data['entries']} & {e['id'] for e in new})
    handoff = next(e for e in data['entries'] if e['id']=='silent-double-boss-resource-handoff')
    handoff['lesson'] += ' G1a端点复核沿用六局旧证据：永久牌组及上限在所核交接相同，药槽/遗物计数及入房到可操作HP可有开场变化；TDLBRNA0R05B入房2→可操作4、64VJC5XT2AT2战后3→入房28→可操作30、7S8HCC0M6G9W后场新出现药瓶形石头，逐源归因未控。下一王取实际敌人，不只读可能滞后的boss_id。旧四局0胜/4局与8192模拟未确立校准联合率，平均剩血不可替代；复活充能、未见开场机制及其他进阶保持未知。'
    data['entries'].extend(new)
    data['version'] = '2026-10-16.g1a-r1'
    save(exp_path, data)
    ids = [e['id'] for e in new] + [handoff['id']]
    save(OUT / 'changed-experience.json', [e for e in data['entries'] if e['id'] in ids])
    save(HERE / 'experience-links.json', {'request_id':'roy-20261016-global-build-g1a', 'revision':1,
        'input_sha256':'66f3ad3a272f4fe74f12d0832ea220be57f5aade9e2f89a0a1044e261166ff5b',
        'experience_version':data['version'], 'entries':ids,
        'old_resource_proposals':['silent-proposal-9e5d50fdd7bf1fbd','silent-proposal-330b05f2e6671108'],
        'watcher_owns':['G1b','G1c','G2','G3','G5','general two-boss evaluation interface'],
        'not_closed':['original calibration parent','silent-0332','global-build parent','natural use and effect']})
    questions = [
        {'claim':'低可信Boss只要凑够验证场数即可可信', 'finding':'三幕三种Boss数量均已足够，但分别失败质量闸；THE_INSATIABLE新增样本反而撤可信。不是原计划要求放宽门槛，而是需明确限制。',
         'evidence':['R366 calibration-readback.json','VNSXWCWXR3VW F33 attempt1 T1–7 won'], 'recommendation':'保持原四闸；缺多少数量与质量缺口分列，不承诺固定新增场数可通过。','existing_entry_ids':['silent-0484','silent-0491']},
        {'claim':'旧R366表可证明当前生产Boss/S已可信', 'finding':'旧固定模型与原发布70输入SHA不同，当前另列指纹；没有当前生产模型重新校准证据。',
         'evidence':['production-boundary.json','original R366 live-model-changes.json'], 'recommendation':'表只描述固定对象；watcher对当前生产保持unknown，必要新校准先冻结新对象与切分。','existing_entry_ids':['silent-0491']},
        {'claim':'四局double-boss的HP价值曲线或平均首战剩血代表两场联合胜率', 'finding':'原四局实战0胜，8192为模拟样本，不是独立实战。六局端点存在开场资源变化；7S8已见后场SL胜，不能把旧0/4当普遍不可能。',
         'evidence':['continuous-resource-contract.json','JMH5C51RLN4E/9TG1RP5LFAAK/ZVYUL2YP3518/TDLBRNA0R05B F48→49','64VJC5XT2AT2 F48→49','7S8HCC0M6G9W F48→49'],
         'recommendation':'交付实际端点/条件/未知给原watcher；联合输出缺状态或未校准时保留unknown，不由均值补胜率或改SL/留药阈值。','existing_entry_ids':['silent-double-boss-resource-handoff','silent-0228']}]
    save(HERE / 'questions.json', questions)
    report = ['# G1a 知识阶段交付（revision 1）', '',
        '请求 roy-20261016-global-build-g1a；冻结输入SHA 66f3ad3a272f4fe74f12d0832ea220be57f5aade9e2f89a0a1044e261166ff5b。原owner/thread/batch见 start-receipt.json。本阶段只复用旧结果和原角色日志，未运行模拟、拟合、模型/API或对局。', '',
        'Roy要求：四闸、角色隔离、冻结切分和生产边界、未知保留、学习入库及读回。下表与资源端点是从Silent实证得出的限定结论；授权不提供机制事实。', '',
        '## 固定对象与逐Boss缺口', '',
        f'R366模型 {audit["model_commit"]}，结束日志截止 {audit["cutoff"]}，107调参/460验证，B2/B3各458有效。原生产70输入差；本轮读回实际live {boundary["current_live_commit"]} 的210输入中{boundary["current_production_input_differences"]}项不同，全部逐叶列于production-boundary.json。两者均不冒充当前生产重校准。', '',
        '|Boss|B2/B3有效n（独立局）|B2失败|B3失败|Brier B2/B3|预测−实际 B2/B3|血比 B2/B3|数量缺口|',
        '|---|---|---|---|---|---|---|---|']
    for boss,r in audit['bosses'].items():
        if 3 not in r['acts_observed']:
            continue
        a,b=r['metrics']['b2'],r['metrics']['b3']
        report.append(f'|{boss}|{a["n"]}/{b["n"]}（{a["distinct_runs"]}/{b["distinct_runs"]}）|{a["failed"]}|{b["failed"]}|{a["brier"]}/{b["brier"]}|{a["mean_pred"]-a["actual_win"]:+.3f}/{b["mean_pred"]-b["actual_win"]:+.3f}|{a["leak_ratio"]}/{b["leak_ratio"]}|0；质量所需新增数未知|')
    report += ['', '数量闸≥10，Brier≤整体1.25倍（B2 0.1385/B3 0.141375），胜率偏差≤15pp，血比0.7–1.3；无降低。所有三幕/最终对象为AEONGLASS、QUEEN、TEST_SUBJECT，仍均低可信。QUEEN原30实际结局/30局中1模拟错误，n=29；不可把30写成有效验证。全12Boss附表含首试/SL、排除原因与逐源身份，见calibration-readback.json和act3-attempt-identities.json。它们保留首试/SL身份，不把predicted_death截断算死亡；独立局数不等首试成功率。', '',
        'A10整体残差B2 +0.035/B3 +0.039，血比1.313/1.329；F49有效29，+0.300/+0.256、2.681/2.774，仍失败。A0–4/A5–9验证均0，各距诊断10例缺10，不能借A10发布。', '',
        '## 连战资源契约与未知', '',
        'continuous-resource-contract.json为机器可读端点契约；raw/保存24条实际原帧，run-and-sl-evidence.json保留原行offset/bytes/SHA。复用六局既有研究，只核原字节，没有新增整场计算。四原局分别8/60、17/84、50/83、2/70进F49；实际敌人为沙漏、女王、实验体、实验体。TDL首个可操作4HP；64V首战后3/116、F49入房28、可操作30；7S8后场64/122并新增药瓶形石头。上限/永久牌组端点相同；药槽、金钱、遗物计数及HP须分开场/奖励变化。列明实见消失能力，不能推及所有未见增益；未记录的充能/复活、牌/药/遗物开场效果均unknown。', '',
        'double-boss.json原4局0胜、8192模拟仅旧价值曲线；后续7S8已有SL胜，既非证明联合模型校准，也非证明不能通关。平均HP不能代替资源分布和两场联合胜率。不修改原double-boss参数、留药/保血/费用/目标/SL阈值。通用两场接口与自然消费由watcher实现；071301/074303原策略owner输入/文件/注册/任务均未改，后继未交付内容仍未知。', '',
        '## 经验、提案与验收', '',
        f'经验版本 {data["version"]}，新增4条边界经验并限定旧silent-double-boss-resource-handoff，原22证据局/n_support保持。其余条目逐值保持。原资源提案链沿用，校准边界新提案经CLI关联；实际ID与合入见deployment/readback和最终报告，不冒标shipped/通用接口implemented。', '',
        '本轮仅知识/材料改动，复用原R366精确宿主488文件4915过2跳与原源/合后检查，未重跑全量套件。必须另执行当前候选和实际live经验的生产loader/render消费者探针，保存输入/输出与SHA；固定消费者仅证明可读，不证明自然采用/收益。所有原审计失败与schema草稿保留在learner/runs/20261016-global-build-g1a-r1/。', '',
        '## 异议与后续', '',
        'questions.json给出逐项限定/反证与旧经验ID；发布后按授权根目录双通知，交ops→watcher→Roy，不代填确认。学习者本阶段交付不关闭原校准、0332或global-build父要求。未来当前生产重校准必须另冻结对象/模型与输入，保持原切分/门槛；联合评估缺数据先unknown。现有定期refresh-silent.py入口及升阶/新增20实际boss结局触发不变，本轮不复派原周期校准。', '']
    (HERE / 'completion.md').write_text('\n'.join(report))
    (OUT / 'report.md').write_text('\n'.join(report))
    print(json.dumps({'experience_version': data['version'], 'new':len(new),'updated':1,'current_input_differences':boundary['current_production_input_differences']}))


if __name__ == '__main__':
    main()
