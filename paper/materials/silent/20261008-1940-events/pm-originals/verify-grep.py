import sys,json
for line in sys.stdin:
 n,value=line.split(':',1);row=json.loads(value);s=row['state'];c=s.get('combat') or {};p=c.get('player') or {}
 print(json.dumps({'证据行':int(n),'局号':s['run_id'],'层':s['run']['floor'],'回合':s.get('turn'),'HP':s['run']['current_hp'],'maxHP':s['run']['max_hp'],'格挡':p.get('block'),'药槽':[[x['index'],x['potion_id']] for x in s['run']['potions'] if x['occupied']],'敌人':[{k:e.get(k) for k in ['enemy_id','current_hp','is_alive','intents']} for e in c.get('enemies',[])]},ensure_ascii=False))
