"""Hash-verified bounded pages for #54 own comparisons and external decisions."""
import argparse
import json
from pathlib import Path
import re
from sts2fun_build_projection import canonical,sha

KINDS=('archetypes','combinations','timeline','matchups','comparison','run-index','game','decisions','availability','readiness')


def page(root,kind,cluster=None,ascension=10,attempt_scope='no_retry_evidence',version='v0.111',field=None,run_id=None,section='snapshots',table='archetypes',offset=0,limit=5,max_bytes=32768):
    if kind not in KINDS or offset<0 or not 1<=limit<=100 or not 1024<=max_bytes<=262144:raise ValueError('invalid bounded query')
    manifest=json.loads((root/'manifest.json').read_bytes())
    if kind=='game':
        if not run_id or not re.fullmatch(r'[A-Z0-9_-]{1,80}',run_id) or section not in ('snapshots','fights','questions','plans'):raise ValueError('invalid game query')
        name='games/'+run_id+'.json'
    elif kind in ('decisions','availability','readiness'):name='statistics.json'
    else:name=kind+'.json'
    ref=manifest['files'][name];raw=(root/name).read_bytes()
    if len(raw)!=ref['bytes'] or sha(raw)!=ref['sha256']:raise ValueError('frozen artifact differs')
    data=json.loads(raw);extra={}
    if kind=='game':
        rows=[x for floor in data['rows'] for x in floor[section]]+data['unplaced'][section]
        rows.sort(key=lambda x:x.get('off',x.get('first_off')))
        extra={k:data[k] for k in ('run_id','cluster','ascension','game_version','attempt_scope','final_victory','final_floor','death_fight','first_attempt_end','source_counts','question_scope')}
    elif kind=='comparison':
        if table not in ('archetypes','combinations','timeline','matchups'):raise ValueError('invalid comparison table')
        rows=data[table]
        if cluster is not None:rows=[x for x in rows if x.get('cluster',x.get('self',{}).get('cluster'))==cluster]
        extra={'primary_filter':data['primary_filter'],'source_denominators_pooled':False}
    elif kind in ('decisions','availability','readiness'):
        rows=data[{'decisions':'rows','availability':'field_availability','readiness':'decision_unit_readiness'}[kind]]
        if kind!='readiness':rows=[x for x in rows if x['version']==version and (not field or x['field']==field)]
        extra={'categories':data['categories']}
    else:
        rows=[x for x in data['rows'] if x['ascension']==ascension and x['attempt_scope']==attempt_scope and (cluster is None or x['cluster']==cluster)]
    selected=rows[offset:offset+limit]
    result={'source':data.get('source'),'artifact':{'path':name,**ref},'kind':kind,'section':section if kind=='game' else None,
        'limitations':data.get('limitations',data.get('limits',[])),'offset':offset,'total':len(rows),
        'next_offset':offset+len(selected) if offset+len(selected)<len(rows) else None,'rows':selected,**extra}
    output=canonical(result)
    if len(output)>max_bytes:raise ValueError('complete page exceeds byte limit; reduce --limit; no record truncated')
    return output


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);p.add_argument('--kind',choices=KINDS,required=True)
    p.add_argument('--cluster',type=int);p.add_argument('--ascension',type=int,default=10);p.add_argument('--attempt-scope',default='no_retry_evidence')
    p.add_argument('--version',default='v0.111');p.add_argument('--field');p.add_argument('--run-id');p.add_argument('--section',default='snapshots')
    p.add_argument('--table',default='archetypes');p.add_argument('--offset',type=int,default=0);p.add_argument('--limit',type=int,default=5);p.add_argument('--max-bytes',type=int,default=32768)
    a=vars(p.parse_args());print(page(**a).decode(),end='')
