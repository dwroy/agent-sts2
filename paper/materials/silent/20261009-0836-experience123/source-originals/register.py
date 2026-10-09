import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries']
M=json.load(open(O/'ledger-map.json'))
N='RZ6YAC7K89NM'
def cli(script,args,value):
    stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:
        h.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()

if sys.argv[1]=='prepare':
    B={e['id']:e for e in json.load(open(O/'ledger-before.json'))}
    roll=json.load(open(O/'delayed-block-history.json'))
    e=next(c['after'] for c in C if c['before'] is None)
    evidence=[]
    for run in e['evidence']:
        x=next(x for x in roll['actions'] if x['run']==run and x['supported'])
        evidence.append(dict(run=run,floor=x['floor'],turn=x['turn'],role='support',note=f'实际闪躲翻滚当步格挡变化{x["block_delta"]}，BLOCK_NEXT_TURN_POWER增{x["next_power_delta"]}，两轮分账；其他修饰另核。'))
    first=e['evidence'][0]
    value=dict(by='learner:experience-update',character='silent',kind='mechanic',claim=e['lesson'],evidence=evidence,first_run=first,prior='unknown',prior_note='最早实牌窗口确认当轮/下轮份分别建立；未找到学习前同场预算是否预支延后挡的决策对照，实际施牌不等正确时序预算。',status='observed',where=dict(experience=[e['id']],lessons=[N]),note='第123批新增延后挡边界，20局97动作中仅直接核实正层窗口按局去重；提交后另记proposed。')
    result=cli('ledger.py',['add'],value)
    lid=json.loads(result)['id'] if result.startswith('{') else result.split()[0]
    assert lid.startswith('silent-'),result
    M[e['id']]=[lid]
    (O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text(json.dumps([lid])+'\n')
    L=list(dict.fromkeys(l for ls in M.values() for l in ls))
    notes={
        'silent-0019':(12,4,'F7回21后F8/F9两胜耗能力药且合损42，9血进入F12；F13火/F15商店与餐券回血未到，无改线受控胜果。'),
        'silent-0020':(7,None,'唯一休息30→51实回21、无锻造；初56+21−六胜净损68=末战9，回血不保证后战，无回血/锻造整战对照。'),
        'silent-0021':(12,4,'四轮净扣85余6，清91需22.75/轮仅事后预算；当前9挡不含未来4，4血对15死。计划毒雾/触媒未得。'),
        'silent-0125':(6,1,'护栏原候选9损21伤、替线0损9伤，替线实际38血不变、82→73；原线未实打，不把省9记整场收益。'),
        'silent-0005':(8,3,'能力药取步法实际建2敏，三挡7+10+7=24比基础18多6，覆盖20攻零损；换战敏捷清，F12持有步法未建立。'),
        'silent-0006':(12,4,'钙化/潮湿仪式2/6，潮湿同无弱招3/9/15对应力0/6/12；中和不停止后续成长，杀钙化后潮湿仍长力。'),
        'silent-0012':(12,4,'无弱同单击随潮湿力0/6/12为3/9/15，每段加力；末5毒未斩杀，4血9挡对15死。'),
        'silent-0083':(12,4,'本局两邪教徒现场仪式2/6按现场核，潮湿后续每轮+6；不把旧雕刻师+9移植到不同敌人。'),
        'silent-0007':(12,2,'普通药瓶三份3毒实分钙化6/潮湿3，次轮23/36血及余5/2毒，题报总扣32虽同而两体各差6；T2致命毒药2→7毒、本体36当步不变，结束扣7。'),
        'silent-0030':(12,3,'普通刺击钙化12→6血、4→7毒，结束清6血并取消13攻，潮湿9−5=4损；末潮湿未斩杀仍杀玩家。'),
        'silent-0225':(6,3,'固化饮前已有5挡、实饮后15，32血当步不变、本轮零损，整战仍损8；早饮/留药整战对照缺。'),
    }
    for oldid in L:
        if oldid==lid:continue
        entries=[c['id'] for c in C if oldid in M[c['id']]]
        v=dict(id=oldid,by='learner:experience-update',where=dict(experience=entries),note='第123批预关联：保留claim/首证/prior/status/version和证据历史；旧158局复算、新局实帧核验；提交后另记proposed。')
        seen={x['run'] for x in B[oldid]['evidence']}
        new=[]
        if N not in seen:
            floor,turn,note=notes[oldid]
            new.append(dict(run=N,floor=floor,turn=turn,role='support',note=note))
        if oldid=='silent-0225' and 'P2M3DFJ4DEZ3' not in seen:
            A=json.load(open(O/'historical-formula-checks.json'))[-1]
            x=next(x for x in A['windows'] if x['run']=='P2M3DFJ4DEZ3')
            new.append(dict(run=x['run'],floor=x['floor'],turn=x['turn'],role='support',note=f'历史重新核实固化当步B→3B：{x["before"]["block"]}→{x["after"]["block"]}，只作真实已持挡收益，不定时点胜果。'))
        if new:v['evidence']=new
        cli('ledger.py',['update'],v)
    specs=[
        ('mechanisms',['silent-footwork-block','silent-strength-weak-observation','silent-deadly-poison-application','silent-poisoned-stab-components','silent-fortifier-existing-block-triple','silent-dodge-and-roll-delayed-block'],['combat','potion','terminal'],'静默已建敏捷、仪式成长、毒免攻与延后格挡的逐帧终局边界',
         'RZ6YAC7K89NM A10：F8T1能力药生成步法建2敏，T3三挡7/10/7=24比基础18多6，覆盖20攻零损；F9敏捷清。F12T2—T4潮湿力0/6/12同招3/9/15，钙化仪式2、潮湿6，不套雕刻师9；T3刺击直伤6及+3毒使钙化6血7毒，结束取消13攻、只损4。T4普通翻滚实建当前4/下轮4，再防御5，4血9挡对15完整需损6，至少7血可活、差3；玩家先死未活到未来4挡。F6T3固化5→15、HP32不变；历史18局25饮B→3B一致。旧行为按现有属性、毒结/真实目标和BLOCK_NEXT_TURN_POWER路径；条件性新行为先固定帧重放，定位真实遗漏再限本角色已观察分支修正。若当前源码等价则报告真实live祖先、不制造改动；不由持有步法反推应优先出，不添新优先级/药时点/终局权重。'),
        ('random-poison',['silent-bouncing-flask-poison'],['combat','terminal'],'静默多敌随机毒总量相同仍需核逐敌收尾分布',
         'RZ6YAC7K89NM F12T1 d307856/s316052—316058：普通药瓶三份3毒，实分钙6/潮湿3，下一轮钙23血5毒/潮湿36血2毒；原题钙29无毒/潮湿30余8毒，总扣同32却每体各差6。旧silent-0295的最高HP+挡分配缺口重复，本局标签combat/plan-choice及五轮3/8赢5/8死，没有伪保证斩杀，整场另一分配胜负未知。旧turn-solver.ts随机毒复用随机直伤目标，施毒不改即时HP，可能三次同目标；条件性新行为核每次施毒的真实分配可能集合、逐敌剩血/制品与终局边界。确定斩杀只允许已证明的分配下成立；普通候选保留观察不确定性，方法/参数须独立strategy-proposal的固定本角色帧重放核验。复用旧提案，不把本局全症状套成伪斩杀重犯；不足则waiting。'),
        ('resources',['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation'],['combat','potion','terminal'],'静默护栏即时血价与赢战血药链不预支未来恢复',
         'RZ6YAC7K89NM F6T1 d307764：原双打击+刺击9损21伤，8点护栏换双防御+刺击0损9伤，替线38血不变/82→73兑现，原线未实打，两线当步均不饮固化。F9T2更伤线损16/伤18对另一线损8/伤9，五轮都胜不保证战后资源，最终38→9。F7唯一回21后F8/F9两胜实损13/29、能力药已饮；获4/饮4/弃0/SL0，初56+21−六胜68=9。餐券F9得后未到商店，F10/11未回血，F13火未到；F7后至下一火无别路线。F7脑投影48进精英实38，差10对应F8实际损13对模型普通房3；仅本局条件差，不拟参数。F12四轮扣85余6、清91需22.75/轮仅事后预算。旧规则保留护栏/药价/必死边界；条件性新行为先审计候选即时损/伤、实际执行/后战血药分源与未建能力、投影条件是否齐记，再按本角色跨局配对留出重放拟策略。缺受控原线/留药/换线整战胜果则waiting，不以一败取消护栏或改变喝留阈值。')
    ]
    ids=[]
    for name,entries,domains,summary,detail in specs:
        lids=list(dict.fromkeys(l for ident in entries for l in M[ident]))
        if name=='random-poison':lids.append('silent-0295')
        lines=['# '+summary,'','角色silent；新证据A10；来源experience-update/20261009-075800；实现独立strategy-proposal。Roy-2026-10-07-learning只提供规则修改授权，不提供游戏事实。','账本：'+','.join(lids),'经验：'+','.join(entries),'','## 旧规则、新行为、已核数据',detail]
        for ident in entries:
            c=next(c for c in C if c['id']==ident);e=c['after']
            lines+=['','- '+ident+'；旧经验：'+(c['before']['lesson'] if c['before'] else '无独立条目')+'；新经验：'+e['lesson']+'；支持：'+','.join(e['evidence'])+'；反例：'+','.join(e.get('contradicting',[]))+'；适用'+str(e['asc'])+'。']
        lines+=['','## 拟合、时间切分与缺数据','旧158个silent完局截至2026-10-08T23:01:33.472Z复算；新局23:06:44.894Z—23:15:32.987Z作增量验证；后续独立完局作留出。所有SL同局/同场不当独立样本，本局无SL。支持沿已核语义，不把共现当机制证明。缺完整开局dirty知识内容、逐击毛伤/过量与部分归零内部次序、完整实际最优执行比例、原线/随机毒另分配/留药/换路线整战反事实、药水表加载原因、未到后幕/boss资源、实际boss时钟/比值、Jev缓存与实际费用。无充分配对数据，不拟新血线/药价/终局权重。','','## 验证、影响与回退','核旧提案去重和当前live源码，固定本角色真实状态重放，逐卡敏捷/毒/仪式/延后挡及真实血药分源核相等；直接多敌目标分配不足不强称确定胜果。必要实现后原test-sandbox，未观察条件/其他角色保持等价；不足waiting。本任务只改经验，不改打法源码、不登记implemented/shipped。预期提高已核知识/预算一致性，不承诺翻盘；后续回退独立源码commit，经验回退本父版blob，保留刷新和全部历史。实际规则上线先date双通知Roy旧/新规则、证据/账本/任务、预期影响和回退，不改运维prompt。','']
        path=O/('proposal-'+name+'.md');path.write_text('\n'.join(lines))
        value=dict(character='silent',ledger=lids,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],value))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(added=[lid],proposals=ids),ensure_ascii=False))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip()
    added=json.load(open(O/'ledger-added.json'))
    L=list(dict.fromkeys(l for ls in M.values() for l in ls))
    for lid in L:
        entries=[c['id'] for c in C if lid in M[c['id']]]
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第123批经验自测提交；实际数据shipped交运维据完成事件核live，三源码提案pending；首证/prior/claim/evidence/support/repeat与旧版本历史保持。0295纯bug只提案关联，observed保持。'))
    result=dict(added=added,proposed=[l for l in L if l not in added],retired=[])
    (O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
