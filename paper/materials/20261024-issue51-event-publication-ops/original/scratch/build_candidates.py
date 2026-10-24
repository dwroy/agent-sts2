import collections
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
WORK = Path.cwd()
BASE = '7c11e4c072f2fac0aa88b98efb7ed960e6fecf72'
MANIFEST = 'paper/materials/20261024-issue51-speed-ops/inputs/issue51-decision-event-001-20261024.json'
INPUT_SHA = '1d2d96a88fbc1544014215800da56bd392476559e1826de03e42708243e95c1c'

def load(p):
    return json.loads(Path(p).read_bytes())

def write(name, obj):
    p = OUT / name
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n')
    return p

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == BASE
assert sha(MANIFEST) == INPUT_SHA
manifest = load(MANIFEST)
scope = load('paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json')
windows = load(OUT/'own-event-windows.json')['windows']
external = load(OUT/'external-all-version-event-cells.json')['rows']
contrasts = load(OUT/'external-descriptive-comparisons.json')
pending = {'formal_publication': 'pending', 'consumer_readback': 'pending'}
common_limits = [
    '自有版本unknown，不能视为与v0.111.0机制相同；没有机制改动对照，各build/幕独立保留，不跨版本合并。',
    '自有retry_or_predicted_death是整局分层，不能当该事件发生SL；no_retry_evidence也不证明从未重试。',
    '外部自选上传，玩家标识未读取，玩家独立数未知；distinct_uploaded_runs是上传记录局数，非已核实独立玩家。',
    '外部已选title键没有完整备选、variables或即时支付前资源；前节点末HP及两节点差是代理，不是选择原子费用。',
    '选项自选、牌组/路线/持有物、上传与生存选择、节点内其他动作混杂；终局胜率只作描述，不证明因果或固定选择。',
    '真实事件身份、当前选项文本和支付资源只能从当题读取；未来随机牌/遗物及终局簇不作为当前触发。',
    '自有所列n为冻结选择日志机会，重复决策/重掷不增加独立局；机会间并非配对反事实。',
    '展示某备选不证明当时可支付；is_locked=false且will_kill_player=false只作可选性代理，不把致死备选当同台可选对照。',
]
event_limits = {
    'ROOM_FULL_OF_CHEESE': ['v0.111.0幕2 GORGE为31/81、SEARCH为13/28整局胜，GORGE低8.16点；幕1相反。v0.107.0幕1也反向。未追踪芝士后续回本，不能从节点奖励推整局价值。'],
    'SLIPPERY_BRIDGE': ['同局先重掷后跨越，两个标题组明显重叠；不是独立治疗/对照。A10有6次文本HP价与下一帧净减不一致，保留原价和原帧，原因未知；事件完成帧包含后续重掷，不能归给某一次动作。'],
    'BRAIN_LEECH': ['自有付血RIP执行数为0，不能估计本系统两分支收益差。v0.111.0幕2分享17/41对扯下20/46，方向相反；v0.108.0幕1也反向。奖励实际牌在选择事件分支时尚未知。'],
    'SUNKEN_STATUE': ['CA5KE8GFJ9X2 F12当前3HP，潜水7HP的will_kill_player=true；拿剑不是与可支付潜水的同起点对照。v0.108.0幕1潜水高4.79点，反于v0.111.0；剑后续兑现未知。'],
    'THIS_OR_THAT': ['ORNATE的89个A10窗口中，6次HP净增、2次金币净增，伴随所得遗物，不能定义为永远HP/金币零变。v0.111.0幕2与3中ORNATE整局胜率均低于PLAIN，且PLAIN仅11/12局。随机结果在原选择时不可用。'],
    'THE_LANTERN_KEY': ['自有KEEP_THE_KEY执行数为0，不知道自有战斗损耗或钥匙兑现；3次文本100但后继金币+125，同持BOWLER_HAT只属共现，不据此补机制。外部KEEP与FIGHT两标题同30局，不可相加为60。'],
}

