import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'))
L={r['id']:r for r in json.load(open(O/'ledger-fold-current.json'))}
mapping={'silent-footwork-block':['silent-0005'],'silent-gorget-plating':['silent-0016'],'silent-strength-weak-observation':['silent-0005','silent-0006'],'silent-route-hp-observation':['silent-0019'],'silent-rest-buffer-observation':['silent-0020'],'silent-deck-burst-observation':['silent-0021'],'silent-noxious-fumes-growth':['silent-0011'],'silent-accelerant-triggers':['silent-0027'],'silent-snecko-skull-poison-application':['silent-0087'],'silent-lagavulin-siphon-poison-sl':['silent-0030'],'silent-act-transition-missing-hp-heal':['silent-0243'],'silent-poison-potion-observed-application':['silent-0278'],'silent-dampen-battle-upgrade-observation':['silent-0280'],'silent-three-knights-revival-blood-price':['silent-0079']}
dh={r['run']:r for r in json.load(open(O/'dampen-history.json'))};rows={}
for c in C['entries']:
    for lid in mapping[c['id']]:
        row=rows.setdefault(lid,dict(id=lid,by='learner:experience-update',where=dict(experience=[]),evidence=[],note='第91批经验预关联；原claim、first_run、prior、repeat及旧上线历史保持，提交后proposed；源码交独立strategy-proposal。'))
        row['where']['experience'].append(c['id'])
        known={e['run'] for e in L[lid].get('evidence',[])}|{e['run'] for e in row['evidence']}
        for run in c['new_runs']:
            if run in known:continue
            if c['id']=='silent-dampen-battle-upgrade-observation':
                f=dh[run]['frames'][0];floor,turn=f['floor'],f['turn'];note='抑制前后同层所有牌区的同基ID总数守恒、升级转普通；具体前后时点与版本计数见dampen-history.json，不用混合副本仅同ID匹配推身份。'
            else:
                floor=45 if c['id'] in ['silent-footwork-block','silent-gorget-plating','silent-strength-weak-observation','silent-poison-potion-observed-application','silent-three-knights-revival-blood-price'] else 44 if c['id']=='silent-route-hp-observation' else 42 if c['id']=='silent-rest-buffer-observation' else 17 if c['id']=='silent-lagavulin-siphon-poison-sl' else 18 if c['id']=='silent-act-transition-missing-hp-heal' else 33
                turn=3 if floor==45 else 5 if floor==33 else 9 if floor==17 else None;note='GXNKW8X1XYJP原帧与复盘已核；支持'+c['id']+'，动作兑现与完整胜负因果分开；关键回合见facts.json/sl-paired-facts.json。'
            ev=dict(run=run,floor=floor,role='support',note=note)
            if turn is not None:ev['turn']=turn
            row['evidence'].append(ev)
for row in rows.values():
    if not row['evidence']:row.pop('evidence')
