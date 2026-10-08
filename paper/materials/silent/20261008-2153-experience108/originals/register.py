import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
RUN='PF90JTU0UZ5M'
C=json.load((O/'changes.json').open())['entries']
M={
'silent-footwork-block':['silent-0005'],
'silent-strength-weak-observation':['silent-0012'],
'silent-giant-explosion-window':['silent-0017'],
'silent-route-hp-observation':['silent-0019'],
'silent-rest-buffer-observation':['silent-0020'],
'silent-deck-burst-observation':['silent-0021'],
'silent-deadly-poison-application':['silent-0007'],
'silent-bouncing-flask-poison':['silent-0007'],
'silent-noxious-fumes-growth':['silent-0011'],
'silent-accelerant-triggers':['silent-0027'],
'silent-pumpkin-candle-charge-energy':['silent-0185'],
'silent-gardener-skittish-shield':['silent-0209','silent-0211'],
'silent-toxic-paid-exhaust-end-turn-loss':['silent-0214'],
'silent-myte-toxic-block-sl-observation':['silent-0079'],
'silent-poison-potion-observed-application':['silent-0278'],
'silent-fortifier-existing-block-triple':['silent-0225'],
}
assert set(M)=={c['id'] for c in C}
L=list(dict.fromkeys(l for v in M.values() for l in v))
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
    for lid in L:
        linked=[c for c in C if lid in M[c['id']]]
        evidence=list(dict.fromkeys(r for c in linked for r in c['after']['evidence']))
        known={p['run'] for p in F[lid]['evidence']}
        missing=[r for r in evidence if r not in known]
        row=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in linked]),note='第108批经验提案预关联；逐帧/层/回合见numbers-checked、fortifier-history、poison-potion-history及audit；保留旧claim/状态/prior/版本与重复错误历史，提交后登记proposed。')
        if missing:
            row['evidence']=[dict(run=r,role='support',floor=22 if r==RUN and lid in ['silent-0079','silent-0214','silent-0278'] else 9 if r==RUN and lid in ['silent-0209','silent-0211'] else 17 if r==RUN and lid in ['silent-0005','silent-0017','silent-0027','silent-0225'] else 21 if r==RUN and lid=='silent-0011' else None,note='本角色原日志核实：'+','.join(c['id'] for c in linked)+'；机制/观察支持与单组件整战胜因分开。') for r in missing]
        if lid=='silent-0225':
            e=linked[0]['after']
            row['claim']=e['lesson']
            row['first_run']=e['evidence'][0]
            row['note']+=' 固化新增完整历史16局23饮，最早LRN0HPZ0FZS1 F33T7已有10→30早于原BJL首证；仅CLI追加首证/claim更正，prior unknown保留，原行不改。'
        cli('ledger.py',['update'],row)
    replay=['silent-myte-toxic-block-sl-observation','silent-deadly-poison-application']
    resources=['silent-route-hp-observation','silent-rest-buffer-observation']
    mechanics=[c['id'] for c in C if c['id'] not in replay+resources]
    specs=[('mechanisms',['combat','potion'],mechanics,'静默实建敏捷、毒结算、已有挡倍增及完整持牌伤分源'),('resources',['structure','potion','terminal'],resources,'静默路线真实问号战血药链及未到恢复节点不预支'),('replay',['combat','potion','sl'],replay,'静默SL同底板锚线重放保留当轮血价及后继生存约束')]
    ids=[]
    H={c['id']:c for c in C}
    for name,domains,entries,summary in specs:
        path=O/('proposal-'+name+'.md')
        ledgers=list(dict.fromkeys(l for e in entries for l in M[e]))
        lines=['# '+summary,'','角色：silent。新证据PF90JTU0UZ5M A10；既有机制A0—A10分阶见historical-mechanism-summary，策略范围沿经验，不改其他角色/未观察变体。','来源任务：experience-update；实现任务：strategy-proposal；授权：Roy-2026-10-07-learning。','账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 每条经验的旧/新证据']
        for ident in entries:
            c=H[ident]
            lines+=['- '+ident+'（账本'+','.join(M[ident])+'）：旧：'+(c['before']['lesson'] if c['before'] else '本角色经验库尚无固化专条，原复盘0225记录11→33。')+' 新：'+c['after']['lesson']]
        lines+=['','## 已核盘面与限制','F22第3/4试T1同3血0挡3能2敏、同五手、敌58/57；原防御两打击整轮扣26/损0，SL锚线毒药两打击扣31/损2。末次T2再改步法，多敏不追补旧挡，T3三挡27对19攻及两毒素10，完整需损2、至少3血才存活，实死且敌58/16。原判官与完整推演已经计入持牌伤，未发现漏算纯bug。','F17普通药瓶9毒＋普通触媒1，9＋8=17毒伤；中和3另计。T9蒸汽41/虚弱，T10爆30、四敏三挡27实损3。固化16局23饮B→3B，毒药36局144饮按常态/头骨/制品分账。','资源F19/20/21三胜65→47→21→3，问号F21实损18；未来F23店/F27/29/32火未到。本局含SL恢复原瓶，不当新增药/回血。','支持/反例按experience的12位run id，逐条分阶/动作/遭遇见historical-mechanism-summary；血档统计/重打对照见audit、rest-summary、sl-summary；公式反例0不等无死亡或单组件必胜。','缺完整dirty运行源码、截断尝试退出/未执行结算、部分独立0血/毛伤、毒素/敌毒/攻击同帧内部时点、提前喝毒药/锻造/改线/原锚线整场反事实；不据缺数据强喝或强制探索。','','## 旧规则与建议新行为']
        if name=='mechanisms':
            lines+=['旧：当前参考模型对敏捷、毒素已有相应计算；本局毒药题面仍称数值未知/效果未模拟，固化可能已有模型须先核当前源码。','新：独立任务按当前源码去重；固定同角色帧复现普通触媒逐结减1、固化只乘饮用时已有挡、敏捷不追补、毒药不即时伤；未建模药效明示未知。完整末回合生存须包含敌攻和已知持牌伤。已正确模型保持等价，不从相关性加药水优先级。']
        elif name=='resources':
            lines+=['旧：F18线路投影普通战11、问号0，F27预计32；F21奖励题幕初战斗计数按定义排问号，仅2场，而实际资源链已3战。','新：结构展示补已发生问号战/净损与距实际恢复点剩余战，不混统计定义；未来店/营火的收益只在抵达后的分支标记。本轮仅观察，不据12房7死拟安全血线或固定避战、留药门槛。静默尚无时钟估伤字段，保留未知。']
        else:
            lines+=['旧：sl/explore.ts的replayChoice为到达探索点恢复锚线路径；本局替防御线仍当轮存活，符合现有准入但多损2。后轮探索同时改变了步法，缺原线整场胜果。','新：独立任务记录锚线/原答同盘损血、实结伤和后继需求，审计能否区分有血缓冲与单血边界。证据只支持保留血价，不足定统一禁止重放、毒药提前喝或更高阈值；若无法固定对照验证则waiting。先查原postmortem提案f6f3783ef2387b07及实际live祖先，不重复冒认实现。']
        lines+=['','## 拟合、验证、预期影响、回退','冻结历史141局截止2026-10-08T11:38:44.123Z作兼容复核；本新局为发现集，后续新silent完局才是时间留出，不把本局同时作独立验证。机制按真实文本/动作帧算术核验，未拟合经验参数或胜率阈值。','独立strategy-proposal工作树核当前实现，使用固定已观察进阶夹具；撤改应失败、恢复应通过，再跑原test-sandbox。无关角色/未观察变体保持等价。没有足够受控比较时保存waiting理由；经验发布不等代码实现。','预期使事实/显示/审计与实盘一致，不宣称胜率提高。回退为独立实现commit revert，保留经验/账本/提案历史；本提案无implemented_commit，不登记implemented/shipped。','']
        path.write_text('\n'.join(lines))
        item=dict(character='silent',ledger=ledgers,runs=[RUN],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],item))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print('提案',','.join(ids))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip()
    heading='2026-10-08 静默猎手 第一百零八次增量：1 局 A10（version 2026-10-08.25，分支 exp-silent，'+commit[:8]+'）'
    for lid in L:
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[e for e in M if lid in M[e]],commits=[commit],changelog=[heading]),note='第108批源经验已提交；实际数据shipped交运维根据live完成事件登记，独立策略提案尚未实现。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-heading.txt').write_text(heading+'\n')
    print('proposed',len(L))
