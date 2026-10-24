"""Own Silent four tables and side-by-side external winner comparisons for #54."""
import argparse
from collections import Counter,defaultdict
import datetime
import gzip
import json
import math
from pathlib import Path
import re

from sts2fun_build_projection import canonical,sha,card_id
from sts2fun_build_stats import combinations,distribution,dot,normalize
import own_build_projection as own

LIMITS=[
 '自有与外部独立分母；游戏版本自有未记录，保持unknown，不能称v0.111精确对照。',
 '进阶分列；采用冻结外部模型回分，未再拟合或由开发定义流派。终局簇含结局信息。',
 '自有结果是最终记录结果；SL重试/预判必死证据另分层，未见重试证据不等于证明未SL。首次尝试截止代理另记，不把最终牌组当首次失败牌组。',
 '逐层/改牌快照是真实日志决策点；中间缺帧未知，首次记录到不等于实际首次获得。',
 '战斗沿原logdb视图：first combat frame为首记录帧，未必动作前；SL同层可能合并尝试，触及战斗不据合并数据计算单次HP损失。',
 '防御仅同一固定目录正block牌副本代理；间接防御、未知ID和历史版本对齐不补造。',
 '外部前节点HP、还原时间线与自有逐层快照口径不完全等价；ordinal不是已核floor，不相减解释成晚几层。',
 '关联与样本差异不证明因果；自有代码/大脑/学习版本演变、SL、玩家选择和幸存偏差保留。',
]


def inventory(values):return Counter(c for raw in (values or []) if (c:=card_id(raw.rstrip('+'))) is not None)


def assign(cards,model):
    v=normalize({c:model['vocabulary'][c] for c in cards if c in model['vocabulary']})
    if not v:return None,None
    scores=[dot(v,c) for c in model['centers']];j=max(range(len(scores)),key=lambda j:(scores[j],-j))
    return j,scores[j]


def filter_data(data,policy):
    def timestamp(value):
        if not value:return None
        dt=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
        return (dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)).timestamp()
    explicit=set(policy['excluded_run_ids']);excluded=[]
    for r in data['runs']:
        reasons=[]
        if r['run_id'] in explicit:reasons.append('explicit_manual_or_handoff_run')
        times=[timestamp(s['ts']) for s in data['snapshots'] if s['run_id']==r['run_id'] and s['ts']]
        if r.get('ended'):times.append(timestamp(r['ended']))
        for window in policy['manual_windows']:
            if times and min(times)<=timestamp(window['ended']) and max(times)>=timestamp(window['started']):
                reasons.append('overlaps_manual_window');break
        if policy.get('require_confirmed_terminal_snapshot'):
            terminal=[s for s in data['snapshots'] if s['run_id']==r['run_id'] and isinstance(s['deck'],list)]
            latest=max(terminal,key=lambda s:s['off']) if terminal else None
            if not latest or latest['screen']!='GAME_OVER' or latest['go_victory'] is not r['victory']:
                reasons.append('terminal_snapshot_missing_or_outcome_inconsistent')
        if reasons:excluded.append({'run_id':r['run_id'],'reasons':reasons})
    blocked={r['run_id'] for r in excluded}
    filtered={k:[r for r in rows if r['run_id'] not in blocked] for k,rows in data.items()}
    return filtered,{'source_finished_runs':len(data['runs']),'eligible_finished_runs':len(filtered['runs']),'excluded':excluded,
                     'policy':policy,'scope':'手动/交接整局排除；没有在runs_raw终局清单的活动局不纳入，也不提前补局。'}


