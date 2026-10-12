import collections as C
import json
import math
from pathlib import Path
import subprocess
import sys

P = Path(__file__).resolve().parent
ROOT = P.parents[2]
sys.path.insert(0, str(ROOT / 'eval'))
import metrics
import brain_source

def read(n):
    return json.loads((P / n).read_text())
def save(n, obj):
    (P / n).write_text(json.dumps(obj, ensure_ascii=False, indent=2, default=str) + '\n')
def jsonl(n):
    return [json.loads(s) for s in (P / 'scratch/frozen-logs' / n).read_text().splitlines()]
def wilson(k, n):
    if not n: return [None, None]
    z = 1.959963984540054
    p = k/n
    c = (p+z*z/(2*n))/(1+z*z/n)
    h = z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n)
    return [c-h,c+h]
def share(k,n): return {'k': k, 'n': n, 'p': k/n if n else None, 'wilson95': wilson(k,n)}
def mean(xs):
    xs=[x for x in xs if isinstance(x,(int,float))]
    if not xs: return {'n':0,'mean':None}
    return {'n':len(xs),'mean':sum(xs)/len(xs),'min':min(xs),'max':max(xs)}
def git(*args):
    x = subprocess.run(['git',*args],cwd=ROOT,capture_output=True,text=True)
    return x.stdout.strip() if x.returncode==0 else None

db = read('db-runs.json')
met = {r['run_id']:r for r in read('metrics-version-2.json')['runs']}
configs = C.defaultdict(list)
for c in jsonl('run-config.jsonl'): configs[c['run_id']].append(c)
frames=C.defaultdict(list)
for f in read('frame-index.json'): frames[f['run_id']].append(f)
decisions=C.defaultdict(list)
for d in read('decision-index.json'): decisions[d['run_id']].append(d)
fights=C.defaultdict(list)
for f in read('fights.json'): fights[f['run_id']].append(f)
brain=C.defaultdict(list)
for b in jsonl('brain.jsonl'): brain[b['run_id']].append(b)
vm=metrics.VersionMap(metrics.load_versions(str(ROOT/'eval/versions.json')),metrics.Git(str(ROOT)))
release_names=['V4.codex-only1','S1.double-boss1','S1.fix45','S1.double-boss-phase1','S1.mirage-poison1','S1.sloth-replay1','S1.bullet-time1']
releases={e['name']:e for e in vm.entries if e['name'] in release_names}
cohort=[]
for r in db:
    rid=r['run_id']
    if rid not in met: continue
    cfgs=configs[rid];cfg=cfgs[0] if cfgs else {}
    commit=cfg.get('code',{}).get('commit')
    ve,how=vm.assign(commit,metrics.as_utc(r['started']))
    exposure={n: (commit in e['descendants'] if commit else None) for n,e in releases.items()}
    fs=frames[rid]; ds=decisions[rid]; ff=fights[rid]
    entry2=next((f for f in fs if f['act']==2 and f['floor']>=18),None)
    bs=brain_source.classify(brain[rid])
    actualmax=max(f['floor'] or 0 for f in fs)
    lastcombat=next((f for f in reversed(fs) if f['screen']=='COMBAT' and f['enemies']),None)
    sl=met[rid]['first_attempt']
    def rests(act): return C.Counter(d['action'] for d in ds if d['screen']=='REST' and (1 if d['floor']<=17 else 2 if d['floor']<=33 else 3)==act)
    rest={str(a):dict(rests(a)) for a in [1,2,3]}
    elites={str(a):len({f['floor'] for f in ff if f['act']==a and f['room']=='elite'}) for a in [1,2,3]}
    lastfloor=lastcombat['floor'] if lastcombat else r['floor']
    act2hall=bool(lastcombat and lastcombat['act']==2 and lastfloor<33 and any(f['floor']==lastfloor and f['room'] in ['hallway','unknown_room'] for f in ff))
    cohort.append({**r,'start_commit':commit,'start_code':cfg.get('code',{}),'start_version':ve['name'] if how=='git' else 'unknown','version_how':how,'end_label_version':met[rid].get('version', vm.assign(r['code'], metrics.as_utc(r['started']))[0]['name']),'start_process':cfg.get('process'), 'config_count':len(cfgs),'config_sha':cfg.get('config_sha'),'brain_config':cfg.get('brain'), 'sl_config':cfg.get('sl'),'loop_config':cfg.get('loop'),'experience_version':cfg.get('knowledge',{}).get('experience_version'),'prefix_sha':cfg.get('knowledge',{}).get('prefix_sha'),'brain_source':bs,'exposures':exposure,'post_double_walltime':r['started'].replace(' ', 'T')>='2026-10-07T06:11:00','actual_max_floor':actualmax,'reach33':actualmax>=33,'reach48':actualmax>=48,'first_reach33':sl['floor']>=33,'first_reach48':sl['floor']>=48,'sl_rows':sl['sl_rows'],'reloads':sl['reloads'],'first_death_floor':sl['death_floor'],'death_frame':lastcombat,'act2_hall_death':act2hall,'act2_road_death':bool(lastcombat and lastcombat['act']==2 and lastfloor<33),'entry2':entry2,'elite_floors':elites,'rests':rest,'reward_choices':dict(C.Counter(d['action'] for d in ds if d['label']=='reward/card'))})
