import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
N = 'H1T1F8ML9FUE'
mapping = {
    'silent-strength-weak-observation':['silent-0012'],
    'silent-mirage-poison-card-block':['silent-0010'],
    'silent-haze-group-poison-weak':['silent-0007'],
    'silent-wither-end-turn-loss':['silent-0024'],
    'silent-noxious-fumes-growth':['silent-0011'],
    'silent-accelerant-triggers':['silent-0027'],
    'silent-afterimage-per-card-block':['silent-0023'],
    'silent-serpent-form-per-card-damage':['silent-0132'],
    'silent-piercing-wail-temporary-strength':['silent-0046'],
    'silent-scroll-paper-cuts-unblocked':['silent-0221'],
    'silent-dexterity-potion-card-block':['silent-0276'],
    'silent-aeonglass-artifact-growth-sl':['silent-0025','silent-0079'],
    'silent-insatiable-dual-clock':['silent-0018','silent-0117'],
    'silent-act-transition-missing-hp-heal':['silent-0243'],
    'silent-rest-buffer-observation':['silent-0020'],
    'silent-route-hp-observation':['silent-0019'],
    'silent-deck-burst-observation':['silent-0021']}
locations = {'silent-0012':(48,4),'silent-0010':(45,5),'silent-0007':(48,3),'silent-0024':(48,4),'silent-0011':(33,5),'silent-0027':(33,9),'silent-0023':(45,5),'silent-0132':(45,5),'silent-0046':(48,3),'silent-0221':(35,2),'silent-0276':(24,2),'silent-0025':(48,3),'silent-0079':(48,3),'silent-0018':(33,9),'silent-0117':(33,6),'silent-0243':(18,None),'silent-0020':(47,None),'silent-0019':(48,1),'silent-0021':(48,4)}
groups = {}
for eid, ids in mapping.items():
    for ident in ids:
        groups.setdefault(ident, []).append(eid)

def cli(tool, command, data):
    subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'], stdout=subprocess.DEVNULL, check=True)
    args = ['nice','-n','19','python3',str(ROOT/'learner'/tool),command]
    if tool == 'code_proposals.py':
        args += ['--character','silent']
    p = subprocess.run(args, input=json.dumps(data,ensure_ascii=False)+'\n', text=True, capture_output=True)
    with (O/(tool+'.'+command+'.log')).open('a') as h:
        h.write(p.stdout+p.stderr)
    assert p.returncode == 0, p.stdout+p.stderr
    return p.stdout.strip()

if sys.argv[1] == 'prepare':
    p = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],text=True,capture_output=True,check=True)
    L = {r['id']:r for r in json.loads(p.stdout)}
    for ident, eids in groups.items():
        item = dict(id=ident,by='learner:experience-update',where=dict(experience=eids),note='第100批提交前关联H1T1F8ML9FUE实帧及14:39勘误；保留首证/prior/claim/support/repeat及旧上线历史，提交后登记proposed。')
        if N not in {e['run'] for e in L[ident]['evidence']}:
            f,t = locations[ident]
            ev = dict(run=N,floor=f,role='support',note='本角色实帧支持'+','.join(eids)+'；数据及反事实限制见20261008-144110报告，不将局部收益称整场胜因。')
            if t is not None:
                ev['turn'] = t
            item['evidence'] = [ev]
        cli('ledger.py','update',item)
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text('[]\n')
    print('账本预关联',len(groups))
