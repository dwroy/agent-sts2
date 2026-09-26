import json,collections,re,statistics as st
C=collections.Counter
def plannum(p):
    m=re.match(r'plan(\d+)$',p or ''); return int(m.group(1)) if m else None
stats=collections.defaultdict(list)
jevconf=[]; jevrank=C(); jevrank_by=collections.defaultdict(C)
esc_ct=C(); guard=C(); ds_over_cat=C(); ds_conf_cat=C()
hpguard_nonesc=C()
extra=collections.defaultdict(list)   # key -> extra hp list
dmg=collections.defaultdict(list)
fightkind=C()
rank_code=collections.defaultdict(list)
with open('decisions.jsonl') as f:
  for l in f:
    d=json.loads(l); dec=d.get('decider'); lab=d['label']; e=d.get('escalation')
    cat=lab.split('/')[0]
    if e and e.get('by')=='deepseek':
        over = e['deepseek_choice']!=e['jev_choice']
        (ds_over_cat if over else ds_conf_cat)[lab if cat!='combat' else 'combat/plan-choice*']+=1
        if e.get('guard'):
            guard[('override' if over else 'confirm')]+=1
    if e and e.get('by')=='claude' and e.get('guard'): guard['claude']+=1
    if not e and 'HP guard' in d.get('rationale',''): hpguard_nonesc[dec]+=1
    if not lab.startswith('combat/plan-choice'): continue
    q=d.get('questions') or {}; a=d.get('answers') or {}
    if 'plan' not in q: continue
    crit=q['plan']['criteria']; plans={}
    for k,v in crit.items():
        try: o=json.loads(v)
        except: continue
        if k.startswith('plan') and 'hp_lost' in o: plans[k]=(o['hp_lost'],o.get('damage_dealt',0))
    if len(plans)<2: continue
    mn=min(v[0] for v in plans.values()); 
    r=d.get('rationale','')
    kind='boss' if 'boss fight' in r else 'elite' if 'elite fight' in r else 'monster' if ('monster fight' in r or 'hallway' in r) else 'unk'
    jc=(e['jev_choice'] if e else a.get('plan',{}).get('choice'))
    jconf=(e['jev_confidence'] if e else a.get('plan',{}).get('confidence'))
    if jc in plans:
        n=plannum(jc); jevrank[min(n,4)]+=1; jevrank_by[kind][min(n,4)]+=1
        if jconf is not None: jevconf.append(jconf)
    def add(key,c):
        if c in plans:
            extra[key].append(plans[c][0]-mn); dmg[key].append(plans[c][1]-plans['plan1'][1] if 'plan1' in plans else 0)
            extra[(key,kind)].append(plans[c][0]-mn)
    add('code_rank1','plan1'); 
    add('jev_pick',jc)
    if e and e.get('by')=='deepseek':
        add('ds_pick',e['deepseek_choice'])
        if e['deepseek_choice']!=e['jev_choice']:
            add('ds_override_pick',e['deepseek_choice']); add('ds_override_jevorig',e['jev_choice']); add('ds_override_rank1','plan1')
        final=e.get('used_choice') or e['choice']; add('final_after_guard',final)
    if dec=='jev': add('final_jev_decided',jc)
    fightkind[kind]+=1
print('jev rank dist',jevrank, {k:dict(v) for k,v in jevrank_by.items()})
print('jev conf quantiles',[round(x,2) for x in st.quantiles(jevconf,n=10)], 'n',len(jevconf), 'mean',round(st.mean(jevconf),2))
print('ds overrides by cat',ds_over_cat); print('ds confirms by cat',ds_conf_cat)
print('guard',guard,'nonesc guard',hpguard_nonesc)
for k in sorted(extra,key=str):
    v=extra[k]; print(k,'n',len(v),'meanExtraHP',round(st.mean(v),2),'share>=5',round(sum(x>=5 for x in v)/len(v),2), ('dmg vs plan1 %.1f'%st.mean(dmg[k]) if k in dmg else ''))
print(fightkind)
