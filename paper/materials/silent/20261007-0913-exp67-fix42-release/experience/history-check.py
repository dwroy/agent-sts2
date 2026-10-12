import collections,hashlib,json,pathlib
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
A=json.load(open(O/'audit.json'));E=json.load(open(ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json'));R={x['run_id']:x for x in json.load(open(O/'run-metadata.json'))};C=json.load(open(O/'changes.json'));by={e['id']:e for e in E['entries']};F={}
for eid in C['added']+C['updated']:
 e=by[eid];F[eid]=dict(evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc_support=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),asc_contradict=dict(collections.Counter(R[r]['ascension'] for r in e.get('contradicting',[]))))
for eid,cid in [('silent-snakebite-retained-poison','SNAKEBITE'),('silent-piercing-wail-temporary-strength','PIERCING_WAIL')]:
 plays=[x for x in A['cards'] if x['card']==cid];support=set(by[eid]['evidence']);actual={x['run'] for x in plays};assert support<=actual,(eid,support-actual)
 F[eid]['actions']=[x for x in plays if x['run'] in support];F[eid]['actual_runs']=len(actual);F[eid]['actual_plays']=len(plays)
 print(eid,'纳证局实用',len(support),'历史',len(actual),'局',len(plays),'次')
eid='silent-lagavulin-siphon-poison-sl';f=[x for x in A['fights'] if x['run'] in by[eid]['evidence'] and 'LAGAVULIN_MATRIARCH' in x['enemies']];assert {x['run'] for x in f}==set(by[eid]['evidence']);F[eid]['fights']=f
F[eid]['siphon_ends']=[x for x in A['ends'] if x['run'] in by[eid]['evidence'] and any(e['id']=='LAGAVULIN_MATRIARCH' for e in x['before']['enemies']) and x['before']['powers']!=x['after']['powers']]
F['silent-strength-weak-observation']['new_frames']=[x for x in A['cards'] if x['run']=='KQQELQSZ382Z' and (x['before']['powers'].get('STRENGTH_POWER') or x['before']['powers'].get('DEXTERITY_POWER') or any(e['powers'].get('STRENGTH_POWER') or e['powers'].get('WEAK_POWER') for e in x['before']['enemies']))]
(O/'historical-facts.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
common=json.load(open(ROOT/'.worktrees/exp/knowledge/common/monster-db.json'))['monsters']
db={i:common[i] for i in ['LAGAVULIN_MATRIARCH','SKULKING_COLONY']};(O/'common-facts-check.json').write_text(json.dumps(db,ensure_ascii=False,indent=2)+'\n')
print('机制进阶',[(i,x['asc_support']) for i,x in F.items()])
assert sum(x['death'] for x in A['fights'])==74
print('静默84完局、1265房74实死；卡牌实际与boss场核对通过')
