import json, subprocess
from pathlib import Path

O=Path(__file__).parent.resolve(); ROOT=Path('/home/dw/Projects/agent-sts2'); N='K2JAGKVJAWZJ'
C=json.load(open(O/'changes.json'))['entries']; F={r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
mapping={
 'silent-strength-weak-observation':['silent-0012'],
 'silent-mirage-poison-card-block':['silent-0010'],
 'silent-vambrace-opening-block':['silent-0013'],
 'silent-piercing-wail-temporary-strength':['silent-0046'],
 'silent-burst-next-skills-replay':['silent-0115'],
 'silent-three-knights-output-buffer-observation':['silent-0106'],
 'silent-deck-burst-observation':['silent-0021'],
 'silent-rest-buffer-observation':['silent-0020'],
 'silent-route-hp-observation':['silent-0019'],
 'silent-kaiser-crab-facing-sl':['silent-0065'],
 'silent-act-transition-missing-hp-heal':['silent-0243'],
 'silent-shadowmeld-new-block-double':['silent-0077'],
 'silent-dexterity-potion-card-block':['silent-0276'],
 'silent-heart-of-iron-plating':['silent-0277'],
 'silent-poison-potion-observed-application':['silent-0278'],
 'silent-tungsten-rod-hp-loss-observation':['silent-0178']}
cases={
 'silent-strength-weak-observation':(46,9),'silent-mirage-poison-card-block':(46,1),
 'silent-vambrace-opening-block':(46,1),'silent-piercing-wail-temporary-strength':(46,2),
 'silent-burst-next-skills-replay':(46,9),'silent-three-knights-output-buffer-observation':(46,9),
 'silent-deck-burst-observation':(46,6),'silent-rest-buffer-observation':(44,None),
 'silent-route-hp-observation':(46,None),'silent-kaiser-crab-facing-sl':(33,11),
 'silent-act-transition-missing-hp-heal':(34,None),'silent-shadowmeld-new-block-double':(33,3),
 'silent-dexterity-potion-card-block':(15,2),'silent-heart-of-iron-plating':(27,2),
 'silent-poison-potion-observed-application':(33,10),'silent-tungsten-rod-hp-loss-observation':(46,6)}
def cli(script,command,obj,label,extra=()):
 data=json.dumps(obj,ensure_ascii=False);(O/(label+'-input.json')).write_text(data+'\n')
 p=subprocess.run(['python3',str(ROOT/'learner'/script),command,*extra],input=data,text=True,capture_output=True)
 (O/(label+'.log')).write_text(p.stdout+p.stderr);p.check_returncode();return p.stdout.strip()

updates=[]
for c in C:
 for lid in mapping[c['id']]:
  known={r['run'] for r in F[lid]['evidence']};ev=[]
  for run in c['new_runs']:
   if run in known:continue
   floor,turn=cases[c['id']] if run==N else (17,5)
   e=dict(run=run,floor=floor,role='support',note='第94批静默原帧复核'+c['id']+'，局部机制与整战因果分开；详见changes.json/historical-mechanisms.json/historical-rod.json/terminal-facts.json。')
   if turn is not None:e['turn']=turn
   ev.append(e)
  u=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id']]),note='第94批经验提案预关联；保留原claim/first_run/prior/repeat及旧上线历史。钨合金棍0178复用原观察，新增更早支持不倒改原首证；提交后proposed，打法源码交独立strategy-proposal。')
  if ev:u['evidence']=ev
  updates.append(u)
cli('ledger.py','update',updates,'ledger-prelink')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-ids.json').write_text(json.dumps(sorted({i for ids in mapping.values() for i in ids}))+'\n')
(O/'ledger-added.json').write_text('[]\n')

common='''角色silent，机制仅来自自身A0—A10观察；策略只涉及已观察A10，其他角色与未知进阶保持等价。来源experience-update/20261008-101302-experience-update，第94批2026-10-08.11；目标独立strategy-proposal，授权Roy-2026-10-07-learning。本经验任务不改打法源码。
证据局K2JAGKVJAWZJ：runs.character=SILENT、A10/F46失败，代码6fd495cc+dirty、完整dirty源码快照未留。UTC首末决策2026-10-08T00:27:15.532Z—01:17:20.209Z，722决策/814帧/71实际Codex脑/7计划，DeepSeek推理0。当前源码不冒认原运行dirty树。状态按UTC二分seek并核character_id，原帧/偏移、动作前后、SL摘要在本任务scratch。
全史截至末决策124静默完局；旧123局七数组、血档、源节点转移、回复和SL复算一致。不用其他角色、缺character旧局、进行中或切点后局。分阶支持/反例名单见update-summary.json；条件化机制反例0不表示失败局0。
拟合与时间切分：不拟合出牌权重、HP阈值、药水持有价值、SL必死门槛或终局参数。本史仅诊断与固定夹具；如后续实现须把同局SL整组保留、用截止后新完局时间留出，不将一次局的多尝试当独立训练/验证局。缺完整另一策略/路线/喝药时点胜线时保持规则，记录未知，不凭预训练填补。
验证：先读最新live机制/入口及已有实施记录，有等价且实际live祖先源码commit才记duplicate。新增最小修改要固定正反例、原沙箱tsc/vitest、合前知识刷新及预检、合后测试/版本，实际规则上线双通知Roy。不承诺这局能变胜，经验数据上线不等代码implemented/shipped。
回退：独立逆向实际实现的净源码补丁，保留并行知识/记录/账本；本批经验独立恢复experience-before.json或逆向本经验提交，回退也登记版本。
'''
mechanisms=['silent-strength-weak-observation','silent-mirage-poison-card-block','silent-vambrace-opening-block','silent-piercing-wail-temporary-strength','silent-burst-next-skills-replay','silent-shadowmeld-new-block-double','silent-tungsten-rod-hp-loss-observation']
resources=['silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-dexterity-potion-card-block','silent-heart-of-iron-plating','silent-poison-potion-observed-application']
trace=[c['id'] for c in C if c['id'] not in mechanisms+resources]
groups=[
 ('mechanisms',mechanisms,['combat','terminal'],'核验零毒蜃景升级版与重放/格挡倍率、临时减力和逐击减损分源', '''旧行为：原题把未建模蜃景+方案列为lasting value 10，不能当已得10挡；当前模型可能已有等价覆盖，先核普通与升级及真实任务分支。新行为：零毒/零敏的升级蜃景当步挡0，不由未来叠毒预支；有毒按现场牌文/实际算。臂甲首触发消费、后继普通挡、爆发计数与实际重放、暗影建立后新增挡、临时降力恢复与独立成长都用真实时点分账。
证据F46T1臂甲后空翻+8→16，蜃景+耗1能、16仍16（states293158→293159，d286431，Jev0.11）；T6抑制下8毒+2敏普通蜃景10→20实增10，仍损26。T2尖啸+三敌0→−8力，前两敌20+17→4+9；T3普通减6；T5连枷3力、T8为6，不能沿用首轮少伤。末T9爆发+2层使生存者10×2=20、余1层；36攻击逐击过20挡、钨合金棍两次穿挡各少1，完整需损14而仅13血，strict额外2血；显示−1不能读成只受1伤。末击被死亡截断，实际只扣剩13。
跨史钨合金棍3局：10GPK5XGHCK3 A3/F17T5九攻/五挡损3；UJ0K3G10609Y A10/F33T7二十一攻/十二挡损8及原复盘F48单击/多击；新局T6共49攻/20挡，三次穿挡少3实损26、F43文案11实扣10。只观察已核数值，移除遗物/其他交互反事实缺失，不改变不相关伤源。三骑士T7净损与简单可见意图相差2，完整伤源/执行顺序缺帧，不把所有回合强行拟合或报新bug。
首轮换牌/换目标整场未执行，rollout的未来排名不能证明浪费该1能量是单一败因。升级蜃景未覆盖仅进入独立策略核验，不自动报新纯bug。暗影蟹首T10旧7挡施后仍7，第二试T3普通扫腿实际28；三骑士未建，不预支翻倍。预期减少虚构成长、重放重复计数及死亡截断误读；源码等价则保留。
'''),
 ('resources',resources,['combat','potion','terminal'],'核验实际能力、药水来源与跨幕回复，保留时点和终局反事实限制', '''旧行为：计划/持有能力与实建可能混用，SL恢复可能与新资源混计。新行为：若记录或事实覆盖缺失，按局/层/尝试/回合关联实建、毒结算与药栏；不改喝药/留药/终局阈值。三骑士末组34牌16升级，雾+及暗影+持有但没有建立；2敏由步法实建，前战能力/敏捷药不能跨战。
全史敏捷47局69饮均+2；铁心18局34饮均覆甲+7且旧挡不变；毒31局123饮，106次加6、头骨4局15次加7、制品2局2次阻毒耗1层。F15T2敏药，后防御7仍整战损17；F27T2铁心药前后均0挡、覆甲0→7；F33首T10毒药加6但当步不伤本体仍判死，末试未饮保留瓶胜，F45主动弃瓶换液态记忆后末战仍败。喝药时点/换瓶对整战胜因未控，保持原规则。
跨幕F17后13/70→58回复⌊57×.8⌋45，F33后28/75→65回复⌊47×.8⌋37；SL首T10的10→62恢复52不是回血、不是新获毒药。前战获/饮/弃与恢复各留单独数字；资源/持续能力必须已完成才供终局评估。没有另一构筑/提前毒雾或暗影/早喝毒瓶整战胜线，不能从持有与失败拟新规则。
'''),
 ('trace',trace,['combat','potion','sl','terminal'],'保留同首29抽帝王蟹重打与强制三骑士资源/成长对照', '''旧行为：有限模拟排名、低损开场或高进场血可能被当整场安全；当前追踪已有等价则保留。新行为：用真实层/尝试/回合/抽牌时点贯通候选、SL重放、药水与实战，不将单轮少伤或样本全败当必死证据。
帝王蟹18证据局18房9活9死，真正重打10场52试2赢；K2两试都62血/原毒瓶，首29张抽牌顺序与归属回合同，T5洗牌后已未知。首T1施毒火箭、第二T1改爪，T2改攻击与减力、T3改暗影/扫腿，后轮均变。首T10喝毒到最后10血判死退出、未实结终轮；SL恢复52血及原瓶，第二T11胜余28且原瓶还在。能说同初抽改线获胜，不能独立归因首目标/未喝药或全部归运气。
三骑士新局单尝试实死、无SL摘要，旧四局背景加新共五场2勝3敗，保持旧asc[5,7]，A10背景通过general:deck/plan给到当前高阶，不扩大未验证策略进阶。高血86/91且两药、前四轮仅净损2，T5/T6耗39/26、T8末毒杀魔法、T9仍需127伤且13血20挡死；无替focus受控胜线。
F31满75两药胜损35空药；F32实回22后蟹末试损34；F35/38/39三胜实损24/8/11（卷轴最大血95→91）；F42+27、F43文案11实扣10、F44+27得86。F45换毒瓶为液态记忆，末战液态记忆和能量实饮，不能写省药/留毒造成失败。分阶血档/源节点下一战统计见audit.json；HP/构筑/房型未控、未走替线，只是观察，不改单一阈值或统一休息优先。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
 lids=sorted({lid for eid in eids for lid in mapping[eid]})
 runs=list(dict.fromkeys(n for c in C if c['id'] in eids for n in c['new_runs']))
 p=O/f'proposal-{name}.md'
 p.write_text('# 静默猎手第94批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
 row=dict(character='silent',ledger=lids,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(p),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
 (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
 ids.append(cli('code_proposals.py','add',row,'proposal-'+name+'-cli',('--character','silent')))
(O/'proposal-ids.json').write_text(json.dumps(ids)+'\n')
print(json.dumps(ids,ensure_ascii=False))
