import hashlib
import json
import statistics
from pathlib import Path

O = Path(__file__).parent
B = json.load(open(O / 'slice-before.json'))
E = json.load(open(O / 'slice-after.json'))
rows, before, after, diffs = [], [], [], []
for b, e in zip(B, E):
    assert b['sample'] == e['sample']
    delta = [y - x for x, y in zip(b['sizes'], e['sizes'])]
    before += b['sizes']; after += e['sizes']; diffs += delta
    rows.append(dict(sample=b['sample'], before_median=b['median'], before_max=b['max'], after_median=e['median'], after_max=e['max'], paired_median=statistics.median(delta)))
summary = dict(rows=rows, before_median=statistics.median(before), after_median=statistics.median(after), median_growth=statistics.median(after)-statistics.median(before), paired_median=statistics.median(diffs), before_max=max(before), after_max=max(after), delta_range=[min(diffs), max(diffs)])
(O / 'slice-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
before_root = O / 'slice-knowledge-before'; after_root = O / 'slice-knowledge-after'
files = []
for file in before_root.rglob('*.json'):
    if file.name == 'experience.json':
        continue
    other = after_root / file.relative_to(before_root)
    assert file.read_bytes() == other.read_bytes()
    files.append(dict(file=str(file.relative_to(before_root)), sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
(O / 'slice-other-data-verification.json').write_text(json.dumps(files, ensure_ascii=False, indent=2)+'\n')

sl = [json.loads(s) for s in (O / 'HXCY44VD9QWU/sl-attempts.jsonl').open()]
orders = [s['draws']['order'][:s['draws']['clean']] for s in sl]
common = 0
for values in zip(*orders):
    if len(set(values)) != 1:
        break
    common += 1
comparison = dict(run='HXCY44VD9QWU', floor=17, attempts=len(sl), wins=sum(s['result']=='won' for s in sl), shared_recorded_prefix=common, cases=[dict(attempt=s['attempt'], result=s['result'], turns=s['turns'], clean=s['draws']['clean'], broke=s['draws']['broke'], clean_order=s['draws']['order'][:s['draws']['clean']], draw_turns=s['draws']['turns'], explore=s['explore']) for s in sl], limitation='同24张原始抽牌前缀不等弃牌/回合资源一致；重放与偏离均另列，洗牌后序未控；本场0胜，不拟赢线或全空间必死。')
(O / 'sl-draw-comparison.json').write_text(json.dumps(comparison, ensure_ascii=False, indent=2)+'\n')

ROOT = Path('/home/dw/Projects/agent-sts2')
verified = []
for run, floor in [('F9PP859XZ3RJ', 14), ('9YBKCNBFP0X5', 6)]:
    candidates = []
    for line in (O / run / 'states.jsonl').open():
        x=json.loads(line); s=x['state']
        if s['run']['floor']==floor and s.get('combat') and any(e['enemy_id']=='SNAPPING_JAXFRUIT' for e in s['combat']['enemies']):
            candidates.append(x)
    select=[candidates[0]]
    for x in candidates[1:]:
        e=next(e for e in x['state']['combat']['enemies'] if e['enemy_id']=='SNAPPING_JAXFRUIT')
        if any(p['power_id']=='STRENGTH_POWER' and p['amount']>=2 for p in e['powers']):
            select.append(x); break
    for target in select:
        p=ROOT/'logs/states.jsonl'
        with p.open('rb') as source:
            lo, hi=0,p.stat().st_size
            while hi-lo>65536:
                mid=(lo+hi)//2;source.seek(mid);source.readline();line=source.readline()
                if not line:hi=mid;continue
                if json.loads(line)['ts']<target['ts']:lo=source.tell()
                else:hi=mid
            source.seek(max(0,lo-65536))
            if lo>65536:source.readline()
            found=False
            while True:
                offset=source.tell(); raw=source.readline()
                if not raw:break
                x=json.loads(raw)
                if x['ts']>target['ts']:break
                if x==target:
                    verified.append(dict(run=run, floor=floor, ts=x['ts'], offset=offset, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest()))
                    found=True;break
            assert found, (run,target['ts'])
(O / 'historical-jax-raw-verification.json').write_text(json.dumps(verified,ensure_ascii=False,indent=2)+'\n')
print('切片中位变化',summary['median_growth'],'最大',summary['after_max'],'；SL共同抽序前缀',common,'；历史果原帧',len(verified))
