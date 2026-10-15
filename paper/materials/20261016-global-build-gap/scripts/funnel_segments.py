import json,subprocess,sys,datetime
S=sys.argv[1]
runs=json.load(open(f'{S}/runs-since-20261012.json'))['rows']
ff={r[0]:r for r in json.load(open(f'{S}/sl-first-failed-attempt.json'))['rows']}
old=json.load(open('paper/materials/20261015-v5-performance-1039/per-run.json'))
anc=lambda a,c: subprocess.run(['git','merge-base','--is-ancestor',a,c],capture_output=True).returncode==0
V5ROOT='4391d1d38bf658747c37ab1d56d53e648ae97167'; R352='67863fac6d97452a235cb11fb2bd10c749880a3f'; R360='fad271855a515e229c7022f5049cc870f95a8d69'
v5=[]
for rid,ch,asc,st,en,fin,vic,fl,act,droom,denc,cm in runs:
    if ch!='SILENT' or asc!=10 or not fin or rid=='W1YY8PEWGUF9' or not cm or not anc(V5ROOT,cm): continue
    seg='S2' if anc(R360,cm) else ('S1' if anc(R352,cm) else 'S0')
    f=ff.get(rid); fa=(f[2],False) if f else (fl,bool(vic))
    cst=(datetime.datetime.fromisoformat(st)+datetime.timedelta(hours=8))
    v5.append(dict(id=rid,cst=cst,seg=seg,floor=fl,win=bool(vic),fa_floor=fa[0],fa_win=fa[1],room=droom))
v4=[dict(floor=r['floor'],win=r['victory'],fa_floor=r['first_attempt']['floor'],fa_win=r['first_attempt']['victory'],start=r['start']) for r in old if r['family']=='V4' and r['eligible'] and r['finished']]
v4.sort(key=lambda r:r['start'])
def row(name,rs,fa=False):
    k,w=('fa_floor','fa_win') if fa else ('floor','win')
    n=len(rs); fl=[r[k] for r in rs]; wins=sum(r[w] for r in rs)
    c=[sum(f>=17 for f in fl),sum(f>17 for f in fl),sum(f>=33 for f in fl),sum(f>33 for f in fl),sum(f>=48 for f in fl),sum(f>=49 for f in fl),wins]
    pct=lambda x:f"{x/n*100:.0f}%"
    print(f"| {name} | {n} | "+" | ".join(pct(x) for x in c)+f" | {sum(fl)/n:.1f} |")
hdr="| 分段 | 局数 | 到F17 | 过一幕 | 到F33 | 过二幕 | 到F48 | 到F49 | 通关 | 均层 |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"
segs=[('V5-S前(≤R351)','S0'),('P1/P3启用','S1'),('P2/C2启用','S2')]
blocks=[(f"第{i+1}-{min(i+10,len(v5))}局",v5[i:i+10]) for i in range(0,len(v5),10)]
if len(blocks[-1][1])<5: blocks[-2]=(blocks[-2][0].split('-')[0]+f"-{len(v5)}局",blocks[-2][1]+blocks[-1][1]); blocks.pop()
days={}
for r in v5: days.setdefault(r['cst'].strftime('%m-%d'),[]).append(r)
for fa in (False,True):
    print('\n###','首试' if fa else '最终(含SL)'); print(hdr)
    row('V4 全部',v4,fa); row('V4 最后30局',v4[-30:],fa); row('**V5 全部**',v5,fa)
    for nm,s in segs: row(nm,[r for r in v5 if r['seg']==s],fa)
    for nm,b in blocks: row(nm,b,fa)
    for d,b in days.items(): row(f"{d} 开局",b,fa)
print('\n## blocks', [(nm,b[0]['cst'].strftime('%m-%d %H:%M'),b[-1]['cst'].strftime('%m-%d %H:%M')) for nm,b in blocks])
print('## seg counts',{s:sum(r['seg']==s for r in v5) for _,s in segs})
for s in ('S0','S1','S2'):
    rs=[r for r in v5 if r['seg']==s and not r['win']]
    print(s,'losses by room',{k:sum(r['room']==k for r in rs) for k in ('hallway','elite','unknown_room','boss')}, 'boss floors',sorted(r['floor'] for r in rs if r['room']=='boss'))
print([ (r['id'],r['cst'].strftime('%m-%d %H:%M'),r['seg'],r['floor'],r['room']) for r in v5 if r['seg']=='S2'])
