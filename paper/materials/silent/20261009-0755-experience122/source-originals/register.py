import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O / 'changes.json'))['entries']
M = json.load(open(O / 'ledger-map.json'))
L = list(dict.fromkeys(l for ls in M.values() for l in ls))
N = 'CSLHFCBSC1UM'

def cli(script, args, value):
    stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %z'], text=True).strip()
    p = subprocess.run(['nice', '-n', '19', 'python3', str(ROOT / 'learner' / script), *args], input=json.dumps(value, ensure_ascii=False), text=True, capture_output=True)
    with (O / 'ledger-cli.log').open('a') as h:
        h.write(stamp + '\n' + json.dumps(value, ensure_ascii=False) + '\n' + p.stdout + p.stderr + '\n')
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

if sys.argv[1] == 'prepare':
    B = {e['id']: e for e in json.load(open(O / 'ledger-before.json'))}
    for lid in L:
        entries = [c['id'] for c in C if lid in M[c['id']]]
        value = dict(id=lid, by='learner:experience-update', where=dict(experience=entries), note='第122批经验/提案预关联；保留首证/prior/claim/status/version及历史。旧157局复算，新局真实帧核验；提交后另记proposed。')
        if N not in {e['run'] for e in B[lid]['evidence']}:
            value['evidence'] = [dict(run=N, floor=17, turn=10, role='support', note='族母吸取后力敏−4，两普通防御1+1与生存者4共6挡、10血对25需损19；末毒16结后仍56。T5致命毒药+实3→10再迷雾到14、本体172当步不变；T9刺击负2力只扣敌挡4而仍加3毒。支持' + ','.join(entries))]
        cli('ledger.py', ['update'], value)
    resources = ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-deck-burst-observation']
    mechanisms = [c['id'] for c in C if c['id'] not in resources and c['id'] != 'silent-lagavulin-siphon-poison-sl']
    specs = [
        ('mechanisms', mechanisms, ['combat', 'terminal'], '静默族母负力量/敏捷、重放格挡与毒终局的固定帧一致性',
         'CSLHFCBSC1UM F17第6试，s315827—315830与315845—315853：T5/T9吸取后玩家力敏0→−2→−4，敌力0→2→4；T10两防御及生存者1+4+1=6挡，10血对25完整需损19、预测剩−9，实死时只扣剩10。T3重放防御同一步0→10挡、手动计数0→1，后继防御到15。T5升级致命3→10再迷雾到14，本体172当步不变，结束到158；T9负2力刺击只使敌挡14→10却加3毒10→13，迷雾再到17、实结89→72；末16毒实结到56未斩杀。当前combat-plan.ts:3269输出hpAfter，本局没有新定位bug。先核当前live已否等价，固定重放牌效、负属性、重复触发与毒结终局；等价则报告实际源码祖先，不制造改动。如定位遗漏，仅改本角色已观察接线。无重复防御自动计数的一般化、未见能力优先级或新终局权重。'),
        ('sl', ['silent-lagavulin-siphon-poison-sl', 'silent-deck-burst-observation'], ['sl', 'combat', 'terminal'], '静默SL饱和换线同时记录即时血价和实际本体进度',
         'CSLHFCBSC1UM F17第4试T2，d307445/307548指纹相同：64血3能量、敌230血0挡2毒1易伤。Jev防御→切割→猎杀者损16/伤33；SL改打击→切割→猎杀者损21/伤42，原帧实多损5、多扣9，五轮saturated、两线tied、整场各0%无赢样本，第四试T10判死。末试T3 d307630原致命毒药+线损5/伤32换双防御/迷雾/串刺损0/伤21，实省5血少11伤，后继同变。第5試T5明确替换损仍0、少4伤；只有这三处明确候选替换，HP护栏0。当前探索已失败原线外的未试线，本局不证明替线违例、也不证明原线整场胜。独立任务审计原答/实际执行、HP/伤/毒进度、饱和/截断与后序是否齐记；缺失则沿现有字段补可追溯记录。排序/血价门槛须独立新局及整场受控重放支持，证据不足waiting，保留原探索/必死闸/护栏，不禁止SL或强制防御。'),
        ('resources', resources, ['potion', 'terminal'], '静默赢战仍耗血药、真实营火和未建能力的终局资源核账',
         'CSLHFCBSC1UM F2/3/5/6/8/11/12/14/15九胜净损1/0/0/16/6/13/0/0/19合55，F8是问号。F7以39血锻造不回血，F9/F13/F16各回21合63，初56−55＋63=族母64/70；六试64空药，五次恢复64非自然回复。获5瓶、主动饮5、弃0、复活0，F12补明耀到F14饮掉且零损，未证留药能赢；开槽遗物不是补药。F9想避精英时所选两精英已必经。最终22张无步法/毒雾/触媒，不预支计划能力；族母首试十轮截至截断扣202、末试含末毒扣177，233清血预算23.3/轮只作事后值。脑实际Codex16、DeepSeek0，兼容字段不作引擎证据。独立任务核候选投影、实际血药分源、组件建立与剩余结算；充分本角色配对数据才拟药持有价或终局值，不足保留原行为及waiting，不把一局六试当六独立样本。')
    ]
    ids = []
    for name, entries, domains, summary, detail in specs:
        lids = list(dict.fromkeys(l for ident in entries for l in M[ident]))
        text = ['# ' + summary, '', '角色silent，新证据A10。来源experience-update/20261009-073010；实现独立strategy-proposal。Roy-2026-10-07-learning仅提供规则授权，不提供游戏事实。', '账本：' + ','.join(lids), '经验：' + ','.join(entries), '', '## 旧行为、证据与条件性新行为', detail]
        for ident in entries:
            c = next(c for c in C if c['id'] == ident)
            e = c['after']
            text += ['', '- ' + ident + '；旧经验：' + c['before']['lesson'] + '；新经验：' + e['lesson'] + '；支持：' + ','.join(e['evidence']) + '；反例：' + ','.join(e.get('contradicting', [])) + '；适用' + str(e['asc']) + '。']
        text += ['', '## 样本、时间切分与限制', '旧157个silent完局截至2026-10-08T22:35:53.178Z作核验基线；新局22:40:47.195Z—23:01:33.472Z作增量；后续独立完局作留出。同局全部SL属于同一集合，未经隔离不拟阈值或胜率。缺完整dirty源码、前五试末结算/退出HP、部分逐击毛伤/过量/归零与致死顺序、原线/留药/改线/替代构筑的整战反事实、后续幕实到资源、完整执行最优比例、时钟估值和实际费用。旧支持沿已核语义，历史出现集合只检索、不把共现当完整机制分母。', '', '## 验证、预期影响与回退', '先核同主题旧提案与当前live源码，复用真实固定状态重放，无新游戏规则凭空补入。复现同盘多损5/多扣9与反向省5/少11，逐牌负属性/施毒/重放和毒终局相等；净损与毛伤、SL恢复与自然回复分源。实现必要改动后用原test-sandbox，其他角色及未观察条件等价；缺整场对照则waiting。预期改进可核验性，不承诺翻盘。本轮只改经验，无源码implemented/shipped。未来源码回退独立commit，经验回退父版blob，历史保留；实际规则上线先date双通知Roy旧/新规则、证据/账本/任务、影响和回退，不改运维prompt。', '']
        path = O / ('proposal-' + name + '.md')
        path.write_text('\n'.join(text).replace('第5試', '第5试'))
        value = dict(character='silent', ledger=lids, runs=[N], source_task='experience-update', target_task='strategy-proposal', domains=domains, summary=summary, proposal=str(path), experience=entries, rule_changes=True, authorization='Roy-2026-10-07-learning')
        (O / ('proposal-' + name + '.json')).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        ids.append(cli('code_proposals.py', ['add', '--character', 'silent'], value))
    (O / 'proposal-ids.json').write_text(json.dumps(ids, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(ids, ensure_ascii=False))
elif sys.argv[1] == 'after':
    commit = (O / 'source-commit.txt').read_text().strip()
    heading = (O / 'changelog-heading.txt').read_text().strip()
    for lid in L:
        entries = [c['id'] for c in C if lid in M[c['id']]]
        cli('ledger.py', ['update'], dict(id=lid, by='learner:experience-update', status='proposed', where=dict(experience=entries, commits=[commit], changelog=[heading]), note='第122批九经验已自测提交；实际live数据shipped由运维按完成事件核实，三源码提案pending。保留首证/prior/claim/支持/repeat/旧版本历史。'))
    result = dict(added=[], proposed=L, retired=[])
    (O / 'ledger-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