def prepare(data,model):
    indexed={name:defaultdict(list) for name in data if name!='runs'}
    for name,buckets in indexed.items():
        for row in data[name]:buckets[row['run_id']].append(row)
    result=[]
    for meta in sorted(data['runs'],key=lambda r:r['run_id']):
        ident=meta['run_id']
        if not re.fullmatch(r'[A-Z0-9_-]{1,80}',ident):raise ValueError('unsafe own run ID')
        details={name:sorted(buckets[ident],key=lambda r:r.get('off',r.get('first_off'))) for name,buckets in indexed.items()}
        snapshots=details['snapshots'];known=[s for s in snapshots if isinstance(s['deck'],list)]
        terminal=known[-1] if known else None;cards=inventory(terminal['deck']) if terminal else Counter()
        cluster,similarity=assign(cards,model)
        cutoff=next((s for s in details['sl'] if s['result']=='predicted_death'),None)
        retry=any(s['reload_ok'] or (s['attempt'] or 0)>1 or s['result']=='predicted_death' for s in details['sl'])
        scope='retry_or_predicted_death' if retry else 'no_retry_evidence'
        for fight in details['fights']:
            fight['sl_touched']=any(s['floor']==fight['floor'] and (s['result']=='predicted_death' or (s['attempt'] or 0)>1 or s['reload_ok']) for s in details['sl'])
            fight['net_hp_loss_recorded_view']=fight['net_hp_loss']
            if fight['sl_touched']:fight['net_hp_loss']=None
        cohort='unknown-game-version:A'+str(meta['ascension'])+':'+scope
        floors=sorted({s['floor'] for s in snapshots if s['floor'] is not None})
        nodes=[]
        for i,floor in enumerate(floors):
            states=[s for s in snapshots if s['floor']==floor];first=states[0];last=states[-1]
            nodes.append({'node':i+1,'floor':floor,'act':first['act'],'hp':last['hp'],'max_hp':last['max_hp']})
        r={'run_id':ident,'version':cohort,'game_version':'unknown','ascension':meta['ascension'],'attempt_scope':scope,
           'win':int(bool(meta['victory'])),'code':meta['code'],'ended':meta['ended'],'final_floor':meta['floor'],'death_fight':meta['death_fight'],
           'cards':cards,'deck':[{'id':c} for c in cards.elements()],
           'relics':[{'id':c} for c in inventory(terminal['relics'] if terminal else [])],
           'nodes':nodes,'cluster':cluster,'similarity':similarity,'content_sha256':sha(canonical(meta)),
           'terminal_snapshot':terminal,'terminal_state_confirmed':bool(terminal and terminal['screen']=='GAME_OVER'),
           'first_attempt_end':{'basis':'predicted_death cutoff proxy' if cutoff else 'final result; no predicted_death cutoff recorded',
              'floor':cutoff['floor'] if cutoff else meta['floor'],'victory_proxy':False if cutoff else bool(meta['victory']),
              'cutoff_ts':cutoff['ended_at'] or cutoff['ts'] if cutoff else None,'actual_death_verified':bool(not cutoff and terminal and terminal['screen']=='GAME_OVER' and terminal['go_victory'] is False),
              'deck_at_cutoff':'not substituted with final deck'},**details}
        result.append(r)
    return result


def core(model,cluster,n=6):return sorted(model['centers'][cluster],key=lambda c:(-model['centers'][cluster][c],c))[:n]


def checkpoint(r,act,core_cards,blocks):
    if not any(s['act'] is not None and s['act']>act for s in r['snapshots']):return None
    states=[s for s in r['snapshots'] if s['act']==act and isinstance(s['deck'],list)]
    if not states:return None
    s=states[-1];cards=inventory(s['deck']);unknown=sum(n for c,n in cards.items() if c not in blocks)
    return {'run_id':r['run_id'],'floor':s['floor'],'screen':s['screen'],'off':s['off'],'hp':s['hp'],'max_hp':s['max_hp'],
            'core_copies':sum(cards[c] for c in core_cards),'positive_block_copies_proxy':None if unknown else sum(n for c,n in cards.items() if blocks[c]),'unmapped_copies':unknown}


