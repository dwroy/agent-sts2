import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');N='LYBHQ1X230ZB'
mapping={
 'silent-strength-weak-observation':['silent-0012'], 'silent-footwork-block':['silent-0005'],
 'silent-vambrace-opening-block':['silent-0013'], 'silent-shadowmeld-new-block-double':['silent-0077'],
 'silent-obscura-summon-growth':['silent-0039'], 'silent-vajra-opening-strength':['silent-0049'],
 'silent-burst-next-skills-replay':['silent-0115'], 'silent-slumbering-beetle-wake-growth':['silent-0128'],
 'silent-bowlbug-rock-full-block-stun':['silent-0196'], 'silent-hunter-tender-card-attributes':['silent-0232'],
 'silent-haze-group-poison-weak':['silent-0007'], 'silent-eternal-feather-rest-arrival-heal':['silent-0142'],
 'silent-act-transition-missing-hp-heal':['silent-0243'], 'silent-rest-buffer-observation':['silent-0020'],
 'silent-route-hp-observation':['silent-0019'], 'silent-deck-burst-observation':['silent-0021']}
locations={'silent-0012':(30,1),'silent-0005':(30,2),'silent-0013':(30,2),'silent-0077':(29,3),'silent-0039':(30,2),'silent-0049':(30,1),'silent-0115':(23,1),'silent-0128':(29,6),'silent-0196':(29,3),'silent-0232':(22,2),'silent-0007':(30,2),'silent-0142':(28,None),'silent-0243':(18,None),'silent-0020':(28,None),'silent-0019':(30,1),'silent-0021':(29,6)}
def cli(tool,cmd,data):
    args=['nice','-n','19','python3',str(ROOT/'learner'/tool),cmd]
    if tool=='code_proposals.py':args+=['--character','silent']
    p=subprocess.run(args,input=json.dumps(data,ensure_ascii=False)+'\n',capture_output=True,text=True)
    with (O/(tool+'.'+cmd+'.log')).open('a') as h:h.write(p.stdout+p.stderr)
    if p.returncode:raise RuntimeError(p.stdout+p.stderr)
    return p.stdout.strip()
groups={}
for eid,ids in mapping.items():
    for ident in ids:groups.setdefault(ident,[]).append(eid)
if sys.argv[1]=='prepare':
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/ledger.py'),'fold'],capture_output=True,text=True,check=True)
    L={r['id']:r for r in json.loads(p.stdout)}
    for ident,eids in groups.items():
        item=dict(id=ident,by='learner:experience-update',where=dict(experience=eids),note='第99批提交前经验补证关联；来源LYBHQ1X230ZB实帧和14:01勘误，保留首证/prior/claim/support/repeat和旧上线历史，提交后登记proposed。')
        if N not in {e['run'] for e in L[ident]['evidence']}:
            f,t=locations[ident];ev=dict(run=N,floor=f,role='support',note='本角色实帧复核支持'+','.join(eids)+'；详细历史分阶、血档、机制和四次无赢SL见20261008-140852报告，局部机制不冒称整场反事实胜因。')
            if t is not None:ev['turn']=t
            item['evidence']=[ev]
        cli('ledger.py','update',item)
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n');(O/'ledger-added.json').write_text('[]\n')
    print('已关联账本',len(groups))