specs = [
    dict(event='ROOM_FULL_OF_CHEESE', slug='cheese-visible-hp-versus-card-pool', acts=[1,2], main_act=1,
         a='GORGE', b='SEARCH',
         direction='满屋芝士把当下14血代价与八选二的真实牌池比较，不预支遗物未来回本。',
         magnitude='A10自有111局111次：71次大快朵颐完成后牌组各+2、HP不变；40次翻找均净失14HP且新增CHOSEN_CHEESE。',
         applicability='仅当前原ID为ROOM_FULL_OF_CHEESE且选项仍明确为8选2/14HP换遗物；Silent A10、已观察幕1/2，自有版本unknown。',
         text='仅当前事件ROOM_FULL_OF_CHEESE且文本仍为八选二/付14血时，比较真实牌池与即时血价，不预支天选芝士未来回本。自有A10/版本unknown：71局选择大快朵颐，完成后各加2牌、HP不变；40局翻找各减14HP并获CHOSEN_CHEESE。\n范围：幕1/2；外部v0.111.0一幕GORGE为62/191、SEARCH为18/71整局胜，二幕方向相反。自选与路线混杂，无因果收益或安全血线；当前牌池未展示时不能先指定所得牌。'),
    dict(event='SLIPPERY_BRIDGE', slug='bridge-reprice-each-reroll', acts=[1,2,3], main_act=1,
         a='OVERCOME', b='HOLD_ON_0',
         direction='滑脚木桥每次重掷后重新比较具名移除牌和新的血价，累计已付成本，不能当恒定3血。',
         magnitude='A10自有74局178次选择：63局共104次重掷，文本价3至7HP，后继实测净减2至7HP、累计368HP；74次跨越各移除1牌且即时HP不变。',
         applicability='仅当前原ID为SLIPPERY_BRIDGE、具名移除牌及重掷价已展示；Silent A10、幕1/2/3，自有版本unknown。',
         text='仅当前事件SLIPPERY_BRIDGE时，每次重掷后重新比较所指移除牌与新血价，并累计已付成本。自有A10/版本unknown：74局178次选择，其中63局共104次重掷，文本价3至7HP，后继净减2至7HP；74次跨越各移除1牌、即时HP不变。\n范围：幕1/2/3；不把重掷数当独立局，也不保证下一次抽中可舍弃牌。外部v0.111.0一幕节点净减代理约5至7HP，涵盖整段，不能当单次费用；文本与实测不一致的记录保留。'),
    dict(event='BRAIN_LEECH', slug='brain-leech-priced-reward-type', acts=[1,2], main_act=1,
         a='SHARE_KNOWLEDGE', b='RIP',
         direction='脑蛭把五选一与付血无色奖励按当前需求比较，不能因无色标签直接付费。',
         magnitude='A10自有88局88次分享知识，HP/金币均不变，完成后各+1牌；付血分支实际选择0次，只有明确5HP价的备选文本。',
         applicability='仅当前原ID为BRAIN_LEECH、文本确为5选1与5HP换无色奖励；Silent A10、幕1/2，自有版本unknown。',
         text='仅当前事件BRAIN_LEECH且提供五选一与付5HP无色奖励时，按当前缺口比较奖励类型与血价，别由无色标签直接判优。自有A10/版本unknown的88局均选分享知识，完成后各加1牌且HP/金币不变，未观察付血分支后果。\n范围：幕1/2；外部v0.111.0一幕分享为44/137、扯下为39/140整局胜（+4.26点），v0.108.0反向（-6.43点），机制对照未知；不作固定选项或因果收益。'),
    dict(event='SUNKEN_STATUE', slug='statue-current-gold-quote', acts=[1], main_act=1,
         a='DIVE_INTO_WATER', b='GRAB_SWORD',
         direction='沉没雕像按本次金币报价和即时掉血比较石剑，不把一局115金币写成固定收益。',
         magnitude='A10自有56局56次：50次潜水均净失7HP、金币净增101至121且逐次等于当前报价；6次拿剑HP/金币不变并新增SWORD_OF_STONE。',
         applicability='仅当前原ID为SUNKEN_STATUE且显示具体金币/HP代价与石剑选项；Silent A10、幕1，自有版本unknown。',
         text='仅当前事件SUNKEN_STATUE时，用本次显示的金币、支付后HP与石剑选项比较，别固定按115金币，也别预支未来精英奖励。自有A10/版本unknown：50局潜水各减7HP并得101至121金币，逐次等于报价；6局拿剑即时HP/金币不变且获SWORD_OF_STONE。\n范围：第一幕；外部v0.111.0潜水17/77、拿剑44/139整局胜，v0.108.0方向相反。路线/牌组自选混杂；未核石剑后续兑现，不给固定拿法或安全HP线。'),
    dict(event='THIS_OR_THAT', slug='this-or-that-curse-versus-hp-gold', acts=[1,2,3], main_act=1,
         a='ORNATE', b='PLAIN',
         direction='这个还是那个按当前代价区分加笨拙换随机遗物和付血换金币，不把随机所得提前当已知收益。',
         magnitude='A10自有94局94次：89次ORNATE各加1张CLUMSY和1件遗物；5次PLAIN各失6HP并得58至65金币；ORNATE有8次HP/金币同步变化，不能视作永远零资源变化。',
         applicability='仅当前原ID为THIS_OR_THAT、实际展示诅咒/遗物与HP/金币两选；Silent A10、幕1/2/3，自有版本unknown。',
         text='仅当前事件THIS_OR_THAT时，把明示的加笨拙代价与随机遗物、以及本次付血金币替代逐项比较，别按“这个/那个”的名字或未来遗物定优劣。自有A10/版本unknown：89局ORNATE各加1张CLUMSY及1件遗物，另5局PLAIN各减6HP并得58至65金币。\n范围：幕1/2/3；ORNATE另有8局HP/金币同步变化，原因未核。外部v0.111.0一幕ORNATE为64/209、PLAIN为5/20整局胜，二三幕反向；小组稀疏、混杂，不作必拿或因果承诺。'),
    dict(event='THE_LANTERN_KEY', slug='lantern-visible-gold-versus-fight', acts=[2], main_act=2,
         a='RETURN_THE_KEY', b='KEEP_THE_KEY',
         direction='灯火钥匙区分眼前金币与明确额外战斗，未核敌人与奖励时不把留下钥匙当免费收益。',
         magnitude='A10自有43局43次交还，HP不变，40次金币+100、3次+125；留钥匙实选0次，备选仅明确需要战斗。',
         applicability='仅当前原ID为THE_LANTERN_KEY且文本仍为100金币/战斗留钥匙；Silent A10、幕2，自有版本unknown。',
         text='仅当前事件THE_LANTERN_KEY时，把交还钥匙的眼前金币与留下钥匙明确需要的额外战斗分开比较；敌人/奖励未核时保留未知。自有A10/版本unknown：43局均交还、HP不变，40局得100金币，3局净增125；未观察留钥匙执行后果。\n范围：第二幕；外部v0.111.0交还43/102、留钥匙16/30整局胜，战斗节点前后HP差约-8.47只是代理。自选幸存混杂，不能由赢家关联固定留钥匙，也不把文本100当所有后继净变化。'),
]