payload=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows.values());(O/'ledger-prelink-input.jsonl').write_text(payload)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True);(O/'ledger-prelink.log').write_text(p.stdout+p.stderr);p.check_returncode()
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n');(O/'ledger-ids.json').write_text(json.dumps(sorted(rows),indent=2)+'\n')
common='''角色silent；本次策略观察只实施已观察A10；机制有本角色A5/A6/A7/A10或对应条目历史分阶证据，其他角色及未观察组合保持等价。来源experience-update/20261008-071205-experience-update，版本2026-10-08.8，第91批；目标独立strategy-proposal，授权Roy-2026-10-07-learning。
本局GXNKW8X1XYJP：649决策、673状态、48实际Codex脑、7 SL摘要；兼容ds_*不算DeepSeek调用，实际0。UTC窗口2026-10-07T21:35:52.195Z—22:15:02.084Z。全史120静默完局、旧119局七数组/血档/转移/回血/SL逐行一致；原dirty完整源码缺失，不以当前源码冒充运行树。
拟合与切分：本次不拟合牌值、药水持有价、SL或血量阈值；原日志及截止点前历史做诊断与固定夹具，之后独立新静默局留出验证，同局SL不拆独立训练/测试。相关性不当因果。支持/反例及进阶见mechanism-evidence.json，原帧见audit.json和各局states.jsonl，单局机制与同盘见facts.json/sl-paired-facts.json。
验证与回退：先查当前live是否已有等价模型/上下文，已实现须给实际live祖先源码commit才记duplicate或implemented。否则只依据已核窗口独立实现，原入口tsc+沙箱vitest及固定正反例通过才合入并双通知Roy。回退只反向撤独立实现提交，保留知识刷新、并行记录、证据与账本。不把经验数据发布当源码实现或shipped。
'''
groups=[
('mechanisms',[e for e in C['updated'] if e not in ['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal']],['combat','potion','terminal'],'实际能力、毒结算与现场力挡核验','''旧行为/观察：末战构筑有触媒而未建立；当前模型是否已完整覆盖各入口须核，不假定新文字意味着源码缺失。F33赢战已建两雾与触媒+，末三骑士虽持有触媒+但T3被抑制为普通且未打。
拟议行为：逐入口核力量每击、敏捷每张牌挡且不追补旧挡，覆甲按当前4/3/2另计；毒雾4配头骨实补5、升级毒药7实补8、药水当步加7而不扣本体。实际触媒2层使29毒结84，31毒结90；另轮初遗物7不能并入毒公式。未建立能力/未结算毒不预支到终局，末13+23+2对40需损15、hpAfter−2与实死一致。
典型证据：GXNKW8X1XYJP F33T3/5/6及F45T1—3，F17末次T9力−2/敏0由30毒收30血、2血胜；缚魂T4→T1和触媒T2→T5伴随抽牌/防御变化，不能单归药水时点。三药全史及所有旧能力动作重新核对，条件分支保留。
反例/缺数据：制品阻毒与头骨加量是条件分支，完整覆甲减层机制、提前喝毒药、先打触媒的完整胜线与dirty源码未记录。不设一律早喝/保药/先能力规则。已有模型正确处只复用，预期改善事实覆盖，不承诺胜率。
'''),
('dampen',['silent-dampen-battle-upgrade-observation'],['combat','sl','structure'],'抑制战内版本和SL身份守恒审计','''旧行为：GXNKW8X1XYJP F45T2→T3四份SL记录把刀刃/触媒/毒性爆发/突然一拳的普通键当inserted，把+键当未入手离堆，clean前缀19/18/19/18；纯记录bug沿复盘silent-0279原提案，不放经验文字。当前draws.ts整堆升级键比较须实施前重查。
拟议行为：已核抑制窗口以同基ID前后总数守恒配对版本变化，再处理实际抽取/新增/弃牌/洗牌；同ID普通升级多副本或同帧真插牌无法唯一配对时继续保守断序。战斗按现场文本而场外deck保留升级，不预支第四刀/升级触媒次数，不擅改已建能力。
证据：dampen-history.json完整8局候选的前后牌区守恒验证（若验证发现不足以证明的局会剔除，以最终文件为准），A5 ZE8F192FKX24 F42T3—4为首证；本局F45T3刀刃4→3且实三刀，触媒额外2→1、毒性爆发12→9毒、一拳10伤/2弱→8伤/1弱仅文本变化、降级后未施放。场外升级保留、出口文本恢复。
验证：正例纯改标/普通入手及留堆/出口恢复；负例同ID多副本、真实新牌、洗回/抽牌同帧歧义、无抑制。保存不同阶段原键及实体守恒，不补未记录瞬时帧或完整抽序。反例/缺数据：未核全部牌/已建能力，也没有修后赢战对照；只预期减少假插牌与断序记录，不承诺改变末战败局。
'''),
('resources-sl',['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal','silent-three-knights-revival-blood-price'],['combat','potion','sl','terminal','structure'],'赢战资源链与复活后的同盘血价追踪','''旧观察：F34原话“最大生命强化双王续航，双火单精英保血。”后的换线投影54/p7543，实际F44赢战仅5后立即精英；未来回血不是实得资源。F45第2/末试同2血、3敏/1力/3覆甲、敌84/84/77、同五牌，Jev原选双毒，末次被代码SL换为翻滚。
拟议行为：按状态指纹及层/尝试/回合串联Jev原答、护栏/SL替换、抽牌后重问与实际执行。原双毒死亡22/24、翻滚23/24分母保留，同时记录T3实3血/0带挡/敌218对13血/7带挡/敌226；多保10血少扣8是局部对照，两线均未赢，不凭24样本定必死或调整权重。精灵四次T2自动消耗与T3主动毒药、SL恢复/新得/弃药分源。
资源证据：GXNKW8X1XYJP F35/38/40净耗56、F42实补30、F44净耗66；五火实回114、两幕补54/12、小血瓶12、果实31、四次SL恢复血/药另列。跨幕同上限缺失HP×80%向下取整只核A9/A10。候选hpAfter−2为13−15，与实死一致，不误报漏伤纯bug。
反例/缺数据：原完整dirty树、复活瞬时帧/逐击吞血、前三试退出帧、替路线/提前用药整战结果缺失。保持现有护栏/必死边界/药水和终局权重；只有缺少的事实关联字段可独立实现，已有等价则复用。预期提高可追踪性，不声称留药、回血或另一focus可以赢。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
    lids=sorted({l for eid in eids for l in mapping[eid]});runs=sorted({r for c in C['entries'] if c['id'] in eids for r in c['new_runs']})
    path=O/f'proposal-{name}.md';path.write_text('# 静默猎手第91批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
    row=dict(character='silent',ledger=lids,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
    p=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True);(O/f'proposal-{name}-cli.log').write_text(p.stdout+p.stderr);p.check_returncode();ids.append(p.stdout.strip());print(ids[-1])
(O/'proposal-ids.json').write_text(json.dumps(ids,indent=2)+'\n')
