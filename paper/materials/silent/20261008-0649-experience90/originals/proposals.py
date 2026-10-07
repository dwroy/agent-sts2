import json,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');C=json.load(open(O/'changes.json'));L={r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
mapping={'silent-strength-weak-observation':['silent-0005','silent-0006'],'silent-route-hp-observation':['silent-0019'],'silent-rest-buffer-observation':['silent-0020'],'silent-deck-burst-observation':['silent-0021'],'silent-accelerant-triggers':['silent-0027'],'silent-knowledge-demon-healing-sl-observation':['silent-0079','silent-0102'],'silent-paels-flesh-third-turn-energy':['silent-0189'],'silent-knowledge-demon-sloth-replay-observation':['silent-0247'],'silent-act-transition-missing-hp-heal':['silent-0243'],'silent-hand-trick-sly-card-limit':['silent-0274']}
new=[c for c in C['entries'] if c['after']['scope'].startswith('potion:')];payload=[]
for c in new:
 e=c['after'];payload.append(dict(by='learner:experience-update',character='silent',kind='potion',claim=e['lesson'],evidence=[dict(run=n,role='support',note='同角色原日志逐饮用核对，完整层/回合/时点与前后帧见本任务historical-potions.json；支持按独立局去重，局部机制不当整战胜因。') for n in e['evidence']],first_run=e['evidence'][0],prior='unknown',prior_note='首次实饮前没有同角色可比的实际药效窗口；这里只登记剂量与触发事实，不能由首个正确饮用反推预训练或未用药胜因。',status='observed',where=dict(experience=[e['id']]),note='新汇总机制，当前经验任务预关联，提交后改proposed；不登记accepted/shipped。'))
s=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in payload);(O/'ledger-add-input.jsonl').write_text(s)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'add'],input=s,text=True,capture_output=True);(O/'ledger-add.log').write_text(p.stdout+p.stderr);p.check_returncode();added=p.stdout.split();assert len(added)==3
for c,lid in zip(new,added):mapping[c['id']]=[lid]
rows={}
for c in C['entries']:
 for lid in mapping[c['id']]:
  row=rows.setdefault(lid,dict(id=lid,by='learner:experience-update',where=dict(experience=[]),evidence=[],note='第90批经验提案预关联；原claim、首证、prior、repeat和旧上线历史保留，提交后proposed，源码另交strategy-proposal。'))
  row['where']['experience'].append(c['id'])
  known={e['run'] for e in L.get(lid,{}).get('evidence',[])}|{e['run'] for e in row['evidence']}
  for n in c['new_runs']:
   if lid in added or n in known:continue
   row['evidence'].append(dict(run=n,floor=33 if c['id'] not in ['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal'] else 30 if c['id']=='silent-route-hp-observation' else 32 if c['id']=='silent-rest-buffer-observation' else 18,role='support',note='KFRDELW2TH2P原帧/复盘与35→36毒勘误已核；支持'+c['id']+'，实际行动与胜负因果分开，详细回合见facts.json。'))
for row in rows.values():
 if not row['evidence']:row.pop('evidence')
