import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load((O/'changes.json').open())['entries']
M=json.load((O/'ledger-map.json').open())
L=list(dict.fromkeys(l for v in M.values() for l in v))
F=json.load((O/'ledger-fold-before.json').open())
F=F if isinstance(F,dict) else {e['id']:e for e in F}

def cli(script,args,value):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as f:f.write(json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()

if sys.argv[1]=='prepare':
    for lid in L:
        changes=[c for c in C if lid in M[c['id']]]
        known={e['run'] for e in F[lid]['evidence']}
        missing=list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if r not in known))
        item=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第109批经验预关联；原帧/层/回合见本批numbers-checked、heart-history、audit，旧claim/first_run/prior/状态/版本及repeat历史保持，提交后登记proposed。')
        if missing:
            item['evidence']=[dict(run=r,role='support',floor=14 if r=='SY0WMJNNVRLM' and lid=='silent-0277' else 8 if lid in ['silent-0209','silent-0211'] and r=='2H311EAD34GD' else 4 if lid=='silent-0170' else 17,note='本角色原日志核实'+','.join(c['id'] for c in changes)+'；完整机制支持与单组件整战因果分开，历史漏计另在报告说明。') for r in missing]
        cli('ledger.py',['update'],item)
    resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-fishing-rod-random-upgrade']
    replay=['silent-lagavulin-siphon-poison-sl','silent-ceremonial-beast-threshold-growth-sl']
    specs=[('mechanisms',['combat','potion'],[c['id'] for c in C if c['id'] not in resources],'静默实建力敏、负属性、覆甲剩量、毒与反伤结算及单牌限制核验'),('resources',['structure','potion'],resources,'静默路线已发生战斗血药链、恢复节点及随机升级组件验收'),('replay',['combat','sl'],replay,'静默全败模拟同盘探索保留少挡换伤血价及后继需求')]
    H={c['id']:c for c in C}
    ids=[]
    for name,domains,entries,summary in specs:
        ledgers=list(dict.fromkeys(l for e in entries for l in M[e]))
        runs=list(dict.fromkeys(r for e in entries for r in H[e]['new_runs']))
        path=O/('proposal-'+name+'.md')
        lines=['# '+summary,'','角色：silent；新观察A10，既有机制A0—A10按historical-mechanism-summary分阶，策略只在实际已观察进阶验证。','来源任务：experience-update；实现任务：strategy-proposal；授权：Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 每条经验的旧规则与新证据']
        for e in entries:
            c=H[e]
            lines+=['- '+e+'（账本'+','.join(M[e])+'）：旧：'+c['before']['lesson']+' 新：'+c['after']['lesson']+' 新增证据：'+','.join(c['new_runs'])+'。']
        lines+=['','## 已核层、回合与反例','2H311EAD34GD A10 F17第4/5次T4同完整手牌/52血/3敏/6覆甲：防御线实扣25、损1；探索撤防御实扣31、损9，B2均0/1200，五轮均0/24死却整战预计耗尽52。第4/5次后来T14/T12截断，后继抽牌/动作亦变；六次0赢。末次T7/T11吸取后玩家力−4敏−1，T12两挡8对25、11血完整需损17死，敌余79。','WZL2AMEY85S7 A10 F17第1/3次T4同手牌/20血/3能/敌216血、4力、7毒：防御线整轮扣28损13；三打击线扣34损18，题面伤25/31未包括荆棘3。两线B2均0，第三次各1200；五轮各24/24死。六次0赢，后继不同，不能将更早T7死全归T4。','WZL末T5尖啸6→0力、26→20攻，16挡损4；T6回力并成长8，11毒把166→155跨PLOW160，取消21攻击；T8仍17跺地。昏眩1下生存者8挡后余2能/余牌blocked，8血完整需损9死；21毒＋荆棘3只使133→109。末试行动75＋毒63＋荆棘15＝153，不借未来毒/未抽11挡。','两局各四火各回21，共84；前七胜分别净耗82/91，事件耗6/9，56＋84−82−6＝52与56＋84−91−9＝40进boss。第二局避精英后F13/14仍损37；钓鱼竿仅F4/F13升级防御/打击，三毒雾未升。','历史铁心本次全日志42饮/21局均当步覆甲+7、旧挡不变；原19局35饮遗漏SY0WMJNNVRLM A10 F14T1一饮，本次CLI补支持，不更改旧claim/首证/prior。其余反例见条目的contradicting，失败局不自动当公式反例。','支持/反例和进阶逐条见experience、historical-mechanism-summary；原始字节窗/样本/数字见本批audit、numbers-checked、baseline-check。未记录完整dirty运行源码、SL截断后的动作结算、部分独立归零/毛伤、同帧内部时点及替代路线/构筑/纯换一牌或药时点的整场结局。','','## 建议实现与边界']
        if name=='mechanisms':
            lines+=['旧：当前参考实现可能已计入负力量/敏捷、临时减力、毒跨阈值、荆棘和昏眩。完整运行dirty源码未知；不按失败直接认定纯bug。','新：独立任务先查当前源码和已登记复盘提案，固定复现实际组件与净属性。动作/毒/荆棘分账；模拟完整需损与实际0血截断分开；覆甲只用剩层，昏眩单牌与未抽到牌/余能量分别展示。已正确模型保持等价，不据本两局调药水持有权重、喝留阈值或断言某卡必胜。']
        elif name=='resources':
            lines+=['旧：路线题条件HP/胜率及计划want可能与实际后续失血、药槽或随机升级不同；WZL F12回血后投影boss70/88%，实到40，不能用概率单结局差值直接认定模拟bug。','新：结构题显示已发生每场真实净损、实际药槽、距离下一恢复点仍需付的战斗血价；未知恢复/未取得组件/随机升级不写成已兑现。将钓鱼竿3/6次随机升级与具体升级牌验收关联；不能因输局硬改休息、避精英或留药政策。需要固定帧证明题面漏实况才改显示。']
        else:
            lines+=['旧：参考sl/explore.ts:1506允许B2不劣的未试线；全败并列也进入探索，族母探索可能撤掉HP护栏已选防御。行为符合既定取舍，不认定纯bug。','新：独立任务按原同抽/同盘面夹具核少挡的真实血价与后继需伤，区分五轮生存分布和整场胜率。先审计/显示并保存原选与探索选的两组数；若要改准入/阈值，需本角色受控后继或新增完整胜次，不凭两场六败拟统一禁止探索。证据不足保持原规则并登记waiting；Roy授权不代替游戏事实。']
        lines+=['','## 拟合、验证、影响与回退','历史142局截至2026-10-08T12:06:47.125Z为兼容核验集，本次两局为发现集，后续新silent完局才作为时间留出。机制按真实文本和动作算术核验，没有拟合经验参数、胜率或安全血线；不把发现局同时当独立验证。','固定复现上述层/回合，与当前live代码去重后再改；已有模型正确则保持等价并记录duplicate的真实live祖先源码commit，缺整场证据写waiting。不影响其他角色或未观察变体。必要实现需原test-sandbox入口通过和固定夹具验证，完整外部由调度器另跑。','预期提高事实展示与模拟账目的可追溯性，不承诺胜率提升。回退独立实现commit并恢复旧行为，保留经验/账本/提案。此提案pending、无implemented_commit；经验上线不代表代码已实现或账本shipped。','']
        path.write_text('\n'.join(lines))
        item=dict(character='silent',ledger=ledgers,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],item))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print('提案',','.join(ids))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip()
    heading='2026-10-08 静默猎手 第一百零九次增量：2 局 A10（version 2026-10-08.26，分支 exp-silent，'+commit[:8]+'）'
    for lid in L:
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[e for e in M if lid in M[e]],commits=[commit],changelog=[heading]),note='第109批源经验已提交；实际数据shipped交运维据live完成事件核实，独立策略提案尚未实现，不覆盖旧claim/首证/prior/证据/旧版本历史。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-heading.txt').write_text(heading+'\n')
    print('proposed',len(L))
