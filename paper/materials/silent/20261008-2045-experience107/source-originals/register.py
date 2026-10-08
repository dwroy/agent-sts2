import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load((O/'changes.json').open())['entries']
RUN='CNKR125PFHJ5'
M={
'silent-strength-weak-observation':'silent-0012',
'silent-footwork-block':'silent-0005',
'silent-insatiable-dual-clock':'silent-0018',
'silent-route-hp-observation':'silent-0019',
'silent-rest-buffer-observation':'silent-0020',
'silent-deck-burst-observation':'silent-0021',
'silent-noxious-fumes-growth':'silent-0011',
'silent-accelerant-triggers':'silent-0027',
'silent-orichalcum-zero-block':'silent-0047',
'silent-sparkling-rouge-turn-three':'silent-0071',
'silent-infested-prism-tainted-skill-cost':'silent-0167',
'silent-dexterity-potion-card-block':'silent-0276',
'silent-bouncing-flask-poison':'silent-0007',
'silent-poisoned-stab-components':'silent-0030',
'silent-piercing-wail-temporary-strength':'silent-0046',
'silent-act-transition-missing-hp-heal':'silent-0243',
'silent-deadly-poison-application':'silent-0007',
'silent-afterimage-per-card-block':'silent-0023',
'silent-frail-card-block':'silent-0013',
'silent-mercury-hourglass-start-observation':'silent-0309',
}
assert set(M)=={c['id'] for c in C}

