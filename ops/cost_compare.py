import json,re,datetime as dt,collections,sys
fin=[]
for l in open('/home/dw/Projects/sts2-jev/ops/autoplay.log'):
    m=re.match(r'(\S+ \S+) finished run (\w+)',l)
    if m: fin.append((dt.datetime.strptime(m[1],'%Y-%m-%d %H:%M:%S'),m[2]))
runs={}
for l in open('logs/runs.jsonl'):
    try:r=json.loads(l)
    except:continue
    runs[r['run_id']]=r
# windows (local time = UTC+8)
wins=[]
for i in range(1,len(fin)):
    if fin[i][0]<dt.datetime(2026,9,28,6,0):continue
    wins.append((fin[i-1][0]-dt.timedelta(hours=8),fin[i][0]-dt.timedelta(hours=8),fin[i][1]))
def ts(s): return dt.datetime.strptime(s[:19],'%Y-%m-%dT%H:%M:%S')
stats={w[2]:collections.Counter() for w in wins}
def find(t):
    for a,b,rid in wins:
        if a<=t<b: return rid
first={};last={}
with open('logs/decisions.jsonl') as f:
    f.seek(0,2); f.seek(max(0,f.tell()-160_000_000)); f.readline()
    for l in f:
        try:r=json.loads(l)
        except:continue
        t=ts(r['ts']); rid=find(t)
        if not rid: continue
        c=stats[rid]; d=r.get('decider')
        first.setdefault(rid,t); last[rid]=t
        u=r.get('usage') or {}
        lat=r.get('latency_ms'); lat=lat if isinstance(lat,(int,float)) else (lat or {}).get('total',0) if isinstance(lat,dict) else 0
        if d in('jev','jev-plan'): c['jev_n']+=1; c['jev_ms']+=lat; c['jev_tok']+=(u.get('input_tokens',0)+u.get('output_tokens',0))
with open('logs/deepseek-reasoning.jsonl') as f:
    f.seek(0,2); f.seek(max(0,f.tell()-110_000_000)); f.readline()
    for l in f:
        try:r=json.loads(l)
        except:continue
        rid=find(ts(r['ts']))
        if not rid: continue
        c=stats[rid]; c['ds_n']+=1; c['ds_ms']+=r.get('latency_ms') or 0
        c['ds_in_chars']+=len(json.dumps(r.get('memory'),ensure_ascii=False))+len(r.get('question',''))
        c['ds_out_chars']+=len(r.get('reasoning') or '')+len(json.dumps(r.get('reason'),ensure_ascii=False))
print('run floor code dur_min min/floor ds_n ds_min ds_memK/call ds_reasonK jev_n jev_min jev_tok')
for a,b,rid in wins:
    r=runs.get(rid,{}); c=stats[rid]
    dur=(b-a).total_seconds()/60; fl=r.get('floor',0) or 1
    print(rid[:6],fl,r.get('code','?')[:7],round(dur,1),round(dur/fl,2),c['ds_n'],round(c['ds_ms']/60000,1),round(c['ds_in_chars']/max(c['ds_n'],1)/1000,1),round(c['ds_out_chars']/1000),c['jev_n'],round(c['jev_ms']/60000,1),c['jev_tok'],r.get('tokens'))
