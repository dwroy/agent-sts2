import json, subprocess, sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];L=json.load(open(O/'ledger-fold-before.json'));D={r['id']:r for r in L}
def cli(tool,command,data):
    p=subprocess.run(['python3',str(ROOT/'learner'/tool),command]+(['--character','silent'] if tool=='code_proposals.py' else []),input=json.dumps(data,ensure_ascii=False)+'\n',text=True,capture_output=True)
    path=O/(tool+'.'+command+'.log')
    with path.open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stderr+p.stdout)
    return p.stdout.strip()
mapping={
 'silent-strength-weak-observation':['silent-0012'], 'silent-footwork-block':['silent-0005'],
 'silent-gorget-plating':['silent-0016'], 'silent-anticipate-temporary-dexterity':['silent-0080'],
 'silent-piercing-wail-temporary-strength':['silent-0046'], 'silent-envenom-unblocked-attack-poison':['silent-0084'],
 'silent-noxious-fumes-growth':['silent-0011'], 'silent-afterimage-per-card-block':['silent-0023'],
 'silent-mirage-poison-card-block':['silent-0010'], 'silent-paels-legion-card-block-double':['silent-0123'],
 'silent-infested-prism-tainted-skill-cost':['silent-0168','silent-0079','silent-0135'],
 'silent-deck-burst-observation':['silent-0021'], 'silent-rest-buffer-observation':['silent-0020'],
 'silent-route-hp-observation':['silent-0019'], 'silent-act-transition-missing-hp-heal':['silent-0243'],
 'silent-ceremonial-beast-threshold-growth-sl':['silent-0133'], 'silent-dexterity-potion-card-block':['silent-0276'],
 'silent-heart-of-iron-plating':['silent-0277'], 'silent-poison-potion-observed-application':['silent-0278'],
 'silent-regen-potion-decay-heal':['silent-0259'], 'silent-infection-end-turn-block':['silent-0286'],
 'silent-stone-calendar-end-turn-window':['silent-0288']}
