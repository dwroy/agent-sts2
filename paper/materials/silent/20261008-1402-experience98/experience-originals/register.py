import json,subprocess,sys
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='G8NHLL09DLBX'
C=json.load(open(O/'changes.json'))['entries']
mapping={
 'silent-strength-weak-observation':['silent-0012'],
 'silent-footwork-block':['silent-0005'],
 'silent-bouncing-flask-poison':['silent-0007'],
 'silent-deadly-poison-application':['silent-0007'],
 'silent-poisoned-stab-components':['silent-0007'],
 'silent-piercing-wail-temporary-strength':['silent-0046'],
 'silent-speed-potion-temporary-dexterity':['silent-0253'],
 'silent-giant-explosion-window':['silent-0017'],
 'silent-act-transition-missing-hp-heal':['silent-0243'],
 'silent-rest-buffer-observation':['silent-0020'],
 'silent-route-hp-observation':['silent-0019'],
 'silent-deck-burst-observation':['silent-0021']}
locations={'silent-0012':(17,15),'silent-0005':(24,2),'silent-0007':(24,5),'silent-0046':(24,3),'silent-0253':(23,2),'silent-0017':(17,15),'silent-0243':(18,None),'silent-0020':(16,None),'silent-0019':(24,1),'silent-0021':(24,5)}
def cli(tool,cmd,data):
    args=['python3',str(ROOT/'learner'/tool),cmd]
    if tool=='code_proposals.py':args+=['--character','silent']
    p=subprocess.run(args,input=json.dumps(data,ensure_ascii=False)+'\n',capture_output=True,text=True)
    with (O/(tool+'.'+cmd+'.log')).open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
    return p.stdout.strip()
groups={}
for eid,ids in mapping.items():
    for ident in ids:groups.setdefault(ident,[]).append(eid)
if sys.argv[1]=='prepare':
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],capture_output=True,text=True,check=True)
    L={r['id']:r for r in json.loads(p.stdout)}
    for ident,eids in groups.items():
        item=dict(id=ident,by='learner:experience-update',where=dict(experience=eids),note='第98批提交前补证与经验关联，来源G8NHLL09DLBX实帧/复盘含13:30勘误；保留首证/prior/claim/support/repeat及既往上线历史，提交后登记proposed。')
        if N not in {e['run'] for e in L[ident]['evidence']}:
            floor,turn=locations[ident]
            ev=dict(run=N,floor=floor,role='support',note='逐帧核实支持'+','.join(eids)+'；详细动作、血档与SL对照存20261008-133302任务，局部机制不冒称整战反事实胜因。')
            if turn is not None:ev['turn']=turn
            item['evidence']=[ev]
        cli('ledger.py','update',item)
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text('[]\n')
    print('提交前关联',list(groups))