def counter_diff(a, b):
    return dict(collections.Counter(a)-collections.Counter(b))

def own_summary(ws):
    groups = collections.defaultdict(list)
    for w in ws:
        groups[(w['ascension'],w['attempt_scope'],w['act'],w['selected_option']['text_key'])].append(w)
    rows=[]
    for (asc, attempt, act, key), vals in sorted(groups.items()):
        delta=collections.Counter((w['immediate_after']['hp']-w['before']['hp'],w['immediate_after']['gold']-w['before']['gold']) for w in vals)
        rows.append({'game_version':'unknown','ascension':asc,'attempt_scope':attempt,'act':act,'option_key':key,
                     'opportunities':len(vals),'distinct_runs':len({w['run_id'] for w in vals}),
                     'runs':sorted({w['run_id'] for w in vals}),
                     'immediate_delta_hp_gold':[{'hp':hp,'gold':gold,'n':n} for (hp,gold),n in sorted(delta.items())],
                     'event_finished_available':sum(w['event_finished'] is not None for w in vals)})
    return rows

strategies=[]
knowledge=[]
rk=[]
mapping=[]
model_review=[]
own_all=sorted({w['run_id'] for w in windows if w['ascension']==10})
own_strata=own_summary(windows)
write('own-stratified-statistics.json',own_strata)

