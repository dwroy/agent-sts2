import sys,json,re,hashlib,subprocess
from pathlib import Path
from collections import Counter
sys.path.insert(0,str(Path(__file__).parent))
from analyze import P,D,S,R,SL,hp,live
stamp=subprocess.run(['date','--iso-8601=seconds'],text=True,capture_output=True,check=True).stdout
(P/'final-verification-date.txt').write_text(stamp)
receipt=json.loads((P/'append-receipt.json').read_text());draft=(P/'lesson-intro.md').read_bytes()
with Path('notes/lessons.md').open('rb') as h:
 digest=hashlib.sha256();remaining=receipt['append_offset']
 while remaining:
  b=h.read(min(65536,remaining));assert b;digest.update(b);remaining-=len(b)
 assert digest.hexdigest()==receipt['old_prefix_sha256']
 appended=h.read(receipt['appended_bytes']);assert appended==draft
 assert hashlib.sha256(appended).hexdigest()==receipt['append_sha256']
 err=json.loads((P/'erratum-receipt.json').read_text());h.seek(err['append_offset'])
 eb=h.read(err['appended_bytes']);assert eb==(P/'erratum.md').read_bytes()
 assert hashlib.sha256(eb).hexdigest()==err['append_sha256']
assert sum(l.startswith('## LY83ZMTFVKJH') for l in Path('notes/lessons.md').open())==1
r=subprocess.run(['rg','-n','-F','LY83ZMTFVKJH','logs/runs.jsonl'],text=True,capture_output=True,check=True)
row=json.loads(r.stdout.strip().split(':',1)[1]);assert row['character'].lower()=='silent' and row['ended'] and row['floor']==21 and row['ascension']==10 and row['victory'] is False and row['code']=='049dff24+dirty'
assert len(D)==538 and len(S)==556 and len(R['combats'])==13
byline={s['_line']:s for s in S};ds={d['_line']:d for d in D}
v=ds[300426]['thief_card_value'];assert v['hp'] is None and v['status']=='flat' and v['samples']==1000
assert v['measures']['bossLeft']['with']==336.507 and v['measures']['bossLeft']['card']=={'value':21.464,'se':.9731}
assert v['measures']['bossLeft']['perHp']=={'value':-.2843,'se':.0417}
assert v['measures']['bossLeft']['with']+v['measures']['bossLeft']['card']['value']==357.971
assert ds[300426]['chosen']['action']=='end_turn' and ds[300426]['confidence']==.89
assert [byline[n]['state']['combat']['enemies'][0]['current_hp'] for n in [308030,308031,308032]]==[77,69,67]
assert [byline[n]['state']['combat']['enemies'][0]['current_hp'] for n in [308041,308042,308043,308044]]==[40,32,18,16]
assert 'dmg 8' in ds[300482]['rationale'];assert json.loads(ds[300493]['questions']['plan']['criteria']['plan3'])['damage_dealt']==20
assert [hp(byline[n]) for n in [307941,307942,307966,307967,307994,307999,308000,308048,308052,308053]]==[63,65,65,67,61,61,63,1,1,0]
assert [byline[n]['state']['combat']['player']['block'] for n in [308048,308049,308050,308051,308052]]==[0,3,6,9,9]
e=byline[308052]['state']['combat']['enemies'][0];assert e['current_hp']==4 and e['max_hp']==138 and e['block']==14 and e['intents'][0]['damage']==33
assert e['intents'][0]['damage']-9==24 and 24-hp(byline[308052])+1==24
assert byline[307993]['state']['combat']['enemies'][0]['current_hp']==30 and byline[307993]['state']['combat']['enemies'][0]['move_id']=='ESCAPE_MOVE'
assert all(not any(c['card_id']=='THRUMMING_HATCHET' for c in s['state']['run'].get('deck',[])) for s in S if s['_line']>=307972)
assert [hp(byline[n]) for n in [307560,307561,307683,307684,307740,307741,307933,307934]]==[52,59,30,53,56,77,11,63]
assert [hp(byline[n]) for n in [307815,307821,307878,307884,307830,307893]]==[50,45,50,45,26,36]
assert [len(byline[n]['state']['combat']['hand']) for n in [307790,307791,307850,307851,307916,307917]]==[2,5,5,8,3,6]
assert len([d for d in D if d['chosen']['action']=='use_potion'])==8
assert not any(d['chosen']['action']=='discard_potion' for d in D)
for c in R['combats']:
 a=c['entry'];b=c.get('exit') or c['last']
 assert a['turn']==1 and hp(byline[a['line']])==a['hp'] and hp(byline[b['line']])==b['hp']
 assert a['max_hp']==byline[a['line']]['state']['run']['max_hp']
 assert b['max_hp']==byline[b['line']]['state']['run']['max_hp']