s=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows.values());(O/'ledger-prelink-input.jsonl').write_text(s)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=s,text=True,capture_output=True);(O/'ledger-prelink.log').write_text(p.stdout+p.stderr);p.check_returncode()
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n');(O/'ledger-ids.json').write_text(json.dumps(sorted(rows),indent=2)+'\n');(O/'ledger-added.json').write_text(json.dumps(added,indent=2)+'\n')
common='''角色silent；本批新策略观察限A10，机制只在已观察进阶/组合核验，其他角色与未观察条件保持等价。来源experience-update/20261008-061302-experience-update，2026-10-08.7，第90批；实现任务独立strategy-proposal，授权Roy-2026-10-07-learning。
证据局KFRDELW2TH2P：F28T2敏捷药及两防御/手上技法；F33六试T2铁心、T4回血与加3力、T5触媒、首/第三试T6同盘、六次T7奇巧/毒药。原日志587决策/620状态/35实际Codex脑/8 SL记录；DeepSeek0。勘误36毒优先。全史119静默完局截至2026-10-07T21:30:23.239Z，历史动作与层/回合保存在historical-potions.json/audit.json/facts.json，支持/反例/分阶详mechanism-evidence.json，不把读档当独立局。
拟合与切分：本次不拟合药水持有价、胜率或HP门槛，先用上述固定快照做局部差分验证，截止点后的新静默可比完局留出验证。历史29毒药局的制品阻挡/头骨加量分条件，未知组合保持旧分支。胜负相关性不能代替因果。
验证及回退：独立实现跑既定tsc+沙箱vitest，固定快照核合法动作、能力层/药槽/HP与毒结算；无关角色和未观察等级等价。实现后才按真实live祖先登记implemented、通知Roy，原记录不得冒标。各新增条件/事实入口独立撤提交即可恢复旧行为，保留账本/证据/历史及知识刷新。
'''
groups=[
('mechanisms',['silent-strength-weak-observation','silent-accelerant-triggers','silent-paels-flesh-third-turn-energy']+[c['id'] for c in new],['combat','potion'],'已观察药效和能力的分时点模型覆盖核验','''旧行为：本局毒药候选一直标数值未知，已有observedPoison入口仅覆盖已观察双boss；现场37→43毒却未供恶魔候选。已有力量、敏捷、触媒、覆甲和肉的公式先与本角色实帧比对，不能凭新经验文字假定源码缺失。
拟议行为：窄范围核无加量/制品的毒药6层与触媒1两结；若已有源码/数据等价就记duplicate，否则独立实现输入已核药效和现场修饰条件。敏捷药2敏逐牌兑现、铁心建7覆甲不即补牌挡且后轮按当前层，肉T3起4能；力量逐击和触媒不倍增层数与原模拟逐项差分。历史剂量核44局64敏捷饮/16局26铁心饮/29局118毒饮；条件外不补预训练事实。
反例/缺数据：制品两局阻毒、头骨三局加量是条件分支，不是基础6反例；提前饮毒、换药时点完整胜线未执行，不设一律早喝、持有价或静态优先级。铁心减层的完整触发条件未隔离，不能由7→2推每轮固定减1。预期影响是减少已核窗口模型未知，整局胜率未知。
'''),
('sl-selection',['silent-hand-trick-sly-card-limit','silent-knowledge-demon-sloth-replay-observation','silent-knowledge-demon-healing-sl-observation','silent-deck-burst-observation'],['combat','sl','terminal','structure'],'奇巧可执行后续、SL血价与实际终结核验','''旧行为：六次T7奇巧均给爆发，随后三牌满懒惰，爆发剩能仍锁；首/第三试T6代码探索删第二斗篷换毒药，多10扣敌、多6损血，未赢。T5懒惰0血价是历史平均出牌数条件估值，不是本组合免费收益；旧重放计数修复0245不是本次根因。
拟议行为：选择上下文补当前剩牌额度/能量/可执行后续序列，把无法施放的奇巧对象收益记未兑现；不固定选防御、不固定禁爆发。SL及终局评估同时登记15血/228敌/36毒/3覆甲时的12挡→6挡、损6→12和净扣83→93；死亡模拟饱和不由敌余血更少判更安全，保持当前严格必死规则与随机抽牌未知边界。敌T4回复30、末需总429/已扣355/残74与玩家22完整需损分开，避免把可见未结毒/未施能力当胜线。
缺数据：没有奇巧换对象/顺序、其他诅咒、提前喝毒药或完整护栏替线的整战反事实。F12候选护栏0损线在生成小刀后重问，实际不同线损6，不能把候选0对实6报纯bug或补固定阈值。现有纯工具追踪问题沿复盘提案，若上下文已等价记duplicate；预期只提高兑现事实和比较可解释性，胜率未知。
'''),
('resources',['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal'],['structure'],'赢战血价、已到回血与跨幕回复事实分源','''旧观察：本局选三火零精英、六次回血仍失败；F29后异螨/虱祖赢战净耗50，F32仅到36，恶魔开场38。计划中的步法/尖啸并未取得，F18投影boss入70而实36，构筑和药水也变。
拟议行为：核路线/休息输入是否保留前序赢战实际血价、入房与可操作HP、已到营火和当时牌组，若等价记duplicate；不同来源恢复分列。营火126、幕间⌊48×0.8⌋=38、小血瓶20、SL恢复145及药槽恢复10次分别记，不将SL恢复当路线回血。跨幕80%公式仅核已观察A9/A10，不外推低阶/先古组合；不改安全节点/锻造阈值。
缺数据：没有可比替路线/回血对锻造完整胜负对照，六次回血不能据败局判错；各阶/幕/房型与源节点后战的实死率是观察、多源可同战，不能拟合因果。预期提高资源事实一致性，胜率未知。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
 lids=sorted({lid for eid in eids for lid in mapping[eid]});path=O/f'proposal-{name}.md';path.write_text('# 静默猎手第90批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
 row=dict(character='silent',ledger=lids,runs=['KFRDELW2TH2P'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning');(O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
 p=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True);(O/f'proposal-{name}-cli.log').write_text(p.stdout+p.stderr);p.check_returncode();ids.append(p.stdout.strip());print(ids[-1])
(O/'proposal-ids.json').write_text(json.dumps(ids,indent=2)+'\n')
