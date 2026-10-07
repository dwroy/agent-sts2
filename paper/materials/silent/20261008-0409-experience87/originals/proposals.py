import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O/'changes.json'))
L = {r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
mapping = {
    'silent-strength-weak-observation':['silent-0006'],
    'silent-footwork-block':['silent-0005'],
    'silent-gorget-plating':['silent-0016'],
    'silent-route-hp-observation':['silent-0019'],
    'silent-rest-buffer-observation':['silent-0020'],
    'silent-deck-burst-observation':['silent-0021','silent-0057'],
    'silent-noxious-fumes-growth':['silent-0011'],
    'silent-frail-card-block':['silent-0013','silent-0069'],
    'silent-accelerant-triggers':['silent-0027'],
    'silent-piercing-wail-temporary-strength':['silent-0046'],
    'silent-wither-end-turn-loss':['silent-0024'],
    'silent-kin-poison-sl-observation':['silent-0009'],
    'silent-queen-poison-main-target':['silent-0090'],
    'silent-queen-poison-window-sl-observation':['silent-0079'],
    'silent-nightmare-next-turn-copies':['silent-0140'],
    'silent-sturdy-clamp-retention-cap':['silent-0095'],
    'silent-whispering-earring-first-turn-control':['silent-0164'],
    'silent-slumbering-beetle-wake-growth':['silent-0128'],
    'silent-bowlbug-rock-full-block-stun':['silent-0196'],
    'silent-survivor-neutralize-discard':['silent-0205'],
    'silent-dark-shackles-temporary-strength':['silent-0241'],
}
assert set(mapping)==set(C['updated'])
pre={}
for c in C['entries']:
    e=c['after']
    for lid in mapping[e['id']]:
        row=pre.setdefault(lid,dict(id=lid,by='learner:experience-update',where={'experience':[]},evidence=[],note='第87批经验提案预关联，保持首证/prior/原claim/repeat/全部上线历史；经验与独立源码实现分开。'))
        row['where']['experience'].append(e['id'])
        known={x['run'] for x in L[lid]['evidence']}|{x['run'] for x in row['evidence']}
        for run in e['evidence']:
            if run in known:continue
            new=dict(run=run,role='support',note='本角色历史复盘及实帧复算支持对应经验主题；子分母/进阶/限制见'+e['id']+'和本批mechanism-evidence.json；局部效果不认整战胜因。')
            if run=='BTSRF7JL1W1Y':new.update(floor=31,turn=2,note='F17胜试T5三敏两防御16挡；F31T2弃唯一突然一拳，实损14而候选4，临时减力/覆甲/毒及醒虫成长分账；本条具体支持见'+e['id']+'。')
            if run=='XTSV1U9JD34T':new.update(floor=49,turn=4,note='F48T8的54毒三结潜在159截132、先凋萎耗9；F49六败，末T4夜魇未到复制、三敏脆弱防御6/尖啸后16，需损10而只1血；具体主题见'+e['id']+'。')
            row['evidence'].append(new);known.add(run)
for row in pre.values():
    if not row['evidence']:row.pop('evidence')
payload=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in pre.values())
(O/'ledger-prelink-input.jsonl').write_text(payload)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
(O/'ledger-prelink.log').write_text(p.stdout+p.stderr)
assert p.returncode==0,p.stderr
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
shared='''仅静默猎手，新增证据均A10；基础机制按各条已核实进阶，不外推未观察组合/角色。
来源任务experience-update/20261008-033315，第87次；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据BTSRF7JL1W1Y F17四试、F30/F31；XTSV1U9JD34T F33两试、F48T8/F49六试。原始日志状态/决策、字节偏移、facts/audit、before及历史复盘段保存在本scratch；完整逐条支持/反例/进阶见changes及mechanism-evidence。
拟合/切分：旧113静默完局逐局重新抽算，与前批七数组、全部血档、节点转移、回血及SL逐行一致；两局为新增验证，切点2026-10-07T19:05:16.706Z，共115静默完局。无自由参数或boss模拟池；两局原dirty完整树未知，不用当前源码冒认历史运行树。没有整场受控替代胜线，不以预训练补机制或放宽必死/SL门槛。
验证：独立实现冻结本角色已观察实帧；固定回放核实际弃牌/增益/用药/目标/持牌伤/下一轮到手。保留其他角色及未观察边界等价，跑原sandbox tsc/vitest。已实现的子项只有核真实live祖先源码commit才duplicate；证据不足waiting并保留现有策略。
回退：独立源码实现逆向恢复实际上线前规则、保留并行刷新；经验逆向本批单文件源差异。实际上线后Roy双通知旧/新规则、局号/账本/任务/影响与回退。本经验任务只登记提案pending，不改源码或冒称implemented/shipped。
'''
replay=['silent-deck-burst-observation','silent-survivor-neutralize-discard','silent-kin-poison-sl-observation','silent-queen-poison-main-target','silent-queen-poison-window-sl-observation','silent-nightmare-next-turn-copies','silent-wither-end-turn-loss','silent-whispering-earring-first-turn-control']
resources=['silent-route-hp-observation','silent-rest-buffer-observation']
mechanisms=[eid for eid in mapping if eid not in replay+resources]
groups=[
 ('replay',replay,['combat','sl','terminal'],'强制弃牌后候选重核、毒胜保血候选及夜魇/接管首轮兑现边界', '''
旧/新行为：B F31T2原生存者后突然一拳计划13伤/损4/杀丝，实际强制弃唯一后继牌、净扣8且损14，35→21。普通单弃标记与绷带补挡耦合根因已有0268，本批只补该子项的重复数据，不新增固定保留/击杀序。
X F48T8已可毒胜，手仍有防御/触不可及/手上技法且5能量，求解器winsFight立即停止扩展、自动首胜线结束，凋萎实耗9后32→23入连战。旧0213为存活结算、0271为存活时搜索漏保血候选，不能混作同一已修根因；独立回放验证这些合法候选对当轮剩血的实际差额，不断言F49可赢，不在本任务改搜索边界。
X女王末T4夜魇建立3复制标记、次轮未到便死；第2/4次T3猎杀者31净扣与药瓶32的差额都仍损22、T4挡9与6均不足16，后续抽牌亦变。B同族四试第四胜T13、T3/T6退两信徒，但后轮路线/抽牌同变。SL重打统计与局部收益分账，缺完整同条件对照不设能力优先/击杀顺序/SL新门槛。
X耳环首题接管后只进阶之灾不可打、仍3能量，中间接管动作未知；不能让agent主动选择已被接管的启动或预支前战能力。预期：候选必须可实际执行、终局资源不能跳过持牌血价/保血候选；胜率提升未知。
'''),
 ('resources',resources,['sl','terminal'],'赢战血价、真实回复与存档恢复接续，连王剩血按实到资源', '''
旧/新行为：B F30赢战70→42并耗明晰、F31入42与液态记忆、F32未到；两火42/事件78/幕间37/SL199分账。X F47回满97，F48虽赢仍97→23净损74、无恢复直F49；七火160/五轮书40/蘑菇20/幕间76与SL146分源，9独立获得、15饮含6同瓶SL重放，不当15新药。
路线/休息/商店/普通事件按实际入血档关联下一更高层首战，A10各幕各房型全部表留audit，A8一/A9三独立分阶；没有同条件改线、留药或锻造胜负对照，不设新阈值。独立实现只审计题面/终局/SL恢复的资源接续，预期消除预支未来火和重复计获药，获胜影响未知。
'''),
 ('mechanisms',mechanisms,['combat','potion'],'敏捷/脆弱/覆甲分源、毒与临时减力时点及留挡上限按实帧核', '''
旧/新行为：B同族胜试T5步法+三敏使两防御各8、16挡仍损6；F31没有继承前战敏捷。T2镣铐令石虫16→7，中和令甲虫18→13，牌13+覆甲3盖石7而其他敌仍损14、下轮石眩晕；末覆甲1+后空翻5对22攻，毒4后甲虫17→13仍存活。
X沙漏T8触媒+2、54毒三结159按132敌血截断，凋萎9先扣，不能把力量或整轮159净伤都归毒。女王未继承前场毒雾/触媒/敏捷；末T3步法后累计3敏不补旧5挡，末T4脆弱防御6；尖啸令聚合体力1→−5、25→16攻，但1血+6挡仍致死。
幽灵六试均T1喝、现场无实体1令26→1，16挡覆盖且钳子带10到T2；T2末21抵16仅留5到T3、27攻实损22。只核已饮效果、逐牌/留挡与模型，未有延后饮药胜线，不定喝药/留药门槛。旧历史卡牌机制及本批子窗口分母见mechanism-evidence，不外推全部增益组合。
预期：按实建增益与当前牌逐项兑现，临时降力和敌成长不跨轮混算、留挡上限不作每轮保底；无整场受控胜因。
'''),
]
ids=[]
for name,eids,domains,summary,body in groups:
    lids=sorted({l for eid in eids for l in mapping[eid]})
    if name=='replay':lids+=['silent-0268','silent-0271']
    path=O/f'proposal-{name}.md'
    path.write_text('# 静默猎手第87批：'+summary+'\n\n账本：'+','.join(lids)+'。\n经验：'+','.join(eids)+'。\n\n'+shared+body)
    row=dict(character='silent',ledger=lids,runs=['BTSRF7JL1W1Y','XTSV1U9JD34T'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
    p=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True)
    (O/f'proposal-{name}-cli.log').write_text(p.stdout+p.stderr)
    assert p.returncode==0,p.stderr
    pid=p.stdout.strip();assert pid.startswith('silent-proposal-'),pid
    ids.append(pid);print(name,pid)
(O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
