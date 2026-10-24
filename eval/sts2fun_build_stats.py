"""Deterministic #54 build statistics from a privacy-limited public-game projection.

Terminal-deck clusters are descriptive retrospective groups, never a strategy or
causal effect. All outcome denominators remain separate by game version.
"""
import argparse
import collections as C
from functools import lru_cache
import gzip
import itertools as I
import json
import math
from pathlib import Path
import random
import statistics as S
import sys

from sts2fun_build_projection import VERSIONS, FILTER, SQL, canonical, project, sha
from sts2fun_boss_semantics import aggregate as boss_aggregate

SEED = 24054
LIMITS = [
    '观察性上传数据仍有自愿上传、玩家水平、SL/死亡删失与未观察混杂。',
    '未读玩家标识，不能按玩家去重、核独立性或进行玩家整簇稳健推断。',
    '终局牌组含生存与结局信息；簇标签是事后描述，不是决策时可用状态。',
    '仅用到达第三幕的v0.111牌组拟合几何，不读胜负；早期牌组回分可能模糊。版本结局分母不混算，旧版本映射可能不同。',
    '各版本初始牌组由终局保留的最早取得节点牌组众数推定；终局一致不证明每个节点准确。',
    '正block字段牌数只是防御代理，不含全部间接防御；目录元数据的历史版本对齐未验证。',
    'Boss结局与前一节点HP均是推断/代理字段，多战斗节点保持结局未知。',
    '组合仅按终止深度匹配，不是随机干预；BH q值仍依赖配对可交换与独立假设。',
    '不分发原始数据库，仅交聚合统计及有界、脱敏的代表时间线派生摘录。',
]


def ratio(n,d): return n/d if d else None


def distribution(values):
    a=sorted(values)
    def q(p):
        if not a:return None
        x=(len(a)-1)*p;lo=int(x)
        return a[lo]+(a[min(lo+1,len(a)-1)]-a[lo])*(x-lo)
    return {'n':len(a),'mean':S.mean(a) if a else None,'p25':q(.25),'median':q(.5),'p75':q(.75)}


def wilson(w,n):
    if not n:return [None,None]
    z=1.959963984540054;p=w/n;a=1+z*z/n;b=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))
    return [(p+z*z/(2*n)-b)/a,(p+z*z/(2*n)+b)/a]


def normalize(v):
    norm=math.sqrt(sum(x*x for x in v.values()))
    return {k:v[k]/norm for k in sorted(v)} if norm else {}


def dot(a,b): return sum(a[k]*b.get(k,0) for k in sorted(a))


def geometry(runs,k):
    reference=[r for r in runs if r['version']=='v0.111' and any(p['act']>=3 for p in r['nodes'])]
    if not reference:raise ValueError('v0.111 reference cohort is required')
    df=C.Counter(c for r in reference for c in r['cards'])
    vocab=sorted(c for c,n in df.items() if max(5,math.ceil(.02*len(reference)))<=n<=.95*len(reference))
    if not vocab:raise ValueError('no variable reference card features')
    idf={c:math.log((1+len(reference))/(1+df[c]))+1 for c in vocab}
    def vector(r):return normalize({c:idf[c] for c in vocab if c in r['cards']})
    vectors=sorted((vector(r) for r in reference),key=lambda v:tuple(v.items()))
    unique={tuple(v.items()):v for v in vectors if v}
    if len(unique)<k:raise ValueError('insufficient unique reference profiles for requested k')
    vectors=[v for v in vectors if v]
    rng=random.Random(SEED);centers=[vectors[rng.randrange(len(vectors))]]
    while len(centers)<k:
        centers.append(max(unique.values(),key=lambda v:(1-max(dot(v,c) for c in centers),tuple(v.items()))))
    labels=None
    for _ in range(40):
        current=[max(range(k),key=lambda j:(dot(v,centers[j]),-j)) for v in vectors]
        if current==labels:break
        labels=current;sums=[C.Counter() for _ in range(k)]
        for v,j in zip(vectors,current):sums[j].update(v)
        centers=[normalize(s) if s else centers[j] for j,s in enumerate(sums)]
    centers.sort(key=lambda c:tuple((x,round(c[x],12)) for x in sorted(c)))
    for r in runs:
        v=vector(r);scores=[dot(v,c) for c in centers]
        r['cluster']=max(range(k),key=lambda j:(scores[j],-j)) if v else None
        r['similarity']=max(scores) if v else None
        r['similarity_margin']=(sorted(scores,reverse=True)[0]-sorted(scores,reverse=True)[1]) if v else None
    model={'k':k,'seed':SEED,'algorithm':'二元TF-IDF球面k-means；固定最远点初始化；最多40轮',
           'reference_version':'v0.111','reference_scope':'到达第三幕且不读胜负的幸存牌组几何；全部局事后回分','reference_n':len(reference),'vocabulary':idf,
           'centers':centers,'outcome_features':False}
    model['sha256']=sha(canonical(model))
    return model


