import json,pathlib,hashlib,subprocess,collections,re
WORK=pathlib.Path.cwd();ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');OUT=pathlib.Path(__file__).resolve().parent;RUN=OUT.parent
BASE='24546ada8cf2eecebb0e013bf06f70cb6d4e7153';BATCH='20261024-182343-strategy-proposal';PLAN='issue51-decision-encounter-001-20261024';INPUT='3195a6d5e9df24fd242b8603c867730e0b29fa1b85cefa3e4c5021e58eb1ec81'
def dump(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def rd(p):return json.loads(p.read_text())
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==BASE
checks=rd(OUT/'input-audit.json')['checks'];post=[]
for x in checks:
 p=ROOT/x['path'];post.append({'path':x['path'],'bytes':p.stat().st_size,'sha256':sha(p),'ok':p.stat().st_size==x['bytes'] and sha(p)==x['sha256']});assert post[-1]['ok']
for x in rd(OUT/'own-shard-audit.json'):
 p=ROOT/x['path'];assert p.stat().st_size==x['bytes'] and sha(p)==x['sha256']
for e in rd(OUT/'reflex-candidates.json')['entries']:
 for s in e['sources']:assert sha(WORK/s['path'])==s['sha256']
for x in rd(OUT/'raw-seek-audit.json'):
 p=pathlib.Path(x['path']);assert len(p.read_bytes())==x['bytes'] and sha(p)==x['sha256'] and x['offset']+x['bytes']<=x['cutoff']
status=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True);assert not status,status
baseline=rd(OUT/'dedup-audit.json')
for name,h in baseline['baseline_sha256'].items():assert sha(WORK/'knowledge/characters/silent'/name)==h
config=rd(OUT/'candidate-config.json');mapping=rd(OUT/'paired_output_map.json');rawaudit=rd(OUT/'raw-seek-audit.json');selected={x['run'] for x in config};contrast=rd(OUT/'own-fight-contrasts.json');seen=set();candidates=0;contexts=0;plan_rows=[]
def fullplan(v):
 if isinstance(v,dict):return ('steps' in v and 'outcome' in v) or any(fullplan(x) for x in v.values())
 if isinstance(v,list):return any(fullplan(x) for x in v)
 return False
for x in rawaudit:
 if x['stream']!='decisions':continue
 j=rd(pathlib.Path(x['path']));n=0;p=fullplan(j);ct=0
 for q in j.get('questions',{}).values():
  for k,v in q.get('criteria',{}).items():
   try:v=json.loads(v)
   except (ValueError,TypeError):continue
   n+=1;p=p or fullplan(v);ct+=isinstance(v.get('v6_combat_entry',{}).get('context'),dict)
 candidates+=n;contexts+=ct;plan_rows.append({'path':x['path'],'sha256':x['sha256'],'candidate_count':n,'original_full_Plan_found':p,'candidate_context_count':ct})
assert candidates==226 and contexts==0 and not any(x['original_full_Plan_found'] for x in plan_rows)
dump(OUT/'plan-gap-audit.json',{'original_decision_rows_scanned':111,'original_candidates_scanned':226,'original_full_Plan_count':0,'original_candidate_context_count':0,'scope':'仅已抽取六窗口；不声称506局全域无Plan。解析原criteria JSON，不从plays/quantitative_turn/selection_audit重建Plan。','rows':plan_rows})
external_pages=[]
for p in sorted((OUT/'external-pages').glob('*.json')):
 j=rd(p);xs=j['rows'][0]['examples'];external_pages.append({'path':str(p),'sha256':sha(p),'offset':j['offset'],'limit':1,'reader':'eval/sts2fun_build_view.py page; original artifact manifest size/SHA verified','examples':[{'example':x['example'],'safe_projection_sha256':x['safe_projection_sha256'],'nodes':len(x['timeline']),'version':x['version'],'win':x['win'],'complete_page_model_read':True} for x in xs]})
