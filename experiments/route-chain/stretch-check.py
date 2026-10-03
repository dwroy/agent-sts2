"""For the boards whose code choice changed: from the old and the new best node, every path to the next rest site (or
the boss) and the Monster/Elite rooms of the stretch it is in (the act-2/3 chain: since the last rest site, shops and
? rooms not ending it), counted from the chain so far. Usage: python3 experiments/route-chain/stretch-check.py (worktree root)."""
import json, subprocess, sys
PY = '.cache/logdb-venv/bin/python'
old = [json.loads(l) for l in open('experiments/route-chain/old.jsonl')]
new = [json.loads(l) for l in open('experiments/route-chain/new.jsonl')]
changed = [(o, n) for o, n in zip(old, new) if o.get('best') != n.get('best')]
def q(sql):
    out = subprocess.check_output([PY, 'tools/logdb/query.py', '--no-sync', '--json', '--max-rows', '5000', sql], text=True)
    d = json.loads(out); return [dict(zip(d['columns'], r)) for r in d['rows']]
f = open('logs/states.jsonl', 'rb')
table = ['| run | F | act | HP | chain so far | old best | new best | taken |', '|---|---|---|---|---|---|---|---|']
for o, n in changed:
    rows = q(f"SELECT s.off, s.len FROM decisions d JOIN state_index s ON s.run_id=d.run_id AND s.ts=d.ts WHERE d.run_id='{o['run']}' AND d.floor={o['floor']} AND d.action='choose_map_node' ORDER BY d.ts LIMIT 1")
    f.seek(rows[0]['off']); st = json.loads(f.read(rows[0]['len']))['state']
    m = st['map']; nodes = {(x['row'], x['col']): x for x in m['nodes']}
    cur = m['current_node']
    # chain so far (act 2/3 rule): visited rows back from current
    vis = sorted([x for x in m['nodes'] if x.get('visited') and x['row'] <= cur['row']], key=lambda x: -x['row'])
    chain = 0
    for x in vis:
        if x['node_type'] in ('RestSite', 'Ancient'): break
        if x['node_type'] in ('Monster', 'Elite'): chain += 1
    def paths(rc):
        x = nodes[rc]
        if not x['children']: return [[x['node_type']]]
        return [[x['node_type']] + p for c in x['children'] for p in paths((c['row'], c['col']))]
    def stretches(p, c0):
        out, c = [], c0
        for t in p:
            if t == 'RestSite': out.append(c); c = 0
            elif t in ('Monster', 'Elite'): c += 1
            elif t == 'Boss': out.append(c)
        return out
    avail = {a['index']: (a['row'], a['col']) for a in m['available_nodes']}
    def cell(idx):
        rc = avail[idx]; ps = paths(rc)
        first = [stretches(p, chain)[0] for p in ps]
        return f"n{idx} {nodes[rc]['node_type']}: this stretch {min(first)}-{max(first)} fights, {sum(1 for v in first if v >= 4)}/{len(ps)} paths >= 4"
    table.append(f"| {o['run']} | {o['floor']} | {o['act']} | {o['hp']}/{o['max']} | {chain} | {cell(o['best'])} | {cell(n['best'])} | n{o['taken']} |")

print('\n'.join(table))
