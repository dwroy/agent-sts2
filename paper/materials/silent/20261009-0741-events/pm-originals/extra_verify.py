import json
from pathlib import Path
p=Path('learner/runs/20261009-071302-postmortem');s={r['_line']:r for r in map(json.loads,(p/'states.jsonl').open())};d=[json.loads(x) for x in (p/'decisions.jsonl').open()]
for n in (315374,315375,315501,315502,315532,315533,315534,315628,315818,315819,315848):
 st=s[n]['state'];print('S',n,'T',st['turn'],'relics',[(x['name'],x['relic_id']) for x in st['run']['relics']],'slots',len(st['run']['potions']),'plays',((st.get('combat') or {}).get('player') or {}).get('cards_played_this_turn'))
 if n==315848:print('HAND',[(x['card_id'],x['resolved_rules_text']) for x in st['combat']['hand']])
print('JEV_USAGE',next(r['usage'] for r in d if r['decider']=='jev'))
sl=[json.loads(x) for x in (p/'sl-attempts.jsonl').open()];e=sl[1]['explore'];print('SL2',list(e));print('SL2_TARGET',{k:v for k,v in (e.get('target') or {}).items() if k in ('turn','reference','point')},'DEV',e.get('deviation'),'REPLAY',e.get('replay'))
