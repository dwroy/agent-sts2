import collections,json,re
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');K=ROOT/'.worktrees/exp/knowledge';A=json.load(open(O/'audit.json'));E=json.load(open(K/'characters/silent/experience.json'));C=json.load(open(O/'changes.json'));R={x['run_id']:x for x in json.load(open(O/'run-metadata.json'))};B={x['id']:x for x in E['entries']};F={}
for eid in C['added']+C['updated']:
 e=B[eid];F[eid]=dict(evidence=e['evidence'],contradicting=e.get('contradicting',[]),asc_support=dict(collections.Counter(R[r]['ascension'] for r in e['evidence'])),asc_contradict=dict(collections.Counter(R[r]['ascension'] for r in e.get('contradicting',[]))))
plays=[x for x in A['cards'] if x['card']=='POISONED_STAB'];actual={x['run'] for x in plays};support=set(B['silent-poisoned-stab-components']['evidence']);assert support<=actual,(support-actual)
F['silent-poisoned-stab-components'].update(actual_runs=len(actual),actual_plays=len(plays),actions=[x for x in plays if x['run'] in support])
beast=[x for x in A['fights'] if 'CEREMONIAL_BEAST' in x['enemies']];support=set(B['silent-ceremonial-beast-threshold-growth-sl']['evidence']);assert support<=set(x['run'] for x in beast)
cases=[x for x in beast if x['run'] in support];groups=collections.defaultdict(list)
for x in A['attempts']:
 if x['run'] in support and next((f for f in cases if f['run']==x['run'] and f['floor']==x['floor']),None):groups[(x['run'],x['floor'])].append(x)
multi=[v for v in groups.values() if max(x['attempt'] for x in v)>1]
assert (len(cases),sum(not x['death'] for x in cases),sum(x['death'] for x in cases),len(multi),sum(map(len,multi)),sum(x['result']=='won' for v in multi for x in v))==(15,11,4,5,26,1)
F['silent-ceremonial-beast-threshold-growth-sl'].update(fights=cases,sl_multi=multi)
H=json.load(open(O/'ringing-history.json'));F['silent-ceremonial-beast-ringing-one-card']['frames']={r:H[r] for r in B['silent-ceremonial-beast-ringing-one-card']['evidence']}
rest=json.load(open(O/'rest-summary.json'))[-1];assert rest['runs']==46 and sum(rest['gains'])==4242
assert len(A['runs'])==86 and len(A['fights'])==1292 and sum(x['death'] for x in A['fights'])==76
notes=[];section=[]
def keep(lines):
 if not lines:return
 header=lines[0][3:]
 if '静默猎手' not in header or header[:12] not in A['runs']:return
 for line in lines[1:]:
  if any(w in line for w in ['力量','敏捷','横冲直撞','昏眩','带毒刺击','机制：']):notes.append(header+'\n'+line)
for line in (ROOT/'notes/lessons.md').open():
 if line.startswith('## '):keep(section);section=[line.rstrip()]
 elif section:section.append(line.rstrip())
keep(section)
(O/'historical-mechanism-notes.txt').write_text('\n\n'.join(notes)+'\n')
(O/'historical-facts.json').write_text(json.dumps(F,ensure_ascii=False,indent=2)+'\n')
print('证据/进阶/支持与反例全部核对；毒刺实用',len(actual),'局',len(plays),'次；仪式兽15房11活4死、5场26试1赢；历史机制复盘',len(notes),'段')
print('各条进阶支持',{k:v['asc_support'] for k,v in F.items()})