elif sys.argv[1]=='proposals':
    C=json.load(open(O/'changes.json'))['entries']
    groupspec=[
      ('modifiers',['combat'],['silent-strength-weak-observation','silent-footwork-block','silent-vambrace-opening-block','silent-shadowmeld-new-block-double','silent-vajra-opening-strength','silent-hunter-tender-card-attributes']),
      ('poison-spawn',['combat','sl'],['silent-obscura-summon-growth','silent-burst-next-skills-replay','silent-haze-group-poison-weak']),
      ('enemy-windows',['combat','sl'],['silent-slumbering-beetle-wake-growth','silent-bowlbug-rock-full-block-stun']),
      ('resources',['combat','potion','sl','terminal'],['silent-eternal-feather-rest-arrival-heal','silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation'])]
    targets={
      'modifiers':'核已观察普通/升级步法、臂甲首次挡、融入暗影后续牌挡、金刚杵逐段力量、柔嫩逐牌属性变化是否已被当前live完整消费；已有实现登记实际祖先或明确waiting。只修核实的漏模，未知脆弱/叠加/自动出牌交互保持边界，不把6额外挡当整场获胜承诺。',
      'poison-spawn':'核爆发重放迷雾的各次施毒/虚弱、结束毒、活体召唤新增血与两敌攻击，未执行结算不能记已伤。四次同序重打无赢次，只保留真正必死判据；未知抽牌/复活/航行不从本局补公式或拟新SL触发门槛。',
      'enemy-windows':'核石虫完整吸挡后眩晕与甲虫醒后成长、虚弱乘区和后续轮血价，另一敌打掉血不阻石虫已见眩晕。不能把一次零损/眩晕当后续安全或设固定击杀序；仅已观察silent进阶保持证据范围。',
      'resources':'核战斗获胜终局价值是否保留实际出口HP/药水并关联下一房危险；F29T6两候选损18/伤31/留4/8样本全赢与损12/伤22/留10/7胜8试，只证实前者实损18且下一轮胜、后场以4血死。先保存两线候选与实际出口资源和后场联系，独立实现任务有完整同盘证据后再拟权重；无另一线整场胜负，保留现终局权重、药水持有价值和SL门槛。羽毛到火、休息、五轮书、先古与SL恢复分账，不预支未到营火。'}
    common='''来源任务：experience-update / 20261008-140852；实现任务：独立strategy-proposal。角色silent；策略只本次已观察A10，机制分阶支持/反例完整列表见update-summary.json与changes.json。本任务不改打法源码、不登记implemented/shipped。Roy-2026-10-07-learning授权不提供游戏事实，其他角色和未观察策略进阶保持等价。

证据：LYBHQ1X230ZB A10 F30败，runs.code=5925a43d+dirty，完整dirty源码快照缺失；当前源码只作缺口定位，不声称逐字复原运行树。按局号重抽455决策/28实际Codex脑请求/5SL记录，seek取478本角色帧，DeepSeek窗0；按14:01勘误，F29T3技能药首次离栏UTC=05:22:14.174Z，末战幻象15/21、母体87/129。历史129局重算与上批七数组、血档/节点后战、实回复及SL逐行一致；总130完局只用于本角色学习观察，不能冒充纯Codex爬塔成绩。

机制：F29T1臂甲生存者8→16已消费；T3技能药真实生成暗影、步法+建3敏，两普通防御各(5+3)×2=16合32盖29；两次翻倍来自暗影而非臂甲再次触发。F30T2首次防御16比零敏首次10多6，4血+16挡恰等20攻会死，严格存活差1血。F30T1金刚杵1力使背刺12/打击7/匕首雨5×2合29直伤，漏斗毒4另计，母体129→96；随后召21血幻象，下一轮17+11=28被迷雾+弱至12+8=20。毒分别6/9，只末次结15毒，仍幻象15/母体87。前三判死截断没有结毒、退出帧或实死。四试已执行牌序相同，无explore换线及赢次，不能称运气或提出先杀谁。

F23T1爆发1层使迷雾+重放两次各6毒，母体4→16毒/弱4、层消耗，结束实扣16。F22柔嫩使三攻后力量0→-1→-2→-3、敏3→2→1→0；次轮敏恢复3，T5精确切击后防御7+生存者9=16挡盖14。F29石虫T1攻击16被16挡吸收、T2眩晕，T3合29被32挡覆盖、T4石再眩晕；甲虫醒后0力18攻中和降13，T4/5/6力2/4/6弱后15/16/18，T6零挡损18。

资源：前13战房已赢，净损187；四次休息各21、五轮书20、先古16、羽毛15，实回135，56+135-187-4=0，净损不是敌人总伤。F17异鱼赢29血，五轮书先回20至49；F18再⌊21×0.8⌋=16至65。F22胜65→36/F23胜36→6，F24休息6→27，F28牌组25羽毛27→42后锻造中和无休息回血；F29带技能药赢42→4/空药，F30四试均4/70空药。独立12瓶=初始2/普通奖励5/商店2/事件3，9饮/3主动弃污浊，SL未恢复已喝瓶或增加饮数。F29T6Jev置信0.96选损18/伤31、下轮8/8赢候选，实损18且T7赢；另一损12/伤22留10、7/8赢候选未实打，不能写6血差可保证过末战。F28脑原文依赖后续回血，F29赢后脑已更新F30投影4，不说脑仍按32进场。F31后未实到。

拟合与验证：历史129局时间前置核验、本局留出；同场四试按局/房分组，不能当四独立局。独立实现先查实际live祖先已有修复，再以本批固定帧核动作前后/状态边界与消费，若涉及权重需补完整候选/同盘执行资源及时间留出，不拟合本次单败。当前获胜终局血价的资源记录可以核验，另一线/休息/留药/改路线整场结局未记录，证据不足就保留原行为并waiting。

限制：本局未实打逃脱计划，其模型缺口silent-0296已有独立PM提案与LRN/T082实证，不重复将本局未执行抽牌认机制支持；未知抽序需边界后重问，不保证补模后能赢。完整dirty源码、前三退出及结算、重复敌ID持久身份、卵退场完整逐击毛伤、替代目标序/路线/留药/锻造整场结局、未到F31后资源与完整boss时钟均缺失。

预期影响：仅核实模型与实际资源链，避免把单场预测全赢称后场安全，不承诺获胜率改善。回退：独立实现只逆向该源码提交，保留经验/日志/刷新。实现后固定沙箱测试、gitleaks、锁内刷新/预检/合后测试与Roy旧新规则双通知照协议；经验数据发布不代表提案实现。
'''
    ids=[]
    for name,domains,eids in groupspec:
        ledgers=list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        text='# 静默猎手经验代码提案：'+name+'\n\n'+common+'\n旧规则/新行为：'+targets[name]+'\n\n账本：'+','.join(ledgers)+'；经验：'+','.join(eids)+'。\n\n'
        text+=''.join('- '+c['id']+'；asc='+str(c['after']['asc'])+'；支持/反例='+str(c['after']['n_support'])+'/'+str(c['after']['n_contradict'])+'；'+c['after']['lesson']+'\n' for c in C if c['id'] in eids)
        path=O/('proposal-'+name+'.md');path.write_text(text)
        item=dict(character='silent',ledger=ledgers,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=targets[name],proposal=str(path.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        result=cli('code_proposals.py','add',item)
        try:ident=json.loads(result)['id']
        except (ValueError,TypeError,KeyError):ident=result.splitlines()[-1]
        assert ident.startswith('silent-proposal-'),result
        ids.append(ident)
    assert set(mapping)=={eid for _,_,eids in groupspec for eid in eids}
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print(ids)
elif sys.argv[1]=='finalize':
    commit=(O/'source-commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
    for ident,eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第99批源提交完成，原首证/先验/claim/evidence/repeat及旧上线历史保持；实际shipped由运维核live，经验发布不当代码实现。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n');print('已登记proposed',len(groups))
