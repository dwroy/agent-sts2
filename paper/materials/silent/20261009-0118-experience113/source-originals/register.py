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
    F = json.loads(subprocess.check_output(['python3', str(ROOT / 'learner/ledger.py'), 'fold'], text=True))
    F = F if isinstance(F, dict) else {e['id']: e for e in F}
    for lid in L:
        changes = [c for c in C if lid in M[c['id']]]
        known = {e['run'] for e in F[lid]['evidence']}
        missing = list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if r not in known))
        value = dict(id=lid, by='learner:experience-update', where=dict(experience=[c['id'] for c in changes]), note='第113批提案预关联；保留原claim/prior/状态/版本和support/repeat；提交后追加proposed。本局538决策/556帧，机制616项核验和旧147局同口径复算均留scratch。')
        if missing:
            value['evidence'] = [dict(run=r, role='support', note='本角色原始帧及复盘重核：' + ','.join(c['id'] for c in changes) + '；逐房/层/轮见audit、louse-history、stolen-history及变更记录。') for r in missing]
        if lid == 'silent-0316':
            value.update(first_run='T082DRCUHRRD', asc=0, prior_note='全历史22局按角色重查，补发现更早A0 T082DRCUHRRD F28 T3已5力/14挡；据此仅追加更正原首证2SU6XN2AEJRD为T082DRCUHRRD。prior仍unknown：观察到成长不等此前长期应对已做对，原A6/A10证据及初始记录保留。')
        cli('ledger.py', ['update'], value)
    specs = [
        ('mechanisms', ['combat', 'potion'], ['silent-strength-weak-observation', 'silent-frail-card-block', 'silent-piercing-wail-temporary-strength', 'silent-strangle-following-card-hp-loss', 'silent-louse-progenitor-strength-growth', 'silent-regen-potion-decay-heal'], '静默虱虫成长、临时减力、脆弱牌挡、紧勒逐牌失血与再生实回核验'),
        ('resources', ['structure', 'combat', 'sl'], ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-deck-burst-observation', 'silent-act-transition-missing-hp-heal'], '静默实际血药和可用牌组接续，未来营火与读档恢复分账'),
        ('retirement', ['combat', 'sl'], ['silent-kin-poison-sl-observation'], '静默同族同盘退场窗口与弃牌重算后的实际执行核验'),
        ('stolen', ['combat', 'terminal', 'structure'], ['silent-stolen-card-availability-observation'], '静默失窃卡的已测进度、逃脱与未知HP换算分别展示和核验')
    ]
    details = {
        'mechanisms': ['LY83ZMTFVKJH A10 F21 T7紧勒→偏折预测8/实10，T10紧勒→匕首雨+→偏折预测20/实24，均完整执行；普通STRANGLE_POWER2仅本轮，后续牌各扣2。纯漏接线bug沿silent-0260/原postmortem提案04cbbf6b3a547aea，经验账本0261分账，不称修后必胜。', 'F21蜷身成长T2/5/8/11后建7/14/21/28力量和18挡，T9/T12同无弱猛扑37/44，虚弱将44→33；T6尖啸14→8力且现有弱下22→18，9挡损9，T7恢复14。末T12零敏脆弱三防御各3合9、1血实死，完整需损24。历史22局力增长逐帧验证，A0/2/6/7每次5、A8仍5但初蜷身18；A10每次7。剩挡受其他触发影响，不把一帧剩挡当原始建挡。', 'F14T1再生建立5层，T1/2/3回复5/4/3合12，战止；血瓶2与实伤1另账，53→66，不预支未结2/1。新局无玩家力量/敏捷增益或能力部署。', '旧行为：中文紧勒经验已存在但出牌推演漏后续伤；其他模型是否已正确须读当前live再验。新行为：先固定本角色已见无挡目标接线/扣血/撤回及历史兼容帧，正确保持，可复现偏差才窄修；穿敌挡、升级紧勒/叠层/重放缺本局证据，不直接推广。'],
        'resources': ['LY83ZMTFVKJH A10 F8锻造49不回，F13/16各回血23/21，F17第三试77→11损66；F18跨幕回floor((77−11)×80%)=52至63。SL6/11→77各恢复同一瓶狡诈药水，不当回复137或新获2瓶。', 'F19血瓶63→65无伤胜，F20血瓶65→67后实损6到61，技能药T3实饮；F20失手斧+持续缺失、敌30逃脱不能作击杀。F21入61/77、血瓶补63/空药/无手斧；F22店与F24火未到。二幕路线初投影63/52/41，后题更新F21为54再61，实入61，不把更新兑现HP当赢战保证。', '旧行为：未来火堆/构筑计划为条件展示，已建/持有/失窃和SL恢复不一定分源。新行为：先核当前展示，保留实际入口血药牌组及条件预测，缺字段才补结构；同族第三試后续抽牌/药序变化，不拟统一回血权重、SL次数或留药价。'],
        'retirement': ['LY83ZMTFVKJH A10 F17第2/3试T5同50血、信徒38/神官147；SL将手斧由神官改信徒，原计划20伤预测损11/10，但生存者都弃打击、重算补防御，实际都只清14损5。末盘信徒35/神官136变24/147，信徒退场由T7提前T6、T7实际损10变0，第3试T14剩11胜。', '旧行为：同题总伤相同但实际退场不同，原方案与SL替换、弃牌后剩余序列容易混用。新行为：固定记录两线当前血价、目标剩血与执行续步，抽/弃后用实际重算，记录局部窗口与后续差异；既有实现正确保持，不规定永远先信徒，不从单场拟固定目标排序。总10场36试6赢/真正重打7场33试3赢，支持含A0背景一局，策略仅观察A10。'],
        'stolen': ['LY83ZMTFVKJH A10 F20 T1顺走手斧+从永久牌组缺失；T2 d300426/s307973，1000样本知识恶魔模拟余血with336.507→without357.971，卡进度21.464±0.9731；HP斜率−0.2843±0.0417，hp=null/status=flat，题面loot cost 0。Jev选择plan3置信0.89，无理由文本，不认定零价导致选择。另一线肾上腺素+和匕首雨+预测12进度，各线8/8预计逃。T5实际20伤后敌30血逃，至F21死未返牌。', 'PU80F84P6HPN A10 F19普通步法被携后持续缺牌；NB8KCF6HRGVF A10 F21升级药瓶暂缺，首奖励帧仍缺，下一奖励帧返还；最终非战斗帧核返还，不能据首奖励帧误认永久移除。机制支持3局、HP换算未知而正卡进度仅本局1，其他负进度worse_with旧案例不同不合并成反例。', '旧规则：flat/null未有HP换算却界面按loot cost 0；新行为：终局评估保留hp未知、卡进度、逃脱概率与置信区间分别核。先固定当前live渲染/排序回归，若仍丢失卡进度，补可追溯展示/比较；未有未知HP换算的稳定排序验证，先保留原执行并登记waiting，不把21.464敌血硬换人定HP价，不称12伤线能追回或追回必胜。']
    }
    ids = []
    for name, domains, entries, summary in specs:
        ledgers = list(dict.fromkeys(l for e in entries for l in M[e]))
        if name == 'mechanisms':
            ledgers.append('silent-0260')
        path = O / ('proposal-' + name + '.md')
        lines = ['# ' + summary, '', '角色silent；已观察进阶、支持和反例逐条列出，其他角色/未观察交互保持等价。来源任务experience-update，实现任务strategy-proposal，授权Roy-2026-10-07-learning。', '账本：' + ','.join(ledgers) + '；经验：' + ','.join(entries), '', '## 旧条目、新证据与推理']
        for ident in entries:
            c = next(c for c in C if c['id'] == ident)
            e = c['after']
            lines.append('- ' + ident + '；旧：' + (c['before']['lesson'] if c['before'] else '尚无对应独立条目') + '；新：' + e['lesson'] + '；支持局' + ','.join(e['evidence']) + '；反例局' + ','.join(e.get('contradicting', [])) + '；账本' + ','.join(M[ident]) + '。')
        lines += ['', '## 证据、旧规则、新行为与缺数据', *details[name], '', '## 时间切分、验证、预期影响与回退', '历史147完局截至2026-10-08T15:04:43.085Z用于核验/兼容，新局截至15:44:39.242Z为后时段发现样本；后续silent完局才作独立时间留出。SL同场多试不算独立局，本任务未拟合任何药价/HP血线/终局权重。运行049dff24+dirty完整源码未记录，先核当前live和原三项postmortem提案去重，不把参考源码冒作开局代码。', '验证使用本scratch556状态/538决策、616项核验、历史原帧和同角色固定回归。模型已正确则保持；缺受控胜果不推出新硬规则。原test-sandbox入口、排除及60000预算不变。预期使模型/展示与已见现场相符，不保证转胜；回退独立源码commit至父版，保留经验/账本/原失败日志。实际源码commit为live祖先才可登记implemented，经验文字上线不算源码实现。', '本任务只登记pending，不改打法源码，不称implemented/shipped。实现者不足明确waiting原因；实际上线后先date双通知Roy逐项旧/新、证据/账本/任务、预期影响/回退。', '']
        path.write_text('\n'.join(lines))
        item = dict(character='silent', ledger=ledgers, runs=['LY83ZMTFVKJH'], source_task='experience-update', target_task='strategy-proposal', domains=domains, summary=summary, proposal=str(path), experience=entries, rule_changes=True, authorization='Roy-2026-10-07-learning')
        (O / ('proposal-' + name + '.json')).write_text(json.dumps(item, ensure_ascii=False, indent=2) + '\n')
        ids.append(cli('code_proposals.py', ['add', '--character', 'silent'], item))
    (O / 'proposal-ids.json').write_text(json.dumps(ids, ensure_ascii=False, indent=2) + '\n')
    print('已登记代码提案', ids)
elif sys.argv[1] == 'after':
    commit = (O / 'source-commit.txt').read_text().strip()
    version = json.load(open(O / 'update-summary.json'))['version']
    day = subprocess.check_output(['date', '+%Y-%m-%d'], text=True).strip()
    heading = day + ' 静默猎手 第一百一十三次增量：1 局 A10（version ' + version + '，分支 exp-silent，' + commit[:8] + '）'
    for lid in L:
        cli('ledger.py', ['update'], dict(id=lid, by='learner:experience-update', status='proposed', where=dict(experience=[e for e in M if lid in M[e]], commits=[commit], changelog=[heading]), note='第113批经验已提交，只登记proposed。实际数据shipped交运维据完成事件核；原claim/prior/证据及旧状态/版本历史保留，独立代码提案未实现。'))
    (O / 'ledger-results.json').write_text(json.dumps(dict(added=[], proposed=L, retired=[]), ensure_ascii=False, indent=2) + '\n')
    (O / 'changelog-heading.txt').write_text(heading + '\n')
    print('登记proposed', L)