for sp in specs:
    ev=sp['event']
    all_ws=[w for w in windows if w['event_id']==ev]
    ws=[w for w in all_ws if w['ascension']==10]
    erows=[r for r in external if any(x['id']=='EVENT.'+ev for x in r['rooms'])]
    ecomparisons=[r for r in contrasts if r['event_id']==ev]
    chosen=[]
    for key in sorted({w['selected_option']['text_key'] for w in ws}):
        vals=[w for w in ws if w['selected_option']['text_key']==key]
        chosen.append(next((w for w in vals if w['attempt_scope']=='no_retry_evidence'),vals[0]))
    if ev=='THE_LANTERN_KEY':
        chosen.append(next(w for w in ws if w['immediate_after']['gold']-w['before']['gold']==125))
    if ev=='THIS_OR_THAT':
        chosen.append(next(w for w in ws if w['immediate_after']['hp']>w['before']['hp']))
    primary=next(r for r in ecomparisons if r['version']=='v0.111' and r['act']==sp['main_act'])
    evidence_path=OUT/(sp['slug']+'-evidence.json')
    proof={'event_id':ev,'source':'mixed',**pending,
           'own_game_version':'unknown','own_retrieved_at':'2026-10-24','own_windows':len(all_ws),
           'own_distinct_runs_all_ascensions':len({w['run_id'] for w in all_ws}),
           'own_A10_windows':len(ws),'own_A10_distinct_runs':len({w['run_id'] for w in ws}),
           'own_support_runs':sorted({w['run_id'] for w in ws}),
           'own_strata':[r for r in own_strata if r['option_key'].startswith(ev+'.')],
           'reviewed_witnesses':chosen,'external_cells':erows,'external_comparisons':ecomparisons,
           'independent_sources_pooled':False,'mechanism_version_equivalence':'unknown',
           'external_input_sha256':'4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d',
           'own_scope_sha256':manifest['own_contrast_scope']['scope']['sha256'],
           'full_own_windows':{'path':str((OUT/'own-event-windows.json').resolve()),'sha256':sha(OUT/'own-event-windows.json')},
           'primary_external_comparison':primary,'limits':common_limits+event_limits[ev]}
    write(evidence_path.name,proof)
    sid='silent-brain-event-'+sp['slug']
    kid='silent-event-'+sp['slug']
    rid='silent-rk-event-'+sp['slug']
    own_ev=[{'type':'own','run':w['run_id'],'floor':w['floor'],
             'ref':'logs/decisions.jsonl@'+str(w['decision']['ref']['offset'])+'+'+str(w['decision']['ref']['bytes'])+' sha256='+w['decision']['ref']['sha256'],
             'role':'support'} for w in chosen[:2]]
    ext_ev=[]
    for which in ('a','b'):
        row=next(r for r in erows if r['original_row_index']==primary[which+'_original_row'])
        ext_ev.append({'type':'external_aggregate','source':'external:sts2fun',
                       'url':manifest['provenance']['url'],'version':row['build_id'],
                       'dataset_sha256':manifest['provenance']['database_sha256'],
                       'downloaded_at':'2026-10-21',
                       'filters':{'character':'silent','ascension':10,
                                  'criteria':"n_players=1; is_valid=1; was_abandoned=0; has_modifiers=0; act="+str(row['act'])+'; rooms='+json.dumps(row['rooms'],separators=(',',':'))+'; chosen='+row['value']['title']['key']},
                       'statistic':{'name':'whole_run_winning_uploads_per_distinct_uploaded_run','value':row['whole_run_winning_uploads']/row['distinct_uploaded_runs'],'unit':'probability'},
                       'denominator':{'unit':'runs','n':row['distinct_uploaded_runs']},'design':'observational',
                       'limitations':['上传自选/玩家独立数未知；非因果。','缺即时费用及完整备选；资源差仅代理。','牌组/路线/生存混杂；同局多标题分母不累加。'],
                       'license':'Dataset redistribution license not found; attribution and aggregates only.',
                       'ref':'knowledge/external/sts2fun/decision-fields-v1/statistics.json#/rows/'+str(row['original_row_index'])+'; sha256=4cf36c85eee760ed8e74495c1758e0228bbe1214789d3d0bd97052d5ca6a1f9d',
                       'role':'support'})
    # External associations contextualize the trade, rather than support an option ranking.
    entry={'id':sid,'version':'1.0.0','trigger':{'question_types':['event'],'acts':sp['acts']},
           'strategy':sp['text'],'evidence':own_ev+ext_ev,'source':'mixed','confidence':0.35,
           'evidence_status':'unassessed',**pending,'event_identity_guard_in_body':ev}
    assert len(entry['strategy'].encode())<=1200,(ev,len(entry['strategy'].encode()))
    strategies.append(entry)
    kn={'id':kid,'source':'mixed','disposition':'new',**pending,
        'direction':sp['direction'],'magnitude_and_sample':sp['magnitude'],'applicability':sp['applicability'],
        'strategy_id':sid,'rk_candidate_id':rid,'evidence':{'path':str(evidence_path.resolve()),'sha256':sha(evidence_path)},
        'game_versions':{'own':'unknown','external':sorted({r['build_id'] for r in erows})},
        'collected_at':{'external':'2026-10-21','own':'2026-10-24'},
        'input_sha256':INPUT_SHA,'external_input_sha256':proof['external_input_sha256'],
        'external_primary':primary,'counterexamples_and_gaps':event_limits[ev]+common_limits,
        'causal_effect':None,'safe_hp_threshold':None,'fixed_option_ranking':None}
    kp=write(sp['slug']+'-knowledge-candidate.json',kn)
    knowledge.append(kn)
    gap={'id':rid,'strategy_id':sid,'knowledge_id':kid,'disposition':'waiting','source':'mixed',**pending,
         'candidate_kind':'descriptive_rk_note_not_reflex_entry_v1',
         'event_id':ev,'direction':sp['direction'],'magnitude_and_sample':sp['magnitude'],'applicability':sp['applicability'],
         'executable_entry':None,'signal':None,'predicate':None,
         'evidence':{'path':str(evidence_path.resolve()),'sha256':sha(evidence_path)},
         'missing_contract':['applies_to has combat_line/card_pick/potion/rest/shop, no event',
                             'predicate whitelist has no event.id or event.options identity/price/lock fields',
                             'No original event RK consumer capture or matched outcome matrix'],
         'reason':'现行合同不能表达该事件选择；不伪装成shop/card_pick、不扩schema。保留逐情境描述与原证据，待原owner处理消费者合同和离线输入。',
         'counterexamples_and_gaps':event_limits[ev]+common_limits,
         'capture':None,'replay':None,'model_calls':0,'formal_effect':None}
    rp=write(sp['slug']+'-rk-candidate.json',gap)
    rk.append(gap)
    mapping.append({'unit_id':'external-decision-event-001','event_id':ev,'experience_ids':[],
                    'ledger_ids':[],'disposition':'new','strategy_id':sid,'knowledge_id':kid,
                    'strategy_path':str((OUT/'strategy-candidates.json').resolve()),
                    'knowledge_path':str(kp.resolve()),'strategy_json_pointer':'/entries/'+str(len(strategies)-1),
                    'rk_id':rid,'rk_disposition':'waiting','rk_path':str(rp.resolve()),
                    'source_refs':kn['evidence'],'limits':event_limits[ev]+common_limits,
                    'reason':'六种事件身份/资源交易不同，合并每事件的重复观察与多个统计行，不拆泛句计数；未命中既有正式情境。'})
    for w in chosen:
        aft=w['event_finished'] or w['immediate_after']
        model_review.append({'event_id':ev,'run_id':w['run_id'],'floor':w['floor'],'act':w['act'],
                             'attempt_scope':w['attempt_scope'],'before_hp_gold':[w['before']['hp'],w['before']['gold']],
                             'all_current_options':w['before']['event']['options'],
                             'chosen':w['selected_option'],'result':w['decision']['result'],
                             'immediate_hp_gold':[w['immediate_after']['hp'],w['immediate_after']['gold']],
                             'completion_hp_gold':[aft['hp'],aft['gold']],
                             'completion_added_cards':counter_diff(aft['deck'],w['before']['deck']),
                             'completion_removed_cards':counter_diff(w['before']['deck'],aft['deck']),
                             'completion_added_relics':sorted(set(aft['relics'])-set(w['before']['relics'])),
                             'source_refs':[w['before']['ref'],w['decision']['ref'],aft['ref']]})