def formation(r,bundle):
    for s in r['snapshots']:
        if isinstance(s['deck'],list) and set(bundle)<=set(inventory(s['deck'])):
            return {'act':s['act'],'recorded_floor':s['floor'],'off':s['off'],'screen':s['screen']}
    return None


def summary(values):
    valid=[v for v in values if type(v) in (int,float)]
    return {**distribution(valid),'missing_n':len(values)-len(valid)}


def row_meta(rows):
    r=rows[0]
    return {'cohort':r['version'],'game_version':'unknown','ascension':r['ascension'],'attempt_scope':r['attempt_scope'],'cluster':r['cluster']}


def own_tables(runs,model,blocks):
    groups=defaultdict(list)
    for r in runs:
        if r['cluster'] is not None:groups[r['version'],r['cluster']].append(r)
    archetypes=[];timeline=[];bosses=defaultdict(list)
    for (cohort,cluster),rows in sorted(groups.items()):
        cc=core(model,cluster);bundle=cc[:3];meta=row_meta(rows)
        archetypes.append({**meta,'n':len(rows),'wins':sum(r['win'] for r in rows),'win_rate':sum(r['win'] for r in rows)/len(rows),
            'terminal_state_confirmed_n':sum(r['terminal_state_confirmed'] for r in rows),
            'core_cards':[{'id':c,'present':sum(c in r['cards'] for r in rows),'prevalence':sum(c in r['cards'] for r in rows)/len(rows)} for c in cc],
            'boss_reach':[{'act':a,'runs':sum(any(f['room']=='boss' and f['act']==a for f in r['fights']) for r in rows),'denominator':len(rows)} for a in (1,2,3)],
            'code_versions':dict(Counter(str(r['configs'][-1]['code'] if r['configs'] else r['code']) for r in rows)),
            'first_attempt_end':{'n':len(rows),'victory_proxy_n':sum(r['first_attempt_end']['victory_proxy'] for r in rows),'cutoff_n':sum(r['first_attempt_end']['cutoff_ts'] is not None for r in rows)}})
        strata=[]
        for outcome in ('all','winner','loser'):
            selected=[r for r in rows if outcome=='all' or bool(r['win'])==(outcome=='winner')]
            positions=[formation(r,bundle) for r in selected];positions=[x for x in positions if x]
            checkpoints=[]
            for act in (1,2):
                marks=[checkpoint(r,act,cc,blocks) for r in selected];marks=[m for m in marks if m]
                checkpoints.append({'act':act,'n':len(marks),'core_copies':summary([m['core_copies'] for m in marks]),
                    'positive_block_copies_proxy':summary([m['positive_block_copies_proxy'] for m in marks]),'hp_end_snapshot':summary([m['hp'] for m in marks])})
            strata.append({'outcome':outcome,'n':len(selected),'formed':len(positions),'not_observed':len(selected)-len(positions),
                'formed_by_act1':sum(p['act'] is not None and p['act']<=1 for p in positions),
                'formation_act_counts':dict(Counter(str(p['act']) for p in positions)),
                'formation_recorded_floor':summary([p['recorded_floor'] for p in positions]),'act_end_checkpoints':checkpoints})
        timeline.append({**meta,'bundle':bundle,'bundle_basis':'冻结外部质心前三ID的描述性bundle，不是已验证核心','core_cards':cc,'strata':strata})
        for r in rows:
            for f in r['fights']:
                if f['room']!='boss':continue
                bosses[cohort,cluster,f['act'],f['scheduled_boss_id'],f['encounter']].append((r,f))
    recipes,coverage=combinations(groups,2)
    for recipe in recipes:
        group=groups[recipe.pop('version'),recipe['cluster']];recipe.update(row_meta(group));recipe['low_n']=recipe['pairs']<10
    for cov in coverage:
        cov.update(row_meta(groups[cov.pop('version'),cov['cluster']]))
    matchups=[]
    for (cohort,cluster,act,target,encounter),pairs in sorted(bosses.items(),key=lambda x:str(x[0])):
        known=[f for r,f in pairs if f['outcome'] in ('won','died')];n=len(known)
        def touched(r,f):return any(s['floor']==f['floor'] and (s['result']=='predicted_death' or (s['attempt'] or 0)>1 or s['reload_ok']) for s in r['sl'])
        hp=[f['entry_hp'] for r,f in pairs if not touched(r,f)]
        matchups.append({**row_meta([pairs[0][0]]),'act':act,'boss_target_id':('ENCOUNTER.'+target.removeprefix('ENCOUNTER.')) if target else None,
            'actual_enemy_encounter':encounter,'identity_status':'run.boss_id目标；真实敌人ID另列，未核双Boss当前目标映射',
            'boss_record_n':len(pairs),'distinct_runs':len({r['run_id'] for r,f in pairs}),'outcome_known':n,'unknown':len(pairs)-n,
            'wins':sum(f['outcome']=='won' for f in known),'win_rate':sum(f['outcome']=='won' for f in known)/n if n else None,
            'sl_touched_records':sum(touched(r,f) for r,f in pairs),
            'entry_first_recorded_combat_hp':summary(hp),
            'net_hp_loss':summary([None if touched(r,f) else f['net_hp_loss'] for r,f in pairs]),
            'hp_definition':'首记录战斗帧HP，非保证动作前原子入场；SL触及记录排除单次HP成本',
            'run_ids':sorted({r['run_id'] for r,f in pairs})})
    return {'archetypes':{'rows':archetypes,'unassigned_run_ids':[r['run_id'] for r in runs if r['cluster'] is None]},
            'combinations':{'rows':recipes,'coverage':coverage,'min_support':2,'candidate_method':'与外部同样top16牌/top8遗物、同幕/近3记录节点1:1配对；仅自有分母'},
            'timeline':{'rows':timeline,'snapshot_basis':'实际记录牌组；幕末要求已见后幕。按胜负分层；不由card_choices反推。'},'matchups':{'rows':matchups}}


