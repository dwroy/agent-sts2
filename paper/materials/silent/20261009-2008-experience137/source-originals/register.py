import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
N = 'HNX4A2WBC34W'
C = json.load(open(O / 'changes.json'))
M = json.load(open(O / 'ledger-map.json'))
L = json.load(open(O / 'ledger-all.json'))
L = L if isinstance(L, dict) else {e['id']: e for e in L}
calls = []

def cli(script, args, data):
    subprocess.run(['date'], stdout=subprocess.DEVNULL, check=True)
    p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner' / script), *args], input=json.dumps(data, ensure_ascii=False), text=True, capture_output=True)
    calls.append(dict(script=script, args=args, data=data, stdout=p.stdout, stderr=p.stderr, exit=p.returncode))
    (O / 'registration-cli.json').write_text(json.dumps(calls, ensure_ascii=False, indent=2) + '\n')
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

for ident in dict.fromkeys(i for ids in M.values() for i in ids):
    es = [c for c in C if ident in M[c['id']]]
    data = dict(id=ident, by='learner:experience-update', where=dict(experience=[c['id'] for c in es]), note='第137次经验提案预关联；保留旧claim、first_run、prior、状态及版本；HNX4A2WBC34W原始1779条SHA与1369项角色/主题核验；源提交之后登记proposed。')
    if not any(e['run'] == N for e in L[ident]['evidence']):
        data['evidence'] = [dict(run=N, role='support', note=es[0]['after']['lesson'].split('典型案例：')[1][:350])]
    cli('ledger.py', ['update'], data)

resource_ids = ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-deck-burst-observation', 'silent-act-transition-missing-hp-heal']
boss_ids = ['silent-aeonglass-artifact-growth-sl', 'silent-insatiable-dual-clock', 'silent-bygone-effigy-wake-strength']
mechanism_ids = [c['id'] for c in C if c['id'] not in resource_ids + boss_ids]
groups = {
    'resources': (resource_ids, ['combat', 'potion', 'terminal'], 'HP护栏持续收益及路线血药资源链的固定输入对照',
        '旧行为：护栏依据当轮净损替换候选，未来路线血量与营火给条件投影。新行为提案：独立strategy-proposal并列当轮血价、已结伤、余毒、减力和实际敏捷收益；未受控整场结局不调整护栏/终局权重或药水门槛。F14T4候选损24/伤25换损14/伤8，实际51→37、敌49→41；F33首T3候选损20换10且伤15保持，却−4力/4弱改实−2/2；T5候选损12/伤21换1/6并建3永久敏而无新毒。合31省血/32少伤是题面差，原线未完整执行；两线五轮均4/8死亡并不等价。路线三幕胜耗6/19/37/15，后段F44休息8→30、蘑菇30/75→50/95、F47回28至78；恢复HP和上限/营火/SL来源分列，连续三败不证明另路线、删牌、留药或回血换升级能赢。'),
    'mechanisms': (mechanism_ids, ['combat', 'potion', 'structure'], '力敏、毒引擎和凋萎共同血量预算的一致性验收',
        '旧行为：已有毒/持牌致死提醒和现场属性建模；本局不能指为完全漏算凋萎。新行为提案：独立strategy-proposal把同输入和结算阶段固定后核局部收益消费，只有发现可复现差异才补模型；无本批源码实现。沙漏末T7三张致命毒药7/5/5使13→20→25→30毒，三刀各4+1共15，毒30+29+28=87；余像七牌7挡对25攻击及两张9凋萎需损36、38→2。T8后翻/防御基础5+2敏各7、各余像1再暴露1共17，对40攻击及一张9凋萎静态32；代码预计30的差2未归因，死亡裁剪只扣2不足证真实总损。毒29+28+27=84后敌余130。不得由未发生的少出小刀/弃凋萎推整战胜线。速度药T3加5敏，沙虫防御10+蜃景11=21，比同两牌无药多10，下轮撤5；萎靡/药时/抽序同时改变，不能归单因。毒雾补2、触媒建2、痊愈加1能抽2不回血、毒药水施毒不即时伤，按本角色实帧分别验收，不引入新药时阈值。'),
    'boss-sl': (boss_ids, ['combat', 'sl', 'terminal'], '沙漏与沙虫重打的可比前缀及实际死亡边界',
        '旧行为：真正必死时SL、未知抽牌使判官不确定则继续；本局沙漏末试有腐蚀波/百年积木未知边界，并非用尽6次上限。新行为提案：独立strategy-proposal对比sl-attempts/decisions.sl_attempt的真实同前缀、explore/sl_explore和药时，保留必死规则及未知边界；有限全败不证所有打法必死。沙虫两试均58/75且槽0速度，首T11 12血3挡对33、敌106/9毒判死；重打T3速度+萎靡改变，后序亦变，T10敌8/11毒被结束而22攻未兑现、19血胜，不指归取消护栏或只挪药时。沙漏三试均78/95两药，前两T7判死，末T8实死；SL曾恢复首试前缀，不当Jev自主选择。雕像T4实际护栏损14/伤8与未执行原线分列。未知完整同抽与未执行方案没有胜负对照，不制定固定出牌/杀序。')
}

