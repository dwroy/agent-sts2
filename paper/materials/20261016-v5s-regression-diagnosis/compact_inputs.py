#!/usr/bin/env python3
"""Retain only fields used in this diagnosis; original raw projections and their manifest remain local."""
import gzip
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def keep(d, keys):
    return {k: d[k] for k in keys if k in d} if isinstance(d, dict) else d


def main():
    target = BASE / 'inputs-lean'
    target.mkdir(exist_ok=True)
    assert not (target / 'manifest.json').exists(), 'Preserve the derived analysis inputs.'
    files = []
    for path in sorted((BASE / 'inputs').glob('*.gz')):
        if path.name == 'selection-fields-supplement.jsonl.gz':
            continue
        count = 0
        with gzip.open(path, 'rt') as source, (target / path.name).open('xb') as raw, gzip.GzipFile(fileobj=raw, mode='wb', mtime=0) as out:
            for row in map(json.loads, source):
                if path.name == 'decisions.jsonl.gz':
                    questions = row.get('questions') or {}
                    row['questions'] = {name: {'type': q.get('type'), 'criteria':
                        {key: keep(json.loads(value) if isinstance(value, str) and value.startswith('{') else value, ('kind','option'))
                         for key, value in (q.get('criteria') or {}).items()}}
                        for name,q in questions.items() if isinstance(q,dict)}
                    row['deepseek'] = keep(row.get('deepseek'), ('choice','reason','ranking_override_reason','brain'))
                    sim = row.get('boss_sim') or {}
                    row['boss_sim'] = keep(sim, ('available','error','reason','skipped','boss','base','completion','adaptive','readiness',
                        'build_ranking','s_ranking','low_trust','best','tied','ranked','lines','samples','requested','timed_out','ms','objective','rollout_own_best','rollout_own_tied'))
                    if isinstance(row['boss_sim'],dict):
                        sim=row['boss_sim']
                        if isinstance(sim.get('lines'),dict):sim['lines']={k:keep(v,('win','cal','loss','won_loss','samples','paired_samples','order')) for k,v in sim['lines'].items()}
                        if isinstance(sim.get('s_ranking'),dict):sim['s_ranking']=keep(sim['s_ranking'],('schema','used','mode','reason','old_best','best','candidate_keys','shadow_best','shadow_used'))
                        if isinstance(sim.get('readiness'),dict):sim['readiness']=keep(sim['readiness'],('schema','samples','valid','missing','win','mode','delivered','trust'))
                        if isinstance(sim.get('build_ranking'),dict):sim['build_ranking']=keep(sim['build_ranking'],('schema','status','mode','delivered','best_group','groups','candidates','selection','win_saturated','low_trust'))
                elif path.name == 'brains.jsonl.gz':
                    row.pop('options',None)
                    row['answer']=keep(row.get('answer'),('choice','reason','ranking_override_reason'))
                elif path.name == 'sl.jsonl.gz':
                    row=keep(row,('ts','run_id','floor','encounter','fight_kind','attempt','started_at','ended_at','result','reload','give_up_reason','_source'))
                out.write((json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n').encode());count+=1
        q=target/path.name
        files.append({'path':str(q.relative_to(BASE)),'rows':count,'bytes':q.stat().st_size,'sha256':hashlib.sha256(q.read_bytes()).hexdigest(),
                      'original_projection_path':str(path.relative_to(BASE)),'original_projection_sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    manifest={'schema':'v5s-regression-lean-inputs-v1','source_manifest_sha256':hashlib.sha256((BASE/'inputs/manifest.json').read_bytes()).hexdigest(),
              'projection_only':True,'no_game_labels_or_predictions_changed':True,'original_local_inputs_retained':True,'files':files}
    (target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'files':len(files),'bytes':sum(r['bytes'] for r in files)}))


if __name__=='__main__':main()