def cli(script,args,value):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:h.write(json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()

if sys.argv[1]=='prepare':
    (O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
    F=json.load((O/'ledger-fold-before.json').open())
    F=F if isinstance(F,dict) else {x['id']:x for x in F}
    for lid in dict.fromkeys(M.values()):
        changes=[c for c in C if M[c['id']]==lid]
        row=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第107批经验提案预关联，保留状态/首证/prior/版本及所有历史；逐层回合与原帧见本批numbers-checked/audit。')
        if RUN not in {x['run'] for x in F[lid]['evidence']}:
            row['evidence']=[dict(run=RUN,role='support',floor=33 if lid in ['silent-0018','silent-0021','silent-0027','silent-0012','silent-0005','silent-0071','silent-0047'] else 29 if lid in ['silent-0167','silent-0046'] else 23 if lid in ['silent-0276','silent-0023','silent-0007'] else 30 if lid=='silent-0013' else 18 if lid=='silent-0243' else None,note='本角色A10已核实：'+','.join(c['id'] for c in changes)+'；整战单因及替代打法未控。')]
        if lid=='silent-0309':
            row['claim']='本局水银沙漏是F29棱柱战胜后奖励11:35:53.563Z取得，F26实得音叉，棱柱战内尚未持有，171→171不作沙漏抵消/阻挡证据。其后F30虱虫和F33沙虫在T1入场未就绪到可行动、无牌药动作间138→135及341→338，玩家HP不变，只支持这两场单敌首行动前净扣3的观察；未隔离其他被动交互或整战独立胜因。'
            row['note']+=' 原复盘只读；0309棱柱未记录内部抵消说法现由实际获取顺序更正，原claim行完整保留。'
        cli('ledger.py',['update'],row)
    resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal']
    deadline=['silent-insatiable-dual-clock','silent-deck-burst-observation']
    mechanics=[c['id'] for c in C if c['id'] not in resources+deadline]
    specs=[('mechanisms',['combat','potion'],mechanics,'静默A10实建力敏、逐牌挡、实结毒与真实随机分配分账'),('deadline',['combat','sl','terminal'],deadline,'静默沙虫攻击生存与沙坑截止事实分别传播，毒不足及未建模药水保留未知'),('resources',['combat','potion','terminal'],resources,'静默路线/休息按实际血药链和分阶数据校核，不由胜前战或计划预支资源')]
    ids=[]
    for name,domains,entries,summary in specs:
        path=O/('proposal-'+name+'.md')
        ledgers=list(dict.fromkeys(M[e] for e in entries))
        limitations='完整dirty运行树、终结独立0血帧/部分毛伤、罐装幽灵实饮与沙坑无实体交互、替构筑/路线/休息/用药/提前触媒的受控整场均缺失；本局无重打，不从模拟8样本4胜或休息31.25%推实胜概率。'
        header=['# '+summary,'','角色：silent；新证A10，机制有历史A0—A10支持（逐条分阶见historical-mechanism-summary）；策略仅原条目的已观察范围，不改其他角色。','来源任务：experience-update；实现任务：strategy-proposal；既有规则授权：Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 已核证据与限制','CNKR125PFHJ5 F33 T2步法/毒雾实建，T3四敏21挡对23；T5逃离1→2；T6触媒后33毒三结96、敌217→121，27血9挡对24攻击账剩12却沙坑死。F23 T5随机药瓶三份给子体、母体67/18毒未加、结51到16，T6才胜；F29技能污染及F30脆弱牌面/额外挡分别核。F29胜后才领取水银，首行动前两场各净扣3，本角色141局历史只这一局持有。F19/21/23赢仍损60、事件消费毒药升上限，F25/28/32回血实到36/60/53；SL只有首试。','支持/反例：各条完整12位局号、n、进阶与典型数字见experience及audit/history/numbers-checked；本批无机制反例，胜败不直接作公式反例。','限制：'+limitations,'','## 旧行为与新行为']
        if name=='mechanisms':
            header+=['旧：相关短线估值可能把尚存毒、最高HP分配或整步额外挡当确定收益；水银获取时间在原复盘写错。','新：只根据本角色核实的实建量/结算与分配计算；多敌随机毒若未穷举全部合法分配不认证确定斩杀，单牌挡与被动触发分源；初轮被动只用实帧，不拟合全敌固定净伤。已经正确的模型保持等价；单步能力判定不是强喝时点。']
        elif name=='deadline':
            header+=['旧：F33T6四次combat/play的end_turn lethal=false，把攻击后12血当完整存活；combat.ts事实入口未接整回合已有沙坑截止。','新：实现任务先核当前源码，令单动作/整回合共用已观察的特殊截止事实，并保留未模拟药水的不确定性。只修已证实事实接线，不能据持幽灵强喝、删候选或强制SL；截止输出不足须明确提示，不能由末轮103进度外推全程。旧纯bug另有关联0308，原复盘提案0ff91bb5da98a252保持，本提案覆盖本批经验链；实现时去重实际源码提交。']
        else:
            header+=['旧：路线计划与已选回血分支、实到资源可能被混用；库存药持有价未知时显示0。','新：独立任务先核现实现，按真实实建资源、已选分支和下一场首COMBAT净损标记预测误差；表未载入/药效未建模保持未知。不从低血节点的观察死亡率拟造安全血线或强喝门槛；没有可辨识反事实时保存证据并waiting。']
        header+=['','## 拟合、验证、影响与回退','冻结切点2026-10-08T11:38:44.123Z；新局作为发现集、历史140局作公式兼容复核，不把这同一发现局冒称留出验证。结构/机制用明确文本和逐动作帧固定夹具，非数值拟合；后续静默新局才是时间留出。所有游戏参数限本角色已验证的变体/进阶；其他角色和未观察变体保持等价。','在独立工作树先查既有提案及实际live祖先；新增代码需固定夹具验证撤源码失败/恢复通过，并跑原test-sandbox。预期提高事实一致性，不能宣称胜率提升。沙漏/音叉未隔离交互及幽灵抵截止保持waiting限制；实现后用新完局审计。','回退用独立实现源码commit revert，保留本经验/账本/提案历史；当前仅记录提案，没有源码implemented_commit，不标implemented/shipped。','']
        path.write_text('\n'.join(header))
        item=dict(character='silent',ledger=ledgers,runs=[RUN],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],item))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print('提案',','.join(ids))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip()
    heading='2026-10-08 静默猎手 第一百零七次增量：1 局 A10（version 2026-10-08.24，分支 exp-silent，'+commit[:8]+'）'
    proposed=list(dict.fromkeys(M.values()))
    for lid in proposed:
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[k for k,v in M.items() if v==lid],commits=[commit],changelog=[heading]),note='第107批已提交经验来源；实际live数据shipped交运维核实，不冒称代码提案已实现。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=proposed,retired=[]),ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-heading.txt').write_text(heading+'\n')
    print('proposed',len(proposed))