save('sample-table.json',cohort)
def stats(rs):
    return {'n':len(rs),'run_ids':[r['run_id'] for r in rs],**{k:share(sum(r[k] for r in rs),len(rs)) for k in ['reach33','reach48','first_reach33','first_reach48','act2_hall_death','act2_road_death']},'elite_act1':mean([r['elite_floors']['1'] for r in rs]),'elite_act2':mean([r['elite_floors']['2'] for r in rs]),'entry2_hp':mean([r['entry2']['hp'] for r in rs if r['entry2']]),'entry2_hp_share':mean([r['entry2']['hp']/r['entry2']['max_hp'] for r in rs if r['entry2'] and r['entry2']['max_hp']]),'entry2_deck_size':mean([len(r['entry2']['deck']) for r in rs if r['entry2']]),'entry2_potions':mean([len(r['entry2']['potions']) for r in rs if r['entry2']]),'rests':{str(a):dict(sum((C.Counter(r['rests'][str(a)]) for r in rs),C.Counter())) for a in [1,2,3]},'reward_choices':dict(sum((C.Counter(r['reward_choices']) for r in rs),C.Counter())),'sl_attempt_rows':sum(r['sl_rows'] for r in rs),'reloads':sum(r['reloads'] for r in rs)}
def grouped(key,rs):
    by=C.defaultdict(list)
    for r in rs: by[key(r)].append(r)
    return {str(k):stats(v) for k,v in by.items()}
out={}
for source in ['all','codex','deepseek','mixed']:
    rs=[r for r in cohort if source=='all' or r['brain_source']['source']==source]
    out[source]={'walltime':grouped(lambda r:'after' if r['post_double_walltime'] else 'before',rs),'ancestry':grouped(lambda r:'after' if r['exposures']['S1.double-boss1'] else 'before',rs),'versions':grouped(lambda r:r['start_version'],rs),'phases':grouped(lambda r:'bullet-time' if r['exposures']['S1.bullet-time1'] else 'sloth-replay' if r['exposures']['S1.sloth-replay1'] else 'mirage-poison' if r['exposures']['S1.mirage-poison1'] else 'double-phase' if r['exposures']['S1.double-boss-phase1'] else 'fix45' if r['exposures']['S1.fix45'] else 'double-boss' if r['exposures']['S1.double-boss1'] else 'codex-only' if r['exposures']['V4.codex-only1'] else 'pre-codex-only',rs)}
save('statistics.json',out)
save('version-timeline.json',[{'name':e['name'],'commit':e['full'],'commit_time':str(e['time']),'source':e['source'],'first_start_exposed':min((r['started'] for r in cohort if r['start_commit'] in e['descendants']),default=None),'exposed_runs':sum(r['start_commit'] in e['descendants'] for r in cohort)} for e in vm.entries if e['family']=='Silent' or e['name']=='V4.codex-only1'])
audit=[]
for r in cohort:
    rid=r['run_id']
    for b in brain[rid]:
        p=b.get('payload') or {}; fact=p.get('facts') or {}
        situation=p.get('situation') or {}
        text=json.dumps(p,ensure_ascii=False)
        markers=[k for k in ['double_boss_preparation','F48_F49_continuous','continuation_objective','未经两战校准','F48→F49'] if k in text]
        audit.append({'run_id':rid,'question_id':b.get('question_id'),'ts':b['ts'],'label':b['label'],'engine':b['engine'],'successful':brain_source.successful(b),'error':b.get('error'),'problems':b.get('problems'),'situation':situation,'act':fact.get('act',situation.get('act')) if isinstance(fact,dict) else situation.get('act'),'floor':fact.get('floor',situation.get('floor')) if isinstance(fact,dict) else situation.get('floor'),'double_boss_markers':markers,'fact_keys':list(fact) if isinstance(fact,dict) else [],'answer':b.get('answer'),'knowledge':b.get('knowledge')})
save('brain-audit.json',audit)
summ={'cohorts':{s:sum(r['brain_source']['source']==s for r in cohort) for s in ['codex','deepseek','mixed','unknown']},'start_end_code_mismatch':[r['run_id'] for r in cohort if r['start_commit'] and not r['code'].startswith(r['start_commit'][:7])],'dirty_source_runs':[{'run':r['run_id'],'dirty_files':r['start_code']['dirty_files']} for r in cohort if any(x.startswith('agent/') for x in r['start_code'].get('dirty_files',[]))],'brain_failed':[a for a in audit if not a['successful']],'double_boss_marker_acts':dict(C.Counter(str(a['act']) for a in audit if a['double_boss_markers'])),'double_boss_early_markers':[a for a in audit if a['double_boss_markers'] and a['act'] in [1,2]]}
save('audit-summary.json',summ)
for s in ['all','codex']:
    print(s,{k:{g:{m:v[m] for m in ['n','reach33','reach48','act2_hall_death']} for g,v in out[s][k].items()} for k in ['ancestry','phases']})
print('audit',summ)