def mode_initial(runs):
    by_version={}
    for version in sorted({r['version'] for r in runs}):
        dates=[c['added'] for r in runs if r['version']==version for c in r['deck'] if c['added'] is not None and c['added']>=0]
        start=min(dates) if dates else None
        counts=C.Counter(tuple(sorted(C.Counter(c['id'] for c in r['deck'] if c['added']==start).items())) for r in runs if r['version']==version)
        nonempty=[(n,key) for key,n in counts.items() if key]
        if not nonempty:by_version[version]={};continue
        n,key=max(nonempty,key=lambda x:(x[0],x[1]))
        by_version[version]={'cards':dict(key),'start_node':start,'modal_support':n,'n':sum(counts.values()),'definition':'终局保留的最早floor_added牌组众数；推定初始值，非入场快照'}
    return by_version


def reconstruct(r,baseline,block_cards):
    deck=C.Counter(baseline.get('cards',{})); snapshots=[];audit=C.Counter();initial=dict(deck)
    choices=C.Counter();dated_choices=C.Counter()
    for node in r['nodes']:
        picked=C.Counter(c['id'] for c in node['choices'] if c['picked'])
        choices.update(picked)
        dated_choices.update((c,node['node']) for c in picked.elements())
        gained=C.Counter(node['gained']);added=picked|gained
        transformed=C.Counter(t['new'] for t in node['transformed'] if t['new'])
        added=added|transformed
        removed=C.Counter(node['removed'])|C.Counter(t['old'] for t in node['transformed'] if t['old'])
        if node.get('partial'):audit['partial_nodes']+=1
        if any(not t['old'] or not t['new'] for t in node['transformed']):audit['unresolved_transforms']+=1
        for card,n in removed.items():
            if deck[card]<n:audit['unavailable_removal_copies']+=n-deck[card]
            deck[card]=max(0,deck[card]-n)
        deck.update(added)
        snapshots.append(dict(deck))
    predicted=+deck;final=r['cards'];overlap=sum((predicted&final).values())
    strict=predicted==final and not audit
    new=[c for c in r['deck'] if c['added'] is not None and c['added']>baseline.get('start_node',0)]
    matched=(C.Counter((c['id'],c['added']) for c in new)&dated_choices).total()
    quality={'exact_terminal_counts':predicted==final,'strict_terminal_consistent':strict,
             'predicted_copies':predicted.total(),'terminal_copies':final.total(),
             'precision':ratio(overlap,predicted.total()),'recall':ratio(overlap,final.total()),
             'final_added_cards':len(new),'final_added_cards_exact_choice_date_matches':matched,
             'terminal_choice_date_coverage':ratio(matched,len(new)),'audit':dict(audit),
             'baseline_inferred':True}
    r.update(snapshots=snapshots,initial=initial,quality=quality)
    return quality


def features(r):return {'card:'+c for c in r['cards']}|{'relic:'+c['id'] for c in r['relics']}


def depth(r):return (r['nodes'][-1]['act'],len(r['nodes'])) if r['nodes'] else (0,0)


def depth_pairs(rows):
    losses=C.defaultdict(list)
    for r in rows:
        if not r['win']:losses[depth(r)].append(r)
    for group in losses.values():group.sort(key=lambda r:r['content_sha256'])
    pairs=[]
    for w in sorted((r for r in rows if r['win']),key=lambda r:(depth(r),r['content_sha256'])):
        act,d=depth(w)
        candidates=[(abs(key[1]-d),key) for key,group in losses.items() if group and key[0]==act and abs(key[1]-d)<=3]
        if candidates:
            key=min(candidates)[1];pairs.append((w,losses[key].pop(0)))
    return pairs


@lru_cache(maxsize=8192)
def paired_p(greater,less):
    n=greater+less
    return sum(math.comb(n,j) for j in range(greater,n+1))/2**n if n else 1.