results = []
for key, (ids, domains, title, body) in groups.items():
    ledger = list(dict.fromkeys(i for ident in ids for i in M[ident]))
    lines = ['# ' + title, '', '角色：silent；新局A10，历史支持/反例及分阶见mechanism-evidence.json。',
        '来源任务：experience-update/20261009-193738；实现任务：独立strategy-proposal。',
        '账本：' + ','.join(ledger) + '。', '', body, '',
        '| 条目 | 支持/反例 | 适用范围 | 机制与真实典型案例 |', '| --- | --- | --- | --- |']
    for c in C:
        if c['id'] in ids:
            e = c['after']; lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]} | {e["asc"]} | {e["lesson"]} |')
    lines += ['', '## 拟合、样本及时间切分', '',
        '全引擎silent学习观察截止2026-10-09T10:51:20.602Z，共175完局，旧174局七数组、血档、节点、HEAL与SL全部复算相等。旧局只进数字与历史机制验证，不是纯Codex爬塔成绩。主题支持局不当逐公式的独立因果分母，同房重打不当独立局。未拟新参数，后续本角色新完局作时间外验证；不凭预训练知识填机制。', '',
        '## 固定验证、缺数据与预期影响', '',
        '1779条新局原始字节/SHA核验，1369项角色/证据/主题参数验证，关键前后帧和原始护栏理由留verification.json、audit.json及机制历史复盘文本。固定回放核力敏、余像、逐次毒、凋萎持牌、药栏和HP、SL恢复、毒杀取消攻击，走原沙箱tsc/vitest入口，不跑boss模拟池。',
        '缺完整dirty源码、部分逐击归零/过量、原始内部结算序、未选线/路线/休息/留药整战反事实、完整相同抽序以及F49真实资源。T8预计30与静态32差2仅列待核，缺证保留原行为。预期提高候选、实际执行和血药出口的一致性，不保证旧局翻胜。', '',
        '## 回退与既有授权', '',
        '只影响silent已观察条件，其他角色及未观察机制保持等价；没有源代码修改，提案pending，不登记implemented/shipped。独立实现按实际live祖先源码commit验收后才标实现，规则实际上线先date、decision-log/eval唯一版本与Roy双通知。回退独立源码commit和本批经验commit，保留并行知识刷新及失败原件。Roy-2026-10-07-learning是既有学习授权，不提供游戏事实。']
    path = O / ('proposal-' + key + '.md')
    path.write_text('\n'.join(lines) + '\n')
    data = dict(character='silent', ledger=ledger, runs=[N], source_task='experience-update', target_task='strategy-proposal', domains=domains, summary=title + '；按已核固定输入验证、缺证保留', proposal=str(path), experience=ids, rule_changes=True, authorization='Roy-2026-10-07-learning')
    (O / ('proposal-' + key + '.json')).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    results.append(cli('code_proposals.py', ['add', '--character', 'silent'], data))
(O / 'code-proposals-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
(O / 'ledger-added.json').write_text('[]\n')
print('三份提案：', results)