assert sum(x['nodes'] for p in external_pages for x in p['examples'])==138
counts={'processed_contexts':6,'new_contexts':2,'updated_existing_contexts':4,'byte_reused_contexts':0,'alias_contexts':0,'new_text_entries':2,'updated_text_entries':4,'new_rk_candidates':6,'paired_candidate_contexts':6,'rk_descriptive_tags':6,'rk_executable_comparisons':0,'legal_original_inputs':0,'original_mod_states':6,'legal_plan_replays':0,'action_comparison_groups_ge100':0,'formally_published_text':0,'formally_published_rk':0,'production_consumer_readbacks':0,'natural_queries':0,'actual_adoptions':0,'benefit_estimate':None}
dump(OUT/'decision_output_counts.json',counts)
coverage={'unit_ids':['external-decision-encounter-001'],'unit_disposition':'processed_candidates_with_local_waiting','target_contexts':[5,10],'handled_contexts':6,'new_contexts':2,'updated_same_id':4,'source':'mixed','own_support_runs':sorted(selected),'own_action_windows':6,'own_independent_support_runs':4,'own_negative_context_runs':sorted({x['run'] for x in contrast if x['role']=='limitation'}),'own_total_read_fight_summary_runs':len({x['run'] for x in contrast}),'own_raw_rows':len(rawaudit),'own_raw_bytes':sum(x['bytes'] for x in rawaudit),'own_raw_state_rows':124,'own_raw_decision_rows':111,'own_model_read':'6个当前题指纹匹配的原状态/原候选问题与实际派发、逐状态资源/敌人/招式/power/手牌投影；抽核具体后继字段，未逐字阅读6MB原件所有冗余字段。','own_complete_game_four_sections_read':False,'own_complete_playbook_claimed':False,'own_fight_summaries':12,'external_complete_pairs':external_pages,'external_full_examples_model_read':4,'external_full_nodes_model_read':138,'external_unread_examples':156,'external_cluster_semantics':'簇1/3仅定位页，未给簇命名，也未据终局簇触发本批策略；无完整流派剧本声明。','program_coverage':['冻结3 manifest+129叶全大小/SHA；11片全SHA，源nlink可为1。','11片仅显式名单；内存DuckDB threads=2；查询先allowed506，且off+len<=原6流截止。','506局机会索引及按真实enemy ID的6类机会；A10与各其他进阶分列；reload/predicted/no_retry独立分层。','124状态+111决策原行235条有offset/bytes/SHA；不复制17GB流。','114个冻结代表文件仅程序筛选负例；12个选定战斗条目通过有界reader完整模型读回，不冒114整局人工通读。'],'waiting_subitems':[{'context':x['context'],'state':'waiting','what':'原完整请求/各候选Plan/同seed结果矩阵/#28 capture与固定回放/正式消费者','evidence':str(OUT/'replay-inventory.json'),'next':'原owner仅在原授权切点补实际保存原件；缺失继续unknown；本学习者不开模拟/模型或新单元。'} for x in mapping],'formal_publication':'pending','consumer_readback':'pending','scientific_parent_closed':False}
dump(OUT/'coverage.json',coverage)
notice='本单元实际处理6个有区别的动作情境：真实新建2，同ID更新4，逐字节复用0；新rk6均为描述tag，可执行比较0、合法回放0、正式发布/消费者读回0。若按真实新建数审计，只有2条，不能冒称5条新增。主要缺口是原完整request.state、逐候选原Plan.steps/outcome与同seed结果矩阵；下一步交原owner在506名单/六流原截止内补原件或保持waiting，不扩批/不重开旧005，不关闭科学父。'
(OUT/'supervisor-notice.md').write_text('[learner]\n\n'+notice+'\n\n投递状态：仅保存本批scratch，待原ops→watcher→Roy/主管链转交；未冒称已发送或ACK。\n')
dump(OUT/'execution-settings.json',{'host_request':'fast per frozen work_spec wrapper limitation','native_model':None,'native_effort':None,'native_service_tier':None,'weekly_usage':None,'billing_or_native_elapsed':None,'reason':'未读取原生请求回执，不能把启动文本或本助手自述当采用证明。未改账号/home/config/权限、未热切线程。','new_models_or_simulation_or_games':0})
dump(OUT/'postflight-integrity.json',{'base':BASE,'head':BASE,'tracked_status_clean':True,'frozen_refs_rechecked':len(post),'all_ok':True,'shards_rechecked':11,'raw_rows_rechecked':len(rawaudit),'formal_knowledge_same_sha':True,'binding_not_mutated':True,'checks':post})
# Artifacts are indexed before report/result to avoid circular self-hashes.
artifacts=[]
for p in sorted(OUT.rglob('*')):
 if p.is_file() and p.name!='artifacts.json':artifacts.append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)})