def bh(rows):
    previous=1.
    for rank,row in reversed(list(enumerate(sorted(rows,key=lambda r:r['p_one_sided']),1))):
        previous=min(previous,row['p_one_sided']*len(rows)/rank)
        row['q_bh']=previous


def combinations(groups,min_support):
    out=[];coverage=[]
    for (version,cluster),rows in sorted(groups.items()):
        pairs=depth_pairs(rows);n=len(pairs)
        coverage.append({'version':version,'cluster':cluster,'pairs':n,'winner_n':sum(r['win'] for r in rows),
                         'loser_n':sum(not r['win'] for r in rows),'max_depth_difference':3,'replacement':False})
        if not pairs:continue
        freq=C.Counter(f for r in rows for f in features(r))
        vocab=[]
        for kind,limit in [('card:',16),('relic:',8)]:
            vocab += sorted((f for f,count in freq.items() if f.startswith(kind) and count>=min_support),key=lambda f:(-freq[f],f))[:limit]
        vocab=set(vocab);wins=C.Counter();losses=C.Counter();both=C.Counter()
        for w,l in pairs:
            a=features(w)&vocab;b=features(l)&vocab
            for size in (2,3):
                wins.update(I.combinations(sorted(a),size));losses.update(I.combinations(sorted(b),size));both.update(I.combinations(sorted(a&b),size))
        for combo in sorted(wins.keys()|losses.keys()):
            wn,ln= wins[combo],losses[combo]
            if wn+ln<min_support:continue
            same=both[combo];greater=wn-same;less=ln-same
            p=paired_p(greater,less)
            out.append({'version':version,'cluster':cluster,'items':list(combo),'pairs':n,'winner_present':wn,'loser_present':ln,
                        'both_present':same,'winner_only':greater,'loser_only':less,'winner_prevalence':wn/n,'matched_loser_prevalence':ln/n,
                        'difference_pp':100*(wn-ln)/n,'prevalence_ratio':wn/ln if ln else None,
                        'p_one_sided':p,'test':'单侧精确配对二项检验；赢家富集','q_bh':None})
    bh(out)
    for row in out:row['enriched_q05']=row['q_bh']<=.05 and row['difference_pp']>0
    return out,coverage


def boss_rows(groups):
    return boss_aggregate(groups)[0]


def timeline_rows(groups,model,combos,baselines,block_cards):
    out=[]
    for (version,cluster),runs in sorted(groups.items()):
        cards=sorted(model['centers'][cluster],key=lambda c:(-model['centers'][cluster][c],c))[:6]
        enriched=sorted((c for c in combos if c['version']==version and c['cluster']==cluster and c['enriched_q05']),key=lambda c:(c['q_bh'],-c['difference_pp'],c['items']))[:3]
        recipes=[{'items':c['items'],'basis':'终止深度匹配且q<=0.05的观察关联'} for c in enriched]
        if not recipes:recipes=[{'items':['card:'+c for c in cards[:3]],'basis':'质心前三牌描述性组合；未声称显著关联'}]
        winners=[r for r in runs if r['win']]
        formation=[]
        for recipe in recipes:
            positions=[];strict_n=0;formed=C.Counter()
            for r in winners:
                if not r['quality']['strict_terminal_consistent']:continue
                strict_n+=1;first=None
                for node,snapshot in zip(r['nodes'],r['snapshots']):
                    available={'card:'+c for c,n in snapshot.items() if n>0}|{'relic:'+c['id'] for c in r['relics'] if c['added'] is not None and c['added']<=node['node']}
                    if set(recipe['items'])<=available:first=node;break
                if first:
                    positions.append(first['node']);formed[first['act'],first['point']]+=1
            formation.append({**recipe,'winners':len(winners),'terminal_consistent_winners':strict_n,'formed':len(positions),
                              'not_observed_formed':strict_n-len(positions),'excluded_reconstruction':len(winners)-strict_n,
                              'formation_global_node':distribution(positions),
                              'act_node_distribution':[{'act':a,'node_in_act':p,'n':n} for (a,p),n in sorted(formed.items())]})
        checkpoints=[]
        for act in (1,2):
            core=[];defense=[];unknown=[];reached=0;eligible=0
            for r in winners:
                indices=[i for i,p in enumerate(r['nodes']) if p['act']==act]
                if not indices:continue
                reached+=1
                if not any(p['act']>act for p in r['nodes']):continue
                eligible+=1
                if not r['quality']['strict_terminal_consistent']:continue
                snapshot=r['snapshots'][indices[-1]]
                core.append(sum(snapshot.get(c,0) for c in cards))
                unseen=sum(n for c,n in snapshot.items() if n and c not in block_cards)
                unknown.append(unseen)
                if not unseen:defense.append(sum(n for c,n in snapshot.items() if n>0 and block_cards.get(c,False)))
            checkpoints.append({'act':act,'winners_reaching_act':reached,'later_act_observed':eligible,
                                'terminal_consistent_n':len(core),'core_card_copies':distribution(core),
                                'positive_recorded_block_card_copies_proxy':distribution(defense),'unmapped_card_copies':distribution(unknown),
                                'checkpoint_definition':'该幕最后节点，且必须已记录下一幕；事后推定还原'})
        q=[r['quality'] for r in runs]
        out.append({'version':version,'cluster':cluster,'n':len(runs),'winner_n':len(winners),'core_cards':cards,
                    'quality':{'strict_terminal_consistent':sum(x['strict_terminal_consistent'] for x in q),
                               'exact_terminal_counts':sum(x['exact_terminal_counts'] for x in q),
                               'precision':distribution([x['precision'] for x in q if x['precision'] is not None]),
                               'recall':distribution([x['recall'] for x in q if x['recall'] is not None]),
                               'choice_date_matches':sum(x['final_added_cards_exact_choice_date_matches'] for x in q),
                               'final_added_cards':sum(x['final_added_cards'] for x in q)},
                    'formation':formation,'act_end_checkpoints':checkpoints,'initial_baseline':baselines[version]})
    return out


