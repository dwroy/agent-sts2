import json, subprocess, sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries']
M=json.load(open(O/'ledger-map.json'))
L=list(dict.fromkeys(l for ls in M.values() for l in ls))
N='SV2GP9NX4HQD'
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
        value=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in cs]),note='第121批经验/提案预关联；保留首证/prior/claim/status/version及全部历史。旧156局复算与本局实帧核验，提交后另记proposed。')
        if N not in {e['run'] for e in B[lid]['evidence']}:
            floor=17 if lid=='silent-0243' else 47 if lid=='silent-0020' else 43 if lid=='silent-0019' else 48
            value['evidence']=[dict(run=N,floor=floor,role='support',note='支持'+','.join(c['id'] for c in cs)+'；完整层轮见复盘/new-state-facts/verified。F17胜28/81至F18回42、F33胜9/81至F34回57；六火各24。沙漏六试同前35抽序全败，末T10三敏21挡对30攻+12凋萎、1血死，毒32结后仍146；三饮毒加6三饮耗最后1制品，时点/牌序同变不定胜因。')]
        cli('ledger.py',['update'],value)
    resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
    defenses=['silent-footwork-block','silent-strength-weak-observation','silent-piercing-wail-temporary-strength','silent-wither-end-turn-loss']
    poison=[c['id'] for c in C if c['id'] not in resources+defenses]
    specs=[
        ('defenses',defenses,['combat','terminal'],'静默敏捷逐牌挡、临时减力与敌成长及凋萎的实际血价',
         'F48末试T2步法+建立3敏，防御0→8、普通后空翻8→16；T10生存者11加偏折+10共21挡，比无敏15多6。T7敌力9有虚弱EBB26，T10力15同弱30。尖啸T1实减6力使26→20、随后恢复，不当永久减力。末T7两张9凋萎+26攻击−8挡需损36，52→16；末T10弃掉一张12仍一张12，30+12−21需损21，1血存活至少差21。实际死帧只扣剩1，不把−20预测当实际损20。只确认现行同线模拟与可见持牌、敏捷、敌力弱层是否等价，未发现新纯bug；对缺帧内部时序不补模型，缺整场受控胜线，不拟新能力优先级/护栏阈值。'),
        ('poison-sl',poison,['combat','potion','sl','terminal'],'静默施毒与制品消耗、可结算进度和同首抽六败的分账',
         'F48末试T2致命毒药+加7，T6蛇咬+13→23加10、352血即时不变，T8普通致命29→34加5、265血即时不变；末T10毒32只结178→146余31，不能算胜。原毒瓶六饮：第1/3/4试T2无制品各加6；第2/5/6试T1仍1制品，喝后制品1→0无毒，本体HP不变。技能药六试均选残影只代表实际随机结果，不保证选牌。旧39支持局158饮重算，138加6、15加7、5阻毒。当前card-model.ts:938—942只接未升级蛇咬7毒，本局升级10毒仍覆盖不足，与0319既有提案核去重；数据不冒称修后必胜。六试前35抽序相同，五次T9/8/9/9/11判死截断、末T10实死；药时点和卡序同时改变。第5试T8护栏直接结束实损6伤19，第6试同轮另有出牌/毒/重问实损15伤34，后续不同，不能按当轮9血定单一胜因。独立任务固定已核帧验证制品/施毒/结算与未知分支，充分证据只修升级施毒覆盖；暂保留药时点、SL死闸、终局价，缺受控胜线则waiting。'),
        ('resources',resources,['structure','combat','potion','terminal'],'静默赢战血药、跨幕与营火回复、护栏重问与长战进度独立核账',
         'F33蟹赢74→9、血瓶启动后76→9；F34跨幕回57至66。F43骑士赢74→24、血瓶后76开打，T7精灵自动触发9→0→24；不是主动喝药，净损50不当攻击毛伤。F44及F47各回24后沙漏原始70/81血、血瓶后72，已无复活；F49未到，不用题面模拟代填。六HEAL各24合144、六SMITH不回血，F17跨幕28/81回42到70及F33缺72回57分源，五次SL恢复72另账。获13物理瓶/主动不同瓶12/精灵被动1，22次use动作包含SL复用12次；丢弃0。F48末试前三轮实扣139，十轮389仍缺146；53.5/轮只是事后扣尽535预算，silent时钟估值为null，不拟合成经验时钟。11条护栏替换落7个回合，重问阶段不同，同轮两份题面价不能重复记整战收益；实际原线未打，不由失败否定合规护栏。独立任务先核预测/实际、血药来源和未到节点状态，保留药持有价/护栏等原行为；只有本角色配对数据充分才拟已授权规则，缺反事实waiting。')]
    ids=[]
    for name,entries,domains,summary,detail in specs:
        lids=list(dict.fromkeys(l for ident in entries for l in M[ident]))
        if name=='poison-sl':lids.append('silent-0319')
        text=['# '+summary,'','角色silent；已观察新证据A10；来源experience-update/20261009-070200，独立实现strategy-proposal。Roy-2026-10-07-learning为规则授权，不提供游戏事实。','账本：'+','.join(lids),'经验：'+','.join(entries),'','## 旧行为、已核证据和新行为',detail]
        for ident in entries:
            c=next(c for c in C if c['id']==ident);e=c['after']
            text+=['','- '+ident+'；旧经验：'+c['before']['lesson']+'；新经验：'+e['lesson']+'；支持：'+','.join(e['evidence'])+'；反例：'+','.join(e.get('contradicting',[]))+'；适用'+str(e['asc'])+'；账本'+','.join(M[ident])+'。']
        text+=['','## 方法、时间切分与缺数据','旧156静默完局截至2026-10-08T21:18:53.395Z为核验基线，新局至22:35:53.178Z增量，后续完局为独立留出。全历史复盘主题与实际动作/遭遇核验，出现集合只检索、不算整条支持局数。未拟权重/阈值。缺完整dirty运行源码、前五试最终结算/退出血、致死内部次序、隔离用药时点/构筑/路线/护栏的受控整场反事实、F49实到资源/战斗、实际最优完整执行率、silent时钟比及实际费用。','', '## 验证、预期影响与回退','只用固定真实状态对敏捷逐牌挡、临时力恢复、凋萎持牌数、制品施毒/实结、逐房资源来源做差分；独立实现用原test-sandbox，不改测试预算。先核当前live和既有提案/源码去重，不足waiting；其他角色及未观察条件保持等价。预期减少未兑现收益/覆盖遗漏，不承诺翻盘。本次只经验文字无源码实现，队列pending。独立源码回退父提交、经验回退父版blob并保留历史。实际规则上线先date双通知Roy旧/新规则、证据/账本/任务、影响和回退，不改运维prompt。','']
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
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第121批经验已自测提交；实际live数据shipped交运维按完成事件核实，三源码提案pending不标implemented。保留首证/prior/claim/支持/repeat/旧版本历史，0319纯bug只提案关联不改状态。'))
    result=dict(added=[],proposed=L,retired=[])
    (O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
