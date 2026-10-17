"""Check frozen bytes and exact row coverage, then write the bounded evidence report. No scoring."""
import collections,datetime as dt,gzip,hashlib,json,subprocess
from pathlib import Path
R=Path('/home/dw/Projects/agent-sts2');B=R/'paper/materials/20261016-global-build-g3b';O=Path(__file__).resolve().parent;W=R/'.worktrees/codex-strategy-silent-20261012-024317';BASE='51e0c1f475f842b355172f1f2a6f320cae9fb58d'
AT=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip();print(AT,flush=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def meta(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':sha(b),'bytes':len(b)}
def load(p):return json.loads(Path(p).read_text())
def dump(n,x):(O/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def gzrows(p):
 with gzip.open(p,'rt') as f:return [json.loads(x) for x in f]
def stamp(s):return dt.datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
request_file=B/'ops-dispatch/input-r1.json';request=load(request_file);assert meta(request_file)['sha256']=='090156079b1e5da5efe292c5be3249cd4a517bd933be9865b1b39983422248de'
input_refs=[meta(request_file)]
for x in [request['input'],request['manifest'],*request['artifacts'],*request['authorization'],request['original_owner_log']]:
 m=meta(R/x['path']);assert m['sha256']==x['sha256'] and m['bytes']==x['bytes'];input_refs.append(m)
M=load(B/'inputs/manifest.json');C=load(O/'coverage.json');receipt=load(O/'extraction-receipt.json');assert C['input_manifest_sha256']==request['manifest']['sha256']
A=[json.loads(x) for x in (O/'anchors.jsonl').read_text().splitlines()];AB={x['source_off']:x for x in A};assert len(AB)==len(A)==1371 and set(AB)=={x['off'] for x in M['raw_construction_record_index']}
CR=gzrows(O/'anchor-core-verification.jsonl.gz');CB={(x['source_off'],x['core']):x for x in CR};assert len(CB)==len(CR)==5484
raw_manifest=[]
for name in ['states','decisions','brain']:raw_manifest+=gzrows(O/f'{name}-raw-manifest.jsonl.gz')
raw_manifest+=[json.loads(l) for l in (O/'extra-raw-manifest.jsonl').read_text().splitlines()]
by_source={(x['path'],x['off']):x for x in raw_manifest};assert len(by_source)==len(raw_manifest)
bounds={x['path']:x for x in M['source_bounds'].values()};archives=collections.defaultdict(list)
for x in raw_manifest:
 assert x['path'] in bounds and x['off']>=0 and x['off']+x['len']<=bounds[x['path']]['complete_prefix_bytes'];archives[x['archive']['path']].append(x)
projection={}
for envelope in gzrows(B/'inputs/construction-records.jsonl.gz'):
 projection[envelope['_source']['off']]={'run_id':envelope['run_id'],'decision_id':envelope['decision_id'],'construction_sha256':sha(json.dumps(envelope['construction'],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())}
state_meta={};decision_meta={};raw_counts={}
for archive,refs in archives.items():
 refs.sort(key=lambda x:x['archive']['uncompressed_off']);count=0
 with gzip.open(O/archive,'rb') as f:
  for x in refs:
   assert f.tell()==x['archive']['uncompressed_off'];raw=f.read(x['len']);assert len(raw)==x['len'] and sha(raw)==x['sha256'] and raw.endswith(b'\n');d=json.loads(raw);count+=1
   if x['path']=='logs/states.jsonl':
    s=d['state'];run=s.get('run') or {};assert s['run_id'] in M['selected_runs'] and run['character_id'].lower()=='silent' and run['ascension']==10
    known=isinstance(run.get('deck'),list) and isinstance(run.get('relics'),list) and all(isinstance(v.get('card_id'),str) and v.get('card_id') for v in run['deck']) and all(isinstance(v.get('relic_id'),str) and v.get('relic_id') for v in run['relics'])
    state_meta[x['off']]={'run_id':s['run_id'],'observed_at':d.get('observed_ts'),'known_inventory':known,'floor':run.get('floor'),'hp':run.get('current_hp'),'in_combat':s.get('in_combat'),'screen':s.get('screen')}
   elif x['path']=='logs/decisions.jsonl':
    decision_meta[x['off']]={k:d.get(k) for k in ['decision_id','run_id','ts','sl_attempt','sl_reloads','chosen','floor','result','fingerprint']}
    if x['off'] in projection:
     e=projection[x['off']];assert d['run_id']==e['run_id'] and d['decision_id']==e['decision_id'];assert sha(json.dumps(d['boss_sim']['construction'],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==e['construction_sha256']
  assert not f.read(1)
 raw_counts[archive]=count;print('archive_integrity',archive,count,flush=True)
used=[json.loads(l) for l in (O/'referenced-raw-manifest.jsonl').read_text().splitlines()]
with (O/'evidence-manifest.jsonl').open('w') as f:
 for ref in used:
  saved=by_source[(ref['path'],ref['off'])];assert all(saved[k]==ref[k] for k in ['path','off','len','sha256']);f.write(json.dumps(saved,ensure_ascii=False,separators=(',',':'))+'\n')
# All expanded identities are covered once; option is never dropped into evaluator identity.
expected=set()
for x in gzrows(B/'inputs/predictions.jsonl.gz'):expected.add((x['source']['off'],x['option'],x['prediction']['core'],x['prediction']['metric']))
assert len(expected)==145264
actual=set();matched=[];metrics=collections.Counter();disps=collections.Counter()
for path,compressed in [(O/'outcomes.jsonl',False),(O/'expanded-row-coverage.jsonl.gz',True)]:
 f=gzip.open(path,'rt') if compressed else path.open()
 with f:
  for line in f:
   x=json.loads(line);k=tuple(x[t] for t in ['source_off','option','core','metric']);assert k not in actual;actual.add(k);metrics[x['metric']]+=1;disps[x['disposition']]+=1
   assert x['source_off'] in AB
   if x['disposition']=='unselected':assert AB[x['source_off']]['initial_option']['status']=='verified' and x['option']!=AB[x['source_off']]['initial_option']['key']
   if x['disposition']=='matched':
    assert x['metric']=='conditionalSignature' and x['option']!='current';o=x['outcome'];a=AB[x['source_off']];assert x['option']==a['initial_option']['key']
    assert type(o['value']) is bool and all(o[k] is True for k in ['complete','followed_policy','followed_route']);assert stamp(o['observed_at'])>stamp(a['binding']['as_of']) and stamp(o['observed_at'])<=stamp(M['at']);assert o['attempt']==json.dumps(a['sl']['logged_attempt'],separators=(',',':'));matched.append(x)
   else:assert not x.get('outcome')
assert actual==expected
clean_endpoints=set()
for a in A:
 ref=a['endpoint']['completion_frame']
 if not ref:continue
 end=state_meta[ref['off']];identity=(a['run'],a['horizon'],ref['off'])
 if identity in clean_endpoints:continue
 last_combat=max(stamp(s['observed_at']) for s in state_meta.values() if s['run_id']==a['run'] and s['floor']==a['horizon'] and s['in_combat'] is True and stamp(s['observed_at'])<stamp(end['observed_at']))
 for d in decision_meta.values():
  if d['run_id']!=a['run'] or d['floor']!=a['horizon'] or not str(d['result']).startswith('completed:'):continue
  if not last_combat<stamp(d['ts'])<stamp(end['observed_at']):continue
  assert json.loads(d['fingerprint'] or '{}').get('combat') is not False, (identity,d['decision_id'])
 clean_endpoints.add(identity)
for cr in CR:
 a=AB[cr['source_off']];obs=cr['observations'];assert obs['functional'] is None and obs['aliveAndFunctional'] is None and obs['terminalWin_prediction'] is None
 for kind in ['entry','completed_horizon']:
  comp=obs['components'].get(kind)
  if not comp:continue
  sr=next(r for r in comp['evidence'] if r['path']=='logs/states.jsonl');s=state_meta[sr['off']];assert s['known_inventory'];assert s['floor']==a['horizon'] and s['hp']>0
  if kind=='completed_horizon':assert s['in_combat'] is False and s['screen'] in ['REWARD','MAP','GAME_OVER']
  if a['binding']['as_of']:assert stamp(s['observed_at'])>stamp(a['binding']['as_of'])
  assert stamp(s['observed_at'])<=stamp(M['at'])
 for card,cast in obs['actual_casts'].items():
  dr=next(r for r in cast['evidence'] if r['path']=='logs/decisions.jsonl');d=decision_meta[dr['off']];assert cast['attempt']==d['sl_attempt'] and cast['reloads']==d['sl_reloads']==0
assert C['unprocessed_anchor_source_offs']==[] and C['anchors_processed']==1371 and all(C['coverage'].values())
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=W,text=True).strip();status=subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],cwd=W,text=True);assert head==BASE and not status
size=sum(p.stat().st_size for p in O.rglob('*') if p.is_file());assert size<256*1024*1024
# Deduplicate descriptive observations separately from qualification labels.
unique_obs={};casts=set();proxies=set()
for cr in CR:
 a=AB[cr['source_off']];end=cr['observations']['components']['completed_horizon']
 if end:unique_obs[(a['run'],a['horizon'],cr['core'])]=end['signature_present']
 for card,x in cr['observations']['actual_casts'].items():casts.add((a['run'],card,x['evidence'][0]['off']))
 for card,x in cr['observations'].get('cast_dispatch_proxies',{}).items():proxies.add((a['run'],card,x['evidence'][0]['off']))
obs_counts=collections.Counter((core,value) for (_,_,core),value in unique_obs.items());run_rows=load(B/'inputs/runs.json');runwins=sum(x['row']['victory'] is True for x in run_rows)
summary={'at':AT,'dispatch_input_sha256':input_refs[0]['sha256'],'data_manifest_sha256':request['manifest']['sha256'],'anchor_count':1371,'core_reviews':5484,'expanded_rows':145264,'row_metrics':dict(metrics),'row_dispositions':dict(disps),'qualified_labels':len(matched),'raw_referenced_rows':len(used),'raw_archives_checked':raw_counts,'all_required_dimensions_reviewed':True,'unprocessed_anchors':[],
 'independent_completed_run_horizon_core_observations':[{'core':k[0],'signature_present':k[1],'run_horizon_windows':v} for k,v in sorted(obs_counts.items())],
 'deduplicated_actual_dispatch_witnesses':len(casts),'deduplicated_unclosed_dispatch_proxies':len(proxies),'run_summaries':len(run_rows),'reported_run_wins':runwins,'active_or_unreported_runs':len(M['selected_runs'])-len(run_rows),
 'clean_completed_endpoint_windows':len(clean_endpoints),'integrity_status':'verified','not_calibration_or_qualification_acceptance':True,'evaluator_run':False,'advisory_or_source_changed':False,'original_head':head,'original_worktree_clean':True,'artifact_bytes_before_reports':size}
dump('delivery-integrity.json',summary)
# Select concrete counterexamples without ranking candidate game quality.
examples=[]
for kind in ['policy_changed','route_changed','sl_unknown','censored','unverified']:
 cr=next((x for x in CR if x['disposition']==kind),None)
 if cr:examples.append({'kind':kind,'anchor':AB[cr['source_off']],'core_verification':cr})
positive=next((x for x in CR if (x['observations']['components'].get('completed_horizon') or {}).get('signature_present')),None)
if positive:examples.append({'kind':'components_present_but_not_qualified_label','anchor':AB[positive['source_off']],'core_verification':positive})
dump('counterexamples-and-gaps.json',{'examples':examples,'old_knowledge_changed':False,'functional_or_game_value_claim':None,'route':'原ops→原watcher→Roy；未代填ACK','distinction':'原completionChoice是声明的条件政策；实际政策不同不证明实际选择较差，不推翻旧牌值经验。P/D/S/R原模板candidate与G4未验证边界保持。'})
initial=receipt['initial_option_counts'];routes=receipt['route_counts'];recovery=collections.Counter(a['route'].get('plan_recovery','not_recovered') for a in A);primary=collections.Counter(x['reason'] for x in CR);policy=collections.Counter(x['policy']['status'] for x in CR)
rows='\n'.join('| '+g['core']+' | '+str(g['horizon'])+' | '+g['metric']+' | '+str(g['model'])+' | '+str(g['candidate_rows'])+' | '+str(g['numeric_rows'])+' | '+str(g['actual_matched_rows'])+' | '+str(g['independent_matched_runs'])+' |' for g in C['groups'] if g['model'] is not None and g['metric']=='conditionalSignature')
ex=next((x for x in CR if x['policy'].get('first_deviation') and x['policy']['first_deviation'].get('expected',{}).get('id')),None)
extext='具体原件见counterexamples-and-gaps.json。'
if ex:
 a=AB[ex['source_off']];w=ex['policy']['first_deviation'];extext=f"例：{a['run']} F{a['floor']}锚点{ex['source_off']}、核心{ex['core']}的后继选择，原政策参照{json.dumps(w.get('expected'),ensure_ascii=False)}，实际{json.dumps(w.get('actual'),ensure_ascii=False)}。原字段及三类源帧在counterexamples-and-gaps.json。这里只证明政策差异，不判断哪条打法更好。"
report=f'''# G3b r1：冻结真实后继帧核验

本轮已检查原r1全部1371锚点及七项要求，交付条件匹配结果和可核缺口；合格matched标签为{len(matched)}。这不等于145264行全部为false，也不证明构筑或既有策略无效。宽父roy-20261016-global-build、原量化父、G4资格与0332保持；未运行原eval/construction.py，未推进advisory/G3a/G3c/G5/G2或任何发布。

写时先date：{AT}。原owner/thread：quantitative / 01a12c46-fef2-7282-b689-1fd8b4e0450b；parent_batch=20261012-024317-strategy-proposal；base={BASE}。原树干净，旧51e0/报告/failed/rc0历史未修改或合入。只写本learner-results。

## 冻结范围和可复现入口

逐项核主根绝对路径ops-dispatch/input-r1.json（SHA090156079b1e5da5efe292c5be3249cd4a517bd933be9865b1b39983422248de）、完整learner-input.md（aff9f323…）、原数据manifest（588276ef299dd6802bfe3e7e69e5ad07a506a91eb81bd034bdf30b10824d6ecb）、七投影、两授权及旧owner原日志。coordination/anchor-index.json的SHA724e2996…匹配，只作锚点地址核对，未用其chosen元数据作执行/政策真值。run-plans.json仍为空，未补造或覆盖。此报告仅覆盖原r1明确1371锚点，不称全部R328历史；未切换或扩展其他revision。

截止2026-10-16T05:43:17.052214+00:00。所有原行off+len都不超过各source_bounds.complete_prefix_bytes，未借当前追加帧。Parquet只提供候选地址；逐行读取原日志验角色/进阶、行末、长度与SHA。原始读取29165状态、27328决策、1481原脑记录；缓存保留必要状态、所有锚点/非战斗选择及具名动作见证。共享窗口/原件不当独立样本。

确定性提取入口：`nice -n 19 python3 {O/'extract_outcomes.py'}`。只做冻结日志连接、历史政策的一步算术核对和机械签名判定，不调用预测器、模拟器、游戏/模型API。当前主提取退出0；最后完整性核验命令为同目录finalize_delivery.py，退出码按finalize-delivery日志保存。生产tsc/vitest/cases均null。

原行在raw-*.jsonl.gz中按原字节保存；evidence-manifest.jsonl为实际引用的{len(used)}个原行提供path/off/len/SHA及本地gzip解压偏移，原byte可复核。historical-source-manifest.json按33个实际代码commit保存planner/adapter/admission/route/template，legality-source-manifest.json补原资源约束源码；不执行这些TS或借51e0语义。早期没有admission文件原样标缺，未倒填绑定。四模板在这些原提交中机械摘要76e91c950bfd87d820093bdd7dd4b3f11db15256ea2b6e0bb41b9f1ec89f998c与原生记录对应；status=candidate，不推出functional。

## 七项检查与限定结果

| 要求 | 实际做了什么 | 结果与缺口 |
| --- | --- | --- |
| initial-option | 原accepted脑回答、完整决策/执行result、原始库存前后帧；复合服务连接真正执行的选牌子项 | {initial.get('verified',0)}锚点可核选项身份，{initial.get('unknown',0)}仍未知。current从未当实际skip；无法精确绑定的多步商店/子项保留unknown。 |
| actual-route | 本题原计划，或预测前同版本完整快照+当前计划版本摘要+无中间改线/重启；原constructionRoute逐层转换，实际MAP到访或原生节点选择+真实后继 | same {routes.get('same',0)}、changed {routes.get('changed',0)}、unknown {routes.get('unknown',0)}锚点；这些是单维度，不等于条件标签。只存类型摘要而坐标链不能闭合的仍unknown。 |
| completion-choice-policy | 每核心按原missingRequirements、当前可见库存/实际价格/合法资源和声明动作集合逐项核后继选择；已售库存剔除；等距等价而数组顺序未绑定留未知 | 5484锚点×核心审查中政策状态{dict(policy)}。只升级/买遗物药水/多步交易与原模型动作范围不同或资源条件不闭合时不强配。 |
| sl-branch | 原[sl_attempt,sl_reloads]文本保留；查显式reload/SL摘要、config restart及非单调物理层/回合 | null不是1；不能证明同一分支则sl_unknown，不拼接不同尝试的库存/路线。 |
| original-template-endpoint | 原提交模板数量/替代/升级/遗物条件；分别列到达首Boss节点入口与该Boss完成后、任何奖励/后续非战斗动作前的同层干净原帧 | observed_at用原帧observed_ts，晚于原as_of。缺完整节点、死亡、未到期或分支不闭合不能当false。F48不替换成F49。 |
| separate-observations | 组件、具名动作、存活、原run摘要分列；动作要求原执行行+新鲜匹配原帧，否则另列dispatch proxy | 原摘要40局（报告胜{runwins}），1局在截点内无摘要；不把同run摘要自动归给每条SL分支或当terminalWin标签。 |
| all-anchor-coverage | anchors.jsonl精确1371 source_off；5484份共享核心审查；显式条件行和压缩其他指标行覆盖原键 | 36316 conditionalSignature行在outcomes.jsonl；108948其他原null指标行在expanded-row-coverage.jsonl.gz。合计145264，无丢option；2454 unsupported原选项仍在锚点覆盖中。 |

coverage中的true表示该维度已检查并保存证据或未知/排除，不表示样本通过。未处理锚点为0；coverage.json.unresolved_anchor_source_offs列初始选项、路线或终点尚未闭合的锚点，政策、SL等其他排除另见各核心审查及分组原因，不把未知列成false。

## 精确分组与排除

原展开行为选项×四核心×四指标，不能当独立局数。完整96组的角色/核心/A10/指标/截止层/模型/政策/模板、候选行/数值行、实际匹配、独立局、每项排除原因均在coverage.json.groups；早期缺绑定组保留null，不用后来的绑定替换。

| 核心 | 截止层 | 指标 | 原模型 | 候选行 | 数值行 | matched | 独立matched局 |
| --- | --- | --- | --- | --- | --- | --- | --- |
{rows}

5484份共享锚点×核心审查的主要原因（不是独立样本）为：{json.dumps(dict(primary),ensure_ascii=False)}。每个维度的附加缺口仍保留，主原因没有覆盖掉其他问题。未选候选只标unselected，不占原evaluator没有option维的真实identity；非数值指标不拿签名、存活或run摘要补数。实际matched为{len(matched)}；没有制造十局、校准分数或通过文件，由原watcher决定原eval/construction.py的后续运行。

## 原件反例和不确定性

{extext}

到达/完成节点的机械签名可以为true，但不能跳过路线、政策、SL或未知事件门禁。独立(run,horizon,core)描述性观察：{json.dumps(summary['independent_completed_run_horizon_core_observations'],ensure_ascii=False)}。这些是完成节点库存的共现记录，不能作为条件匹配分母或可运转/通关率。具名动作有{len(casts)}个去重动作级见证、{len(proxies)}个身份/后继或SL尚不闭合的dispatch代理；都不提供完整施放总次数，未列牌为unknown，不说未施放。效果结算、同实例归属、循环和functional均未由此验证。

原算法在首个Boss就break；类型摘要“休→怪→店…”若无可证明的原坐标计划不能补造。当前题缺计划时，只回查其as_of之前、当前记忆同一F计划版本且中间无改线/重启的完整快照；未读未来计划倒填。恢复方式计数：{dict(recovery)}。未知节点改变牌组/遗物/金币、同房额外交易不在原未来步骤、实际政策偏离等均列具体原件，不将其当预测失败。

本轮未发现足以新增或推翻牌值/机制经验的因果对照。原P/D/S/R模板candidate、G4异议及无完整functional验证器的旧边界保持。这里发现的是“声明的条件政策”与实际选择/可核条件的差别，不说明实际选择更差。原文政策、不同实际选择、原模板ID、逐原帧证据和下一步见counterexamples-and-gaps.json；交原ops→原watcher→Roy，未代填任何通知ACK。

## 原失败、检查和交接

保留原owner旧failed/rc0，以及本目录真实中间失败：早期admission文件在原提交不存在（后改为保留缺失）；两次缓存上限保护；末验7个默认终点晚于奖励动作，已在同一冻结原件中重建干净端点、不能闭合的排除，原草稿与outcomes保留before-endpoint-audit；计数器/字符串写gzip的离线序列化错误。修正仅本目录提取/缓存材料；压缩整理没有改原日志或线上。主提取最终exit0、原字节/展开键/版本/时间与工作树检查详delivery-integrity.json；这些不是源码测试或校准通过。

缓存最终在256MiB以内，仅必要原件和静态源码片段，没有整库tar/展开副本。未运行预测、历史模拟、额外模型/游戏API、play、源码full、eval或安装。未改源码/经验/construction-calibration.json/配置/注册/ACK/main/live，没有提交、版本或合入。fixes=[]、merged=null、tests三个null、code_proposals=[]、implementation_domains=[]、proposal_results=[]。

限定本轮证据报告完成后即停，不监听/轮询自然局，不接其他阶段。下一步：原ops原样归档本learner-results；原watcher消费outcomes和完整coverage，在原eval入口处理合格行及去重，保持未满足入场线的组不晋级；缺计划坐标/政策遵从/分支或截止帧的具体缺口沿原链保留，不能把本报告当父项/G4/0332关闭。
'''
(O/'report.md').write_text(report)
result={'task':'strategy-proposal','character':'silent','base':BASE,'runs':M['selected_runs'],'fixes':[],'merged':None,'tests':{'tsc':None,'vitest':None,'cases':None},'code_proposals':[],'implementation_domains':[],'proposal_results':[],'report':str(O/'report.md'),'parent_complete':False,
 'continuation_result':{'supplement_id':request['supplement_id'],'parent_batch':request['parent_batch'],'phase':'G3b-prospective-successor-frames','input_manifest_sha256':input_refs[0]['sha256'],'data_manifest_sha256':request['manifest']['sha256'],'outcome':'complete','completion_scope':'仅本轮原r1冻结后继证据报告，不是校准通过、角色接受或宽父关闭','coverage':C['coverage'],'inputs':input_refs,'results':[meta(O/n) for n in ['report.md','outcomes.jsonl','coverage.json','evidence-manifest.jsonl','delivery-integrity.json']],
 'checkpoint':f'1371/1371锚点已核，145264展开键完整覆盖，实际matched标签{len(matched)}；functional与原null指标不补数；原树HEAD/工作树保持。','next_step':'原ops原样归档；原watcher沿原eval/construction.py消费本次outcomes/coverage并去重、核分组门槛；不自动晋级，不关闭原学习/量化宽父、G4或0332。'}}
dump('report.json',result)
manifest={'at':AT,'kind':'evidence-delivery-integrity-only-not-calibration','files':[meta(p) for p in sorted(O.rglob('*')) if p.is_file() and p.name not in ['artifact-manifest.json','report.json','delivery-receipt.json','finalize-delivery.stdout','finalize-delivery.stderr','finalize-delivery-final.stdout','finalize-delivery-final.stderr']]}
dump('artifact-manifest.json',manifest);result['continuation_result']['results'].append(meta(O/'artifact-manifest.json'));dump('report.json',result)
dump('delivery-receipt.json',{'at':AT,'report':meta(O/'report.md'),'report_json':meta(O/'report.json'),'artifact_manifest':meta(O/'artifact-manifest.json'),'evidence_only_complete':True,'parent_complete':False,'calibration_accepted':None,'notification_ACK':None})
print(json.dumps({'anchors':1371,'expanded_keys':len(actual),'matched':len(matched),'original_head':head,'clean':True,'report':str(O/'report.md'),'evaluator_run':False},ensure_ascii=False),flush=True)
