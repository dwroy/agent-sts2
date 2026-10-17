"""Join actual end-turn commands to observed state fingerprints inside the frozen cuts."""
import collections
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
ROOT=Path('/home/dw/Projects/agent-sts2')
sys.path.insert(0,str(WORK/'agent/tools/logdb'))
import query
import sync

def sha(raw): return hashlib.sha256(raw).hexdigest()
def save(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str)+'\n')

def main():
    summary=json.loads((OUT/'extraction-summary.json').read_text())
    fights=json.loads((OUT/'selected-fights.json').read_text())
    cut=summary['cuts']['logs/decisions.jsonl']
    (OUT/'windows').mkdir(exist_ok=True)
    sources=[];windows=[];missing=[]
    with sync.read_lock(str(ROOT/'data/logdb'),shared=True):
        con=query.connect(str(ROOT/'data/logdb'),threads=1)
        with (ROOT/'logs/states.jsonl').open('rb') as states,(ROOT/'logs/decisions.jsonl').open('rb') as decisions:
            def raw_ref(handle,path,off,n,tag):
                handle.seek(off);raw=handle.read(n);local=OUT/'windows'/f'{tag}.json';local.write_bytes(raw)
                ref={'path':str(path),'offset':off,'len':n,'sha256':sha(raw),'frozen_path':str(local)}
                return json.loads(raw),ref
            for fight in fights:
                frows=con.execute('SELECT off,len,ts,observed_ts,fingerprint,turn FROM frames WHERE off>=? AND off<=? AND run_id=? ORDER BY off',[fight['first_off'],fight['last_off'],fight['run']]).fetchall()
                by_turn=collections.defaultdict(list)
                for row in frows:by_turn[row[5]].append(row)
                drows=con.execute("SELECT off,len,ts,observed_ts,turn FROM decisions WHERE run_id=? AND floor=? AND action='end_turn' AND off+len<=? ORDER BY off",[fight['run'],fight['floor'],cut]).fetchall()
                for off,n,ts,observed,turn in drows:
                    decisions.seek(off);raw=decisions.read(n);d=json.loads(raw)
                    if d.get('sl_attempt')!=fight['attempt']:continue
                    if not fight['sl']['started_at']<=d['ts']<=fight['sl']['ended_at']:continue
                    same=[f for f in by_turn[turn] if f[4]==d.get('fingerprint') and f[2]<=ts]
                    if not same:
                        missing.append({'key':fight['key'],'turn':turn,'decision_off':off,'reason':'no exact preceding state fingerprint'});continue
                    pre=max(same,key=lambda f:f[0]);nxt=by_turn.get(turn+1)
                    if not nxt:
                        missing.append({'key':fight['key'],'turn':turn,'decision_off':off,'reason':'no next-turn settlement; terminal window not inferred'});continue
                    tag=f"{fight['run']}-F{fight['floor']}-a{fight['attempt']}-T{turn}"
                    _,dr=raw_ref(decisions,ROOT/'logs/decisions.jsonl',off,n,tag+'-command')
                    before,pr=raw_ref(states,ROOT/'logs/states.jsonl',pre[0],pre[1],tag+'-pre')
                    after,ar=raw_ref(states,ROOT/'logs/states.jsonl',nxt[0][0],nxt[0][1],tag+'-next')
                    last,lr=raw_ref(states,ROOT/'logs/states.jsonl',by_turn[turn][-1][0],by_turn[turn][-1][1],tag+'-old-last')
                    bp=before['state']['combat']['player'];ap=after['state']['combat']['player'];lp=last['state']['combat']['player']
                    # Net HP change is an observation; held penalties, regeneration and enemy effects are not separated here.
                    windows.append({'key':fight['key'],'boss':fight['boss'],'run':fight['run'],'asc':fight['asc'],'floor':fight['floor'],'attempt':fight['attempt'],'split':fight['split'],'turn':turn,
                                    'command':dr,'pre':pr,'next':ar,'old_last':lr,'pre_hp':bp['current_hp'],'pre_block':bp['block'],'next_hp':ap['current_hp'],'old_last_hp':lp['current_hp'],
                                    'net_window_loss':bp['current_hp']-ap['current_hp'],'old_leak':lp['current_hp']-ap['current_hp'],
                                    'pre_enemies':before['state']['combat']['enemies'],'pre_player':bp,
                                    'post_enemies':after['state']['combat']['enemies'],'post_player':ap,
                                    'claim':'Observed command-fingerprint to next-turn net HP only; no mechanism inferred from rationale.'})
                    sources.extend([dr,pr,ar,lr])
        con.close()
    # Preserve original event/config rows, not merely parsed summaries.
    wanted={(f['run'],f['floor'],f['attempt']) for f in fights};run_ids={f['run'] for f in fights}
    for name in ['logs/sl-attempts.jsonl','logs/run-config.jsonl']:
        off=0
        with (ROOT/name).open('rb') as h:
            while off<summary['cuts'][name]:
                raw=h.readline(summary['cuts'][name]-off)
                if not raw.endswith(b'\n'):break
                row=json.loads(raw)
                keep=(row.get('run_id'),row.get('floor'),row.get('attempt')) in wanted if 'sl-attempts' in name else row.get('run_id') in run_ids
                if keep:sources.append({'path':str(ROOT/name),'offset':off,'len':len(raw),'sha256':sha(raw),'row':row})
                off+=len(raw)
    save('end-turn-windows.json',windows);save('end-turn-missing.json',missing);save('window-sources.json',sources)
    groups={b:{'windows':len(v),'different_old_endpoint':sum(w['old_leak']!=w['net_window_loss'] for w in v),'net_hp_loss':sum(w['net_window_loss'] for w in v),'old_leak_sum':sum(w['old_leak'] for w in v)} for b in summary['per_boss'] for v in [[w for w in windows if w['boss']==b]]}
    save('window-summary.json',{'per_boss':groups,'missing':missing,'scope':'24 diagnostic fights, not a replacement validation split. Net loss is not certified pure enemy leakage.'})
    print(json.dumps(groups))

if __name__=='__main__':main()