elif sys.argv[1] == 'proposals':
    C = json.load((O/'changes.json').open())['entries']
    specs = [
        ('modifiers',['combat','potion'],['silent-strength-weak-observation','silent-mirage-poison-card-block','silent-afterimage-per-card-block','silent-serpent-form-per-card-damage','silent-piercing-wail-temporary-strength','silent-dexterity-potion-card-block']),
        ('poison',['combat'],['silent-haze-group-poison-weak','silent-noxious-fumes-growth','silent-accelerant-triggers']),
        ('windows',['combat','sl'],['silent-wither-end-turn-loss','silent-aeonglass-artifact-growth-sl','silent-insatiable-dual-clock','silent-scroll-paper-cuts-unblocked']),
        ('resources',['combat','potion','sl','terminal'],['silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation'])]
    targets = {
        'modifiers':'核已观察敏捷/脆弱牌挡、余像重放、群蛇逐次盾/本体伤及临时力量撤回；零毒蜃景不预支未来毒。药水仅核已饮2敏及旧挡不补，不拟新喝留时点。已实现部分核实际live祖先，无证据交互保留现行为。',
        'poison':'核人工制品逐项消费减力/毒/弱，毒雾建层到轮初施毒及触媒实际结算次数。H1末T4建雾/触媒而0毒未到下轮，不能预支双结；按已观察帧补漏模，不把全败模拟当真必死。',
        'windows':'核沙漏可见弃牌区已升级凋萎6伤而手空缓存仍3的silent-0297缺口；仅从本角色已显示文本同步、缺字保留未知。SL饱和换线并记零毒蜃景替防御多损3同伤12；沙虫强制弃牌保留仍需的逃离，临终毒与沙坑独立。纸伤难愈2只核未全挡逐击max变化，不改通用SL门槛或凭单局定胜率。',
        'resources':'核赢战出口HP/药水与下一房、实到营火和转幕回复的接续；路线预测随实际行动更新，弃药/事件交换/实饮/SL分账。F47休息到52后沙漏六试败，没有留药或替路线完整胜线；先保存候选与后场资源对照，证据不足保留药水持有价值、终局权重及SL门槛。'}
    common = '''来源任务：experience-update / 20261008-144110；实现任务：独立strategy-proposal。角色silent，策略本次只核A10；机制支持/反例分阶及完整局号见changes.json和update-summary.json。Roy-2026-10-07-learning授权不是游戏知识。其他角色与未观察策略进阶保持等价。本任务不改打法源码，不登记implemented/shipped。

旧行为：当前源码/模型对本局动作及资源的消费需逐项核验，不从经验文本假定已实现。已定位fight-plays.ts:38/48—51及combat-plan.ts:1518—1529只从手牌抬凋萎缓存；仅可见弃牌区6伤而手空时仍3。代码位置以当前exp为准，运行1a0adbaa+dirty完整源码未保存，不冒称逐字重放。

证据：H1T1F8ML9FUE静默A10 F48败，重抽844决策/49实际Codex脑请求/9SL日志，seek930帧。F48六次同52/64空药，前三类末见T4/T5判死截断不计实死，末试T4实死；第3/4试T3同37血、敌464、两制品、4能，Jev原选迷雾→打击→防御，第4代码改迷雾→蜃景→打击。同扣12，防御挡5使损0，蜃景零毒0挡而新生3伤凋萎使损3，预计亦0/3，全败24/24不能等同无代价。第6试T3改零毒蜃景少12伤，无完整胜线。T2保血线省3但少2本体伤。末T4连续反弹扣60至402并新生6伤凋萎，预测33留1、实际30+6完整需损36，34HP死；重读least-loss已报余−2，不能称全程未判死。

机制证据：F48末T3尖啸消一制品、迷雾毒消另一、迷雾弱才建1，毒0；T4弱撤、力0→4，同招26→30。F33第二试触媒1、毒雾3，T9敌18血20毒，逃离沙坑1→2并余像1挡后实胜28血；首试T6弃唯一逃离、T7沙坑1判死，补0117repeat，无不延长实战对照。F24T2敏捷药实建2，防御基础5实7另余像1，12→20；瓶中船10挡同场存在，不能归单药胜因。F45T3群蛇4，脆弱防御3挡同时扣敌盾4，零毒蜃景0挡仍扣盾4；临时3力量次轮撤、群蛇4留。T5五毒脆弱下蜃景+重放两次3挡+两次余像1合8，群蛇8伤先扣4盾再扣本体4；末19挡对28仍损9。F35纸伤难愈2关联max70→68→64、净损11，F46全战33HP/max64不降。

资源：22战房/28窗口，前21赢战净损233，八休息五次21加三次19=162、两先古回52/33，共回复247，事件另损18；56+247−233−18−52=0，SL恢复不叠入正路径。二幕无精英仍损92；F40胜50→29，休息29→48、F43胜→34、休息→53、F45胜→33、F46无损、末休→52，F48败而F49未到。独立15瓶=普通奖励10/事件购2/商店2/事件获1，13饮、主动弃敏捷1、事件换狡诈1；敏捷两次实饮，另弃槽0敏捷不是饮用，无留药受控胜局。脑已明确三营火避精英、末火选择休息；不能将本局登记成末火升级或只认单boss的路线错误。

拟合与验证：历史130局为时间前置，本局留出；同房多尝试按局/房分组，不能当六独立局。旧130局七数组、血档/后战/回复/SL逐行复算一致。先查实际live祖先源码实现，固定帧验证动作前后、手牌/弃牌区、重放、临时量撤回和资源出口；已有实现则登记真实祖先或具体waiting。若改变权重，需完整候选/同盘资源和时间留出，当前本局不足拟参数。修模型后整场胜负未实测，不承诺能赢。

反例：经验旧contradicting列表完整保留，新增该局没有机制反例；战败不等机制无效。支持局数不是动作出现局数。缺数据：完整dirty源码、前五SL退出/未派发结算、首试预报额外门槛差额完整归因、重复敌ID持久身份/召唤退场逐击毛伤、留药/替线/休息/修模受控整场胜负、F49实到资源与完整boss时钟。证据不足保留现行为并waiting。

预期影响：核实模型与血药接续，避免预支未建毒/能力和饱和模拟下忽略血价，不承诺胜率。回退：独立实现只逆向对应源码提交，保留经验/原帧/刷新。实现按固定沙箱、gitleaks、锁内刷新/合后测试及Roy旧新双通知；经验数据发布不当代码实现。
'''
    ids = []
    for name, domains, eids in specs:
        ledgers = list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        if name == 'windows':
            ledgers.append('silent-0297')
        text = '# 静默猎手经验代码提案：'+name+'\n\n'+common+'\n新行为及边界：'+targets[name]+'\n\n账本：'+','.join(ledgers)+'；经验：'+','.join(eids)+'。\n\n'
        text += ''.join('- '+c['id']+'；适用'+str(c['after']['asc'])+'；支持/反例'+str(c['after']['n_support'])+'/'+str(c['after']['n_contradict'])+'；'+c['after']['lesson']+'\n' for c in C if c['id'] in eids)
        path = O/('proposal-'+name+'.md')
        path.write_text(text)
        item = dict(character='silent',ledger=ledgers,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=targets[name],proposal=str(path.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py','add',item))
    assert set(mapping) == {eid for _,_,eids in specs for eid in eids}
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print('提案', ids)
elif sys.argv[1] == 'finalize':
    commit = (O/'source-commit.txt').read_text().strip()
    title = (O/'changelog-title.txt').read_text().strip()
    for ident, eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第100批经验源提交完成；首证/先验/claim/evidence/repeat及旧上线历史保持，实际shipped由运维核live，经验发布不当代码实现。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n')
    print('proposed',len(groups))
