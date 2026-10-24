"""Independent frozen-source accounting for #54 own tables and decision supplement."""
import argparse
from collections import Counter,defaultdict
import gzip
import json
import math
from pathlib import Path
import random
from sts2fun_build_projection import sha,canonical


def own_verify(cache,root,external,external_cache=None):
    receipt=json.loads((cache/'receipt.json').read_bytes());raw=(cache/'own-games.json.gz').read_bytes()
    assert sha(raw)==receipt['cache_sha256'];source=json.loads(gzip.decompress(raw))
    manifest=json.loads((root/'manifest.json').read_bytes())
    for name,pin in manifest['files'].items():
        raw=(root/name).read_bytes();assert len(raw)==pin['bytes'] and sha(raw)==pin['sha256']
    index=json.loads((root/'run-index.json').read_bytes())['rows'];by_id={x['run_id']:x for x in index}
    cohort=json.loads((root/'run-index.json').read_bytes())['cohort_audit'];excluded={r['run_id'] for r in cohort['excluded']}
    assert len(index)==cohort['eligible_finished_runs']==len(by_id)
    assert len(source['runs'])==len(index)+len(excluded)==cohort['source_finished_runs']
    assert excluded.isdisjoint(by_id) and 'Z2KBGZQMSRV5' not in by_id
    assert set(by_id)<={r['run_id'] for r in source['runs']}
    assert all(not name.startswith('games/') or name.removeprefix('games/').removesuffix('.json') not in excluded for name in manifest['files'])
    model=json.loads((external/'archetypes.json').read_bytes())['model'];snapshots=defaultdict(list)
    for row in source['snapshots']:snapshots[row['run_id']].append(row)
    for row in index:
        states=sorted((x for x in snapshots[row['run_id']] if isinstance(x['deck'],list)),key=lambda x:x['off'])
        cards={c.removeprefix('CARD.').rstrip('+') for c in states[-1]['deck']} if states else set()
        vec={c:model['vocabulary'][c] for c in cards if c in model['vocabulary']};norm=math.sqrt(sum(x*x for x in vec.values()))
        scores=[sum(vec[c]*center.get(c,0)/norm for c in sorted(vec)) for center in model['centers']] if norm else []
        expected=max(range(len(scores)),key=lambda j:(scores[j],-j)) if scores else None
        assert row['cluster']==expected
    tables={k:json.loads((root/(k+'.json')).read_bytes()) for k in ('archetypes','combinations','timeline','matchups')}
    for row in tables['archetypes']['rows']:
        group=[r for r in index if (r['ascension'],r['attempt_scope'],r['cluster'])==(row['ascension'],row['attempt_scope'],row['cluster'])]
        assert row['n']==len(group) and row['wins']==sum(r['victory'] for r in group)
    # Rebuild 1:1 matches independently from source floor/deck observations.
    original_meta={r['run_id']:r for r in source['runs']};prepared={}
    for ref in index:
        states=sorted(snapshots[ref['run_id']],key=lambda x:x['off'])
        known=[s for s in states if isinstance(s['deck'],list)]
        floors=sorted({s['floor'] for s in states if s['floor'] is not None})
        act=next((s['act'] for s in states if floors and s['floor']==floors[-1]),0)
        terminal=known[-1] if known else {'deck':[],'relics':[]}
        prepared[ref['run_id']]={'depth':(act,len(floors)),'hash':sha(canonical(original_meta[ref['run_id']])),
            'features':{'card:'+c.removeprefix('CARD.').rstrip('+') for c in terminal['deck']}|{'relic:'+c.removeprefix('RELIC.') for c in terminal['relics'] or []}}
    matched={}
    for row in tables['archetypes']['rows']:
        key=(row['ascension'],row['attempt_scope'],row['cluster'])
        group=[r for r in index if (r['ascension'],r['attempt_scope'],r['cluster'])==key]
        losses=defaultdict(list)
        for r in group:
            if not r['victory']:losses[prepared[r['run_id']]['depth']].append(r['run_id'])
        for bucket in losses.values():bucket.sort(key=lambda ident:prepared[ident]['hash'])
        winners=sorted((r['run_id'] for r in group if r['victory']),key=lambda ident:(prepared[ident]['depth'],prepared[ident]['hash']))
        pairs=[]
        for ident in winners:
            act,n=prepared[ident]['depth'];candidates=[d for d,b in losses.items() if b and d[0]==act and abs(d[1]-n)<=3]
            if candidates:
                d=min(candidates,key=lambda d:(abs(d[1]-n),d));pairs.append((ident,losses[d].pop(0)))
        matched[key]=pairs
    recipe_sample=random.Random(53).sample(tables['combinations']['rows'],min(24,len(tables['combinations']['rows'])))
    for row in recipe_sample:
        pairs=matched[row['ascension'],row['attempt_scope'],row['cluster']];items=set(row['items'])
        assert row['pairs']==len(pairs)
        assert row['winner_present']==sum(items<=prepared[w]['features'] for w,l in pairs)
        assert row['loser_present']==sum(items<=prepared[l]['features'] for w,l in pairs)
    representatives=questions=fights=plans=states=0
    rng=random.Random(54);sampled=rng.sample(tables['timeline']['rows'],min(8,len(tables['timeline']['rows'])))
    for row in sampled:
        group=[r for r in index if (r['ascension'],r['attempt_scope'],r['cluster'])==(row['ascension'],row['attempt_scope'],row['cluster'])]
        forms=[]
        for run in group:
            for snap in sorted(snapshots[run['run_id']],key=lambda x:x['off']):
                cards={c.removeprefix('CARD.').rstrip('+') for c in snap['deck'] or []}
                if set(row['bundle'])<=cards:forms.append(snap['act']);break
        all_row=next(x for x in row['strata'] if x['outcome']=='all')
        assert all_row['formed']==len(forms)
        assert all_row['formed_by_act1']==sum(a is not None and a<=1 for a in forms)
    for ref in index:
        if not ref['representative_path']:continue
        game=json.loads((root/ref['representative_path']).read_bytes());representatives+=1
        for name in ('snapshots','fights','questions','plans'):
            shown=[x for floor in game['rows'] for x in floor[name]]+game['unplaced'][name]
            originals=[x for x in source[name] if x['run_id']==ref['run_id']]
            assert len(shown)==len(originals)==game['source_counts'][name]
            key=lambda x:x.get('off',x.get('first_off'))
            assert sorted(map(key,shown))==sorted(map(key,originals))
            for a,b in zip(sorted(shown,key=key),sorted(originals,key=key)):
                if name=='fights':
                    assert a['net_hp_loss_recorded_view']==b['net_hp_loss']
                    assert a['entry_hp']==b['entry_hp'] and a['outcome']==b['outcome']
                    if a['sl_touched']:assert a['net_hp_loss'] is None
                else:assert a==b
            if name=='snapshots':states+=len(shown)
            elif name=='fights':fights+=len(shown)
            elif name=='questions':questions+=len(shown)
            else:plans+=len(shown)
    comparison=json.loads((root/'comparison.json').read_bytes())
    primary=[r for r in index if r['ascension']==10 and r['attempt_scope']=='no_retry_evidence' and r['cluster'] is not None]
    assert comparison['self_primary_n']==len(primary)==sum(x['self']['n'] for x in comparison['archetypes'])
    assert not comparison['source_denominators_pooled']
    gap_samples=0
    if external_cache:
        ref=json.loads((external_cache/'receipt.json').read_bytes());raw=(external_cache/'runs.json.gz').read_bytes()
        assert sha(raw)==ref['cache_sha256'];human=[]
        for r in json.loads(gzip.decompress(raw)):
            if r['version']!='v0.111' or r['win']!=1:continue
            cards={c['id'] for c in r['deck']};vec={c:model['vocabulary'][c] for c in cards if c in model['vocabulary']}
            norm=math.sqrt(sum(x*x for x in vec.values()))
            scores=[sum(vec[c]*center.get(c,0)/norm for c in sorted(vec)) for center in model['centers']] if norm else []
            cluster=max(range(len(scores)),key=lambda j:(scores[j],-j)) if scores else None
            human.append({'cluster':cluster,'features':{'card:'+c for c in cards}|{'relic:'+c['id'] for c in r['relics']}})
        assert comparison['external_winner_n']==len(human)
        for row in random.Random(56).sample(comparison['combinations'],min(24,len(comparison['combinations']))):
            ours=[r for r in primary if r['cluster']==row['cluster']];theirs=[r for r in human if r['cluster']==row['cluster']];items=set(row['items'])
            a=sum(items<=prepared[r['run_id']]['features'] for r in ours);b=sum(items<=r['features'] for r in theirs)
            assert (row['self_n'],row['self_present'],row['external_winner_n'],row['external_winner_present'])==(len(ours),a,len(theirs),b)
            g=row['prevalence_gap'];expected=100*(a/len(ours)-b/len(theirs)) if ours and theirs else None
            assert g['difference_pp']==expected;gap_samples+=1
    return {'excluded_finished_runs':len(excluded),'comparison_gap_samples':gap_samples,'own_runs':len(index),'archetype_cells':len(tables['archetypes']['rows']),'recipe_samples':len(recipe_sample),'timeline_samples':len(sampled),'representative_games':representatives,
            'snapshots':states,'fights':fights,'questions':questions,'plans':plans,'self_primary_n':len(primary),'all_passed':True}