if sys.argv[1]=='prepare':
    ring=next(c for c in C if c['id']=='silent-toric-toughness-delayed-block')
    data=dict(character='silent',kind='mechanic',claim=ring['after']['lesson'],evidence=[dict(run=r,role='support',note='实际施放建立2次轮初格挡；逐帧见ring-delayed.json，临时敏捷快照仅ZVYUL2YP3518隔离。') for r in ring['new_runs']],first_run=ring['new_runs'][0],prior='unknown',prior_note='早期LLYSRQQ35AVW已有实际施放，但此前没有临时敏撤回后保持原额度的可比决策，不据执行牌效认定已掌握快照机制。',status='observed',by='learner:experience-update',where=dict(experience=[ring['id']]),note='先登记来源以供本次代码提案校验；源提交后登记proposed及提交/变更记录。')
    ident=cli('ledger.py','add',data).splitlines()[-1]
    mapping[ring['id']]=[ident]
    (O/'ledger-added.json').write_text(json.dumps([ident])+'\n')
    for c in C:
        for ident in mapping[c['id']]:
            if ident not in D:continue
            existing={e['run'] for e in D[ident]['evidence']}
            new=[dict(run=r,role='support',note='经验更新重新核实本角色日志；条目'+c['id']+'，完整动作/血量/尝试见本批报告及审计。') for r in c['new_runs'] if r not in existing]
            if new:cli('ledger.py','update',dict(id=ident,by='learner:experience-update',evidence=new))
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
elif sys.argv[1]=='proposals':
    mapping=json.load(open(O/'ledger-map.json'))
    infection=['silent-infection-end-turn-block','silent-poison-potion-observed-application']
    calendar=['silent-stone-calendar-end-turn-window']
    resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal','silent-deck-burst-observation','silent-dexterity-potion-card-block','silent-heart-of-iron-plating','silent-regen-potion-decay-heal']
    groups=[('infection',['combat','potion','terminal'],infection),('calendar',['combat','sl'],calendar),('resources',['combat','potion','sl'],resources),('mechanisms',['combat','sl'],[c['id'] for c in C if c['id'] not in infection+calendar+resources])]
    ids=[]
    evidence='''角色仅silent；策略范围仅实见A8/A10及所列案例，机制按已观察条件。新局79UCJ0K6R9C1 A10/F14和NEWRFAYKTQHR A10/F17/F28/F31；完整dirty源码未保存，当前代码仅作覆盖审计，不能冒认原运行快照。

79UCJ0K6R9C1 F14T10两个感染先耗6挡，13挡后余7、敌18攻损11；T11三感染9先耗7挡并扣2血死亡，已饮毒药目标仍8HP/10毒，无毒结算。T3空过及攻击/双毒三案五轮八样本均0/8赢，实际空过0伤；不把尾端估计76%当实际赢样本或必死。

NEWRFAYKTQHR F31首/第三/末试T2同28HP、敌151HP/4毒、2力量及五张同手；先毒后蜃景11挡、损3/扣30，末SL改蜃景前置且删毒只4挡、损8/扣23。两案24/24模拟死，却相差5HP/7伤；后轮改变，无原线整场胜利反事实。末T3防御10挡但污染加3令三击18→27、实损17，T4三技能15挡/9污染对19需损4，实际3血归零，严格存活差2。

历石场景：F17T7敌70HP/24毒、19HP零挡，结束后胜仍19；F28第四试T7敌52HP/9毒、8HP零挡对40，结束后胜仍8。前三试未执行末结算，不能补获胜；当前judge.ts分别持有52伤上界及13/22毒，前两试57/59HP却只单源判mayDie。52来自当前代码而非本局独立精确实伤，不据归零反算遗物值；新纯bug0287只留修复记录。

坚韧之环6局24次施放已核，普通基础5+施放敏捷后核脆弱、建2次轮初挡。79UCJ0K6R9C1 F14T2给5，T3/T4各5；T10两敏给7，T11带7仍死感染。ZVYUL2YP3518 F33T6临时敏叠至6给11，T7/T8敏回2仍各11；升级/叠层/重放组合未知。

赢战资源链：79UCJ0K6R9C1雕像47→7净损40，其中敵伤55、再生实回15；三火各21、F12赢损19后51进末精英。NEWRFAYKTQHR二幕四走廊赢损46，F24回复21后34进蜂群，第四试赢损26到8，F29回复21后29进棱柱败；六SL恢复165/原药6另记，不算回血或新获药。未来F32/F33/F48/F49及另一线路未实到，终局价值参数不拟合。
'''
    for name,domains,eids in groups:
        ledgers=list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        if name=='calendar':ledgers.append('silent-0287')
        relevant=[c for c in C if c['id'] in eids]
        runs=list(dict.fromkeys(r for c in relevant for r in c['new_runs']))
        text='# 静默猎手经验代码提案：'+name+'\n\n来源任务：experience-update / 20261008-111006；实现任务：独立strategy-proposal。授权：Roy-2026-10-07-learning。\n\n账本：'+','.join(ledgers)+'。经验：'+','.join(eids)+'。\n\n'+evidence+'\n'
        if name=='infection':text+='旧/新行为：当前实盘已预测T6/T10感染伤，不能报全面漏算。独立核当前求解器/药水覆盖是否先付手中感染血价再判毒杀；只修缺少的已观察路径，禁止先死后结毒/把加毒当即时伤害。保持现有喝药/持有门槛，时点胜率证据不足。\n'
        elif name=='calendar':text+='旧/新行为：判官mayDie当前只验hit或poison单独足量；联合可能足以结束时应撤销确定死亡。独立任务依据本角色已核时点核合计上界、截断和其他已实现提案，不把可能击杀当已胜。\n'
        elif name=='resources':text+='旧/新行为：核实际能力、药水回复、覆甲/敏捷和SL恢复的来源及时间；短推演无赢样本不能冒报实赢，未到火堆不当现有资源。当前提示与真实数值有偏差时只修实证覆盖；无早喝/另路线/终局胜线，现有参数保持。\n'
        else:text+='旧/新行为：逐牌核力量、敏捷、临时减力、能力施毒、余像、士兵、蜃景/污染及坚韧之环延迟定额挡。尤其SL死亡率饱和仍展示已核即时5HP/7伤差，不以同死亡率抹掉实际代价；独立任务检查现有实现，未覆盖的机制仅按实见条件补，其他角色等价。\n'
        text+='\n拟合及验证：不拟合新权重或门槛，本批126静默完局按时间先核旧124局逐行一致，再新增两局；机制证据/反例/进阶见changes.json及update-summary.json。使用所列run/floor/turn冻结帧做固定回放；未知分支保留原行为，策略只在可证明覆盖缺口时改。独立策略任务应核已有live祖先实现避免重复，按原沙箱测试/gitleaks/live流程。预期影响为已观察状态数值与结束时点一致，不承诺整局胜率提升。回退只逆向各独立源码提交，保留经验、证据、刷新数据和其他角色；本任务不改源码、不登记implemented/shipped。\n'
        path=O/('proposal-'+name+'.md');path.write_text(text)
        item=dict(character='silent',ledger=ledgers,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary={'infection':'核感染持牌伤先于毒结算和毒药非即时伤覆盖','calendar':'核历石与毒联合结束上界，避免单源不足即判死','resources':'核静默实际资源与预测分账，未执行路线/药水反事实保持未知','mechanisms':'核蜃景/污染即时血价与坚韧之环施放快照及增益分源'}[name],proposal=str(path.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        value=cli('code_proposals.py','add',item)
        try: ident=json.loads(value)['id']
        except (ValueError,TypeError,KeyError): ident=value.splitlines()[-1]
        ids.append(ident)
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(ids)
elif sys.argv[1]=='finalize':
    mapping=json.load(open(O/'ledger-map.json'));commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
    groups={}
    for eid,idents in mapping.items():
        for ident in idents:groups.setdefault(ident,[]).append(eid)
    for ident,eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='本批经验源提交已完成；经验数据发布与独立策略源码实现分开，实际shipped由运维核验登记。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n')
    print('proposed',list(groups))