def prevalence_gap(own_count,own_n,external_count,external_n):
    a=own_count/own_n if own_n else None;b=external_count/external_n if external_n else None
    return {'self_count':own_count,'self_n':own_n,'self_rate':a,'external_winner_count':external_count,
            'external_winner_n':external_n,'external_winner_rate':b,
            'difference_pp':100*(a-b) if a is not None and b is not None else None}


def comparison(runs,external,external_runs,model,blocks,own_result):
    # Each source retains its original denominator; no pooled fit, p-value, or floor delta.
    primary=[r for r in runs if r['ascension']==10 and r['attempt_scope']=='no_retry_evidence' and r['cluster'] is not None]
    human=[r for r in external_runs if r['version']=='v0.111' and r['win']==1]
    for r in human:r['cards']=Counter(c['id'] for c in r['deck']);r['cluster'],_=assign(r['cards'],model)
    archetypes=[];timeline=[];recipes=[]
    for cluster in range(len(model['centers'])):
        ours=[r for r in primary if r['cluster']==cluster];theirs=[r for r in human if r['cluster']==cluster];cc=core(model,cluster)
        archetypes.append({'cluster':cluster,'self':{'n':len(ours),'denominator':len(primary),'cluster_share':len(ours)/len(primary) if primary else None},
            'external_winners':{'version':'v0.111','n':len(theirs),'denominator':len(human),'cluster_share':len(theirs)/len(human) if human else None},
            'core_prevalence':[{'id':c,'self_n':len(ours),'self_present':sum(c in r['cards'] for r in ours),'external_winner_n':len(theirs),'external_winner_present':sum(c in r['cards'] for r in theirs)} for c in cc]})
        own_t=next((x for x in own_result['timeline']['rows'] if x['cluster']==cluster and x['ascension']==10 and x['attempt_scope']=='no_retry_evidence'),None)
        ext_t=next((x for x in external['timeline']['rows'] if x['cluster']==cluster and x['version']=='v0.111'),None)
        timeline.append({'cluster':cluster,'self_all_no_retry_evidence':own_t,'external_winners':ext_t,
            'comparability':'只并列核心副本/正block代理与成型幕分布；自有floor和外部记录ordinal不相减；版本/快照质量不同，不能据均值定因果。'})
        for row in external['combinations']['rows']:
            if row['version']!='v0.111' or row['cluster']!=cluster:continue
            def has(r):return set(row['items'])<=({'card:'+c for c in r['cards']}|{'relic:'+c['id'] for c in r['relics']})
            recipes.append({'cluster':cluster,'items':row['items'],'self_n':len(ours),'self_present':sum(has(r) for r in ours),
                'external_winner_n':len(theirs),'external_winner_present':sum(has(r) for r in theirs),
                'external_matched_test':{'pairs':row['pairs'],'q_bh':row['q_bh'],'enriched_q05':row['enriched_q05']},
                'effect_definition':'各来源终局出现率并列；未算因果胜率提升'})
    for row in archetypes:
        a,b=row['self'],row['external_winners']
        row['cluster_share_gap']=prevalence_gap(a['n'],a['denominator'],b['n'],b['denominator'])
        for item in row['core_prevalence']:
            item['prevalence_gap']=prevalence_gap(item['self_present'],item['self_n'],item['external_winner_present'],item['external_winner_n'])
    for row in recipes:
        row['prevalence_gap']=prevalence_gap(row['self_present'],row['self_n'],row['external_winner_present'],row['external_winner_n'])
    for row in timeline:
        ours=row['self_all_no_retry_evidence'];theirs=row['external_winners'];gaps=[]
        if ours and theirs:
            all_row=next(x for x in ours['strata'] if x['outcome']=='all');f=theirs['formation'][0]
            ext_early=sum(x['n'] for x in f['act_node_distribution'] if x['act']<=1)
            row['recorded_bundle_by_act1_gap']=prevalence_gap(all_row['formed_by_act1'],all_row['n'],ext_early,f['terminal_consistent_winners'])
            for act in (1,2):
                a=next(x for x in all_row['act_end_checkpoints'] if x['act']==act)
                b=next(x for x in theirs['act_end_checkpoints'] if x['act']==act)
                for own_key,ext_key in [('core_copies','core_card_copies'),('positive_block_copies_proxy','positive_recorded_block_card_copies_proxy')]:
                    x,y=a[own_key],b[ext_key]
                    gaps.append({'act':act,'metric':own_key,'self_n':x['n'],'self_mean':x['mean'],'external_winner_n':y['n'],'external_winner_mean':y['mean'],
                        'difference_copies':x['mean']-y['mean'] if x['mean'] is not None and y['mean'] is not None else None})
        row['act_end_proxy_gaps']=gaps
        row['gap_scope']='描述差异：自有全部无重试证据局 vs 外部终局还原一致赢家；缺失/版本/SL/幸存偏差保留，不是因果，也不是晚几层。'
    matchups=[]
    for own_row in own_result['matchups']['rows']:
        if own_row['ascension']!=10 or own_row['attempt_scope']!='no_retry_evidence':continue
        candidates=[r for r in external['matchups']['rows'] if r['version']=='v0.111' and r['cluster']==own_row['cluster'] and r['act']==own_row['act'] and r['boss']==own_row['boss_target_id']]
        matchups.append({'self':own_row,'external_target_id_matches':candidates,
            'comparability':'仅目标原ID机械匹配，不认证目标就是实际遭遇；外部结果/前节点HP是代理，自有首帧HP另列，不混算。'})
    return {'archetypes':archetypes,'combinations':recipes,'timeline':timeline,'matchups':matchups,
            'primary_filter':'self Silent A10 no_retry_evidence vs external v0.111 winners；无重试证据不证明未SL；自有游戏版本unknown',
            'self_primary_n':len(primary),'external_winner_n':len(human),'source_denominators_pooled':False}


