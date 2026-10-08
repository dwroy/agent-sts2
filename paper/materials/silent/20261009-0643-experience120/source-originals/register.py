import json, subprocess, sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries']
M=json.load(open(O/'ledger-map.json'))
L=list(dict.fromkeys(l for ls in M.values() for l in ls))
N='KSX97DF5H3NY'

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
        value=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in cs]),note='第120批经验/提案预关联；保留首证/prior/claim/status/version与全部历史。旧155局复算和新局原帧核验完成，提交后另记proposed。')
        if N not in {e['run'] for e in B[lid]['evidence']}:
            value['evidence']=[dict(run=N,floor=30 if lid in ['silent-0020','silent-0007'] else 31,role='support',note='支持'+','.join(c['id'] for c in cs)+'：F29枕头回36、F30两药用尽净损35；F30T8毒5→10收6血甲虫，F31四试同前30抽序均败。现场层/实结/实际动作与整场因果分账，完整层轮见new-state-facts/verified/复盘。')]
        cli('ledger.py',['update'],value)
    resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
    poison=['silent-bouncing-flask-poison','silent-mirage-poison-card-block','silent-deadly-poison-application']
    mechanics=[c['id'] for c in C if c['id'] not in resources+poison]
    specs=[
        ('mechanisms',mechanics,['combat'], '静默逐牌被动挡、覆甲耗尽和敌成长的实际层与时序验收',
         'F30T1余像建1自身不补，T5串刺/计算下注仅补2；甲虫T5—8力量2/4/6/8，T5/6各损12。F31末T5后空翻先5，余像建立不补，随后三牌实补3，牌挡另5，最终13；覆甲轮初4/3/2/1/0，末轮不补。母体4力且玩家易伤1，31加两幼虫各7为45攻击，需损32，1血存活至少差32。死亡后的21/5/5不反推前态。独立任务先核现行模拟对这些来源和建立时序是否等价、去重既有提案，只有固定帧证实的遗漏才修；没有提前建余像/先杀甲虫的整场受控胜线，不拟优先级或成长权重。毒雾T6建3、后轮毒3→2→5只证明实建和实结，不承诺早建必赢。'),
        ('random-poison',poison,['combat','sl','terminal'], '静默多敌随机施毒的目标进度与总毒挡分开，不以伪确定分配保证胜利',
         'F31第2/3/4试T3普通药瓶三份3毒母体只分到3，母体2→5、血55不变，下一轮50血余4毒；第2/4试两幼虫各3，第3试同一幼虫6。题面把母体55→44余10毒并24/24赢，总毒结11却可与实盘相同，母体差6。蜃景总11挡实6→17/0→11均兑现，不能用总挡正确证明指定目标进度正确。旧G8NHLL09DLBX、CNKR125PFHJ5的0295同根因未修队列保持；本局是Jev选线而非combat/lethal，不冒报新的自动斩杀保证。独立任务核当前turn-solver.ts随机施毒仍最高HP+挡选靶，枚举已观察分配或保守未定标记，严格必死闸不扩大。四试前30抽序相同均败，T2/T4探索、随机分配和幼虫数同变，不能宣称单一目标变更或运气造成勝败。普通致命在F30T8将5→10毒、只按6剩血计已结，不把加层当即时伤或胜率。'),
        ('resources',resources,['structure','combat','potion','terminal'], '静默赢战血药与下一火前资源、护栏局部差和整战代价分账',
         'F8护栏原猎杀者/翻越撑击报损19伤22，改防御/生存者/翻越撑击报损6伤7，实当轮6/7、整战53→14损39；原线未实打，13只是题面当轮省血，非整战实赚。F9枕头14→50、F29枕头18→54各36；三锻造不回血，事件20/25与跨幕38→63的25另账，战外142。15赢房净损179使56+142−179=19；末战19→0，前三SL恢复6/1/5→19另记。实获10瓶、饮9、事件交出毒瓶换灯笼1、弃0，两pending饮药按槽清空核验。F29脑明知下一火前两强制战，F30两污浊饮尽且净损35，F31空药四败；F18投影入口44实际19，但问号战/事件回血/锻造同时改变，不能把25误差全部拟到一个参数，也无留药或换路线的配对整场勝线。独立任务保留现行门槛/药价，先保存预测/执行、资源来源与未到火的假设；证据不足waiting，不由死亡否定合规护栏。')]
    ids=[]
    for name,entries,domains,summary,detail in specs:
        lids=list(dict.fromkeys(l for ident in entries for l in M[ident]))
        if name=='random-poison':lids.append('silent-0295')
        text=['# '+summary,'','角色silent；新证据A10；来源experience-update/20261009-061302，独立实现strategy-proposal。授权Roy-2026-10-07-learning不提供游戏事实。','账本：'+','.join(lids),'经验：'+','.join(entries),'','## 旧行为、已核证据与新行为',detail]
        for ident in entries:
            c=next(c for c in C if c['id']==ident);e=c['after']
            text+=['','- '+ident+'；旧经验：'+c['before']['lesson']+'；新经验：'+e['lesson']+'；支持：'+','.join(e['evidence'])+'；反例：'+','.join(e.get('contradicting',[]))+'；适用'+str(e['asc'])+'；账本'+','.join(M[ident])+'。']
        text+=['','## 方法、时间切分与缺数据','旧155静默完局截至2026-10-08T20:48:22.147Z为核验基线，新局截至21:18:53.395Z为增量，后续完局作独立留出。旧七数组/血档/节点/回血/SL逐行复算；作用顺序用每次动作前后和下一轮实帧，支持局数与尝试数分开。没有拟合权重/阈值；缺完整dirty运行源码、前三次SL退出结算、随机孵化/攻击内部时序、留药/换线/护栏/早建能力的整场受控反事实、实际最优完整执行率和订阅实际费用。出现集合仅检索，不算完整机制支持。','', '## 验证、预期影响与回退','固定真实状态验证建立前后、逐牌挡/覆甲/力与易伤、随机毒分配/总量/母体HP、终局与资源来源；照原test-sandbox，预算和其他角色/未观察条件保持等价。先核当前源码与既有live实现去重；充分本角色证据才改已授权规则，不足waiting并保留原行为。预期减少未兑现收益与伪确定分配，不承诺翻盘。独立源码回退恢复父提交，保留所有经验/日志/失败历史；实际规则上线先date双通知Roy旧/新规则、证据/账本/任务、影响与回退，不改运维prompt。数据提案和经验上线均不等于源码implemented/shipped。','']
        path=O/('proposal-'+name+'.md');path.write_text('\n'.join(text))
        value=dict(character='silent',ledger=lids,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],value))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(ids,ensure_ascii=False))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip()
    heading=(O/'changelog-heading.txt').read_text().strip()
    for lid in L:
        entries=[c['id'] for c in C if lid in M[c['id']]]
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第120批经验已自测提交；实际live数据shipped交运维按完成事件核实，三源码提案pending不标implemented。保留首证/prior/claim/支持/repeat及旧版本历史，纯bug0295只提案关联不改observed。'))
    result=dict(added=[],proposed=L,retired=[])
    (O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
