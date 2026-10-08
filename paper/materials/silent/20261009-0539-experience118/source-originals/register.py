import json, subprocess, sys
from pathlib import Path

O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'))
L=list(dict.fromkeys(l for ls in M.values() for l in ls))
def cli(script,args,value):
    stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:h.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
if sys.argv[1]=='prepare':
    B={e['id']:e for e in json.load(open(O/'ledger-before.json'))}
    for lid in L:
        cs=[c for c in C if lid in M[c['id']]]
        fresh=list(dict.fromkeys(r for c in cs for r in c['after']['evidence'] if r not in c['before']['evidence']))
        seen={e['run'] for e in B[lid]['evidence']}
        value=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in cs]),note='第118批经验/提案预关联。J8PHG72DGD90原帧核验与旧153局逐行复算，保留旧首证/prior/status/version/support/repeat；本次不改打法源码、提交后另记proposed。')
        evidence=[dict(run=r,role='support',note='原日志核验：'+','.join(c['id'] for c in cs)+'；层/轮原帧、血档及SL见本任务verified/audit/new-state-facts/historical-mechanism-summary。无替代整场胜线，不拟固定权重或门槛。') for r in fresh if r not in seen]
        if evidence:value['evidence']=evidence
        if lid=='silent-0186':
            value['claim']=B[lid]['claim'].replace('正充能再添火与未知stack不猜数值','输入1的正充能添火已核1→6且不回血，其他正量与上限仍未知')
            value['note']+=' 已核更早ZVYUL2YP3518 F42也1→6/HP80不变；以追加claim纠正正量完全未知，不改原首证/prior。复盘0328重复发现仍observed，不新建重复经验。'
            if 'ZVYUL2YP3518' not in seen:value['evidence']=[*evidence,dict(run='ZVYUL2YP3518',floor=42,role='support',note='旧原帧再次核实KINDLE由1到6、80血不变；date/原决策时间见candle-old-evidence.json。')]
        cli('ledger.py',['update'],value)
    resource=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
    sl=['silent-knowledge-demon-healing-sl-observation','silent-knowledge-demon-sloth-replay-observation','silent-hidden-daggers-discard-shivs','silent-phantom-blades-first-shiv','silent-poison-potion-observed-application']
    mech=[c['id'] for c in C if c['id'] not in resource+sl]
    specs=[('mechanisms',mech,['combat','structure'],'静默属性/能力/遗物分源验收与蜡烛已观察输入1参考'),('resources',resource,['structure','combat','potion','terminal'],'静默实际营火动作与赢战血价、未兑现组件及护栏代价分账'),('sl',sl,['combat','potion','sl'],'静默同盘省血少伤及懒惰生成小刀/药水额度模型一致性')]
    details={
      'mechanisms':'J8PHG72DGD90 A10 F33末试T2步法建2敏并首能力触发永冻冰晶7挡，中和使18→13仍损6；后继防御/后空翻7、偏折6，T12合20挡比基础多6，T13只7挡仍死。T4萎靡普通X3令0→−3力/3弱，13→7对7挡零损；后T5/9/13敌力0/3/6。T11普通尖啸减6力使三击36→18，14挡损4、次轮恢复。本局无先建能力/其他牌序整场胜线，不能指定启动优先级。F29实际蜡烛1→6/HP50不变，后两胜6→5→4，boss六次均4入；旧ZVYUL2YP3518 A10 F42同1→6/HP80不变，原经验已存，并非首次观察。只补已观察输入1营火事实参考/当前充能与回血独立显示，其他输入、上限、交互保持未知；核能量T10受衰朽不当蜡烛熄灭。',
      'resources':'J8PHG72DGD90 A10 F18计划四火零精英，实F25锻造/F27回血/F29添火/F32回血。F30胜50→13、F31两试胜5、F32实回22至27后恶魔六败。全局三HEAL各22合66、三SMITH一KINDLE，事件9/再生3/草莓7/跨幕46/SL恢复130分别计；未到节点不预支。F29添火后投影boss50实27，F30实损37较模型中位11多26、F31实损8少3，两场合多23，但卡组/节点变化不能省略。F9T3护栏预测由损10伤18变损0伤9，替线实损0伤9、原线未执行，后仍赢战损27；仅保留已兑现与候选差，不能报实际省10血或整战净赚。未得计划毒雾/触媒，构筑题应分持有与待补，不预支输出。缺改线、添火改回血、早喝药或不同护栏阈值的整场配对胜负；不拟路线血线、终局权重或药价。',
      'sl':'J8PHG72DGD90 A10 F31首试T4判死截断、重打T7胜5且未饮毒，首T1净进度42→31少11仍胜，抽牌/后序亦变，不归因单步。F33六次27/74血，前五T11/13/13/11/13截断、末T13实死，一局不是六个独立样本。第5/6试T12均3血、207敌、24毒/3力/16攻，代码删除打击，重问Jev加偏折：14→20挡、省2血少9实伤，下轮玩家1→3/敌204→213，两线都败，不能由饱和全死设固定攻防权重。末T13防御/蛇咬/隐秘匕首占满懒惰3，两刀牌面均13却blocked_by_hook，未打；已建幻影9只按已证首刀加9/保留算，不能预支26。毒药饮用不增cards_played_this_turn，30→36当步HP213不变、结束实结36至177仍死。猎人首試饮毒未结算就读档，原瓶七饮来自六恢复，不算七瓶新获。当前live已有限额与生成模型，本次无新纯bug；独立策略任务先查原3edf35d9b47a7486/0800d092e6d7eab0及当前实现去重，只有找出确定不一致才改相应已观察分支；缺提前喝药或改生成序的胜线，不改持有价/SL触发/次数。'}
    ids=[]
    for name,entries,domains,summary in specs:
        lids=list(dict.fromkeys(l for ident in entries for l in M[ident]))
        lines=['# '+summary,'','角色silent；来源experience-update；实现任务strategy-proposal；授权Roy-2026-10-07-learning。授权不提供游戏事实。','账本：'+','.join(lids),'经验：'+','.join(entries),'','## 旧行为、新观察、层与回合',details[name],'']
        for ident in entries:
            c=next(c for c in C if c['id']==ident);e=c['after']
            lines+=['- '+ident+'；旧：'+c['before']['lesson']+'；新：'+e['lesson']+'；支持局：'+','.join(e['evidence'])+'；反例：'+','.join(e.get('contradicting',[]))+'；适用'+str(e['asc'])+'；账本'+','.join(M[ident])+'。']
        lines+=['','## 方法、时间切分、实现与验证','旧153静默完局截至2026-10-08T19:22:43.172Z为核验基线，本局截至20:17:18.372Z为增量；后续新局才作独立留出。按原帧同输入前后核属性/挡/毒/遗物，旧七数组、全部血档/节点转移/休息/SL逐行复算相等；尝试数与支持局数分开。未拟阈值或权重，跨路线对比只有观察，不称因果。','独立任务先核当前live和既有提案，已等价写duplicate并给真实live祖先源码commit；数据不足写waiting与具体缺项，不能冒称implemented。拟改只覆盖自己核实的机制/生成/资源传播一致性；源码人定规则可依Roy授权调整，但仍需新证据。固定原帧/原抽序测试实际支付、锁牌、属性时序、残HP、回血与药/SL恢复来源；跑原test-sandbox，不改测试预算、不借其他角色知识，未观察等级与其他角色保持等价。','', '## 限制、预期与回退','完整dirty源码、全合法操作穷举、替代全路线/喝留药/早建能力/改护栏整场胜线、部分回血中间帧与完整逐击毛伤、silent旧时钟与实际现金费用未记录。不能把3血扣尽叫完整3伤或把末13轮失败损27对赢样本中位22校准。预期减少事实/预测/可执行后续混算，不承诺翻盘；单项整战因果未控。回退独立源码commit到父版，保留经验/账本/提案/失败历史；实际规则上线先date双通知Roy旧/新行为、证据/账本/任务、影响和回退，不改运维prompt。','本任务只提交经验数据，三项源码提案均pending，不登记实现或shipped。','']
        path=O/('proposal-'+name+'.md');path.write_text('\n'.join(lines))
        value=dict(character='silent',ledger=lids,runs=['J8PHG72DGD90'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],value))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(ids,ensure_ascii=False))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip()
    for lid in L:
        entries=[c['id'] for c in C if lid in M[c['id']]]
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第118批经验源自测提交；实际数据shipped交运维据完成事件核live，三源码提案沿独立strategy-proposal。本次未改源码或登记implemented。旧首证/prior/证据/版本历史保留，0328重复发现未并入保持observed。'))
    result=dict(added=[],proposed=L,retired=[])
    (O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