def game_packet(r,model,blocks):
    floors=sorted({x['floor'] for name in ('snapshots','fights','questions','plans') for x in r[name] if x['floor'] is not None})
    return {'run_id':r['run_id'],'source':'self:agent-sts2','cluster':r['cluster'],'ascension':r['ascension'],'game_version':'unknown',
        'attempt_scope':r['attempt_scope'],'final_victory':bool(r['win']),'final_floor':r['final_floor'],'death_fight':r['death_fight'],
        'first_attempt_end':r['first_attempt_end'],'terminal_deck':dict(r['cards']),'terminal_state_confirmed':r['terminal_state_confirmed'],
        'key_hp_loss_fights':sorted(r['fights'],key=lambda f:-(f['net_hp_loss'] if f['net_hp_loss'] is not None else -1))[:5],
        'act_end_snapshots':[checkpoint(r,a,core(model,r['cluster']),blocks) for a in (1,2)],
        'source_counts':{k:len(r[k]) for k in ('snapshots','fights','questions','plans')},
        'rows':[{'floor':f,**{name:[x for x in r[name] if x['floor']==f] for name in ('snapshots','fights','questions','plans')}} for f in floors],
        'unplaced':{name:[x for x in r[name] if x['floor'] is None] for name in ('snapshots','fights','questions','plans')},
        'limits':LIMITS,'question_scope':'原logdb抽取的题型/选项/选择/理由（可能已按原抽取器截长），不是全部原生prompt；off/len可定位冻结源行。'}