def opening(r):
    return {'card:'+c for p in r['nodes'][:5] for c in p['gained']}|{'card:'+c['id'] for p in r['nodes'][:5] for c in p['choices'] if c['picked']}|{'relic:'+c for p in r['nodes'][:5] for c in p['relic_picks']+p['bought_relics']}



def representatives(groups,k):
    result=[]
    for cluster in range(k):
        rows=[r for (v,c),items in groups.items() if c==cluster for r in items]
        winners=[r for r in rows if r['win']];losses=[r for r in rows if not r['win']]
        profiles={r['content_sha256']:opening(r) for r in rows}
        candidates=[]
        for w in winners:
            for l in losses:
                if w['version']!=l['version']:continue
                a,b=profiles[w['content_sha256']],profiles[l['content_sha256']]
                similarity=len(a&b)/len(a|b) if a|b else None
                candidates.append((w,l,similarity))
        candidates.sort(key=lambda x:(x[0]['version']!='v0.111',x[2] is None,-(x[2] or 0),-x[0]['similarity'],x[0]['content_sha256'],x[1]['content_sha256']))
        chosen=[];used=set()
        for w,l,similarity in candidates:
            if len(chosen)==10:break
            if w['content_sha256'] in used or l['content_sha256'] in used:continue
            used.update((w['content_sha256'],l['content_sha256']));chosen.append((w,l,similarity))
        pairs=[]
        for w,l,similarity in chosen:
            examples=[]
            for r in (w,l):
                node_rows=[]
                for p in r['nodes']:
                    node_rows.append([p['node'],p['act'],p['point'],[[x['kind'],x['id'],x['turns']] for x in p['rooms']],p['hp'],p['max_hp'],p['damage'],p['healed'],p['gold_spent'],
                                      [[c['id'],c['picked']] for c in p['choices']],p['gained'],p['removed'],p['transformed'],p['upgraded'],p['relic_picks'],p['bought_relics'],p['removed_relics'],p.get('partial',False)])
                examples.append({'example':'projection-'+r['content_sha256'][:16],'safe_projection_sha256':r['content_sha256'],'version':r['version'],
                                 'win':r['win'],'terminal_deck':dict(r['cards']),'terminal_relics':[c['id'] for c in r['relics']],
                                 'quality':r['quality'],'timeline':node_rows})
            pairs.append({'early_5_nodes_choice_gain_relic_jaccard':similarity,'initial_state_claim':'仅比较已记录的前5节点选择；不是已核实初始快照','examples':examples})
        result.append({'cluster':cluster,'target_examples':20,'actual_examples':len(pairs)*2,'balanced_outcomes':True,'pairs':pairs})
    return {'columns':['node','act','node_in_act','rooms_kind_id_turns','hp_end','max_hp_end','damage','healed','gold_spent','card_choices_id_picked','gained','removed','transformed','upgraded','relic_picks','bought_relics','removed_relics','partial_projection'],'clusters':result}