def decision_verify(cache,root):
    receipt=json.loads((cache/'receipt.json').read_bytes());raw=(cache/'decision-fields.json.gz').read_bytes()
    assert sha(raw)==receipt['cache_sha256'];runs=json.loads(gzip.decompress(raw))
    manifest=json.loads((root/'manifest.json').read_bytes())
    for name,pin in manifest['files'].items():
        raw=(root/name).read_bytes();assert len(raw)==pin['bytes'] and sha(raw)==pin['sha256']
    data=json.loads((root/'statistics.json').read_bytes())
    for row in data['field_availability']:
        nodes=[n for r in runs if r['version']==row['version'] and r['build']==row['build_id'] for n in r['nodes']]
        assert row['nodes']==len(nodes)
        kept=[n[row['field']] for n in nodes if n['stats_n']==1]
        assert row['present_array']==sum(f['type']=='array' for f in kept)
        assert row['missing_or_null']==sum(f['type'] in (None,'null') for f in kept)
        assert row.get('empty_array',0)==sum(f['type']=='array' and f['raw_item_n']==0 for f in kept)
        assert row.get('item_n',0)==sum(len(f['items']) for f in kept if f['type']=='array')
    sampled=random.Random(55).sample(data['rows'],min(24,len(data['rows'])))
    for row in sampled:
        count=wins=0;uploads=set()
        for i,r in enumerate(runs):
            if r['version']!=row['version'] or r['build']!=row['build_id']:continue
            for n in r['nodes']:
                if n['stats_n']!=1 or n['act']!=row['act'] or n['rooms']!=row['rooms']:continue
                for value in n[row['field']]['items']:
                    if value==row['value']:count+=1;wins+=r['win']==1;uploads.add(i)
        assert row['item_occurrences']==count and row['whole_run_win_occurrences']==wins and row['distinct_uploaded_runs']==len(uploads)
    return {'external_runs':len(runs),'field_cells':len(data['field_availability']),'choice_samples':len(sampled),'all_passed':True}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('own-cache','own-root','external','decision-cache','decision-root','receipt'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--external-cache',type=Path)
    a=p.parse_args();result={'own':own_verify(a.own_cache,a.own_root,a.external,a.external_cache),'decisions':decision_verify(a.decision_cache,a.decision_root)}
    a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_bytes(canonical(result));print(json.dumps(result))
