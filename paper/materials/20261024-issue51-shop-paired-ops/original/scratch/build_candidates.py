import json,pathlib,hashlib,collections,datetime
S=pathlib.Path(__file__).parent;W=pathlib.Path.cwd();ROOT=S.parent
M=json.load(open(W/'paper/materials/20261024-issue51-speed-ops/inputs/issue51-decision-shop-001-20261024.json'))
stats=json.load(open(S/'shop-statistics.json'));xs=json.load(open(S/'shop-enriched.json'));sels=json.load(open(S/'selected-context-offsets.json'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def compact_strata(key):return [{k:v for k,v in r.items() if k!='decision_offsets'} for r in stats[key]['strata']]
text={
'joint-budget':'购买与删牌各自买得起时，先比较同一笔金币能完成的整套方案，再决定把预算给哪边。证据局100金币买51金币翻越撑击后剩49，原100删牌已不可付；另一局162金币先删100后仍能买52药。A10无重试证据购买互斥125机会/84局、选择删牌28/27；重试或判死组522/280、142/127。\n范围：Silent A10/自有版本unknown；只证明预算互斥与实际执行，不证明买牌或删牌更好，不固定删牌优先。',
'affordable-stop':'有可负担商品时也把离店留金列入比较，先分清库存为空、报价超金币和主动不买，别把打折当购买理由。证据局42金币面对25金币打折群蛇仍离店，金币保持42；113金币面对100删牌和37精准仍离店。A10无重试证据可负担价格代理离店74机会/53局、全价不可负担143/82；重试或判死组328/188、650/300；明确留金理由子集分别9/8、32/30。\n范围：Silent A10/自有版本unknown；价格代理不保证药栏等合法条件。原理由仅表意图，未证留金收益，也非打折牌一律不买。',
'golden-reserve':'已持SEAL_OF_GOLD时，把保留金币的战斗用途与本店补强一起比较，避免因为商品买得起就花尽，也不设统一留金线。证据局76金币原样离店；同局另一店仍先买78金币残影，203→125。A10无重试证据有可负担价格代理仍离店5机会/3局、实购2/2；重试或判死组57/24、97/27。\n范围：仅Silent A10/自有版本unknown且实际持黄金印；原遗物牌文含花金币获能量但数值占位未知，不能算固定回合预算。两组局重叠，未证留金胜率收益。',
'curse-removal':'付费删牌可用且当前确有可删诅咒时，把其当前牌文造成的限制与基础牌、购物的取舍一起比较，别默认删打击。两局实际各付100移除NORMALITY，151→51与189→89；牌文记录每回合不能打出超过3张牌。A10无重试证据删诅咒5机会/5局；重试或判死组24/24。持其他诅咒却删非诅咒另有8/8与31/28，说明目标不可一概而论。\n范围：Silent A10/自有版本unknown，先核实际可删目标；不含不可删诅咒的假设。NORMALITY两例均终败，未证删诅咒因果收益或必优先。',
'nonbasic-removal':'当前非基础牌的费用、条件或用途不再合适时，也把它列入付费删牌比较，和基础牌、购买及离店一起审查。实际各付100删TORIC_TOUGHNESS或TACTICIAN，328→228、204→104；前者当前2费，后者当前3费且牌文有奇巧，不据名字补机制。A10无重试证据非基础非诅咒移除1机会/1局；重试或判死组9/9，十局最终均败。\n范围：Silent A10/自有版本unknown，仅提示扩展真实目标比较，不固定删除这些牌、不把旧理由或模型推断当收益。基本牌删除另账，不用稀疏样本排名。',
'upgrade-aware-removal':'同时持有升级和未升级打击、准备付费删牌时，按每张实际费用与牌文分别比较目标，不只按同一ID或升级号决定。证据局付100删未升级打击而留升级版，牌文6/9伤；反例局当前打击却为0费9/12伤并删了MEMENTO_MORI。A10无重试证据混持后删牌4机会/3局，均删未升级打击；重试或判死组20/17中13/10删未升级打击，另7机会选择其他目标。\n范围：Silent A10/自有版本unknown，费用和牌文以当前快照为准；样本终局均败，未证保留升级牌或删打击的收益。'
}
groups={
'joint-budget':['joint_budget_purchase','joint_budget_remove'],
'affordable-stop':['close_affordable_price_proxy','close_no_affordable_price_proxy','close_empty_stock_no_remove','active_affordable_keep_rationale','sale_affordable_close'],
'golden-reserve':['golden_affordable_close','golden_affordable_purchase'],
'curse-removal':['paid_curse_removal','curse_present_other_removal'],
'nonbasic-removal':['paid_nonbasic_removal','paid_basic_removal'],
'upgrade-aware-removal':['mixed_strike_removal','mixed_strike_plain_removed']}
labels={
'joint-budget':'Purchases and removal can exhaust the same shop budget',
'affordable-stop':'Affordable stock does not establish intent to buy',
'golden-reserve':'Seal of Gold gives saved gold a combat use',
'curse-removal':'Paid curse removal competes with other current targets',
'nonbasic-removal':'Paid removal can target nonbasic cards',
'upgrade-aware-removal':'Mixed Strike upgrades require separate removal target comparisons'}
def eq(field,value):return {'op':'eq','field':field,'value':value}
def anycard(card,upgraded=None):
 a=[eq('card.id',card)]
 if upgraded is not None:a.append(eq('card.upgraded',upgraded))
 return {'op':'any','field':'player.deck','arg':a[0] if len(a)==1 else {'op':'and','args':a}}
preds={
'joint-budget':{'op':'and','args':[{'op':'exists','field':'player.gold'},{'op':'exists','field':'shop.stock'},{'op':'exists','field':'shop.prices'}]},
'affordable-stop':{'op':'and','args':[{'op':'exists','field':'player.gold'},{'op':'exists','field':'shop.stock'}]},
'golden-reserve':{'op':'and','args':[{'op':'contains','field':'player.relics','value':'SEAL_OF_GOLD'},{'op':'exists','field':'player.gold'},{'op':'exists','field':'shop.stock'}]},
'curse-removal':{'op':'or','args':[anycard(c) for c in ['NORMALITY','INJURY','CLUMSY','REGRET','SHAME','POOR_SLEEP','DEBT','DOUBT','SPORE_MIND']]},
'nonbasic-removal':{'op':'or','args':[anycard(c) for c in ['TORIC_TOUGHNESS','TACTICIAN','MEMENTO_MORI','INFINITE_BLADES','FAN_OF_KNIVES','METAMORPHOSIS','PRECISE_CUT','FINISHER','KNIFE_TRAP']]},
'upgrade-aware-removal':{'op':'and','args':[anycard('STRIKE_SILENT',True),anycard('STRIKE_SILENT',False)]}}
provenance={'batch':'20261024-184318-strategy-proposal','plan_id':M['batch_plan_id'],'input_manifest_sha256':'5e861dbb105284a3708a46d9cbcdb044ebbf3a88801b44062595d5d4de45c7b3','source':'own','own_scope':M['own_contrast_scope']['scope'],'game_version':'unknown','collected_at':'2026-10-24','external_direction_source':'external:sts2fun','external_collected_at':'2026-10-21','external_statistics_sha256':'4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d','external_database_sha256':M['provenance']['database_sha256'],'design':'observational','external_does_not_validate_exact_shop_choices':True}
common_limits=['只含冻结506名单；A10与其他进阶、SL/判死与无重试证据分别统计，absence of retry evidence不证明无SL。','动作机会可以同局重复；同一局跨组出现不相加，不以最终胜负证明购物/删牌效应。','原生决策理由是历史模型的意图，未重新认证其机制/模拟；本批未调用游戏、模型或MC。','外部缺购买前金币、逐物价格及完整拒选；cards_gained与商店移除仅作来源代理，无可用购买/拒绝因果对照。','统计为描述，下一战首记录HP是代理；中间事件、治疗、SL及更多购物可能改变资源。']
entries=[];rks=[];knows=[];mapping=[];ledger=[];vocab={'schema':'reflex-vocab-v1','character':'silent','dimensions':{k:[] for k in ('enemy_threat','card_role','line_tempo','resource_cost','potion_category')}}
C=S/'candidates';C.mkdir(exist_ok=True)
for key,body in text.items():
 ev=json.load(open(S/(key+'-evidence.json')));evidence=[];observations=[]
 for i,e in enumerate(ev):
  run=e['pre']['run_id'];floor=e['pre']['run']['floor']
  evidence.append({'type':'own','run':run,'floor':floor,'ref':str((S/(key+'-evidence.json')).relative_to(W))+'#/'+str(i),'role':'support'})
  obs={'run_id':run,'floor':floor}
  if obs not in observations:observations.append(obs)
 sid='silent-brain-shop-'+key;rid='silent-rk-shop-'+key;kid='silent-shop-'+key;tag='silent-shop-observed-'+key
 confidence=.22 if key=='nonbasic-removal' else .25 if key=='upgrade-aware-removal' else .35
 entry={'id':sid,'version':'2026-10-24.1','trigger':{'question_types':['shop']},'strategy':body,'evidence':evidence,'source':'own','confidence':confidence}
 rk={'schema':'reflex-entry-v1','id':rid,'version':1,'applies_to':'shop','predicate':preds[key],'signal':{'kind':'tag','value':tag,'unit':'label'},'label_en':labels[key],'evidence':{'observations':observations,'n_support':len(set(o['run_id'] for o in observations)),'n_contradict':0},'confidence':confidence,'scope':{'character':'silent','ascensions':[10]},'directions':[],'cores':[],'combos':[],'source_experience':[kid],'sources':[{'source':'own','path':str((S/(key+'-evidence.json')).relative_to(W)),'sha256':sha(S/(key+'-evidence.json')),'game_version':'unknown','retrieved_at':'2026-10-24','sample':{'runs':len(set(o['run_id'] for o in observations)),'players':None,'selection':'本情境选定的局部商店状态/执行/后继见证；含重试/判死与无重试证据，完整分层见source-ledger；不是因果或整局剧本。'}}]}
 know={'id':kid,'source':'own','scope':'Silent A10 shop','claim':body,'evidence':evidence,'confidence':confidence}
 sample={k:compact_strata(k) for k in groups[key]}
 meta={'formal_publication':'pending','consumer_readback':'pending','source_accounting':provenance,'group_statistics':sample,'limits':common_limits,'counterevidence':'正文与group_statistics保留其他选择、终败及稀疏分层；条件式比较不将不同选择强判为逻辑反证。','predicate_limits':'rk仅描述tag；predicate只能筛粗条件，未表达价格相加、可删资格或当前收益，不能自动评分/执行。','complete_playbook':False,'source_commit':None}
 rec={'context_id':key,**meta,'knowledge':know,'strategy':entry,'rk':rk}
 dump(C/(key+'.json'),rec)
 entries.append(entry);rks.append(rk);knows.append(know)
 vocab['dimensions']['resource_cost'].append({'id':tag,'label_en':labels[key],'evidence':observations})
 mapping.append({'context':key,'disposition':'new','knowledge_id':kid,'strategy_id':sid,'rk_id':rid,'path':str(C/(key+'.json')),'formal_publication':'pending','consumer_readback':'pending','source':'own','statistical_groups':groups[key]})
 ledger.append({'context':key,**meta,'evidence_file':str(S/(key+'-evidence.json')),'evidence_sha256':sha(S/(key+'-evidence.json')),'decision_offsets':sels[key],'own_witness_runs':sorted(set(o['run_id'] for o in observations))})
dump(S/'strategy-candidates.json',{'schema':'brain-strategies-v1','character':'silent','entries':entries})
dump(S/'reflex-candidates.json',{'schema':'reflex-file-v1','character':'silent','entries':rks})
dump(S/'knowledge-candidates.json',{'formal_publication':'pending','consumer_readback':'pending','character':'silent','entries':knows})
dump(S/'reflex-vocab-candidates.json',vocab)
prior=json.load(open(W/'knowledge/characters/silent/strategy-entries.json'))
reuse=next(e for e in prior['entries'] if e['id']=='silent-brain-potion-full-shop-replacement')
# Preserve the exact lexical object bytes from the frozen dispatch library.
raw=(W/'knowledge/characters/silent/strategy-entries.json').read_text();start=raw.index('    {\n      "id": "'+reuse['id']+'"');decoder=json.JSONDecoder();obj,end=decoder.raw_decode(raw[start+4:]);assert obj==reuse
(S/'reused-full-potion-entry.json').write_text(raw[start+4:start+4+end])
reuse_path=S/'reused-full-potion-entry.json'
mapping.append({'context':'full-potion-shop-replacement','disposition':'byte-reuse','strategy_id':reuse['id'],'path':str(reuse_path),'source_library_sha256':sha(W/'knowledge/characters/silent/strategy-entries.json'),'entry_object_sha256':sha(reuse_path),'new_context_count':0,'note':'冻结已有满栏弃后换购场景，逐字节复制对象，不重新宣称发现，不发新ID。'})
dump(S/'context-mapping.json',mapping);dump(S/'source-ledger.json',{'claims':ledger,'external_source':M['provenance'],'external_own_denominators_pooled':False,'formal_publication':'pending','consumer_readback':'pending'})
external=json.load(open(S/'external-shop-rows.json'))
contrast=[r for r in external if r['field']=='cards_removed' and r['value']=='CARD.STRIKE_SILENT' and r['act']==1]
for r in contrast:r['independent_uploaded_win_fraction']=r['whole_run_winning_uploads']/r['distinct_uploaded_runs']
dump(S/'external-version-contrast.json',{'source':'external:sts2fun','provenance':M['provenance'],'input_statistics_sha256':'4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d','collected_at':'2026-10-21','version_mechanism_alignment':'unknown; no cross-version pooling','rows':contrast,'limits':['商店房间移除是来源代理，不证明付费；未移除组的机会分母未知，不计算收益差。','每行独立上传数与牌次分开；build/幕/不同目标可能同局重叠，不相加。','所有行均同时有赢家与失败，旧版本逐build保留；没有玩家去重，不读取玩家标识。']})
print(json.dumps({'contexts':len(entries),'strategy_bytes':[len(e['strategy'].encode()) for e in entries],'witness_runs':sorted(set(r for c in ledger for r in c['own_witness_runs'])),'selected_records':sum(len(v) for v in sels.values()),'selected_unique_decisions':len(set(v for vs in sels.values() for v in vs)),'selected_raw_rows':len(json.load(open(S/'selected-raw-refs.json'))),'own_indexed_decision_runs':len(set(a['decision']['run_id'] for a in xs))},ensure_ascii=False))
