import json,subprocess,sys
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='T0DGVABPV60U'
C=json.load(open(O/'changes.json'))['entries']
mapping={
 'silent-strength-weak-observation':['silent-0012'], 'silent-footwork-block':['silent-0005'],
 'silent-helical-dart-shiv-dexterity':['silent-0104','silent-0105'],
 'silent-rolling-boulder-start-growth':['silent-0094'], 'silent-speedster-draw-damage':['silent-0045'],
 'silent-iron-club-four-card-draw':['silent-0122'], 'silent-gorget-plating':['silent-0016'],
 'silent-tungsten-rod-hp-loss-observation':['silent-0178'],
 'silent-test-subject-phase-reset':['silent-0028','silent-0079'],
 'silent-dexterity-potion-card-block':['silent-0276'], 'silent-regen-potion-decay-heal':['silent-0259'],
 'silent-act-transition-missing-hp-heal':['silent-0243'], 'silent-rest-buffer-observation':['silent-0020'],
 'silent-route-hp-observation':['silent-0019'], 'silent-deck-burst-observation':['silent-0021'],
 'silent-alchemize-potion-resource-observation':['silent-0125']}
def cli(tool,cmd,data):
    args=['python3',str(ROOT/'learner'/tool),cmd]
    if tool=='code_proposals.py':args+=['--character','silent']
    p=subprocess.run(args,input=json.dumps(data,ensure_ascii=False)+'\n',capture_output=True,text=True)
    with (O/(tool+'.'+cmd+'.log')).open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
    return p.stdout.strip()
