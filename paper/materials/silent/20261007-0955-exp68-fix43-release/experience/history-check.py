import collections,hashlib,json
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');K=ROOT/'.worktrees/exp/knowledge';A=json.load(open(O/'audit.json'));E=json.load(open(K/'characters/silent/experience.json'));C=json.load(open(O/'changes.json'));R={x['run_id']:x for x in json.load(open(O/'run-metadata.json'))};by={e['id']:e for e in E['entries']};F={}
for eid in C['added']+C['updated']:
 e=by[eid];F[eid]=dict(evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc_support=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),asc_contradict=dict(collections.Counter(R[r]['ascension'] for r in e.get('contradicting',[]))))
for eid,cid in [('silent-noxious-fumes-growth','NOXIOUS_FUMES'),('silent-accelerant-triggers','ACCELERANT'),('silent-afterimage-per-card-block','AFTERIMAGE'),('silent-anticipate-temporary-dexterity','ANTICIPATE'),('silent-piercing-wail-temporary-strength','PIERCING_WAIL')]:
 p=[x for x in A['cards'] if x['card']==cid];actual={x['run'] for x in p};support=set(by[eid]['evidence']);assert support<=actual,(eid,support-actual)
 F[eid].update(actual_runs=len(actual),actual_plays=len(p),actions=[x for x in p if x['run'] in support]);print(eid,'支持',len(support),'历史实用',len(actual),'局',len(p),'次')
H=json.load(open(O/'paper-history.json'));assert set(by['silent-scroll-paper-cuts-unblocked']['evidence'])<=set(H['changes']);print('纸伤历史遭遇',len(H['inventory']),'局、有同回合上限降帧',len(H['changes']),'局、明确纳证3局')
F['silent-scroll-paper-cuts-unblocked']['frames']={r:H['changes'][r] for r in by['silent-scroll-paper-cuts-unblocked']['evidence']}
common=json.load(open(K/'common/monster-db.json'))['monsters'];db={i:common[i] for i in ['SCROLL_OF_BITING','OWL_MAGISTRATE','CRUSHER','ROCKET']};(O/'common-facts-check.json').write_text(json.dumps(db,ensure_ascii=False,indent=2)+'\n')
others={}
for p in (K/'characters/silent').glob('*.json'):
 if p.name=='experience.json':continue
 x=json.load(p.open());others[p.name]=dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),meta=x.get('meta'),generated=x.get('generated'),about=x.get('_about'),generated_from=x.get('generated_from'),note=x.get('note'))
(O/'other-knowledge.json').write_text(json.dumps(others,ensure_ascii=False,indent=2)+'\n');(O/'historical-facts.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
assert len(A['runs'])==85 and len(A['fights'])==1284 and sum(x['death'] for x in A['fights'])==75
print('85静默完局、1284房75实死；证据、卡牌实际及旧基线通过')
