import json,hashlib,sys,re
from pathlib import Path
from collections import Counter
from datetime import datetime
root=Path('/home/dw/Projects/agent-sts2');out=root/'learner/runs/20261009-141302-postmortem';run='AF76L5UTPP8U';checks=[]
def check(name,actual,expected):
    checks.append({'项目':name,'实际':actual,'预期':expected,'通过':actual==expected})
def rows(n):return [json.loads(l) for l in (out/f'{run}-{n}.jsonl').open()]
for name in ['decisions','states','run-plans','sl-attempts','brain','run-config']:
    rs=rows(name)
    with (root/'logs'/f'{name}.jsonl').open('rb') as f:
        for r in rs:
            f.seek(r['_offset']);raw=f.readline();actual=json.loads(raw);expected={k:v for k,v in r.items() if k not in ['_offset','_line']}
            check(f'{name}:{r["_line"]}原字节',actual,expected)
ds=rows('decisions');ss=rows('states');sm={r['_line']:r for r in ss};dm={r['_line']:r for r in ds};res=json.loads((out/f'{run}-resources.json').read_text())
check('决策总数',len(ds),438);check('状态总数',len(ss),454);check('脑调用数',len(rows('brain')),22);check('脑实际引擎',sorted({r['engine'] for r in rows('brain')}),['codex']);check('SL行',[r['_line'] for r in rows('sl-attempts')],[1373]);check('读档计数',sorted({r['sl_reloads'] for r in ds if 'sl_reloads' in r}),[0]);check('回退计数',sum(bool(r.get('fallback')) for r in ds),0)
expected={2:(56,43,70,[]),3:(43,31,70,[]),7:(36,36,75,[[0,'POWER_POTION']]),9:(58,2,75,[]),12:(42,28,82,[[0,'LIQUID_BRONZE']]),14:(37,26,82,[[0,'BLOCK_POTION']]),15:(26,23,82,[]),17:(59,15,82,[]),19:(68,59,82,[[0,'POISON_POTION']]),21:(59,51,82,[[0,'POISON_POTION'],[1,'SPEED_POTION']]),22:(51,41,82,[[0,'POISON_POTION']]),23:(41,0,82,[[0,'POISON_POTION']])}
for c in res['combats']:
    hp1,hp2,maxhp,belt=expected[c['floor']];a,b=c['entry'],c['exit'];check(f'F{c["floor"]}资源',[a['hp'],b['hp'],a['max_hp'],b['max_hp'],a['potions'],a['turn']],[hp1,hp2,maxhp,maxhp,belt,1]);check(f'F{c["floor"]}原帧HP',[sm[a['line']]['state']['run']['current_hp'],sm[b['line']]['state']['run']['current_hp']],[hp1,hp2])
check('战斗净耗',sum(c['observed_net_hp_loss'] for c in res['combats']),221)
low=[r for r in ds if r['decider']=='jev' and isinstance(r.get('confidence'),(int,float)) and r['confidence']<.35];check('低信心',len(low),8)
flags=Counter(str(r.get('rollout_best_chosen')) for r in ds if r['decider']=='jev');check('最优原答指标',dict(flags),{'True':82,'False':8,'None':19})
check('自主战斗回合',len({(r['floor'],r['turn']) for r in ds if r['decider']=='code' and r['label'].startswith('combat/') and r['label']!='combat/plan-continue'}),63)
check('HP护栏次数',len([r for r in ds if 'HP guard:' in r['rationale']]),1)
check('药水饮用数',sum((r.get('chosen') or {}).get('action')=='use_potion' for r in ds),5);check('药水丢弃数',sum((r.get('chosen') or {}).get('action')=='discard_potion' for r in ds),0)
for f in [19,21,22,23]:
    count=sum(r['floor']==f and '数值未知' in json.dumps(r.get('questions'),ensure_ascii=False) for r in ds);check(f'F{f}未知毒瓶题面',count,{19:8,21:6,22:10,23:12}[f])
for line,key,value in [(322900,'current_hp',41),(322905,'current_hp',32),(322909,'current_hp',6),(322912,'current_hp',2),(322919,'current_hp',0)]:check(f'S{line}关键HP',sm[line]['state']['run'][key],value)
before=sm[322917]['state']['combat']['enemies'][0];after=sm[322918]['state']['combat']['enemies'][0]
power=lambda e,k:next((p['amount'] for p in e['powers'] if p['power_id']==k),0)
check('毒药水实际施毒',[before['current_hp'],after['current_hp'],power(before,'POISON_POWER'),power(after,'POISON_POWER')],[24,24,9,15])
final=sm[322918]['state']['combat'];inc=sum(i.get('total_damage') or 0 for e in final['enemies'] for i in e['intents']);check('最后攻击挡量HP',[inc,final['player']['block'],final['player']['current_hp']],[25,16,2]);check('完整损血及存活差额',[inc-16,inc-16+1-2],[9,8]);check('代码末步HP预算','(-7)' in dm[314381]['rationale'],True)
check('退出活敌血',[e['current_hp'] for e in sm[322919]['state']['combat']['enemies']],[9,78])
for f,need,progress in [(9,[132,113,109,96,84,83,64,56,43,37,20],[19,4,13,12,1,19,8,13,6,17,20]),(17,[324,320,320,302,269,250,225,193,172,149,120,101,76,42,13],[4,0,18,33,19,25,32,21,23,29,19,25,34,29,13]),(23,[180,171,149,119],[9,22,30,32])]:
    c=next(c for c in res['combats'] if c['floor']==f);t=c['enemy_hp_audit']['turns'];check(f'F{f}逐轮需伤',[x['live_enemy_hp_start'] for x in t],need);check(f'F{f}逐轮净扣血',[x['net_live_enemy_hp_loss'] for x in t],progress)
use={k:sum((r.get('usage') or {}).get(k,0) or 0 for r in ds) for k in ['input_tokens','output_tokens','cache_hit_tokens']};check('总token',use['input_tokens']+use['output_tokens'],3467748);check('缓存命中',use['cache_hit_tokens'],1365504)
check('首末决策秒差',(datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds(),1481.664)
# Verify all written source references exist in the extracted original rows.
draft=(out/'lessons-draft.md').read_text()
for marker,name in [('d','decisions'),('s','states'),('p','run-plans'),('sl','sl-attempts'),('b','brain')]:
    valid={r['_line'] for r in rows(name)}
    for n in re.findall(r'(?<![A-Za-z])'+marker+r'(\d{4,6})',draft):check(f'草稿引用{marker}{n}',int(n) in valid,True)
if '--after' in sys.argv:
    snap=json.loads((out/'lessons-prefix.json').read_text());target=root/'notes/lessons.md';h=hashlib.sha256();remaining=snap['bytes']
    with target.open('rb') as f:
        while remaining:
            chunk=f.read(min(remaining,1048576));h.update(chunk);remaining-=len(chunk)
        suffix=f.read()
    check('旧复盘前缀保持',h.hexdigest(),snap['sha256']);check('本局正式追加次数',suffix.count(('## '+run+'（').encode()),1);check('正式追加原文存在',(out/'lessons-draft.md').read_bytes() in suffix,True)
failed=[c for c in checks if not c['通过']];report={'核验数':len(checks),'失败数':len(failed),'失败':failed,'检查':checks};(out/('verified-after.json' if '--after' in sys.argv else 'verified-before.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['核验数','失败数','失败']},ensure_ascii=False));sys.exit(bool(failed))