dump(OUT/'artifacts.json',artifacts)
dest=[]
for x in mapping:
 dest.extend([{'kind':'strategy','id':x['text_id'],'path':x['text_path']},{'kind':'rk','id':x['rk_id'],'path':x['rk_path']}])
result={'task':'strategy-proposal','character':'silent','code_proposals':[],'implementation_domains':[],'proposal_results':[],'batch':BATCH,'base':BASE,'runs':[],'fixes':[],'merged':None,'tests':{'tsc':None,'vitest':None,'cases':None},'reason':'已保存6组文字策略/rk配对候选（2个新情境、4个同ID更新）；6个rk均为描述tag。原Plan、完整请求与同seed结果缺失，可执行比较/合法回放/正式发布/消费者读回均0，缺口逐项waiting，科学父开放。','report':str(RUN/'report.md'),'external_source':PLAN,'input_sha256':INPUT,'external_results':[{'id':'external-decision-encounter-001','state':'processed','destinations':dest,'reason':'6个情境均有真实scratch文字与rk候选及相同证据映射；含4个稳定ID去重更新。只交候选，rk执行和回放缺口见replay-inventory.json，不冒遭遇单元闭环。'}],'own_support_runs':sorted(selected),'decision_output_counts':counts,'paired_output_map':str(OUT/'paired_output_map.json'),'coverage':str(OUT/'coverage.json'),'source_ledger':str(OUT/'source-ledger.json'),'formal_publication':'pending','consumer_readback':'pending'}
raw=json.dumps(result,ensure_ascii=False,indent=2)+'\n';(RUN/'result.json').write_text(raw)
lines=['# Silent 精英与Boss遭遇候选：decision-encounter-001','',f'本批 `{BATCH}`；冻结基线 `{BASE}`。候选已完成落盘，遭遇执行/回放闭环未完成。仅写本批scratch、report/result；未提交或合入，HEAD保持dispatch_base。','',
'## 身份和输入核验','',f'learn.json本批external_source/external_binding、plan `{PLAN}`、worktree、request及实际HEAD一致。输入manifest 14357字节/SHA `{INPUT}`；work_spec 7022字节/SHA `d3d74f523d41168b083dda8d127a9c3e16ade264dcec2ef3ceafdd78aa6001a9`。首读README、最新STATE-2026-10-19及decision-log末尾，较晚日志/本冻结授权接续历史停点；学习协议第9节及冻结#27/#28/#42/#55合同已读。',
'','#54三manifest及129叶=132个对象全部核原SHA/大小；额外合同等共146项前后复核通过。11个只读parquet核原SHA，nlink不作字节有效性门槛。未读外部原库/玩家标识、未下载、未扫描游戏二进制；未init/sync共享logdb。见scratch/input-audit.json、own-shard-audit.json及postflight-integrity.json。','',
'## 计数与去重','',
'本轮处理6个不同动作子情境，落盘6文字+6 rk描述tag；文字真实新建2、同ID更新4、逐字节复用0、别名0。四个已有场景沿原稳定ID合并，不把新动作证据或rk投影另算新情境。原正式47文字/91 rk和原失败005保持原样；临时组合校验49文字有效不等于正式库已变49。若要求5个真实新增情境，本批只有2，不能冒达标；6个处理情境处于5–10总目标范围。',
'','动作证据每情境均1局/1个选定窗口，六窗口来自4个独立支持局，不能按6个独立局相加。达到100的动作比较组为0（本批非单牌批，不因该门槛抛弃小样本方向观察）；没有估计拿牌/出牌因果收益。外部各cell/版本与自有分母从不混加。统计行不算新增条目。冻结前序记录4新/1更只作既有计数基线；本批真实新增2，未触发连续两批新增0停线，也不自行扩单元。','',
'|情境|文字处置|rk资格|直接支持/对照|','|---|---|---|---|']
for cfg in config:
 neg=next(x for x in contrast if x['context']==cfg['key'] and x['role']=='limitation');lines.append(f"|{cfg['key']}|{'同ID更新' if cfg['old'] else '新建'} `{cfg['sid']}`|新描述tag；执行/回放waiting|{cfg['run']} F{cfg['floor']}/T{cfg['turn']}；局级限制反例{neg['run']}|")
