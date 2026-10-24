"""Independent accounting/sample checks over #54 frozen safe projections and tables."""
import argparse
from collections import Counter, defaultdict
import gzip
import json
import math
from pathlib import Path
import random

import sts2fun_build_projection as projection


def verify(cache,output,db=None,require_examples=False):
    receipt=json.loads((cache/'receipt.json').read_bytes())
    compressed=(cache/'runs.json.gz').read_bytes()
    assert projection.sha(compressed)==receipt['cache_sha256'], 'cache SHA mismatch'
    runs=json.loads(gzip.decompress(compressed));by_id={r['content_sha256']:r for r in runs}
    manifest=json.loads((output/'manifest.json').read_bytes())
    for name,ref in manifest['files'].items():
        raw=(output/name).read_bytes()
        assert len(raw)==ref['bytes'] and projection.sha(raw)==ref['sha256'], 'artifact SHA mismatch: '+name
    data={name:json.loads((output/(name+'.json')).read_bytes()) for name in ('archetypes','combinations','timeline','matchups','representative-timelines','boss-semantics')}
    archetypes=data['archetypes'];model=archetypes['model'];idf=model['vocabulary'];centers=model['centers']
    groups=defaultdict(list)
    for r in runs:
        cards={c['id'] for c in r['deck']};v={c:idf[c] for c in cards if c in idf}
        norm=math.sqrt(sum(x*x for x in v.values()))
        if not norm:continue
        scores=[sum(value*center.get(c,0)/norm for c,value in v.items()) for center in centers]
        cluster=max(range(len(centers)),key=lambda j:(scores[j],-j))
        groups[r['version'],cluster].append(r)
    for row in archetypes['rows']:
        group=groups[row['version'],row['cluster']]
        assert row['n']==len(group) and row['wins']==sum(r['win'] for r in group)
        for reach in row['boss_reach']:
            n=sum(any(p['act']==reach['act'] and any(x['kind']=='boss' for x in p['rooms']) for p in r['nodes']) for r in group)
            assert reach['runs']==n and reach['rate']==n/len(group)
    # Recreate deterministic 1:1 depth matching independently, then check random
    # recipes against the actual paired terminal inventories, not displayed rates.
    pair_groups={}
    for key,group in groups.items():
        losses=defaultdict(list);pairs=[]
        for r in group:
            if not r['win'] and r['nodes']:losses[r['nodes'][-1]['act'],len(r['nodes'])].append(r)
        for bucket in losses.values():bucket.sort(key=lambda r:r['content_sha256'])
        wins=sorted((r for r in group if r['win'] and r['nodes']),key=lambda r:(r['nodes'][-1]['act'],len(r['nodes']),r['content_sha256']))
        for w in wins:
            act=w['nodes'][-1]['act'];n=len(w['nodes'])
            available=[depth for depth,bucket in losses.items() if bucket and depth[0]==act and abs(depth[1]-n)<=3]
            if available:
                closest=min(available,key=lambda depth:(abs(depth[1]-n),depth))
                pairs.append((w,losses[closest].pop(0)))
        pair_groups[key]=pairs
    recipes=data['combinations']['rows'];sample=random.Random(54).sample(recipes,min(24,len(recipes)))
    for row in sample:
        def has(r):
            f={'card:'+c['id'] for c in r['deck']}|{'relic:'+c['id'] for c in r['relics']}
            return set(row['items'])<=f
        pairs=pair_groups[row['version'],row['cluster']]
        assert row['pairs']==len(pairs)
        assert row['winner_present']==sum(has(w) for w,l in pairs)
        assert row['loser_present']==sum(has(l) for w,l in pairs)
        assert row['both_present']==sum(has(w) and has(l) for w,l in pairs)
    matchup_samples=random.Random(55).sample(data['matchups']['rows'],min(12,len(data['matchups']['rows'])))
    for row in matchup_samples:
        observations=[];uploads=set();cross_total=sum(x['n'] for x in row['outcome_cross_counts'])
        for index,r in enumerate(groups[row['version'],row['cluster']]):
            for i,p in enumerate(r['nodes']):
                if p['act']!=row['act']:continue
                combat=[room for room in p['rooms'] if room['kind'] in ('monster','elite','boss')]
                for room in combat:
                    if room['kind']!='boss' or room['id']!=row['boss']:continue
                    result=None;single=len(combat)==len(p['rooms'])==1 and not p.get('partial')
                    numeric=type(p['hp']) in (int,float) and math.isfinite(p['hp'])
                    later=i+1<len(r['nodes']);conflict=numeric and p['hp']<=0 and (later or r['win'])
                    if single and type(room['turns']) in (int,float) and room['turns']>0 and not conflict:
                        if numeric and p['hp']<=0:result=False
                        elif later or (r['win'] and numeric and p['hp']>0):result=True
                    proxy=r['nodes'][i-1]['hp'] if i and single else None
                    observations.append((result,proxy));uploads.add(index)
        assert row['encounters']==len(observations)==cross_total
        assert row['distinct_uploaded_runs']==len(uploads)
        assert row['duplicate_boss_visits_n']==len(observations)-len(uploads)
        assert row['outcome_known']==sum(result is not None for result,hp in observations)
        assert row['wins_proxy']==sum(result is True for result,hp in observations)
        hp=[hp for result,hp in observations if type(hp) in (int,float) and math.isfinite(hp)]
        assert row['hp_previous_node_end_proxy']['n']==len(hp)
        if hp:assert abs(row['hp_previous_node_end_proxy']['mean']-sum(hp)/len(hp))<1e-9
    semantic_rows=data['boss-semantics']['rows']
    assert sum(x['distinct_uploaded_runs']*x['observed_path_length'] for x in semantic_rows)==sum(x['boss_record_n'] for x in data['matchups']['rows'] if x['act']==3)
    for row in semantic_rows:
        assert [p['boss'] for p in row['positions']]==row['observed_boss_path']
        assert all(p['verified_floor'] is None and sum(p['outcomes'].values())==row['distinct_uploaded_runs'] for p in row['positions'])
    timeline_samples=random.Random(56).sample(data['timeline']['rows'],min(8,len(data['timeline']['rows'])))
    for row in timeline_samples:
        exact=strict=0
        for r in groups[row['version'],row['cluster']]:
            inventory=Counter(row['initial_baseline'].get('cards',{}));incomplete=False
            for p in r['nodes']:
                remove=Counter(p['removed'])|Counter(t['old'] for t in p['transformed'] if t['old'])
                add=Counter(c['id'] for c in p['choices'] if c['picked'])|Counter(p['gained'])|Counter(t['new'] for t in p['transformed'] if t['new'])
                incomplete |= bool(p.get('partial')) or any(not t['old'] or not t['new'] for t in p['transformed'])
                for card,n in remove.items():
                    incomplete |= inventory[card]<n;inventory[card]=max(0,inventory[card]-n)
                inventory.update(add)
            equal=+inventory==Counter(c['id'] for c in r['deck'])
            exact+=equal;strict+=equal and not incomplete
        assert row['quality']['exact_terminal_counts']==exact
        assert row['quality']['strict_terminal_consistent']==strict
    examples=0;balanced_pairs=0
    for cluster in data['representative-timelines']['clusters']:
        if require_examples:assert 10<=cluster['actual_examples']<=20, 'representative sample shortage'
        assert cluster['actual_examples']==2*len(cluster['pairs'])
        for pair in cluster['pairs']:
            assert [r['win'] for r in pair['examples']]==[1,0]
            assert len({r['version'] for r in pair['examples']})==1
            balanced_pairs+=1
            for example in pair['examples']:
                source=by_id[example['safe_projection_sha256']]
                assert example['terminal_deck']==dict(Counter(c['id'] for c in source['deck']))
                assert len(example['timeline'])==len(source['nodes'])
                assert len({p[0] for p in example['timeline']})==len(source['nodes'])
                assert all(len(p)==len(data['representative-timelines']['columns']) for p in example['timeline'])
                for shown,node in zip(example['timeline'],source['nodes']):
                    assert shown[0:3]==[node['node'],node['act'],node['point']]
                    assert shown[4:9]==[node['hp'],node['max_hp'],node['damage'],node['healed'],node['gold_spent']]
                    assert shown[9]==[[x['id'],x['picked']] for x in node['choices']]
                examples+=1
    source_spots=[]
    if db:
        stat=db.stat();identity=receipt['input']['database']
        assert stat.st_size==identity['size'] and stat.st_mtime_ns==identity['mtime_ns'], 'source file pin changed'
        con=projection.connect(db)
        try:
            spots=[]
            for version in projection.VERSIONS:
                spots.extend(con.execute(projection.SQL+' AND r.patch_major=? LIMIT 2',(*projection.VERSIONS,version)).fetchall())
        finally:con.close()
        for version,win,build,deck,relics,points in spots:
            raw_deck=Counter(projection.card_id(c['id']) for c in json.loads(deck) if projection.card_id(c['id']))
            points=sorted(json.loads(points),key=lambda p:(p['act'],p['point']))
            matched=[r for r in runs if r['version']==version and r['win']==win and len(r['nodes'])==len(points)
                     and Counter(c['id'] for c in r['deck'])==raw_deck
                     and [p['hp'] for p in r['nodes']]==[p['hp'] if p['stats_n']==1 else None for p in points]]
            assert matched, 'SQLite spot does not match frozen safe cache'
            source_spots.append({'version':version,'safe_projection_sha256':matched[0]['content_sha256'],'nodes':len(points),'terminal_cards':sum(raw_deck.values())})
    return {'schema':'issue54-independent-accounting-v1','games':len(runs),'archetype_cells_checked':len(archetypes['rows']),
            'recipe_samples_checked':len(sample),'boss_path_groups_checked':len(semantic_rows),'matchup_samples_checked':len(matchup_samples),'timeline_cells_checked':len(timeline_samples),'representative_examples_checked':examples,'balanced_pairs_checked':balanced_pairs,
            'sqlite_allowlist_source_spots':source_spots,'all_passed':True,'player_identifiers_read':False}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--cache',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--db',type=Path);p.add_argument('--receipt',type=Path,required=True);p.add_argument('--require-examples',action='store_true')
    args=p.parse_args();result=verify(args.cache,args.output,args.db,args.require_examples)
    args.receipt.parent.mkdir(parents=True,exist_ok=True);args.receipt.write_bytes(projection.canonical(result))
    print(json.dumps({k:v for k,v in result.items() if k!='sqlite_allowlist_source_spots'}))