def build(runs,k,block_cards,min_support):
    for r in runs:r['cards']=C.Counter(c['id'] for c in r['deck'])
    model=geometry(runs,k);baselines=mode_initial(runs)
    groups=C.defaultdict(list)
    for r in runs:
        reconstruct(r,baselines[r['version']],block_cards)
        if r['cluster'] is not None:groups[r['version'],r['cluster']].append(r)
    archetypes=[]
    for (version,cluster),rows in sorted(groups.items()):
        n=len(rows);wins=sum(r['win'] for r in rows);center=model['centers'][cluster]
        core=sorted(center,key=lambda c:(-center[c],c))[:8]
        acts=sorted({p['act'] for r in rows for p in r['nodes']})
        archetypes.append({'version':version,'cluster':cluster,'n':n,'wins':wins,'win_rate':wins/n,'similarity':distribution([r['similarity'] for r in rows]),'similarity_margin':distribution([r['similarity_margin'] for r in rows]),'before_act3_n':sum(not any(p['act']>=3 for p in r['nodes']) for r in rows),'iid_wilson_descriptive_only':wilson(wins,n),
                           'core_cards':[{'id':c,'centroid_weight':center[c],'present':sum(c in r['cards'] for r in rows),'prevalence':sum(c in r['cards'] for r in rows)/n} for c in core],
                           'boss_reach':[{'act':act,'runs':sum(any(p['act']==act and any(x['kind']=='boss' for x in p['rooms']) for p in r['nodes']) for r in rows),
                                          'denominator':n} for act in acts]})
    for row in archetypes:
        for reached in row['boss_reach']:reached['rate']=reached['runs']/row['n']
    combos,coverage=combinations(groups,min_support)
    matchups,boss_semantics=boss_aggregate(groups)
    return {'archetypes':{'model':model,'rows':archetypes,'unassigned':dict(C.Counter(r['version'] for r in runs if r['cluster'] is None))},
            'combinations':{'method':{'depth_match':'末幕相同、记录节点差不超过3；1:1无放回','candidate_cap':'top16 cards + top8 relics by outcome-blind cluster prevalence','min_support_in_matched_arms':min_support,
                                    'multiple_testing':'全体簇/版本/二元/三元候选统一BH，保留非富集检验'},'coverage':coverage,'rows':combos},
            'timeline':{'defense_proxy':'固定目录中正数block字段的牌数代理；仅部分防御定义，未映射牌未知',
                        'rows':timeline_rows(groups,model,combos,baselines,block_cards)},
            'matchups':{'rows':matchups},'boss-semantics':boss_semantics,'representative-timelines':representatives(groups,k)}


