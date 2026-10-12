from analyze import *
import hashlib,re,datetime
checks=[]
def ck(name,value):
 if not value:raise AssertionError(name)
 checks.append(name)
for name in ('decisions','states','run-plans','sl-attempts'):
 count=0;digest=hashlib.sha256()
 with pathlib.Path('logs/'+name+'.jsonl').open('rb') as orig:
  for raw in (P/(name+'.match')).open('rb'):
   n,b,content=raw.split(b':',2);orig.seek(int(b));source=orig.readline();ck(f'{name}:{n.decode()}字节一致',source.rstrip(b'\n')==content.rstrip(b'\n'));count+=1;digest.update(source)
 print(name,count,digest.hexdigest())
ck('决策979',len(D)==979);ck('状态1079',len(S)==1079);ck('计划9',len(rows('run-plans'))==9);ck('SL16',len(A)==16);ck('窗口31',len(R['combats'])==31)
ck('低信心39',sum(d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35 for d in D)==39)
ck('护栏3',sum('HP guard:' in d['rationale'] for d in D)==3)
ck('饮药32',sum((d.get('chosen') or {}).get('action')=='use_potion' for d in D)==32);ck('弃药0',sum((d.get('chosen') or {}).get('action')=='discard_potion' for d in D)==0)
ck('9次重载',sum(bool((a.get('reload') or {}).get('ok')) for a in A)==9)
for i in range(20,25):ck('F48入口78和两药'+str(i),R['combats'][i]['entry']['hp']==78 and R['combats'][i]['entry']['potions']==[[0,'POISON_POTION'],[1,'FIRE_POTION']])
for i in range(25,31):ck('F49入口8空药'+str(i),R['combats'][i]['entry']['hp']==8 and not R['combats'][i]['entry']['potions'])
st={s['_line']:s['state'] for s in S};ds={d['_line']:d for d in D}
ck('首boss胜出8空药',st[320567]['run']['current_hp']==8 and all(not p.get('occupied') for p in st[320567]['run']['potions']))
ck('空斩杀结束',ds[312159]['label']=='combat/lethal' and ds[312159]['chosen']['action']=='end_turn' and ds[312159]['rationale']=='lethal: ')
x=st[320566];p=x['combat']['player'];e=x['combat']['enemies'][0];hand=x['combat']['hand']
ck('关键帧17血0挡4能量',p['current_hp']==17 and p['block']==0 and p['energy']==4);ck('关键帧62敌血26毒',e['current_hp']==62 and next(z['amount'] for z in e['powers'] if z['power_id']=='POISON_POWER')==26)
ck('关键帧可打防御两后空翻',sum(c['card_id']=='BACKFLIP' and c['playable'] for c in hand)==2 and any(c['card_id']=='DEFEND_SILENT' and c['playable'] for c in hand));ck('关键帧9伤凋萎',sum(c['card_id']=='WITHER' and '9点伤害' in c['resolved_rules_text'] for c in hand)==1)
x=st[320628];p=x['combat']['player'];e=x['combat']['enemies'][0];ck('终盘8血17挡86敌血25攻',p['current_hp']==8 and p['block']==17 and e['current_hp']==86 and e['intents'][0]['total_damage']==25);ck('终局HP0',st[320629]['run']['current_hp']==0)
ck('Jev总token',sum((d.get('usage') or {}).get('input_tokens',0)+(d.get('usage') or {}).get('output_tokens',0) for d in D if d['decider']=='jev')==1923749)
ck('大脑输入6417188',sum((d.get('deepseek') or {}).get('input_tokens',0) for d in D)==6417188);ck('缓存3971328',sum((d.get('deepseek') or {}).get('cache_hit_tokens',0) for d in D)==3971328)
for seq,losses in [(6,[0,0,0,0,0,2,0,14,0]),(13,[0,2,15,0,8,24,0,0]),(25,[6,13,3,2,9,0,0,28,9]),(31,[0,8])]:
 c=R['combats'][seq-1];ss=[s for s in S if c['entry']['line']<=s['_line']<=(c['exit'] or c['last'])['line']];tt=collections.defaultdict(list)
 for s in ss:tt[s['state']['turn']].append(s)
 ts=sorted(tt);got=[tt[t][0]['state']['run']['current_hp']-(tt[ts[i+1]][0] if i+1<len(ts) else tt[t][-1])['state']['run']['current_hp'] for i,t in enumerate(ts)];ck(f'关键逐轮损血{seq}',got==losses)
ck('资源表31行',len((P/'resource-table.md').read_text().splitlines())-2==31);ck('药水表25行',len((P/'potion-table.md').read_text().splitlines())-2==25)
(P/'numbers-audit-v1.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'run':'JBX9JLH46KVN'},ensure_ascii=False,indent=2)+'\n');print('全部通过',len(checks))
