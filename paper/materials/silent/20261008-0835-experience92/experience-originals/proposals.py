import json, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))
F={r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
H=json.load(open(O/'historical-potions.json'))
def cli(script,command,rows,label,extra=()):
    data=json.dumps(rows,ensure_ascii=False)
    (O/(label+'-input.json')).write_text(data+'\n')
    p=subprocess.run(['python3',str(ROOT/'learner'/script),command,*extra],input=data,text=True,capture_output=True)
    (O/(label+'.log')).write_text(p.stdout+p.stderr)
    p.check_returncode()
    return p.stdout.strip()

eid='silent-liquid-bronze-per-hit-thorns'
bronze=[r for r in H if r['potion']=='LIQUID_BRONZE']
ev=[]
for run in C['entries'][-1]['after']['evidence']:
    r=next(r for r in bronze if r['run']==run)
    ev.append(dict(run=run,floor=r['floor'],turn=r['turn'],role='support',note='实饮铜液后荆棘净增3，原敌本体HP不变；动作与前后状态在historical-potions.json，本局后续反伤及格挡另核。'))
existing=next((r for r in F.values() if eid in r.get('where',{}).get('experience',[])),None)
added=[]
if existing:
    bronzeid=existing['id']
else:
    first=ev[0]['run']
    entry=dict(by='learner:experience-update',character='silent',kind='potion',claim='流动铜液已见17局21次实饮均建立3荆棘，不即时扣敌HP；L2 A10多尼斯异鸟单击反3、全挡三击反9、再单击反3，实反15仍战内净耗20。逐击反伤与牌挡分源，不定早喝/留药门槛或单药胜因。',evidence=ev,first_run=first,prior='yes',prior_runs=[first],prior_note='最早K3676LU8B0UH F15T1已主动实饮，Jev原答plan2信心0.91；早于本独立条目。仅说明使用动作已做，不证明懂全部机制或最佳时点。',status='proposed',where=dict(experience=[eid]),note='先记来源以满足提交前代码提案闭环；源提交后再追加commit与changelog，不标accepted/shipped。')
    bronzeid=cli('ledger.py','add',entry,'ledger-add')
    added=[bronzeid]
    F[bronzeid]=dict(entry,id=bronzeid)

mapping={
'silent-footwork-block':['silent-0005'],
'silent-gorget-plating':['silent-0016'],
'silent-strength-weak-observation':['silent-0005','silent-0006'],
'silent-route-hp-observation':['silent-0019'],
'silent-rest-buffer-observation':['silent-0020'],
'silent-deck-burst-observation':['silent-0021'],
'silent-noxious-fumes-growth':['silent-0011'],
'silent-accelerant-triggers':['silent-0027'],
'silent-afterimage-per-card-block':['silent-0023'],
'silent-vajra-opening-strength':['silent-0049'],
'silent-wither-end-turn-loss':['silent-0024'],
'silent-rolling-boulder-start-growth':['silent-0094'],
'silent-devoted-sculptor-ritual-growth':['silent-0083'],
'silent-ceremonial-beast-threshold-growth-sl':['silent-0133'],
'silent-ceremonial-beast-ringing-one-card':['silent-0222'],
'silent-speed-potion-temporary-dexterity':['silent-0253'],
'silent-act-transition-missing-hp-heal':['silent-0243'],
'silent-dexterity-potion-card-block':['silent-0276'],
'silent-aeonglass-artifact-growth-sl':['silent-0228','silent-0239'],
'silent-queen-poison-main-target':['silent-0090'],
eid:[bronzeid],
}
pdcase={'silent-footwork-block':(49,2),'silent-gorget-plating':(49,10),'silent-strength-weak-observation':(49,10),'silent-route-hp-observation':(35,1),'silent-rest-buffer-observation':(47,None),'silent-deck-burst-observation':(49,10),'silent-noxious-fumes-growth':(48,3),'silent-accelerant-triggers':(48,5),'silent-afterimage-per-card-block':(49,10),'silent-wither-end-turn-loss':(49,10),'silent-rolling-boulder-start-growth':(49,9),'silent-devoted-sculptor-ritual-growth':(35,7),'silent-act-transition-missing-hp-heal':(18,None),'silent-dexterity-potion-card-block':(33,2),'silent-aeonglass-artifact-growth-sl':(49,10),'silent-queen-poison-main-target':(48,6)}
l2case={'silent-vajra-opening-strength':(17,6),'silent-strength-weak-observation':(17,6),'silent-ceremonial-beast-threshold-growth-sl':(17,6),'silent-ceremonial-beast-ringing-one-card':(17,8),'silent-speed-potion-temporary-dexterity':(6,2),'silent-dexterity-potion-card-block':(14,1),'silent-deck-burst-observation':(17,8),'silent-route-hp-observation':(14,1),'silent-rest-buffer-observation':(16,None)}
updates={}
for c in C['entries']:
    for lid in mapping[c['id']]:
        u=updates.setdefault(lid,dict(id=lid,by='learner:experience-update',where=dict(experience=[]),evidence=[],note='第92批经验提交前提案预关联；保留首证/prior/原claim/repeat与旧上线历史，源码交独立strategy-proposal。'))
        u['where']['experience'].append(c['id'])
        known={r['run'] for r in F[lid]['evidence']}|{r['run'] for r in u['evidence']}
        for run in c['new_runs']:
            if run in known:continue
            case=(pdcase if run=='PD9AYQVMLQW6' else l2case)[c['id']]
            evrow=dict(run=run,floor=case[0],role='support',note='本角色原帧核实支持'+c['id']+'；具体前后数值见facts.json/terminal-facts.json/本批条目，局部机制及整战因果分账。')
            if case[1] is not None:evrow['turn']=case[1]
            u['evidence'].append(evrow)
rows=list(updates.values())
for u in rows:
    if not u['evidence']:u.pop('evidence')
cli('ledger.py','update',rows,'ledger-prelink')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-added.json').write_text(json.dumps(added)+'\n')
(O/'ledger-ids.json').write_text(json.dumps(sorted(updates))+'\n')
common='''角色silent；机制按对应条目本角色历史进阶核，策略只实施已观察A10，其他角色/未观察组合保持等价。
来源experience-update/20261008-075539-experience-update，版本2026-10-08.9、第92批；实现任务strategy-proposal，授权Roy-2026-10-07-learning。本任务只更新经验，不改打法源码。
证据：PD9AYQVMLQW6 A10 F49败，UTC 2026-10-07T22:20:03.359Z—23:10:58.949Z；L2TSFU62Z57Z A10 F17败，UTC 23:15:51.935Z—23:39:42.212Z。前者1017决策/1125状态/55实际Codex脑，后者442/447/17；DeepSeek均0，完整dirty源码未记录，不以当前live源码冒认原运行树。
全史122静默完局，旧120局七数组/血档/源节点转移/回血/SL重新核；依据runs.character和states.run.character_id隔离，不用其他角色、未完局或截止点后数据。
拟合/样本/切分：本次不拟合出牌值、药水价、SL、终局权重或HP阈值。截止点前历史用于诊断和固定夹具；后续新的静默局留出验证。同局SL不拆独立训练/验证，相关性不作因果。支持/反例完整run id及进阶见mechanism-evidence.json；原始逐动作前后帧见historical-power-deltas.json/historical-potions.json/facts.json及各局states.jsonl。
验证与回退：实施前核当前live各入口；已有等价用实际live祖先源码commit记duplicate，不因经验文字变化猜测bug。缺覆盖独立实现，固定正反例、原沙箱tsc/vitest通过后合入并双通知Roy。单独逆向撤实际实现净补丁，保留刷新/并行记录/账本，不把经验数据提交称代码implemented或shipped。
'''
resource_ids=['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal','silent-aeonglass-artifact-growth-sl','silent-queen-poison-main-target','silent-deck-burst-observation']
groups=[
('mechanisms',[c['id'] for c in C['entries'] if c['id'] not in resource_ids],['combat','potion','terminal'],'现场力敏、逐牌/逐击收益和实际能力结算覆盖核验','''旧行为：代码可能已有等价机制，须查当前入口，不能把新条目视为新bug。原样持有能力、未来滚石或药水能力不当已兑现收益。
拟议行为：逐入口对照实际力每段/敏每牌，被动余像/覆甲与牌挡分源；换战能力重建。PD9 F49末T10四敏令防御9/生存者12，余像3及翻滚带8合32；生存者弃一张凋萎后持牌伤24，再23攻需损15、3血死亡，严格存活差13。F49T9滚石45+毒7使308→256；显示50但死亡前未再触发，不预支50。F48触媒+2/毒雾+3已建、F49末未建，不延续前战毒触发。
机制证据：PD9 F35T3—6仪式9使力量6/15/24/33，弱后15/22/29/36；T7尖啸42→36暂减，次轮恢复再长51，T8仅已有毒结束，57→10胜。L2 F14敏捷+2令斗篷8/生存者10/防御7，铜液3荆棘实反3+9+3=15且全挡三击亦反，胜仍耗20；F6T2速度+5后防御10抵9，下轮清临敏。L2 F17金刚杵1力令升级匕首雨两段各7，不变成格挡。
完整历史：铜液17局21饮均+3且敌HP当步不变；敏捷46局68饮+2，速度37局46饮+5；能力逐动作全史重新核，动作数不当条目支持局数。限制：力量对滚石、覆甲完整减层、药水时点整战因果及未见组合不补推。
拟议规则保持现有喝药/留药阈值；只核事实覆盖和终局未兑现能力输入，不设先能力/固定药水最佳时点。预期减少错误预支，不承诺胜率或修后本局能赢。
'''),
('resources',resource_ids,['combat','potion','terminal','structure'],'首boss胜后的血药接续与真实路线/休息资源核算','''旧行为：复盘已证明Codex知道连续boss，不能新报幕末误判bug；double-boss.json仍独立四局拟合、连续模拟未校准，本批不重拟参数。
拟议行为：保留首boss胜后同样本实际HP/药水/复活作为第二boss入口，明确跨幕回血与同幕两boss接续。实际路线节点与计划文字分别保存；未来营火/商店/能力不能当当前已得血药。
证据：PD9 F35净耗47，F37两药守住10，F39到9，F40/42/47各回21，F48以58赢但耗48、剩10空槽；F49六试均原样10空槽、无跨幕回复，末剩244/535死。F48T6聚合体16×3对18挡实耗30；首战能力齐不是续战资源齐。真正跨幕异鱼15→59补44、恶魔5→57补52，分别缺血×80%下取整。
L2 F13/16两火回42、F15事件回20，F14赢战44→24耗20且两药饮尽，boss65/70、能力0/无毒源，六试均败；阈值清8力仍8轮仅扣149，余113。F8改避第一精英后后续精英强制，F11避免文字不是无精英实线；未来步法/毒雾计划未取得，不预支成长。
全史分阶血档、REST/SHOP/EVENT源节点后战死亡率及实回血去重表仅观察：源血、房型、构筑与用药不控，不拟路线/回血对锻造因果阈值。反例/缺数据：替路线、提前用药、首战少损血的整场胜局未执行；原时钟未校准。保留现有行为，只补追踪或已核结构差异，现有等价则复用，不人工改四局数据模型。
'''),
('sl-trace',['silent-aeonglass-artifact-growth-sl','silent-deck-burst-observation','silent-ceremonial-beast-threshold-growth-sl','silent-ceremonial-beast-ringing-one-card'],['combat','sl','terminal','structure'],'有限推演、HP护栏和SL后实际执行链分账','''旧观察：PD9 F48T1饱和推演所选0/6死、0/6赢，不是全死；F49首题8/8死、末T7候选24/24死，抽牌重问后实际活到T10，原固定全线未复放，不能据此改SL必死边界。
拟议行为：按状态指纹/层/尝试/回合贯通Jev原答、支配/HP护栏、SL撤回、抽牌重问和实线出口。候选省血和真实净血分别记录，限定覆盖及样本分母，不从局部差异调药水/SL或终局权重。
同盘对照：L2 F17第2试T2护栏把预计损15/扣44改损5/扣30，实际损5/扣30；第3—6试同处被SL撤回、实损15/扣44并喝血清，不能累计五次实省10。后四次T3候选损7/扣0，后空翻后重问实际扣16/损7，候选扣敌0不等于抽牌重问后的全轮扣敌0；全场六试0赢，不由零胜样本定哪次是胜线。
阶段/出牌限额：L2第2试T5中和164→160清6力/PLOW并眩晕，末T6一拳168→159清8力/取消28攻。末T8昏眩1只打精密瞄准16后余1能，四张BlockedByHook，17血0挡受17亡；没有防御/药，不报未打防御bug。末T6Jev0.94结束放弃题面零损打击+侧步线7伤/后轮能量，但整场候选1200样本均0赢、完整替线未打，不声称补打能胜。
另保留普通生存者无绷带弃牌消费旧bug silent-0268（首证53FLQ68CETW0）：PD9末模型−1，真实弃一张后32挡对47需损15、余血算术−12。代码交已有独立修复链，不重复建bug编号、不当真实额外损11或修后必胜。缺dirty源码/前五试完整末结算/替代胜线，保持现有护栏、药水、SL必死规则；只实施缺失追踪覆盖。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
    lids=sorted({l for e in eids for l in mapping[e]})
    runs=sorted({r for c in C['entries'] if c['id'] in eids for r in c['new_runs']})
    path=O/f'proposal-{name}.md'
    path.write_text('# 静默猎手第92批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
    row=dict(character='silent',ledger=lids,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    ident=cli('code_proposals.py','add',row,'proposal-'+name+'-cli',('--character','silent'))
    (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
    ids.append(ident)
    print(ident)
(O/'proposal-ids.json').write_text(json.dumps(ids)+'\n')