def db_identity(db,receipt=None):
    stat=db.stat();before={'size':stat.st_size,'mtime_ns':stat.st_mtime_ns}
    if receipt:
        value=json.loads(receipt.read_bytes())
        if (value['database_size']!=stat.st_size or value['database_mtime_ns']!=stat.st_mtime_ns or not value.get('database_stable_during_export')):
            raise ValueError('database differs from pinned acquisition/export receipt')
        digest=value['database_sha256'];basis='inherited acquisition SHA; exact size/mtime matches pinned export receipt; full digest not recomputed'
    else:
        import hashlib
        h=hashlib.sha256()
        with db.open('rb') as stream:
            for chunk in iter(lambda:stream.read(4*1024*1024),b''):h.update(chunk)
        digest=h.hexdigest();basis='full SHA256 computed from source bytes'
    if before!={'size':db.stat().st_size,'mtime_ns':db.stat().st_mtime_ns}:raise ValueError('database changed during identity read')
    return {**before,'sha256':digest,'basis':basis,'identity_receipt_sha256':sha(receipt.read_bytes()) if receipt else None}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db',type=Path,required=True);p.add_argument('--catalog',type=Path,required=True)
    p.add_argument('--provenance',type=Path,required=True);p.add_argument('--identity-receipt',type=Path)
    p.add_argument('--cache',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--clusters',type=int,default=8,choices=range(6,11));p.add_argument('--min-support',type=int,default=10)
    p.add_argument('--check',action='store_true')
    args=p.parse_args(argv)
    if args.min_support<1:p.error('--min-support must be positive')
    identity=db_identity(args.db,args.identity_receipt);query_sha=sha(SQL.encode())
    key={'database':identity,'query_sha256':query_sha,'projection_code_sha256':sha(Path(__file__).with_name('sts2fun_build_projection.py').read_bytes())}
    cache=args.cache;cache.mkdir(parents=True,exist_ok=True)
    if (cache/'receipt.json').exists():
        saved=json.loads((cache/'receipt.json').read_bytes())
        if saved['input']!=key or sha((cache/'runs.json.gz').read_bytes())!=saved['cache_sha256']:raise ValueError('cache binding differs; use a new isolated cache')
        runs=json.loads(gzip.decompress((cache/'runs.json.gz').read_bytes()));audit=saved['audit']
    else:
        print('Projecting allowlisted public game fields once',file=sys.stderr,flush=True)
        runs,audit=project(args.db)
        if {'size':args.db.stat().st_size,'mtime_ns':args.db.stat().st_mtime_ns}!={k:identity[k] for k in ('size','mtime_ns')}:raise ValueError('database changed during projection')
        raw=gzip.compress(canonical(runs),mtime=0);(cache/'runs.json.gz').write_bytes(raw)
        (cache/'receipt.json').write_bytes(canonical({'input':key,'audit':audit,'cache_sha256':sha(raw)}))
    print('Computing deterministic clusters and version-specific tables: '+str(len(runs))+' games',file=sys.stderr,flush=True)
    catalog_raw=args.catalog.read_bytes();catalog=json.loads(catalog_raw)
    block={c['id']:bool(isinstance(c.get('block'),(int,float)) and c['block']>0) for c in catalog['collections']['cards']}
    original_provenance=json.loads(args.provenance.read_bytes())['provenance']
    provenance_source={k:original_provenance[k] for k in ('url','faq','downloaded_at','compressed_sha256','database_sha256','compressed_hash_basis','license','filter') if k in original_provenance}
    if provenance_source['database_sha256']!=identity['sha256']:raise ValueError('provenance database SHA differs')
    metadata={'schema_version':1,'source':'external:sts2fun','character':'silent','ascension':10,'design':'observational',
              'filter':FILTER.replace('r.','')+'; patch_major in v0.107-v0.111','provenance':provenance_source,'database_identity':identity,
              'query_sha256':query_sha,'script_sha256':sha(Path(__file__).read_bytes()),'projection_code_sha256':key['projection_code_sha256'],'boss_semantics_code_sha256':sha(Path(__file__).with_name('sts2fun_boss_semantics.py').read_bytes()),
              'catalog':{'sha256':sha(catalog_raw),'fetched_at':catalog.get('fetched_at'),'mod_version':catalog.get('mod_version'),'version_alignment':'历史版本对齐未验证；正block字段仅作代理'},
              'cohorts':{v:{'n':sum(r['version']==v for r in runs),'wins':sum(r['win'] for r in runs if r['version']==v),
                            'builds':dict(C.Counter(str(r['build']) for r in runs if r['version']==v))} for v in VERSIONS},
              'projection_audit':audit,'limitations':LIMITS,'player_identifiers_read':False}
    tables=build(runs,args.clusters,block,args.min_support)
    outputs={name+'.json':canonical({**metadata,**table}) for name,table in tables.items()}
    outputs['safe-projection.sql']=SQL.encode()+b'\n'
    manifest={'schema_version':1,'source':'external:sts2fun','cohorts':metadata['cohorts'],'files':{name:{'bytes':len(raw),'sha256':sha(raw)} for name,raw in sorted(outputs.items())}}
    outputs['manifest.json']=canonical(manifest)
    if {'size':args.db.stat().st_size,'mtime_ns':args.db.stat().st_mtime_ns}!={k:identity[k] for k in ('size','mtime_ns')}:raise ValueError('database changed during statistics')
    if args.check:
        for name,raw in outputs.items():
            if (args.output/name).read_bytes()!=raw:raise ValueError('regeneration differs: '+name)
    else:
        args.output.mkdir(parents=True,exist_ok=True)
        for name,raw in outputs.items():(args.output/name).write_bytes(raw)
    print(json.dumps({'games':len(runs),'clusters':args.clusters,'tables':{name:(sum(x['actual_examples'] for x in table['clusters']) if name=='representative-timelines' else len(table.get('rows',[]))) for name,table in tables.items()},'bytes':sum(map(len,outputs.values())),'checked':args.check}))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