assert [s['result'] for s in SL]==['predicted_death','predicted_death','won'] and [s['turns'] for s in SL]==[10,13,14]
assert [s['end_hp'] for s in SL]==[6,11,11] and [s.get('reload',{}).get('ms') for s in SL[:2]]==[7297,6885]
J=[d for d in D if d['decider']=='jev'];plans=[d for d in J if d['label'].startswith('combat/plan-choice')]
assert len(J)==169 and sum(d['confidence']<.35 for d in J)==26
assert len(plans)==147 and sum(d['rollout_best_chosen'] for d in plans)==128
C=[d for d in D if d['decider']=='code'];primary=[d for d in C if d['label'].startswith('combat/') and 'continu' not in d['rationale'].lower()]
assert len(primary)==91
counts=[];full=0;nojev=0
for c in R['combats']:
 a=c['entry']['ts'];b=(c.get('exit') or c['last'])['ts'];seen=set()
 for s in S:
  if not a<=s['ts']<=b or not s['state'].get('in_combat'):continue
  t=s['state'].get('turn')
  if t in seen:continue
  seen.add(t);full+=1;local=[d for d in D if d['floor']==c['floor'] and d['turn']==t and a<=d['ts']<=b]
  if any(d in primary for d in local):counts.append((c['sequence'],t))
  if not any(d['decider']=='jev' for d in local):nojev+=1
assert (full,len(counts),nojev)==(93,55,22)
for t,strength in [(3,7),(6,14),(9,21),(12,28)]:
 s=next(s for s in S if s['_line']>=307999 and s['state'].get('in_combat') and s['state'].get('turn')==t)
 e=s['state']['combat']['enemies'][0];assert any(p['power_id']=='STRENGTH_POWER' and p['amount']==strength for p in e['powers']) and e['block']==18
assert byline[308036]['state']['combat']['enemies'][0]['intents'][0]['damage']==37
assert byline[308048]['state']['combat']['enemies'][0]['intents'][0]['damage']==44
for n,st,incoming in [(308025,14,22),(308026,8,18),(308027,14,18)]:
 e=byline[n]['state']['combat']['enemies'][0];assert any(p['power_id']=='STRENGTH_POWER' and p['amount']==st for p in e['powers']) and e['intents'][0]['damage']==incoming
ledger=json.loads((P/'ledger-find-run.json').read_text());expected=set(json.loads((P/'ledger-result.json').read_text())['added'].values())|{'silent-0260','silent-0209','silent-0019','silent-0261'}
assert expected<=set(e['id'] for e in ledger)
for e in ledger:
 if e['id'] in expected:assert 'LY83ZMTFVKJH' in e['where']['lessons'] and e['character']=='silent'
for key in ['silent-0260','silent-0209','silent-0019','silent-0261']:
 before=json.loads((P/('ledger-before-'+key+'.json')).read_text());after=next(e for e in ledger if e['id']==key)
 for field in ['claim','first_run','prior']:
  assert before[field]==after[field],(key,field)
proposals=json.loads((P/'proposal-result.json').read_text());seen={}
with Path('paper/materials/learning/code-proposals.jsonl').open() as h:
 for l in h:
  if not any(x['id'] in l for x in proposals):continue
  x=json.loads(l)
  if x.get('op')=='add':seen[x['id']]=x
  elif x.get('op')=='update' and x['id'] in seen:seen[x['id']].update(x)
for p in proposals:
 item=seen[p['id']];assert item['character']=='silent' and item['source_task']=='postmortem' and item['target_task']=='strategy-proposal'
 assert item['proposal_sha256']==hashlib.sha256(Path(item['proposal']).read_bytes()).hexdigest()
 assert not item.get('implemented_commit') and 'LY83ZMTFVKJH' in item['runs']
 for ident in item['ledger']:
  e=next(e for e in ledger if e['id']==ident);assert item['proposal'] in e['where']['proposal']
assert json.loads((P/'ledger-check.json').read_text())['exit']==0
result={'run':'LY83ZMTFVKJH','result':'通过','旧正文前缀保持':True,'本局标题数':1,'三条经验':3,'资源窗口':13,'代码自主回合':55,'完整已记录回合':93,'纯代码回合':22,'已追加勘误':'仅因果措辞；数字不变','账本条目':sorted(expected),'代码提案':[p['id'] for p in proposals],'check':0}
(P/'final-verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
