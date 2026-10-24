import gzip,json,random,sys
from pathlib import Path
sys.path.insert(0,'eval')
from sts2fun_build_projection import canonical,sha
import build_stats_view as view
import own_build_stats as own
cache=Path('data/external/issue54-own-cache-v2');data=json.loads(gzip.decompress((cache/'own-games.json.gz').read_bytes()))
data,audit=own.filter_data(data,json.loads(Path('eval/own-build-exclusions.json').read_bytes()))
root=Path('knowledge/characters/silent/build-statistics-v1');spots=[]
with Path('/home/dw/Projects/agent-sts2/logs/states.jsonl').open('rb') as handle:
 for s in random.Random(54).sample(data['snapshots'],10):
  handle.seek(s['off']);raw=handle.read(s['len']);entry=json.loads(raw);state=entry['state'];r=state['run']
  assert state['run_id']==s['run_id'] and r.get('floor')==s['floor'] and r.get('current_hp')==s['hp']
  deck=r.get('deck');cards=[c['card_id']+('+' if c.get('upgraded') else '') for c in deck if isinstance(c,dict) and isinstance(c.get('card_id'),str)] if isinstance(deck,list) else None
  assert cards==s['deck'];spots.append({'run_id':s['run_id'],'off':s['off'],'len':s['len'],'source_line_sha256':sha(raw)})
index=json.loads((root/'run-index.json').read_bytes())['rows'];checks=[]
for r in index:
 if not r['representative_path']:continue
 for section in ('snapshots','fights','questions','plans'):
  raw=view.page(root,'game',run_id=r['run_id'],section=section,limit=1);page=json.loads(raw)
  assert page['total']==r['counts'][section]
  checks.append({'run_id':r['run_id'],'section':section,'total':page['total'],'first_page_bytes':len(raw)})
r=next(x for x in index if x['representative_path'] and x['ascension']==10 and x['attempt_scope']=='no_retry_evidence');complete={}
for section in ('snapshots','fights','questions','plans'):
 offset=0;n=0
 while True:
  page=json.loads(view.page(root,'game',run_id=r['run_id'],section=section,limit=1,offset=offset));n+=len(page['rows'])
  if page['next_offset'] is None:break
  offset=page['next_offset']
 assert n==r['counts'][section];complete[section]=n
for field in ('potion_used','rest_site_choices','ancient_choice'):
 page=json.loads(view.page(Path('knowledge/external/sts2fun/decision-fields-v1'),'decisions',field=field,limit=1));assert len(page['rows'])==1
receipt={'raw_own_state_spots':spots,'bounded_game_section_first_pages':len(checks),'max_first_page_bytes':max(x['first_page_bytes'] for x in checks),
 'complete_bounded_game':{'run_id':r['run_id'],'counts':complete},'external_priority_1_2_3_pages':True,'excluded_ids':[x['run_id'] for x in audit['excluded']],'all_passed':True}
Path('learner/runs/issue54-addendum/source-and-bounded-readback.json').write_bytes(canonical(receipt))
print(json.dumps({k:v for k,v in receipt.items() if k!='raw_own_state_spots'}))
