import json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'));L=list(dict.fromkeys(l for ls in M.values() for l in ls))
def cli(script,args,value):
 stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
 p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
 with (O/'ledger-cli.log').open('a') as h:h.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
if sys.argv[1]=='prepare':
 B={e['id']:e for e in json.load(open(O/'ledger-before.json'))}
 for lid in L:
  changes=[c for c in C if lid in M[c['id']]]
  fresh=list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if not c['before'] or r not in c['before']['evidence']))
  seen={e['run'] for e in B[lid]['evidence']}
  value=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第117批经验/提案预关联，保留旧claim/首证/prior/状态/版本；只核静默153完局，旧151局统计逐行一致。原药水/SL/尾部规则未改，提交后另记proposed。')
  evidence=[]
  for run in fresh:
   if run in seen:continue
   note='本角色原始日志重核：'+','.join(c['id'] for c in changes if run in c['after']['evidence'])+'；分阶支持与逐帧机制/资源链见本任务verified、analysis、historical-mechanism-summary；没有整战单因对照。'
   ev=dict(run=run,role='support',note=note)
   if lid=='silent-0327':
    rocks=json.load(open(O/'rock-history.json'));x=next(x for x in rocks if x['run']==run)
    u=next(u for u in x['used'] if u['hp_after'] is not None and u['hp_before']-u['hp_after']==15)
    ev.update(floor=u['floor'],turn=u['turn'],note=f'旧局蟾蜍新房空槽生石重核；实投目标{u["target"]} {u["hp_before"]}→{u["hp_after"]}扣15，玩家{u["player_before"]}不变；SL恢复和同ID索引重排另核，不外推满槽/留石。')
   evidence.append(ev)
  if evidence:value['evidence']=evidence
  cli('ledger.py',['update'],value)
 resource=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
 sl=['silent-slumbering-beetle-wake-growth','silent-ghost-in-a-jar-current-turn','silent-accelerant-triggers']
 rock=['silent-petrified-toad-opening-rock']
 mech=[c['id'] for c in C if c['id'] not in resource+sl+rock]
 specs=[('mechanisms',mech,['combat','potion'],'静默实测力敏/脆弱/暗影及敌成长分源，修刀刃之舞确定生成路径'),('resources',resource,['structure','combat','potion','terminal'],'静默路线实到节点与赢战血药分账，有限窗尾部收益与生存成本独立验证'),('sl',sl,['combat','sl','potion'],'静默甲虫与丝虫死亡时序的剩余攻击下界及触媒/无实体逐步核验'),('rock',rock,['structure','combat','potion'],'静默蟾蜍开战空槽生石、15基础伤及SL恢复分别建模')]
 details={
 'mechanisms':'FU8ZUQHBHNV9 A10 F8T4尖啸力0→−6使4×3→0，次轮恢复；T7步法+2敏双防御14仍损22，T9中和36→27、20血0挡死、敌18。456MRNGCPD8E A10 F29两次成长力7/14、猛扑23/30，T3损23、T6四敏/暗影/脆弱防御13仍损17；F30柔嫩逐牌后减力敏，T2第二步法净+1至3敏，防御8后再减，次轮回4；F31两敏暗影双防御28挡覆盖28、T6倍率撤。F17力量药+2、毒杀本体后T9弱化自爆38→28、双防御14实损14。FU F8T3技能药取得刀刃之舞0费/playable/手4但被代码结束，T4花1生成3刀各4伤；首局C48LLXBGKXQ9 F2T1已将生成误作draw3、F6T3实际添三刀。附纯bug账本0324及原postmortem提案，独立实现先查现live/队列去重，仅补普通实测生成/费用/手位，未核升级或重放保持原行为；漏12输出不保证获胜。',
 'resources':'FU8ZUQHBHNV9 F2/3/5/6胜战净损4/1/8/1，事件另补6当前与max，F7回48→70/76、强制骇鳗仍死；F7没有绕路选项，F9/17未到。F8T3 d303669五轮0/8直接胜而尾部约84%，当前打击/猎杀者损24伤21，步法/防御/打击备选损17伤6，未整场实打；先修已证生成，不由这一个结果拟权重。456MRNGCPD8E无精英线路四次各回21、餐券两次各15、跨幕14/70→58另回44；F28回43→64后赢虱虫至24、赢猎人至4、F31死，F32回21未兑现。F18原投影F29/30/31为45/34/23，实64/24/4，节点重问的当前/采用HEAL后口径分开。F17实际巨兽赢14与远期F33模拟0胜分账。拟把已达端点、每场赢战耗血、开场遗物、回复与未来能力/未获牌分源，回合内输出和即时血价日志保留；不以路线跨局比例、远期boss零胜或本次死亡推出改线/留药/早建能力必胜。',
 'sl':'已核3KME36ADUE4U A7 F27第三试T4：丝5毒可能先死导致sl-attempts:543排除甲虫，实丝退场、甲虫15攻击对4血7挡死。456MRNGCPD8E A10 F31T6 sl-attempts:1277同拒判：s312177玩家2血14挡、甲虫46血10毒/弱后16攻、丝7血4毒；s312178丝退场、甲虫三结27后19血保持16攻并玩家0，无重载。T5幽灵使20攻降1且损1，T6已撤；触媒+建2使p毒依次p/p−1/p−2，丝剩7截断不当理论9实扣。现live judge.ts对其他敌可能先死的攻击者保守排除并非纯代码bug；建议只在已观察甲虫/丝虫组合验证死亡时序和剩余攻击下界，各合法操作/未知抽牌若未排尽保持拒判。不能由每条已模拟死线判整战必死、不修改读档触发或次数、不能保证重打赢。旧SL组合3K三试零赢、新456无重打分账，药时点改动无整场受控对照。',
 'rock':'456MRNGCPD8E A10 F26得蟾蜍，F27/29/30/31新战空槽1各补石且实投15；F27原账本35→20转录已勘误，正确s312034→035为34→19、玩家57不变；F29为129→114，F30为99→84，F31丝44→29。全历史静默5支持：ZZMYZ5UBCG72 A2、2PVLGRBGUX9S A7、KUZVERN40NGK/Z91JN3S3PQX2/456 A10。按独立房只40次新房生成，50个生石转变窗含10次SL恢复，50次投石玩家HP均不变；41次无挡/未限伤的同实体读数扣15，7/9/4挡另吸收，1次现场滑溜5下扣1，退场及同ID重排不能按旧index差记负伤。保留first_run ZZ与prior yes；机制基伤15与实际剩血/挡/无实体分开，不把10恢复当新获。拟核slot/生成时机与single-target已证分支，满槽、保留旧石、未知修正没有受控证据，不推持有价0或永不缺药。'}
 ids=[]
 for name,entries,domains,summary in specs:
  lids=list(dict.fromkeys(l for e in entries for l in M[e]))
  if name=='mechanisms':lids+=['silent-0324']
  lines=['# '+summary,'','角色silent，来源experience-update，独立实现strategy-proposal。Roy-2026-10-07-learning只作授权，不提供任何游戏知识。','账本：'+','.join(lids),'经验：'+','.join(entries),'','## 旧规则、新观察及本角色局/层/回合',details[name],'']
  for ident in entries:
   c=next(c for c in C if c['id']==ident);e=c['after']
   lines+=['- '+ident+'；旧：'+(c['before']['lesson'] if c['before'] else '本角色经验库无该条')+'；新：'+e['lesson']+'；支持：'+','.join(e['evidence'])+'；反例：'+','.join(e.get('contradicting',[]))+'；适用：'+str(e['asc'])+'；账本：'+','.join(M[ident])+'。']
  lines+=['','## 拟合方法与时间切分','旧151静默完局截至2026-10-08T18:37:20.557Z为复核基线，本次两局至19:22:43.172Z为发现样本；后续新完局才作独立留出。旧基线七数组、全部血档/节点/回血/SL逐行一致；只用本角色实动作/同状态前后，50投石不当50支持局、SL尝试不当独立局。不拟血线、留药价、终局权重/次数。','', '## 拟行为、验证、限制与回退','先核当前live/原提案去重；把本角色已观察机制、模型和题面分账传播一致。出牌/药水/SL/终局人定规则已有Roy授权，但本任务数据没有整战替代胜线，证据不足保持旧规则并在独立任务逐项写waiting。验证用固定原帧及原手/抽序/已执行完整前缀，对比实际费、目标、力敏/挡/毒时序、每个敌人的残HP和攻击，再跑原test-sandbox，保留其他角色和未观察进阶策略等价。不从预训练补未知牌/机制。','完整dirty源码、替路线/早建/喝留药整场受控结果、部分退场0HP与同ID身份、所有合法操作穷举、silent时钟及实付费用缺数据。预期改善事实/估值一致性，不能承诺翻盘。回退独立源码提交至父版并保留经验/账本/提案及失败历史；实际上线后先date双通知Roy旧/新规则、证据/账本/任务、影响与回退。不改运维prompt。','本次只更新经验，源码实现均pending，只有真实live祖先源码commit才登记implemented；不称shipped。','']
  path=O/('proposal-'+name+'.md');path.write_text('\n'.join(lines))
  runs=['FU8ZUQHBHNV9','456MRNGCPD8E'] if name in ['mechanisms','resources'] else ['3KME36ADUE4U','456MRNGCPD8E'] if name=='sl' else ['ZZMYZ5UBCG72','2PVLGRBGUX9S','KUZVERN40NGK','Z91JN3S3PQX2','456MRNGCPD8E']
  value=dict(character='silent',ledger=lids,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
  (O/('proposal-'+name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
  ids.append(cli('code_proposals.py',['add','--character','silent'],value))
 (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n');print(json.dumps(ids,ensure_ascii=False))
elif sys.argv[1]=='after':
 commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip()
 for lid in L:
  entries=[c['id'] for c in C if lid in M[c['id']]]
  cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第117批经验源已自测提交；实际合入以完成事件为准，交运维核登记数据shipped。本次未改打法源码，四提案沿独立策略链，旧claim/首证/prior/证据/版本历史保持。'))
 result=dict(added=[],proposed=L,retired=[]);(O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
