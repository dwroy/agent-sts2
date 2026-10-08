import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load((O / 'changes.json').open())['entries']
R = {r['run_id']: r for r in json.load((O / 'run-metadata.json').open())}
ids = ['0012','0005','0013','0011','0027','0023','0030','0009','0062','0064','0071','0077','0010','0046','0242','0134','0253','0276','0278','0243','0019','0020','0021','0305','0306','0307']
assert len(C) == len(ids)
M = {c['id']: ['silent-'+lid] for c, lid in zip(C,ids)}
M['silent-kaiser-crab-facing-sl'].append('silent-0065')
M['silent-bygone-effigy-wake-strength'].append('silent-0239')

def cli(script, args, value):
    subprocess.run(['date'], stdout=subprocess.DEVNULL, check=True)
    p = subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:
        h.write(json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

if sys.argv[1] == 'prepare':
    (O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
    fold = {r['id']:r for r in json.load((O/'ledger-fold-before.json').open())}
    for lid in dict.fromkeys(l for v in M.values() for l in v):
        changes = [c for c in C if lid in M[c['id']]]
        old = fold[lid]
        seen = {x['run'] for x in old['evidence']}
        ev = []
        for c in changes:
            for run in c['new_runs']:
                if run in seen:
                    continue
                seen.add(run)
                ev.append(dict(run=run,role='support',note='第106批日志复核：'+c['id']+'；完整层/回合/原帧见本批audit、history及numbers-checked，单卡整战因果未控。'))
        row = dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第106批提案预关联，提交后再登记proposed；保留旧状态/claim/prior/版本和历史，不把经验发布当代码实现。')
        if ev:
            row['evidence'] = ev
        if lid == 'silent-0305':
            row.update(first_run='XTSV1U9JD34T',asc=10,prior_note='复盘原首证GXN之前又从本角色日志核到XTSV1U9JD34T F45T3/F48T4，凑三类后各加1力敏；这是可复算的更早首证更正，历史原行保留。更早同角色未有可比触发，不以自动触发认定已懂机制。')
        if lid == 'silent-0306':
            row.update(first_run='UMVLWER4CD98',asc=10,prior_note='新局之前历史静默UMVLWER4CD98已16次总观察中的9次实付6，F35T2已有7挡仍88→82；更正最早实际观察为该局，之前没有本角色可比祭品，prior unknown保持，不能把自动扣血等同学习前已懂血价。')
        cli('ledger.py',['update'],row)
    resources = ['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
    fights = ['silent-kaiser-crab-facing-sl','silent-decimillipede-reattach-poison','silent-kin-poison-sl-observation','silent-lagavulin-siphon-poison-sl','silent-bygone-effigy-wake-strength']
    mechanics = [c['id'] for c in C if c['id'] not in resources+fights]
    specs = [('mechanisms',['combat','potion'],mechanics,'核对彩虹三类触发、祭品直接血价、力敏/毒/新增挡的模型输入与实际兑现，不预支未执行效应。'),('sl',['combat','sl','terminal'],fights,'有限全败时同时保留即时血价和存活轮比较；抽牌后重问、重放及追加出牌后重算实际执行前缀，不立固定杀序。'),('resources',['combat','potion','terminal'],resources,'终态和后场资源分列实建能力、已结毒、实际血药与未到营火；路线投影与即时回血不混为同一入口。')]
    common = '''来源任务experience-update/20261008-193934；实现任务独立strategy-proposal。角色silent，本次新局QHK1XQ928TTM、UZ1T7AH49WMB、7BNC8QX746YP均A10，完整历史140静默完局；原全引擎观察不当纯Codex爬塔成绩。支持/反例局号、进阶、典型层回合及数字逐条见changes.json和historical-mechanism-summary.json；新三局0实际DeepSeek，实际Codex72请求。运行69a7b441/c70efc8c+dirty完整源码未记录，不把当前源码当对局dirty全树，不凭失败认定纯bug。

旧行为与新行为：当前提供有限整场参考、血量护栏、SL探索和终态代价。本任务只改经验文字，下面是待核实代码差异；独立实现只能补实际可证缺口，证据不足保持原规则。彩虹/祭品/暗影、临时力敏/余像/毒必须从实际状态和逐步作用分源；不能由持有或能力建立预记后轮收益。QHK F33第3/6试T3同35血/手/179及204敌血，均扣47，朝向变化使当轮14→20损血、第5轮判死→第4轮实死；两线24/24死，差6未超现护栏8宽限，不能称违反护栏。拟比较全败后的实际即时血价/存活轮数，但不据这两败调宽限或统一杀序。UZ F25四试15/80，后试T1同扣38但损14→9，抽弃/目标等同变；末T3无毒、触媒2/毒雾3已建仍无兑现，13挡对34死。7BNC F14T2单牌带毒刺击候选1/8后又实打冲刺，原短线已不对应实际前缀；只有对完整相同状态/抽牌/动作证据能比较参考误差，不强制结束回合或预言必胜。

资源与药水：QHK F24首T2祭品10→4虽增2能、抽3，后重问改防御不能仍报原23输出；重试改变T1无色/毒雾与后续抽弃且赢，不仅归省6血。末F33T4祭品/腐化撞击先15→9→7，16/22已有挡不抵，总自损8。毒药本批7饮/6恢复，饮当步加6不扣本体；139历史实饮逐项核，加毒不等已结伤害，未知题面不能由价格0推药效0。UZ T2速度药5敏在脆弱下三牌9→20多11挡、抵18零损，次轮撤；没有留药/早喝整场对照，不拟新持有价或时点阈值。QHK二幕三胜耗24/16/19、最后只38入boss；UZ跨幕67后两胜耗52、15入精英，未来F27营火未到。7BNC末火10→31实回21、boss投影24不代表精英31。新行为仅把这些实际资源边界传播到终态/后场，阈值和未执行反事实保持未知。

拟合与样本切分：先用截至4XLZURXMD872旧137局发现/复算，保留本批三新局作时间留出验证；同局SL不拆独立局。自然重打只有局部相同底板，完整同抽牌/多轮单因素控制未齐；不得用同局试次划分拟合/验证来夸大样本。彩虹新增32触发/3局（最早XTSV），祭品16动作/2局（最早UMVL），雕像27局睡醒十力，支持/反例详列JSON；出现/持有不是全部语义支持。反例0也不代表普适胜因；后方值读当场，未死部件不预加蟹怒，缓慢公式没有隔离。

验证与影响：独立实现先核当前live是否已有等价实现，已有则附实际live祖先源码commit，不重复实现；未知输入只能显式保留未知。用上述本角色固定帧测试逐步力敏、临时撤销、暗影/脆弱分源、直接HP支付、毒实结、执行前缀失效及全败局部血价。只有完整动作前缀一致才比较模型与实际；验证其他角色/未观察进阶等价，运行原沙箱/后续外部全量检查。预期改善数值和参考可追溯性，不承诺胜率或另一方案必胜。缺完整dirty源码、部分归零/召唤帧/同ID个体、护栏反事实、组件移除与改路线整场胜线、boss时钟/三幕数据。

授权与回退：Roy-2026-10-07-learning允许证据充分的规则修改，授权不提供游戏事实。本经验任务不改打法源码、不登记implemented或shipped；待独立strategy-proposal核足证据后实现。规则上线只回退具体实现commit，保留刷新/并行记录；先date在根notes/for-dai与ops/inbox-dev双通知旧规则、新规则、证据/账本/任务、预期影响及回退。不改运维prompt、不运行play/模拟池，不联网。
'''
    result=[]
    for key,domains,eids,summary in specs:
        ledger=list(dict.fromkeys(l for eid in eids for l in M[eid]))
        runs=list(dict.fromkeys(r for c in C if c['id'] in eids for r in c['new_runs']))
        md=O/('proposal-'+key+'.md')
        md.write_text('# 静默猎手：'+summary+'\n\n账本：'+','.join(ledger)+'\n条目：'+','.join(eids)+'\n\n'+common)
        item=dict(character='silent',ledger=ledger,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(md.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+key+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        result.append(cli('code_proposals.py',['add','--character','silent'],item))
    (O/'code-proposal-ids.json').write_text(json.dumps(result)+'\n')
    print('三项代码提案登记',result)
else:
    commit=(O/'source-commit.txt').read_text().strip()
    heading='## 2026-10-08 静默猎手 第一百零六次增量：3 局 A10（version 2026-10-08.23，分支 exp-silent，'+commit[:8]+'）'
    proposed=list(dict.fromkeys(l for v in M.values() for l in v))
    for lid in proposed:
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[k for k,v in M.items() if lid in v],commits=[commit],changelog=[heading]),note='第106批源提交已完成，只登记经验来源，旧首证更正及全部原历史保留；实际live数据shipped交运维据完成事件核实，代码提案仍pending。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=proposed,retired=[]),ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-heading.txt').write_text(heading+'\n')
    print('提交后proposed',len(proposed),'条')