elif sys.argv[1]=='proposals':
    proposals=[
      ('poison',['combat'],['silent-bouncing-flask-poison','silent-deadly-poison-application','silent-poisoned-stab-components']),
      ('modifiers',['combat','potion'],['silent-strength-weak-observation','silent-footwork-block','silent-piercing-wail-temporary-strength','silent-speed-potion-temporary-dexterity']),
      ('giant-sl',['combat','sl'],['silent-giant-explosion-window']),
      ('resources',['combat','potion','sl'],['silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation'])]
    common='''来源任务：experience-update / 20261008-133302；实现任务：独立strategy-proposal。仅silent；策略仅已观察A10，机制各阶证据见changes.json/历史mechanism-actions。Roy-2026-10-07-learning授权不是游戏事实。本任务只改经验，不改打法源码，不登记implemented或shipped。

来源：G8NHLL09DLBX A10/F24败，runs记录d61bf0ec+dirty，复盘只读live5925a43d定位；完整运行dirty源码缺失，不称当前核对为当时源码逐字重放。726决策/747角色核实帧/6SL/25实际Codex脑请求重抽，DeepSeek推理窗0；旧128静默完局七数组、血档/节点后战、回复与SL全部逐行复算一致。截至2026-10-08T04:56:54.518Z共129完局，只有指定新复盘并经验，其余用于数字与历史验证，不混其他角色或纯Codex爬塔成绩。

已核机制：F24首试T1步法建2敏，T2后空翻7+生存者10合17，比基础多4挡恰盖17。末试未建步法，T2生存者8挡损9；后空翻/攻击/毒选择同变，不把差9全归敏捷。末T3尖啸使三幼虫各力0→−6/攻5→0、母体8→2，合23→2少21；次轮负力消失，玩家易伤下幼虫各7，9挡损10。F23T2带毒刺击在荆棘5下先52→47；速度建5临时敏捷，偏折4→9，25攻击损16，全轮21，次轮撤临时层，不回复之前5血。

随机毒：F24末T5切割幼虫13→7，致命毒药+加7毒不立即杀；母体29血/20毒。药瓶三跳实际给三幼虫各3毒，母体HP与毒不变，最终母体9、幼虫0/9/10，玩家死亡。旧弹跳药瓶经验已说多敌不保证均匀，本批强化不能保证指定目标收尾。原单步核对将最高HP母体三次加毒至29而winsFight=true，不是最坏分配。实际反证确定斩杀，不能据此声称某条替代线可赢。首试T5是判死截断、末轮毒未结，不补造死亡或毒伤。

巨兽：四试均76/76及原速度进场，前三判死截断而非实际三死；末T14本体剩8被8毒结束，T15残壳999999999不是新需清血。突然一拳使DeathBlow56→42，偏折4+防御5合9，34HP−(42−9)=1获胜；打残壳6+8不改原56自爆。前试有4/2/15HP与不同截断轮；药时点、后空翻、换线和抽牌同时改变，无单因胜线。

SL勘误：13条sl_explore是10次replay、2次replacement、1次avoid未替换。第3试T5换串刺题面损同4、伤12→14；第4试T10三防御换后空翻+两防御题面损同13/伤同11，抽牌后重问加中和实际损6，7差额不能归原一次换线。4次真实读档恢复72/74/61/12共219及三次原速度瓶，不计回复/新药。同盘抽序后续未控，胜例只整场观察，不称运气或最优线已执行。

资源：F7回21、F13锻造毒无回复、F16枕头44→76实回32；F17胜1，F18跨幕⌊75×0.8⌋补60至61。F19胜61→54/F20胜54→52，F22花303买步法/药瓶、删精确切击和买速度，未回血。F23以52血/火焰及速度赢到22且空药，F24同22/76空药两试0赢。9瓶独立取得/最终路径9饮，原12饮含三次SL撤销，discard0/交换0；末战不能提出未持有药的使用方案。后置营火未到，F25后资源/其他路线实到未知，不拟留药价格/血线或称换线必胜。本局未到终局，不修改终局权重。

验证及拟合：旧128局为时间前置观察核验，新局为时间后置证据；同局尝试按局分组，不当独立样本。只用本批固定帧/已知牌序作确定与不确定、临时层次轮撤回、毒限伤/剩血、实际血价的核验；先查当前live祖先已实现机制避免重复。参数若需拟合必须增加完整候选/执行结算和同盘整场对照，按局分组、时间留出。缺完整dirty源码、四处截断结算、同帧毒与回复独立事件、重复幼虫持久身份、完整毛伤/死亡首击、替代整战胜线；缺证据留waiting，保留原门槛，不凭预训练补公式或承诺修后转胜。

预期影响：只消除已见的确定斩杀误承诺、核正确已建收益与资源链；其他角色和未观察策略进阶保持等价。回退只逆向独立实现的源码提交，保留经验/日志/刷新；实现后原沙箱入口、gitleaks、锁内刷新/预检/合后测试与Roy旧新规则双通知执行。经验上线不等本提案已实现。
'''
    targets={
      'poison':'旧规则：randomVictim按最高HP选目标并将随机施毒重复落在同一目标，可能触发确定combat/lethal。新行为提案：针对已观察静默普通多敌弹跳药瓶，将未证实分配保留为不确定，只有能够证实随机落点不影响收尾时才给确定斩杀；否则回到正常选线与实际后继帧重规划。施毒不即时扣血、爪牙死不等母体死、荆棘血价与毒结算分别核。升级/重放/未知分配组合未核不外推，其他角色保持等价。独立策略任务有足够数据可按Roy授权实现，不需以人定规则本身转审批。',
      'modifiers':'旧/新行为：先核当前模型是否已正确传递步法每牌收益、速度本轮+5及次轮撤回、尖啸逐段降力/恢复、弱化自爆和荆棘自损。仅补已核机制遗漏，已有挡不倒补、临时敏不当即时HP；无当前缺口则给duplicate或具体waiting，不凭新败局改饮药/留药门槛。',
      'giant-sl':'旧/新行为：保留真正必死才读档。核巨兽本体毒结束后仍进入实际自爆的终局路径，残壳巨量HP不追加为本体需求，弱化与牌挡逐步核当前血价。SL对照记录原答→探索→抽牌重问→实际执行，13探索分类型；不能从单次换线或截断判死拟合胜率，也不把完成本体标为胜。',
      'resources':'旧/新行为：核前战获胜的实际出口血药到下一战入口，分开营火/事件/跨幕回复与SL恢复、原瓶恢复与独立新药、已建能力和仅持有。F23两药后仍损30只支持资源链记录，缺保药或改线整场胜利，先完善可复算候选/实际资源证据，保留留药价值、路线血线及SL参数。本局未到F25或终局，不增terminal领域。'}
    ids=[]
    for name,domains,eids in proposals:
        ledgers=list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        if name=='poison':ledgers.append('silent-0295')
        text='# 静默猎手经验代码提案：'+name+'\n\n'+common+'\n账本：'+','.join(ledgers)+'；经验：'+','.join(eids)+'。\n\n'+targets[name]+'\n\n条目/证据边界：\n'
        text+=''.join('- '+c['id']+'，asc='+str(c['after']['asc'])+'，支持/反例='+str(c['after']['n_support'])+'/'+str(c['after']['n_contradict'])+'：'+c['after']['lesson']+'\n' for c in C if c['id'] in eids)
        path=O/('proposal-'+name+'.md');path.write_text(text)
        item=dict(character='silent',ledger=ledgers,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=targets[name][:210],proposal=str(path.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        result=cli('code_proposals.py','add',item)
        try:ident=json.loads(result)['id']
        except (ValueError,TypeError,KeyError):ident=result.splitlines()[-1]
        ids.append(ident)
    assert {c['id'] for c in C}=={eid for _,_,eids in proposals for eid in eids}
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(ids)
elif sys.argv[1]=='finalize':
    commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
    for ident,eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第98批源提交完成；保留首证/prior/claim/support/repeat和旧上线历史。经验发布与策略实现分账；实际shipped交运维按live版本核实。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n')
    print(list(groups))
