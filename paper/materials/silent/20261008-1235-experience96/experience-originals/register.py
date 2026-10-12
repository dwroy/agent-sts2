import json, subprocess, sys
from pathlib import Path
O=Path(__file__).parent; ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries']
mapping={
 'silent-strength-weak-observation':['silent-0012'], 'silent-footwork-block':['silent-0005'],
 'silent-kunai-attack-count-dexterity':['silent-0085'], 'silent-frail-card-block':['silent-0069'],
 'silent-afterimage-per-card-block':['silent-0023'], 'silent-rolling-boulder-start-growth':['silent-0094'],
 'silent-accuracy-shiv-scaling':['silent-0054'], 'silent-permafrost-first-power-block':['silent-0173'],
 'silent-test-subject-phase-reset':['silent-0028'], 'silent-queen-poison-main-target':['silent-0069'],
 'silent-queen-poison-window-sl-observation':['silent-0079'], 'silent-dexterity-potion-card-block':['silent-0276'],
 'silent-regen-potion-decay-heal':['silent-0259'], 'silent-act-transition-missing-hp-heal':['silent-0243'],
 'silent-rest-buffer-observation':['silent-0020'], 'silent-route-hp-observation':['silent-0019'],
 'silent-deck-burst-observation':['silent-0021'], 'silent-battle-trance-draw-lock':['silent-0292'],
 'silent-double-boss-resource-handoff':['silent-0228']}
def cli(tool,command,data):
    args=['python3',str(ROOT/'learner'/tool),command]
    if tool=='code_proposals.py':args+=['--character','silent']
    p=subprocess.run(args,input=json.dumps(data,ensure_ascii=False)+'\n',capture_output=True,text=True)
    with (O/(tool+'.'+command+'.log')).open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
    return p.stdout.strip()
