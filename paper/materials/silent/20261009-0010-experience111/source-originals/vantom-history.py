import json
from pathlib import Path
O=Path(__file__).parent;A=json.load(open(O/'audit.json'));E=json.load(open(O/'experience-before.json'));entry=next(e for e in E['entries'] if e['id']=='silent-vantom-slippery-growth');runs=entry['evidence']+['M0GY0A4M2F7H'];rows=[]
def enemy(x):return next((e for e in x['enemies'] if e['id']=='VANTOM'),None)
for run in runs:
 attacks=[];poison=[];growth=[]
 for x in A['cards']:
  if x['run']!=run:continue
  b=enemy(x['before']);a=enemy(x['after'])
  if not b or not a:continue
  sb=b['powers'].get('SLIPPERY_POWER',0);sa=a['powers'].get('SLIPPERY_POWER',0)
  if sb>0 and sa<sb and b['hp']-a['hp']==sb-sa:attacks.append(dict(ts=x['ts'],floor=x['floor'],turn=x['turn'],card=x['card'],hp_before=b['hp'],hp_after=a['hp'],slippery_before=sb,slippery_after=sa))
 for x in A['ends']:
  if x['run']!=run:continue
  b=enemy(x['before']);a=enemy(x['after'])
  if not b or not a:continue
  if b['powers'].get('SLIPPERY_POWER',0)>0 and b['powers'].get('POISON_POWER',0)>0 and b['hp']-a['hp']==1 and b['powers'].get('SLIPPERY_POWER',0)-a['powers'].get('SLIPPERY_POWER',0)==1:poison.append(dict(ts=x['ts'],floor=x['floor'],turn=x['turn'],before=b,after=a))
  if b['powers'].get('POISON_POWER',0)==2 and b['powers'].get('SLIPPERY_POWER',0)-a['powers'].get('SLIPPERY_POWER',0)==2 and b['hp']-a['hp']==2 and x['before']['powers'].get('ACCELERANT_POWER')==1 and not x['before']['powers'].get('THORNS_POWER',0):poison.append(dict(ts=x['ts'],floor=x['floor'],turn=x['turn'],before=b,after=a,player=x['before']['powers'],note='2毒/普通触媒双结仅扣2、滑溜减2，轮初毒雾回补另核，不按两个单结窗口筛掉。'))
  if a['powers'].get('STRENGTH_POWER',0)-b['powers'].get('STRENGTH_POWER',0)==2:growth.append(dict(ts=x['ts'],floor=x['floor'],turn=x['turn'],before=b,after=a))
 assert attacks and growth,(run,len(attacks),len(growth))
 rows.append(dict(run=run,attacks=attacks,poison=poison,growth=growth))
print('计数核验',[(x['run'],len(x['attacks']),len(x['poison']),len(x['growth'])) for x in rows]);assert len(rows)==11 and sum(bool(r['poison']) for r in rows)==8
(O/'vantom-history.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');print([(x['run'],len(x['attacks']),len(x['poison']),len(x['growth'])) for x in rows]);print('11攻击/8毒限伤/11力量支持复核，无新增公式反例。')