def build(data,external,external_runs,blocks):
    model=external['archetypes']['model'];runs=prepare(data,model);tables=own_tables(runs,model,blocks)
    comparisons=comparison(runs,external,external_runs,model,blocks,tables)
    selected=[]
    for cluster in range(len(model['centers'])):
        rows=[r for r in runs if r['cluster']==cluster]
        ordering=lambda r:(r['ascension']!=10,r['attempt_scope']!='no_retry_evidence',-r['similarity'],r['run_id'])
        winners=sorted((r for r in rows if r['win']),key=ordering)[:10]
        losers=sorted((r for r in rows if not r['win']),key=ordering)[:20-len(winners)]
        selected.extend(winners+losers)
    packets={r['run_id']:game_packet(r,model,blocks) for r in selected}
    index=[{'run_id':r['run_id'],'cluster':r['cluster'],'ascension':r['ascension'],'attempt_scope':r['attempt_scope'],'victory':bool(r['win']),
            'final_floor':r['final_floor'],'death_fight':r['death_fight'],'representative_path':'games/'+r['run_id']+'.json' if r['run_id'] in packets else None,
            'counts':{k:len(r[k]) for k in ('snapshots','fights','questions','plans')}} for r in runs]
    return tables,comparisons,packets,index


def read_external(root,cache):
    manifest=json.loads((root/'manifest.json').read_bytes());data={}
    for kind in ('archetypes','combinations','timeline','matchups'):
        name=kind+'.json';raw=(root/name).read_bytes()
        if sha(raw)!=manifest['files'][name]['sha256']:raise ValueError('external artifact differs')
        data[kind]=json.loads(raw)
    receipt=json.loads((cache/'receipt.json').read_bytes());raw=(cache/'runs.json.gz').read_bytes()
    if sha(raw)!=receipt['cache_sha256']:raise ValueError('external safe cache differs')
    if receipt['input']['database']['sha256']!=data['archetypes']['database_identity']['sha256']:raise ValueError('external source identity differs')
    return data,json.loads(gzip.decompress(raw)),{'manifest_sha256':sha((root/'manifest.json').read_bytes()),'safe_cache_sha256':sha(raw),'model_sha256':data['archetypes']['model']['sha256']}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('cache','external','external-cache','catalog','output'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--logdb',type=Path);p.add_argument('--log-tools',type=Path,default=Path(__file__).resolve().parents[1]/'agent/tools/logdb')
    p.add_argument('--exclusions',type=Path,default=Path(__file__).with_name('own-build-exclusions.json'))
    p.add_argument('--check',action='store_true');a=p.parse_args(argv);a.cache.mkdir(parents=True,exist_ok=True)
    if not (a.cache/'receipt.json').exists():
        if not a.logdb:p.error('first export needs --logdb; uses existing DuckDB environment, never installs')
        data,receipt=own.freeze(a.logdb,a.log_tools);raw=gzip.compress(canonical(data),mtime=0);receipt['cache_sha256']=sha(raw)
        (a.cache/'own-games.json.gz').write_bytes(raw);(a.cache/'receipt.json').write_bytes(canonical(receipt))
    receipt=json.loads((a.cache/'receipt.json').read_bytes());raw=(a.cache/'own-games.json.gz').read_bytes()
    if sha(raw)!=receipt['cache_sha256'] or sha(Path(own.__file__).read_bytes())!=receipt['projection_code_sha256']:raise ValueError('own cache binding differs')
    data=json.loads(gzip.decompress(raw));policy_raw=a.exclusions.read_bytes();data,cohort_audit=filter_data(data,json.loads(policy_raw));external,external_runs,external_pin=read_external(a.external,a.external_cache)
    catalog_raw=a.catalog.read_bytes();catalog=json.loads(catalog_raw)
    blocks={c['id']:type(c.get('block')) in (int,float) and c['block']>0 for c in catalog['collections']['cards']}
    tables,comparisons,packets,index=build(data,external,external_runs,blocks)
    meta={'source':'self:agent-sts2','character':'silent','design':'observational','game_version':'unknown','outcome_basis':'final_recorded_result; SL strata separate',
          'own_snapshot':receipt,'cohort_audit':cohort_audit,'exclusion_policy_sha256':sha(policy_raw),'external_pin':external_pin,'catalog_sha256':sha(catalog_raw),'script_sha256':sha(Path(__file__).read_bytes()),'limitations':LIMITS}
    outputs={kind+'.json':canonical({**meta,**table}) for kind,table in tables.items()}
    outputs['comparison.json']=canonical({**meta,**comparisons});outputs['run-index.json']=canonical({**meta,'rows':index})
    for ident,packet in packets.items():outputs['games/'+ident+'.json']=canonical(packet)
    outputs['manifest.json']=canonical({'source':'self:agent-sts2','external_pin':external_pin,'files':{name:{'bytes':len(raw),'sha256':sha(raw)} for name,raw in sorted(outputs.items())}})
    if not a.check and (a.output/'manifest.json').exists():
        previous=json.loads((a.output/'manifest.json').read_bytes())
        for name,pin in previous['files'].items():
            if name in outputs:continue
            stale=a.output/name
            if not stale.resolve().is_relative_to(a.output.resolve()) or sha(stale.read_bytes())!=pin['sha256']:raise ValueError('stale managed file changed')
            stale.unlink()
    for name,raw in outputs.items():
        dest=a.output/name
        if a.check:
            if dest.read_bytes()!=raw:raise ValueError('own regeneration differs: '+name)
        else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
    print(json.dumps({'own_runs':len(index),'a10_runs':sum(r['ascension']==10 for r in index),'representatives':len(packets),'four_tables':{k:len(v['rows']) for k,v in tables.items()},
        'comparison_self_primary_n':comparisons['self_primary_n'],'comparison_external_winner_n':comparisons['external_winner_n'],'bytes':sum(len(x) for x in outputs.values()),'checked':a.check}))
    return 0


if __name__=='__main__':raise SystemExit(main())