if sys.argv[1]=='prepare':
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],capture_output=True,text=True,check=True)
    L={r['id']:r for r in json.loads(p.stdout)}
    for c in C:
        for ident in mapping[c['id']]:
            existing={e['run'] for e in L[ident]['evidence']}
            new=[dict(run=r,role='support',note='本批重新核实本角色日志，经验'+c['id']+'；逐帧/血档/SL对照及限制见20261008-120901报告。') for r in c['new_runs'] if r not in existing]
            item=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id']]),note='提交前关联本批经验来源；保持首证/prior/claim/旧上线历史，提交后再登记proposed。')
            if new:item['evidence']=new
            cli('ledger.py','update',item)
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text('[]\n')
elif sys.argv[1]=='proposals':
    groups=[('trance',['combat','sl'],['silent-battle-trance-draw-lock']),
            ('kunai',['combat'],['silent-kunai-attack-count-dexterity','silent-footwork-block','silent-frail-card-block','silent-strength-weak-observation']),
            ('resources',['combat','potion','sl','terminal'],['silent-double-boss-resource-handoff','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-regen-potion-decay-heal','silent-dexterity-potion-card-block']),
            ('mechanisms',['combat','sl'],['silent-afterimage-per-card-block','silent-rolling-boulder-start-growth','silent-accuracy-shiv-scaling','silent-permafrost-first-power-block','silent-test-subject-phase-reset','silent-queen-poison-main-target','silent-queen-poison-window-sl-observation'])]
    common='''来源任务：experience-update / 20261008-120901；实现任务：独立strategy-proposal。授权：Roy-2026-10-07-learning。角色仅silent，机制只推广实见条件，策略只限已观察A10；普通专注另核A0。完整dirty源码未保存，不能冒认当前源码就是8ef00878+dirty；本任务不改打法源码、不登记implemented/shipped。

新局9R916WW0V65N F49第2试T2专注实添3后NO_DRAW1，步法仍建立2敏却无棋子加抽；原题抽9/伤23/损0长线因禁抽、魂缚、重问未完整执行，实际伤4/损7。LRN0HPZ0FZS1 A0 F35T2先专注3抽、后匕首不抽；JMH5C51RLN4E A10已有13次建立封锁。三局逐次手牌/net_added详见trance-hands.json：凋萎同窗与满手截断不作机制反例，不把净增全归抽牌。

苦无：F49末T1第三攻击0→1敏，步法再到3，实打后空翻8、生存者11，冰晶首次能力7另计；前五试同3敏防御8/重放16，不写成末试出牌。末T2第三刀敏5→6但旧挡仍0，12血对16实死。旧F9PP859XZ3RJ A4和YF0LXT1QSTGG A10已核第三/第六攻击敏捷增长及旧挡不倒补。

F48末试第一阶段T2步法不增敌力，生存者0→3敌力且虚弱意图12→14、防御3→6力且14→16；余像与卡牌挡分源。滚石+T1建10、T2—5为15/20/25/30，后段75不等75独立实伤。三阶段上限111/212/313合636需伤；第3试T15赢，25→12，四药全饮。再生5/4/3/2/1实回15与失血28分列；女王入口12血空药，没有前战余像/滚石/精准/19敏延续。女王末T2精准4、无玩家力量令三刀各8共24，撕咬10另计，敌仍207+361=568。第2试T3六敏/脆弱斗篷+9与闪躲7合16对36仍不足；魂缚只阻部分牌。前五女王与前两实验体没有退出/末结算帧，不补实际死亡。

资源链：机甲68→37（污浊自损12、疑似尾巴出口不能当普通回血6）→组装师37→1→F44回23→问号巨斧23→3→F46花197买再生/能量/明晰→F47回25→实验体胜12→女王六败。新获17瓶、原始23饮、最终路径15饮、两事件交换、主动弃0；七读档恢复HP及原8瓶位另列。F45是Unknown房，不能混到Monster走廊统计。8局F48→F49 HP连续且后场均败，只是观察；无保药/另一线/另一休息的完整胜利对照。F46/47模拟仅56/40样本，不足300，缺选项数字不填0。

拟合与验证：旧126局七数组、全血档/节点后战/SL完全复算一致，加入新1局而不把同局重打当独立样本。首证/进阶/反例及典型案例见changes.json；机制以最早旧局作建立样本，新9R保留作时间后验证。同局多试全部在同一分组。未拟合药水持有价/终局HP权重/SL阈值，其他角色与未观察升级/重放/叠层保持原行为。使用冻结原帧和固定牌序/种子验证；独立任务先核已有live祖先实现避免重复，按原沙箱/gitleaks/live流程；回退只逆向该主题的独立源码提交，保留经验、日志及并行刷新。不承诺整场转胜。
'''
    targets={
      'trance':'旧/新行为：当前模型只在子弹时间建立方案内禁抽，普通专注本轮新建封锁未传播。先核已实现源码，未覆盖时只按普通专注已观察模板，处理自身抽牌后建立禁抽，后继抽牌/棋子加抽不兑现，其他合法效果保留；下一轮清除。升级/重放/其他取牌未知，SL仍守真正必死边界。',
      'kunai':'旧/新行为：当前combat-plan攻击遗物入口及turn-solver攻击计数没有苦无新增敏捷；只核实普通第三/第六攻击触发，向后继牌挡/跨轮传敏，当前已有挡不倒补。已有敏捷算对不等本轮触发已覆盖。不得把不同方案24/26/31挡差全归于苦无。',
      'resources':'旧/新行为：保留已有连续Boss联合模型，核实际HP/药水/复活可观测状态与战斗增益清空。缺复活充能明确未知。当前留药/终局权重/路线评分保持；只先完善审计及固定两战配对验证，证据足够时独立提出参数候选，否则waiting，不因8局全败拟合阈值。',
      'mechanisms':'旧/新行为：独立核余像逐牌、滚石轮初、精准小刀、冰晶一次收益、实验体技能激怒/换阶段和女王减益/魂缚。只补当前源码缺少的已观察传播，不固定杀序。实验体首两试截断、末试胜且后续手牌/出牌同变，不能声称哪项单因转胜；女王没有赢次，不归失败于运气或尚未做过的替代线。'}
    ids=[]
    for name,domains,eids in groups:
        ledgers=list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        if name=='trance':ledgers+=['silent-0290']
        if name=='kunai':ledgers+=['silent-0291']
        runs=list(dict.fromkeys(r for c in C if c['id'] in eids for r in c['new_runs']))
        text='# 静默猎手经验代码提案：'+name+'\n\n'+common+'\n账本：'+','.join(ledgers)+'。经验：'+','.join(eids)+'。\n\n'+targets[name]+'\n\n各条目限定结论：\n'+''.join('- '+c['id']+'：'+c['after']['lesson']+'\n' for c in C if c['id'] in eids)
        path=O/('proposal-'+name+'.md');path.write_text(text)
        item=dict(character='silent',ledger=ledgers,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=targets[name][:160],proposal=str(path.resolve()),experience=eids,rule_changes=name!='resources',authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        value=cli('code_proposals.py','add',item)
        try:ident=json.loads(value)['id']
        except (ValueError,TypeError,KeyError):ident=value.splitlines()[-1]
        ids.append(ident)
    assert {c['id'] for c in C}=={eid for _,_,eids in groups for eid in eids}
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print(ids)
elif sys.argv[1]=='finalize':
    commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
    groups={}
    for eid,idents in mapping.items():
        for ident in idents:groups.setdefault(ident,[]).append(eid)
    for ident,eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='本批经验已提交；首证/prior/claim和旧上线历史保持。经验数据发布与策略代码实现分账，由运维核实实际合入再登记shipped。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n');print(list(groups))
