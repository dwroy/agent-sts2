"""Save the original bounded run/SL/config lines, not reserialized projections."""
import gzip,hashlib,json
from pathlib import Path
R=Path('/home/dw/Projects/agent-sts2');B=R/'paper/materials/20261016-global-build-g3b';O=Path(__file__).resolve().parent;M=json.loads((B/'inputs/manifest.json').read_text());manifest=[]
for kind in ['runs','sl-attempts','run-config']:
 bound=M['source_bounds'][kind];offset=0
 with (R/bound['path']).open('rb') as src,gzip.GzipFile(str(O/f'raw-{kind}.jsonl.gz'),'wb',compresslevel=6,mtime=0) as archive:
  for x in json.loads((B/'inputs'/f'{kind}.json').read_text()):
   z=x['_source'];assert z['off']>=0 and z['off']+z['len']<=bound['complete_prefix_bytes'];src.seek(z['off']);raw=src.read(z['len']);assert len(raw)==z['len'] and hashlib.sha256(raw).hexdigest()==z['sha256'];assert json.loads(raw)==x['row']
   manifest.append({'path':bound['path'],**z,'archive':{'path':f'raw-{kind}.jsonl.gz','uncompressed_off':offset,'len':len(raw)}});archive.write(raw);offset+=len(raw)
with (O/'extra-raw-manifest.jsonl').open('w') as f:
 for x in manifest:f.write(json.dumps(x,separators=(',',':'))+'\n')
print(json.dumps({'original_extra_rows':len(manifest),'roles_from_frozen_configs':'silent/A10','all_raw_hashes_match':True}))