lines+=['','每个候选的文件路径/同证据配对见scratch/paired_output_map.json；每条formal_publication和consumer_readback均pending。策略不使用archetype触发；没有部署#55几何，也没有扩schema。精英仅用fight_plan/幕作宽检索，正文明确实际敌人/手牌条件，不能把宽检索当条件已全部满足；四个Boss旧触发新增fight_plan并将候选楼层上界延至实际Boss层，变更只在scratch。','',
'## 六条方向、幅度、样本和边界','']
for cfg in config:
 e=next(x for x in rd(OUT/'strategy-candidates.json')['entries'] if x['id']==cfg['sid']);lines+=['### '+cfg['key'],'',e['strategy'],'',f"文字ID `{cfg['sid']}`；rk `{cfg['rid']}`。停线：{cfg['stop']}",'']
lines+=['## 来源、分层、反向与代理','',
'外部统一external:sts2fun，地址https://sts2.fun/static/sts2_public.db.zst，采集2026-10-21，数据库SHA 1f7c0c3d441aedb5c85f04bcd4d8d6a1039b438a8b6fda2d96cfa5c27580cbf5。无明确再分发许可，沿冻结FAQ限制仅署名聚合/授权匿名派生。v0.111优先，旧v0.107/108/109/110分列；冻结包没有这些动作机制未改的证据，因此机制对齐unknown，不合并版本、不因此整批停产。每条source-ledger记录所用文件完整SHA与版本/采集日/分母/反例。',
'','外部matchups c1的v0.111描述通过代理：Vantom18/19、同族16/22、知识恶魔22/27、帝王蟹21/31；原总受伤均值分别25.3158、30.3182、22.7778、37.2903 HP。玩家独立性未知，这些是上传行/遭遇分母，非自然独立玩家；不相加为独立总样本。完整小数和各版本原cell见statistics/*-external-versions.json。终局簇仅定位，不命名为流派、不作当前触发；该统计不能支持具体动作效果或安全HP。boss-semantics已核多Boss路径与unknown规则，未重开双Boss/幕Boss任务，也不把旧目标名当实际敌人。',
'','匿名代表通过manifest核SHA有界reader一对一页读取：c1 pair0胜/负49+15节点、c3 pair0胜/负49+25节点，合4完整轨迹138节点，模型已实际通读所选页全部节点；余156例未读。c1胜例旧日雕像节点15总受伤10、同族节点17为22、知识恶魔节点33为18；负例到节点15的SKULKING_COLONY末HP0，不冒本批同遭遇动作反例。c3同一千足虫遭遇节点25，胜者前节点末HP代理65、总受伤51后14；负者代理26、受伤26后0，牌组/路线/遗物不同，非干预或可靠当前快照。两对的相近前五节点不等起点相同；终局牌组不能回填到决策触发。','',
'自有补证仅冻结506 Silent局/11片/六流截止。内存DuckDB threads=2，先allowed506再聚合。A10 466局：no_retry_evidence123、观测到reload且有predicted_death342、仅predicted_death但无成功reload记录1；其他40局按真实进阶分别列。正常监控结束记录不等于SL；无重试记录也不证明无SL。所有自有游戏版本unknown，未冒v0.111。每遭遇A10/no_retry独立机会分别30/18/14/10/18/8；reload+prediction分别64/63/58/61/41/67，均为不同run/floor，跨遭遇局可能重叠，不能相加。详见own-encounter-inventory.json与own-attempt-strata.json。',
'','机会账的“后继楼层存在”为通过代理；没有后继且未见HP0仍unknown，绝不把预测判死当实际失败。12个所选战斗摘要（6支持+6局级限制反例，10独立局）通过有界reader完整读回；3个SL触及反例的单试净损为null，保留最终died与首次predicted截止的区别。负例有同类牌而终败，只反证通用存活保证；未核其严格动作窗口，rk精确谓词反证数保持未知，不能硬填成6个已命中反证。自有/外部观察端点不同、反向/不确定性均保留，策略evidence_status=conflict。',
'','6个原题/状态指纹完全一致，235原行（124状态/111决策、6,193,041字节）逐行保存offset/bytes/SHA且不越截止。模型通读原题的选项/选择/派发及资源、敌人、招式、power和关键手牌/后继字段投影，未逐字通读6MB全部冗余字段。仅这些战斗窗口，不声称读了自有整局四section或交付完整流派剧本；114份整局只程序筛选，不冒模型全读。未读原完整17GB状态流，不复制源库。',
'','原派发与答案分账：同族T3原脑选plan7，实际HP guard派发plan1，按后继尖啸观察写候选；千足虫T3若动作queued，保留unstable，本条分配动作锚定T2 completed；帝王蟹T5的25→17已在致命毒药后发生，再扫腿17→12，不把全减幅归于单牌。遗物、面向/目标、前置药水、资源和后续决策混杂，不保证收益。H0/G1a/校准父和铁甲行为均未改。','',
'## rk可消费性与逐项waiting','',
'六rk都是合法reflex-entry-v1/combat_line描述tag：原敌人ID/同实体出招或power、当前合法手牌、候选动作条件都明确。当前状态条件6/6实际成立；缺原Plan时完整谓词6/6保持unknown，错误敌人6/6拒绝。未用描述文字/quantitative_turn/selection_audit.planned_steps造Plan，也未把统计CSV或封套称为可执行rk。每条停线/目标/动作和同证据文字链接完整，见source-ledger与paired_output_map。','',
'在所抽111决策行/226原候选中，原完整Plan.steps+outcome=0、原候选v6 context=0；六锚题原问题候选齐全且原mod状态合法，但完整V5 request.state缺失，因此合法原输入=0。每候选同seed结果矩阵/模型SHA缺失，原候选均值不代矩阵。六项一律在replay-inventory.json逐情境标waiting：原完整请求、全部原Plan、原同seed结果、#28 capture/固定回放与正式消费者待原owner补原件；本批不开Jev/MC/模型/两臂/A-B，不设置开关。合法执行比较0、合法回放0，遭遇单元未闭环。','',
'文字格式6、rk格式6、隔离结构检索6及候选组合49格式校验通过，仅固定数据；未运行tsc/vitest/full，因为无源码/正式知识修改，tests三项null。隔离匹配不是生产工具读回。正式发布文字0/rk0、生产工具读回0、自然查询0、实际采用0、收益未知；六条仍pending，科学父不关闭，原005的failed不改。',
'','原work_spec允许由ops在整批或2小时先到后独立发布；本学习者本次不走正式锁、不写正式账本/库/通知、不等待代码/full、不自行开下一单元。交原ops串行去重与原发布锁，文字/rk同批走正式流程；执行/回放不满足部分继续waiting，不能把数据交付冒正式可执行发布。',
'','## 主管转交与复核','',notice,'','上段原文同时存scratch/supervisor-notice.md，待原ops→watcher→Roy/主管链转交；本批未实际投递，ACK未知。只在scratch留通知，不代其他角色确认。','',
'档位：冻结宿主请求fast；周额度未知，实际原生model/effort/service tier、计费/耗时均未核，不能把任务文字当生效证明。未改账号/home/config/权限、未热切原线程。','',
'所有源/正式知识SHA前后同，HEAD未动、git tracked状态clean。候选及源码无提交。gitleaks对本批目录扫描约10.31MB、退出0/无泄漏，见scratch/security-check.json。抽取过程一次因状态外封套run_id层级判断中止，修为state.run_id后按原偏移完整重核；分层中正常监控event不再误当重试，最终仅依原reload_ok/predicted标志。该两项为scratch分析修正，原源片无损、原失败历史未改。','',
'关键核件：scratch/input-audit.json、own-shard-audit.json、postflight-integrity.json、raw-seek-audit.json、source-ledger.json、dedup-audit.json、paired_output_map.json、coverage.json、decision_output_counts.json、validation.json、plan-gap-audit.json、replay-inventory.json。全文件字节/SHA索引见scratch/artifacts.json。','',
'## 完整结果 JSON','', '以下代码块与同目录result.json原字节相同；最终回复须直接使用相同内容。','', '```json']
report='\n'.join(lines)+'\n'+raw+'```\n';(RUN/'report.md').write_text(report)
block=re.findall(r'```json\n(.*?)```',report,re.S)[-1];assert block==raw and json.loads(block)==rd(RUN/'result.json')
print(json.dumps({'report':str(RUN/'report.md'),'result':str(RUN/'result.json'),'json_byte_match':True,'head':BASE,'counts':counts,'artifacts':len(artifacts)},ensure_ascii=False))