write('strategy-candidates.json',{'schema':'brain-strategies-v1','character':'silent','entries':strategies})
write('knowledge-candidates.json',{'id':'silent-special-events-knowledge-candidates','entries':knowledge,**pending})
write('rk-candidates.json',{'id':'silent-special-events-rk-candidates','entries':rk,'valid_reflex_entries':0,**pending})
write('experience-strategy-rk-map.json',mapping)
write('model-review-witnesses.json',model_review)

dedup=[]
terms=[sp['event'] for sp in specs]+['满屋芝士','天选芝士','滑脚木桥','脑蛭','沉没雕像','灯火钥匙','这个还是那个']
for fn in ('experience.json','strategy-entries.json','reflex.json'):
    p=WORK/'knowledge/characters/silent'/fn
    lib=load(p)
    hits=[]
    for e in lib['entries']:
        found=[t for t in terms if t in json.dumps(e,ensure_ascii=False)]
        if found:hits.append({'id':e['id'],'terms':found})
    dedup.append({'path':str(p.relative_to(WORK)),'sha256':sha(p),'entries_scanned':len(lib['entries']),'same_event_hits':hits})
assert not any(x['same_event_hits'] for x in dedup)
write('dedup-audit.json',{'libraries':dedup,'generic_related_ids':['silent-route-hp-observation','silent-brain-relic-exchange-current-sacrifice'],
                        'interpretation':'通用路线HP与另一真实事件RANWID交换不同情境；未重命名/重算旧成果。','new_contexts':6})

