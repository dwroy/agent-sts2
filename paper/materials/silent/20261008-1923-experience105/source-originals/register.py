import json, subprocess, sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2')
M=json.load((O/'ledger-map.json').open());C=json.load((O/'changes.json').open())['entries']
def cli(script,args,value):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:h.write(p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
if sys.argv[1]=='prepare':
    cocoa=json.load((O/'cocoa-history.json').open())
    e=next(c['after'] for c in C if c['id']=='silent-very-hot-cocoa-opening-energy')
    evidence=[]
    for n in e['evidence']:
        cases=[r for r in cocoa if r['run']==n];r=cases[0]
        evidence.append(dict(run=n,floor=r['floor'],turn=1,role='support',note=f'现场可可文本为每战首轮额外能量；独立房首可操作开场{len(cases)}次，能量集合{sorted({x["energy"] for x in cases})}。额外增能来源未全隔离，不以牌组能力当已经启动。'))
    item=dict(character='silent',by='learner:experience-update',kind='mechanic',claim='观察：烫嘴可可的首轮额外能量须由实际到手/可打牌兑现，不保证能力启动。20局165个独立房开场147次7能、13次8能、5次9能；其他增能未逐项隔离。4XLZURXMD872无其他开场增能遗物、普通轮3能首轮7能，蟾蜍实建能力而沙虫六试均无能力手牌，不能外推必胜或固定出牌。',evidence=evidence,first_run=e['evidence'][0],prior='unknown',prior_note='最早是静默首局C48LLXBGKXQ9 A0；没有更早本角色可比场景，不从自动能量增加推断学习前已理解启动边界。',status='proposed',where=dict(experience=[e['id']]),note='第105批经验提交前新机制预关联；来源cocoa-history/numbers-checked，提交后补源提交与本节，数据上线不等代码实现。')
    lid=cli('ledger.py',['add'],item);M[e['id']]=[lid]
    (O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text(json.dumps([lid])+'\n')
    fold={r['id']:r for r in json.load((O/'ledger-fold-before.json').open())}
    ids=list(dict.fromkeys(i for v in M.values() for i in v))
    for lid in ids:
        if lid not in fold:continue
        cc=[c for c in C if lid in M[c['id']]];seen={e['run'] for e in fold[lid]['evidence']};ev=[]
        for c in cc:
            for n in c['new_runs']:
                if n in seen:continue
                seen.add(n);ev.append(dict(run=n,role='support',note='第105批重新抽帧/动作复算：'+c['id']+'；numbers-checked、poison-potion-checks和historical-mechanism-summary保留层/回合及数字，整战单因未控。'))
        row=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in cc]),note='第105批经验提交前提案预关联；保留首证/prior/claim、原support/repeat、旧状态及版本，源提交后登记proposed。')
        if ev:row['evidence']=ev
        cli('ledger.py',['update'],row)
    resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-very-hot-cocoa-opening-energy']
    sl=['silent-insatiable-dual-clock','silent-spiny-toad-draw-block-sl']
    mechanism=[c['id'] for c in C if c['id'] not in resources+sl]
    specs=[('mechanisms',['combat','potion'],mechanism,'核本角色力敏/临时减力、技能重放、抽牌伤、毒与持牌伤模型；毒药观察覆盖新增实饮，只实现可证缺口。'),('sl',['combat','sl'],sl,'蟾蜍同抽重试在执行换手后重问，合核真实挡与后轮血价；沙虫有限全败不代替确定判死，不拟固定换手规则。'),('resources',['combat','potion','terminal'],resources,'把能力实际到手/启动及血药来源传递至候选终态与后战估值，不预支可可未兑现能力、未结毒或未到营火；阈值不足保留。')]
    common='''来源任务experience-update/20261008-183609；实现任务独立strategy-proposal。角色silent；新局4XLZURXMD872为A10，历史137完局，机制适用进阶及完整支持/反例列表见changes和historical-mechanism-summary。机制[0,20]不是对所有等级做过验证；源码改变只覆盖核过的本角色场景，其余角色/未观察进阶保持等价。授权Roy-2026-10-07-learning只允许证据支持的更改，不提供机制事实。本任务不改打法源码，不登记implemented/shipped。

证据与旧行为：运行187c025a+dirty完整源码缺失。当前card-model.ts已有动态力量敏捷与重放，modelPotion只在observedPoison已给值时处理POISON_POTION；combat-plan.ts的该参数当前只由已观察双boss提供。本局沙虫药题标数值未知/效果未模拟/喝后重问，不据未知模型判断纯bug。当前源码已经实现计算下注重抽识别、范围/有限样本展示等部分规则，独立任务先核最新live；已等价实现的子项只能以实际live祖先源码commit登记duplicate，不能由经验合入登记implemented。

机制实证：F17T3毒雾+建3但本步敌毒仍12；T6吸取后玩家力敏各-2、敌力+2，回响10变8，T7后空翻5变3挡。尖啸敌力2到-4、双击24到12，3挡后实际损9，次轮力恢复2。T6爆发复制冒泡两次各9，18到36毒、HP当步129不变，末结129到93；后轮毒雾补3分算。F31两试T2爆发复制尖啸25变13；胜试换手三抽在速行者2下103到97额外6伤，抽到究极防御实给11挡。T5爆发复制究极防御0到22挡，对25损3到2血，T6胜。F30T5三毒素先付费离手1/弃1/留1，20血0挡结束到15且敌退场，这5不计敌攻击。沙虫六试均未建毒雾/谋划专家/速行者，前三普通爆发当轮存在，不写所有增益不存在。

药水：34局132个实饮相邻帧独立核验，115次加6、头骨4局15次加7、制品2局2次耗1制品阻毒，HP当步均不变；历史T0DGVABPV60U A10 F28T7一饮+6旧条目漏记，修旧文字32/124为旧切点33/125，再加本局为34/132。新局同瓶毒药实饮7次（蟾蜍首试T5及沙虫六试），SL恢复6不当新获药；总独立9瓶、15动作、弃药0。末沙虫T3药6+冒泡9=15，直伤10和实结15合25，敌余275杀玩家；不从这些全败决定提前喝/留药最佳时点。

SL配对：F31两试已知开场抽序与T2原手牌/能量/25攻相同，但敌入轮111/103且首轮多打匕首雨8伤，后续抽牌时点也变。首试T2结束真实损13到2；重试T2换手并究极防御11挡只损2到13，实际T6以2血赢，只有11血即时差受控数字，不把整战胜因归单次换手。首参考五轮8/8死、重试0/24赢及23/24死；有限参考不是最优/实盘必死证据，也不是新least-loss或全弃模型bug。蟾蜍仅本场有重打，一场两试1赢；另两场历史只有单试获胜，不混作重打支持。沙虫全本角色14场58试7赢，本局六試0赢，无赢的那次；前五T3判死读档不计实际死亡，末T3 23血0挡对31实际HP0，存活至少差9但敌仍275，不把9当整战缺口。

资源与能力：56初血+七火147+跨幕39-事件7-十五胜房净损212=23进沙虫。F28回血到57后三场Monster赢战净损34/8/13共55，F32实际2、休后23，原同分支投影24/45各高22；没有改路线/锻造/留迅捷的受控整场。20局165可可独立房开场147次7、13次8、5次9，其他增能不全归可可；本局无其他首轮能量遗物，普通轮3与首輪7对应额外4，八房都7。F31T1实际启动速行者/谋划专家，boss六试T1无能力手牌，不能由可可“免费启动”的计划推已建。终态价值只评真实HP/药槽及已建立增益，不能把未来未抽到能力、尚未结毒与未到火当现有收益；不拟新的终局/存药常数。

拟议新行为与验证：先逐帧复现当轮力敏/减力时点、技能重放/抽牌额外伤、毒药实加数与制品、持牌伤和SL执行后重问，再检查真实资源/能力状态接线。只修有固定反例证明的缺口；无缺口则保存duplicate/waiting子项，完整dirty源码未知不认运行源码错误。新模型原帧撤掉应红/恢复绿，固定沙箱tsc/vitest与gitleaks通过。实际live祖先源码才是implemented；数据经验发布不代替代码结果。

样本、拟合与反例：旧136局作前置历史，新局为已读核验而非盲测；全部七数组/血档/节点/火/SL复算相同，药水条目旧文字漏证据单列更正。没有自由参数拟合，未来时间更晚的独立silent A10完局用作验证；同局/同房SL不拆成独立局。支持与反例见experience evidence/contradicting；8/9能是其他来源未隔离，不反驳“可可不是保证启动”。没有强制先建能力/不同换手或药水时点/其他路线/组件移除的整场受控结果，部分毒结算与同ID归零中间帧未知，boss时钟构筑估伤未知；不足则保留原行为，不补预训练知识。

预期与回退：改善候选数字与实际执行一致性，减少未建能力/未结毒/未来资源预支，不承诺胜率。规则源码若独立实现，回退只逆向该实现提交，保持刷新与其他角色；上线后先date，按授权在根notes/for-roy及ops/inbox-dev双通知旧/新、证据/账本/任务、影响与回退。不改运维prompt。本经验批只交三个提案独立strategy-proposal。
'''
    result=[]
    for key,domains,eids,summary in specs:
        ledger=list(dict.fromkeys(i for eid in eids for i in M[eid]));md=O/('proposal-'+key+'.md')
        md.write_text('# 静默猎手：'+summary+'\n\n账本：'+','.join(ledger)+'\n经验：'+','.join(eids)+'\n\n'+common)
        item=dict(character='silent',ledger=ledger,runs=['4XLZURXMD872'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(md.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        if key=='mechanisms':item['runs'].insert(0,'T0DGVABPV60U')
        if key=='resources':item['runs']=list(dict.fromkeys(e['evidence']+['4XLZURXMD872']))
        (O/('proposal-'+key+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        result.append(cli('code_proposals.py',['add','--character','silent'],item))
    (O/'code-proposal-ids.json').write_text(json.dumps(result)+'\n')
    print(json.dumps(dict(proposals=result,added=json.load((O/'ledger-added.json').open()),ledgers=ids),ensure_ascii=False))
else:
    commit=(O/'source-commit.txt').read_text().strip();heading='## 2026-10-08 静默猎手 第一百零五次增量：1 局 A10（version 2026-10-08.22，分支 exp-silent，'+commit[:8]+'）'
    ids=list(dict.fromkeys(i for v in M.values() for i in v))
    for lid in ids:
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[k for k,v in M.items() if lid in v],commits=[commit],changelog=[heading]),note='第105批源提交已完成；只登记经验来源，保留首证/prior/claim/原证据与全部旧上线历史，实际shipped交运维核live。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=json.load((O/'ledger-added.json').open()),proposed=ids,retired=[]),ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-heading.txt').write_text(heading+'\n')
    print('提交后proposed登记',len(ids),'条')
