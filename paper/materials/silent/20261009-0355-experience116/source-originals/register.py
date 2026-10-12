import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O / 'changes.json'))['entries']
M = json.load(open(O / 'ledger-map.json'))
L = list(dict.fromkeys(l for ls in M.values() for l in ls))

def cli(script, args, value):
    stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
    p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner' / script), *args], input=json.dumps(value, ensure_ascii=False), text=True, capture_output=True)
    with (O / 'ledger-cli.log').open('a') as f:
        f.write(stamp + '\n' + json.dumps(value, ensure_ascii=False) + '\n' + p.stdout + p.stderr + '\n')
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

if sys.argv[1] == 'prepare':
    F = {x['id']: x for x in json.load(open(O / 'ledger-before.json'))}
    for lid in L:
        changes = [c for c in C if lid in M[c['id']]]
        value = dict(id=lid, by='learner:experience-update', where=dict(experience=[c['id'] for c in changes]), note='第116批经验/提案预关联。保留原claim/首证/prior/状态/版本与support/repeat；PBUBM0LRTEDD原始934决策/963帧及旧150局复算，不称单因转胜；提交后登记proposed。')
        if not any(e['run'] == 'PBUBM0LRTEDD' for e in F[lid]['evidence']):
            value['evidence'] = [dict(run='PBUBM0LRTEDD', role='support', note='本角色实盘核验：' + ','.join(c['id'] for c in changes) + '；F49T1神化升级/力敏/暗影/激怒，T3毒与实死；F42/47满血成长、F48/49资源接续及SL见verified/audit。统计与同盘机制不等整战因果。')]
        cli('ledger.py', ['update'], value)
    resource = ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-deck-burst-observation', 'silent-double-boss-resource-handoff']
    sl = ['silent-test-subject-phase-reset', 'silent-queen-poison-main-target', 'silent-queen-poison-window-sl-observation']
    apotheosis = ['silent-apotheosis-combat-upgrades']
    mechanism = [c['id'] for c in C if c['id'] not in resource + sl + apotheosis]
    specs = [
        ('apotheosis', ['combat'], apotheosis, '静默升级神化传播同线实测升级效果，普通与升级分支分账'),
        ('mechanisms', ['combat', 'potion', 'structure'], mechanism, '静默力敏/暗影/毒与开场血价分源，加湿器满旧上限成长核验'),
        ('handoff', ['structure', 'combat', 'potion', 'sl', 'terminal'], resource, '静默连王真实剩血剩药与能力重建，不拟无证留药价或终局权重'),
        ('sl', ['combat', 'potion', 'sl'], sl, '静默SL死亡模拟饱和时记录即时血价，女王胜试变化分项核对')]
    details = {
        'apotheosis': 'PBUBM0LRTEDD A10 F49末试T1 d303529候选神化+→暗影→步法→后空翻报14挡/损11；s311342→311346实花1能量，暗影1→0费、步法2→3敏、后空翻基础5→8，实(8+3)×2=22挡。三技能敌激怒3增0→9力，弱下23攻，实损1；8挡差已隔离，10血差还含攻击预算差。旧live card-model.ts:1144限定!model.upgraded/cost2，普通S1.apotheosis1已修不能代替升级分支。独立实现先核当前live/原53b3db220508b3d9去重，仅接本角色已观察A10升级1费及上述同手升级，不外推未知牌、永久升级或保证整场胜。普通子集VLZ6CCT8AQ0A A10四次实际2费另留兼容验证。',
        'mechanisms': 'PBUBM0LRTEDD F49末T1步法能力建3敏且不增加敌力，暗影技能加3力；后空翻实22挡、次轮倍率撤而3敏留。末T3两毒雾能力建6不增加敌力/即时毒，带毒刺击基础4在头骨下实加5，防御技能使敌9→12力、易伤下34→38攻，11挡需损27而只剩3，毒结5后仍57血第一阶段。F43/48/49王室猛毒分别109/114/26→105/110/22，SL恢复不再扣4。十一火八HEAL上限各增5，F42旧满104仍增至109，三SMITH均不增；满血新边界仅本局，旧四局查原状态。拟行为只校准已观察字段及题面分账，药水留喝时点/阈值不变，未见模板、顺序、叠层保留原行为。',
        'handoff': 'PBUBM0LRTEDD F27棱柱88→14，F28/32回复后沙虫66入、SL二试胜2；奖励另回20再跨幕80%回复。F43灵魂枢纽入109、可操作105、胜79且喝掉格挡/敏捷药；F45补预知之滴，F47回满114补格挡药。F48三试一胜26空药，奖励/地图/下房仍26、开场22；F49六败。p2804/2805已经明两王/无恢复/能力重置，是0228 support，不是忘第二boss。12实接续局全部次战败、没有留药或改线整场胜果。旧规则药水持有价/必死/SL/终局权重保留；独立任务核同配对端点、开场遗物分账与实际新能力建立，不把首战胜计为通关或将恢复计新获。',
        'sl': 'PBUBM0LRTEDD F33同66血能力药两试一胜；F48同110可操作血和两药三试一胜。前两预知T2取中和+，第三T5取生存者并弃步法，后序与目标也变；第三T6聚合体退场/T9女王胜26，缺0HP退场中间帧，不推出延后饮药或固定顺序必优。F49六试同22空药零胜：d303505第四T1在神化后把暗影/步法/后空翻/尖啸换成仅步法，d303506强制结束，实0挡损18/不清血；第三T1实22挡损1/清9，多损17少清9。第三也失败，不说旧候选必胜；两候选五轮24/24死不证明即时成本消失。拟先核升级模型，再以相同抽序/手/起血/药与真实完整前缀配对日志记录血价，保留必死定义及次数。原84d4c469867ba70e/46ebe0b559d993ce沿队列，独立任务去重不冒称本次已实现。'}
    ids = []
    for name, domains, entries, summary in specs:
        ledgers = list(dict.fromkeys(l for e in entries for l in M[e]))
        if name == 'apotheosis':
            ledgers += ['silent-0322']
        lines = ['# ' + summary, '', '角色silent；来源任务experience-update；独立实现任务strategy-proposal。授权Roy-2026-10-07-learning不充当游戏证据。', '账本：' + ','.join(ledgers), '经验：' + ','.join(entries), '', '## 旧规则、新观察与证据']
        for ident in entries:
            c = next(c for c in C if c['id'] == ident)
            e = c['after']
            lines += ['- ' + ident + '；旧：' + c['before']['lesson'] + '；新：' + e['lesson'] + '；适用' + str(e['asc']) + '，支持' + ','.join(e['evidence']) + '，反例' + ','.join(e.get('contradicting', [])) + '；账本' + ','.join(M[ident]) + '。']
        lines += ['', '## 本角色证据局号/层/回合、拟实现边界', details[name], '', '## 拟合方法与时间切分', '旧150静默完局截至2026-10-08T17:42:10.878Z为历史复核，新PBUBM0LRTEDD截至18:37:20.557Z为发现样本；后续新完局才作独立留出。SL重复尝试不当独立支持局；没有拟合血线、留药价、终局权重或次数。以现场实际动作/状态前后核确定机制，统计只作观察。', '', '## 缺数据、验证、影响与回退', '固定证据：本任务934决策/963帧/13SL原行、32项关键帧核验、旧150局七数组/分阶路线血档/节点转移/休息/SL全相等及772段静默历史复盘检索。实现核相同起血药/抽牌/原手、实际前缀和重问后的后缀，普通已修与升级新分支、逐技能增力/能力不增、毒层与已结伤、满旧血上限HEAL增长/SMITH不增、真实两王资源端点分账。', '完整dirty源码、未选路线/留药/替代牌序整场胜果、部分退场和判死后结算、激怒弱易伤攻击预算完整内部取整、未知升级、叠层与时点缺证，保持原行为并写waiting，不用预训练补机制。其他角色和未观察进阶策略保持等价。预期是使实测机制/模型/题面一致，不保证转胜。', '先核当前live及既有提案去重；独立strategy-proposal实现，固定test-sandbox与预算不改。回退独立源码commit至父版、保留经验/证据/账本与失败历史。实际上线先date双通知Roy旧/新/证据/账本/任务/影响/回退。', '本任务没有源码实现，均pending；只有实际live祖先源码commit才可标implemented。账本proposed，不冒称shipped。', '']
        path = O / ('proposal-' + name + '.md')
        path.write_text('\n'.join(lines))
        value = dict(character='silent', ledger=ledgers, runs=['PBUBM0LRTEDD'], source_task='experience-update', target_task='strategy-proposal', domains=domains, summary=summary, proposal=str(path), experience=entries, rule_changes=True, authorization='Roy-2026-10-07-learning')
        (O / ('proposal-' + name + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        ids.append(cli('code_proposals.py', ['add', '--character', 'silent'], value))
    (O / 'proposal-ids.json').write_text(json.dumps(ids, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(ids, ensure_ascii=False))
elif sys.argv[1] == 'after':
    commit = (O / 'source-commit.txt').read_text().strip()
    heading = (O / 'changelog-heading.txt').read_text().strip()
    for lid in L:
        entries = [c['id'] for c in C if lid in M[c['id']]]
        cli('ledger.py', ['update'], dict(id=lid, by='learner:experience-update', status='proposed', where=dict(experience=entries, commits=[commit], changelog=[heading]), note='第116批经验源已沙箱自测；实际live由完成事件核验，纯bug不改状态，不称代码实现/数据shipped。'))
    result = dict(added=[], proposed=L, retired=[])
    (O / 'ledger-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