representatives=[]
for p in sorted(OUT.glob('external-representatives-c*-p0.json')):
    d=load(p)
    representatives.append({'path':str(p.resolve()),'sha256':sha(p),'cluster_locator_only':d['cluster'],
                            'offset':d['offset'],'limit':1,'complete_pair':True,
                            'examples':[{'example':ex['example'],'win':ex['win'],'nodes':len(ex['timeline']),
                                         'projection_sha256':ex['safe_projection_sha256']} for pair in d['rows'] for ex in pair['examples']]})
counts={'distinct_new_contexts':6,'new_knowledge_candidates':6,'new_strategy_candidates':6,
        'new_rk_descriptive_notes':6,'schema_valid_rk_entries':0,'rk_waiting_contract':6,
        'updated_contexts':0,'byte_reused_contexts':0,'aliases':0,'external_statistic_rows':len(external),
        'descriptive_comparison_rows':len(contrasts),'primary_v111_comparisons_both_groups_ge100':1,
        'all_version_comparisons_both_groups_ge100':sum(r['both_at_least100'] for r in contrasts),
        'formal_strategy_publications':0,'formal_knowledge_publications':0,'formal_rk_publications':0,
        'production_consumer_readbacks':0,'natural_queries':0,'natural_adoptions':0,'verified_benefits':0}
coverage={'frozen_allowed_runs':506,'own_target_events':len(specs),'own_selected_opportunities':len(windows),
          'own_distinct_runs_all_ascensions':len({w['run_id'] for w in windows}),
          'own_A10_selected_opportunities':sum(w['ascension']==10 for w in windows),'own_A10_support_runs':len(own_all),
          'own_event_encounters':len({(w['run_id'],w['floor'],w['event_id']) for w in windows}),
          'own_raw_rows_read':len(load(OUT/'bounded-own-source-refs.json')),
          'own_alignment':'All 627 decision fingerprints agree with before-frame run/event/HP/gold; completed results retained.',
          'external_complete_pairs':len(representatives),'external_complete_timelines':sum(len(x['examples']) for x in representatives),
          'external_complete_nodes':sum(e['nodes'] for r in representatives for e in r['examples']),
          'representatives':representatives,'own_complete_game_four_sections_read':0,
          'full_playbook_claimed':False,
          'model_actual_review':'两页代表的四条完整时间线均已通读；自有七个初始事件原文抽核、六主题逐组汇总及model-review-witnesses逐条核读；不声称读完1927条原始行或506整局。',
          'not_read':'其余代表页与自有四section整局未读；原库/玩家标识/未冻结局未读；不扩展为流派完整剧本。'}
write('coverage.json',coverage)
write('decision-output-counts.json',counts)
ledger={'source':'mixed','external_source':'external:sts2fun','plan_id':manifest['batch_plan_id'],
        'input_sha256':INPUT_SHA,'dispatch_base':BASE,'own_support_runs':own_all,
        'own_other_ascension_evidence_runs':sorted({w['run_id'] for w in windows if w['ascension']!=10}),
        'own_all_ascension_support_runs':sorted({w['run_id'] for w in windows}),
        'source_denominators_pooled':False,'game_versions':{'own':'unknown','external':sorted({r['build_id'] for r in external})},
        'collection_dates':{'external':'2026-10-21','own':'2026-10-24'},
        'external_provenance':manifest['provenance'],'external_license':'No explicit dataset redistribution license found; aggregates with attribution only.',
        'source_references':{'external_cells':'external-all-version-event-cells.json','own_raw_rows':'bounded-own-source-refs.json',
                             'own_stratified':'own-stratified-statistics.json','mapping':'experience-strategy-rk-map.json'},
        'formal_learning_ledger_ids':[],'formal_ledger_registration':'pending_original_publication_owner',
        'decision_output_counts':counts,'limitations':common_limits,**pending}
write('source-ledger.json',ledger)
diff=subprocess.check_output(['git','diff','--binary'])
assert not diff
(OUT/'baseline.diff').write_bytes(diff)
print(json.dumps({'counts':counts,'coverage':{k:v for k,v in coverage.items() if k not in ('representatives','model_actual_review','not_read')},
                  'strategy_text_bytes':[len(e['strategy'].encode()) for e in strategies]},ensure_ascii=False,indent=2))
