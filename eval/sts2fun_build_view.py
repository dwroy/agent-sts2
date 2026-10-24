"""Bounded, hash-verified pages of #54 aggregates/complete representative pairs."""
import argparse
import json
from pathlib import Path
from sts2fun_build_projection import canonical, sha

KINDS={'archetypes','combinations','timeline','matchups','boss-semantics','representative-timelines'}


def page(root,kind,version,cluster,offset=0,limit=1,max_bytes=32768):
    if kind not in KINDS or offset<0 or not 1<=limit<=100 or max_bytes<1024:raise ValueError('invalid bounded query')
    manifest=json.loads((root/'manifest.json').read_bytes());name=kind+'.json'
    raw=(root/name).read_bytes();ref=manifest['files'][name]
    if len(raw)!=ref['bytes'] or sha(raw)!=ref['sha256']:raise ValueError('frozen artifact differs')
    data=json.loads(raw)
    if kind=='representative-timelines':
        rows=[pair for c in data['clusters'] if c['cluster']==cluster for pair in c['pairs'] if pair['examples'][0]['version']==version]
    else:
        rows=[r for r in data['rows'] if r['version']==version and r['cluster']==cluster]
        if kind=='combinations':rows.sort(key=lambda r:(r['q_bh'],-r['difference_pp'],r['items']))
    selected=rows[offset:offset+limit]
    result={'source':data['source'],'design':data['design'],'version':version,'cluster':cluster,'kind':kind,
            'artifact':{'path':name,**ref},'provenance':data['provenance'],'limitations':data['limitations'],
            'offset':offset,'total':len(rows),'next_offset':offset+len(selected) if offset+len(selected)<len(rows) else None,
            'rows':selected}
    if kind=='representative-timelines':result['columns']=data['columns']
    if kind=='boss-semantics':result.update(availability=data['availability'],rules=data['rules'],scope=data['scope'])
    output=canonical(result)
    if len(output)>max_bytes:raise ValueError('complete page exceeds byte limit; reduce --limit; no record truncated')
    return output


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,required=True);p.add_argument('--kind',choices=sorted(KINDS),required=True)
    p.add_argument('--version',default='v0.111');p.add_argument('--cluster',type=int,required=True)
    p.add_argument('--offset',type=int,default=0);p.add_argument('--limit',type=int,default=1);p.add_argument('--max-bytes',type=int,default=32768)
    a=p.parse_args()
    print(page(a.root,a.kind,a.version,a.cluster,a.offset,a.limit,a.max_bytes).decode(),end='')