if sys.argv[1]=='prepare':
    added=[]
    c=next(c for c in C if c['before'] is None);ev=c['after']['evidence']
    al=json.load(open(O/'historical-alchemize.json'))
    evidence=[]
    for run in ev:
        r=next(r for r in al if r['run']==run)
        evidence.append(dict(run=run,floor=r['floor'],turn=r['turn'],role='support',note='实际炼制前后空槽净添一瓶、HP未变化；该局全部逐次记录在historical-alchemize.json。T0的HP护栏取舍另关联0125，支持机制不等支持保药胜率。'))
    item=dict(character='silent',by='learner:experience-update',kind='card',claim='炼制在有空槽的五局27次实际执行中各净添一瓶，动作前后HP未变；真正实打补药和护栏放弃补药分账。产物效用须按实际药水核，持有稳定血清不能当即时回血/挡；护栏血价对照只有T0一局且抽弃同变，不拟价格或整战胜率。',evidence=evidence,first_run=ev[0],prior='unknown',prior_note='逐局回查此前没有实际ALCHEMIZE执行可比窗口，ZE8F192FKX24为本角色最早可核实执行；不把已持有或购牌意图当正确机制消费。',status='observed',where=dict(experience=[c['id']],lessons=[N]))
    value=cli('ledger.py','add',item)
    try:ident=json.loads(value)['id']
    except (ValueError,TypeError,KeyError):ident=value.splitlines()[-1]
    assert ident.startswith('silent-') and len(ident)<30,value
    added.append(ident);mapping[c['id']].append(ident)
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],capture_output=True,text=True,check=True);L={r['id']:r for r in json.loads(p.stdout)}
    for c in C:
        for ident in mapping[c['id']]:
            existing={e['run'] for e in L[ident]['evidence']}
            ev=[dict(run=r,role='support',note='本批本角色实帧/复盘复核支持'+c['id']+'；逐回合、血档及SL数据在20261008-130540审计，观察与整战因果分开。') for r in c['new_runs'] if r not in existing]
            if ident=='silent-0125':ev=[e for e in ev if e['run']==N]
            item=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id']]),note='第97批经验提交前关联；保留首证/prior/claim/支持与重犯及既往上线历史，源提交后登记proposed。')
            if ev:item['evidence']=ev
            cli('ledger.py','update',item)
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text(json.dumps(added)+'\n');print(added)
elif sys.argv[1]=='proposals':
    mapping=json.load(open(O/'ledger-map.json'))
    groups=[
      ('dexterity',['combat'],['silent-strength-weak-observation','silent-footwork-block','silent-helical-dart-shiv-dexterity','silent-gorget-plating','silent-tungsten-rod-hp-loss-observation']),
      ('draw-growth',['combat'],['silent-speedster-draw-damage','silent-iron-club-four-card-draw','silent-rolling-boulder-start-growth']),
      ('phase-sl',['combat','sl'],['silent-test-subject-phase-reset']),
      ('resources',['combat','potion','sl','terminal'],['silent-alchemize-potion-resource-observation','silent-dexterity-potion-card-block','silent-regen-potion-decay-heal','silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation'])]
    common='''来源任务：experience-update / 20261008-130540；实现任务：独立strategy-proposal。角色仅silent；已观察策略限A10，机制验证进阶与支持/反例详见changes.json及本提案条目。授权Roy-2026-10-07-learning不提供游戏事实。本任务只改经验，未改打法源码，不登记implemented/shipped。

来源：本局T0DGVABPV60U SILENT/A10/48败，code261af56e+dirty完整dirty源码未保存。1071决策、1116帧、12条SL与46个实际Codex脑请求均重新抽取，deepseek窗零行。旧127完局七数组、全血档/节点转移、回复与SL完全重算一致；历史只取同角色，支持按局去重，同局尝试不当独立样本。

螺线飞镖：75X1BARMNZ03 A6和新局A10共101次小刀，敏捷与HELICAL_DART_POWER逐张各+1；新局末F48T2四刀0→4、次轮两项消失，T4小刀3→4后偏折8、防御+12。遗物同线贡献各1共2；原报15至实20还有重问换升级牌+3，不能全归遗物。T3步法+建立永久3；末T5再建2、三刀临时3共8敏，仍无挡牌/0挡，16血对11×4经棍逐击减1完整需40死，存活严格差25。修模型不承诺本局可赢。普通/升级小刀已观察，重放/自动出牌与未见其他交互保持原逻辑。

滚石：末T1建5，T2—5触发5/10/15/20，15在二阶段212→197；死前25未触发。速行者T2实建2，T3步法+附魔抽2使13→9额外4，T4偏折触发铁棒抽1使184→182额外2；非牌面攻击，不与毒/攻击重复相加。历史铁棒SADL3CGYTGSR第4/8/24牌额外抽1，计数跨轮；旧KAY522KT5NXR后空翻对无实体两次触发合2，仅独立单目标，不外推多体总收益。

实验体：末T3杂技/咕嘟冒泡/刀刃之舞/肾上腺素令敌力0→3→6→9→12，能力步法+不加；阶段转换清敌力/激怒/11毒，玩家已建能力保留。本局六试全败、五次判死未执行结算不算五次实死。首/末T2同38血/敌86/同手牌，Jev首末原选扫腿；末SL改速行者并在铁棒抽后又删扫腿，原话“every untried line dies more often in the rollout; the pick is known to fail”。首试扫腿当轮零损、末0挡损12；净扣23→43伴随狡诈时点变化，后续抽弃亦变，不认12血为整战单因或凭全败判更安全。前五出口/末结算缺失，原线完整赢战反事实缺失；真正必死才读档门槛保留。

炼制：五局27实际执行，空槽净添一瓶、动作前后HP不变；ZE8F192FKX24 A5、6EV5V6PJJS9D A6、VLV17NUSFS61/7ZUC4VPMDS41 A7和新局A10。新F35T2生成速度、F45T3稳定血清、F46T2虚弱、F48第五试T4稳定血清。F48第3/5试T4同38HP/197敌血/同手，护栏原含炼制损17伤13→挡线损10伤13；另次重问单炼制损21→抽挡损10伤9。前试实际本轮损5无补药，后试SL撤护栏实炼制、损15，T5携血清23HP0挡判死。后续抽弃同变、10HP差不是单牌价。血清文本保留手牌，非立即挡/回复；未实用该瓶不能认可救命，随机产物未知不得预选。共10次护栏记录/9次最终按护栏，不累计重问候选差为独立实盘节血。

资源链：F5赢49→14；F7/9/12三火至70；F28千足虫赢39→1，F29回22、F31赢22→20、F32回41、F33沙虫赢41→13，跨幕按缺失HP80%回58。F37大蘑菇41/70→61/90，F38事件扣11到50，F40火回77；F43胜损14、F44买再生/无色，F45赢63→51含再生15回复与27失血，F46精英又51→13、药用尽，奖励狡诈/枕头；F47回55=27+15，F48仍败。九回血/一锻造，未走其他路线/未锻造牌的受控结果未知。独立药水18瓶含第5试炼制1瓶随后SL撤销，最终路径17瓶/17饮；原22饮含5撤销，SL恢复原瓶不算新获药或回血。新局未实到F49，不给连续Boss交接条目追加支持，不拟终局权重。

验证/拟合：旧127局是时间前置机制/观察验证集，T0是新增时间后置实证；同局六试同组，不能宣称独立盲测或赢率提升。先核现live祖先是否已有相同机制实现避免重复；固定本批原帧、牌序、已知抽牌与种子20260929验证同线模型、临时量次轮清除及换阶段。缺完整dirty源码、SL截断末结算、未知未来抽牌/随机产物和原线完整胜局，不调HP护栏8点容许、药水持有值、探索/必死门槛或终局权重。参数拟合须以局分组、按时间留出验证，并同时报告候选与实际执行/重规划；证据不足waiting，保留原行为。其他角色及未观察进阶策略保持等价。预期只改善已见机制与来源追踪，不保证转胜。回退只逆向独立实现的源码提交，经验/日志/刷新历史保留；原沙箱测试、gitleaks、锁内刷新预检/合后测试与上线双通知照执行。
'''
    targets={
      'dexterity':'旧/新行为：当前只读复盘定位入口敏捷能读对，但螺线新触发/次轮清除未传播。独立核combat-plan/turn-solver按已见每刀新建1临时敏捷，供后继挡牌兑现；rollout次轮扣HELICAL_DART_POWER而保留步法永久敏捷。原已有挡/覆甲分源，钨棍逐次HP损失减1只补当前遗漏的已见组合；未知组合不变。',
      'draw-growth':'旧/新行为：先核已有铁棒计数/速行者抽牌触发和滚石轮初实现；若未覆盖，只按已见时点与来源传递新增牌/群伤，不把偏折或能力牌本身标为攻击，不预支未触发滚石/未知未来抽牌。无实体单次上限已见，多体/重放/自动触发未隔离则保留。',
      'phase-sl':'旧/新行为：保留真正必死才读档。对同盘饱和全败探索，独立审计原答→护栏→SL→抽牌重问→实际行动；核扫腿虚弱/挡、临时敏捷、技能激怒/阶段重置的即时血价。现只有局部差额，缺原线整战胜利，探索评分/血价权重不据此直接改，先记录候选与实际资源再等待固定完整对照。',
      'resources':'旧/新行为：炼制的实际生成、未执行机会和持药价值分账；检查护栏替换能否明确列出失去的补药窗口及未知随机产物。当前HP护栏/留药/终局价值阈值保持；先用已知候选固定数据核机制和两战联合入血/药水重置，缺后战/替代整场胜线不能调参数。九休息仍败不推锻造更好，低模拟胜率不触发必死。'}
    ids=[]
    for name,domains,eids in groups:
        ledgers=list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        if name=='dexterity':ledgers+=['silent-0293']
        runs=list(dict.fromkeys(r for c in C if c['id'] in eids for r in c['new_runs']))
        text='# 静默猎手经验代码提案：'+name+'\n\n'+common+'\n账本：'+','.join(ledgers)+'。经验：'+','.join(eids)+'。\n\n'+targets[name]+'\n\n条目及适用边界：\n'+''.join('- '+c['id']+'，asc='+str(c['after']['asc'])+'：'+c['after']['lesson']+'\n' for c in C if c['id'] in eids)
        path=O/('proposal-'+name+'.md');path.write_text(text)
        item=dict(character='silent',ledger=ledgers,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=targets[name][:160],proposal=str(path.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        value=cli('code_proposals.py','add',item)
        try:ident=json.loads(value)['id']
        except (ValueError,TypeError,KeyError):ident=value.splitlines()[-1]
        ids.append(ident)
    assert {c['id'] for c in C}=={eid for _,_,eids in groups for eid in eids}
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print(ids)
elif sys.argv[1]=='finalize':
    mapping=json.load(open(O/'ledger-map.json'));commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
    groups={}
    for eid,idents in mapping.items():
        for ident in idents:groups.setdefault(ident,[]).append(eid)
    for ident,eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第97批源提交完成；保留首证/prior/claim/support/repeat和旧上线历史，经验发布与策略实现分账，shipped交运维据实际live版本登记。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n');print(list(groups))
