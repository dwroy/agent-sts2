import hashlib,json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp';LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['test_rc']==0 and M.get('release_commit') and M.get('eval_version')=='S1.exp63'
def git(path,*args):return subprocess.check_output(['git','-C',str(path),*args],text=True).strip()
source=M['source_commit'];assert git(EXP,'rev-parse','HEAD')==source and not git(EXP,'status','--short')
assert git(EXP,'show','--format=','--name-only',source)=='knowledge/characters/silent/experience.json'
assert git(EXP,'rev-parse',source+':knowledge/characters/silent/experience.json')==git(LIVE,'rev-parse',M['merged']+':knowledge/characters/silent/experience.json')
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
assert sum(x['name']=='S1.exp63' and x['commit']==M['merged'] for x in json.load(open(LIVE/'eval/versions.json'))['versions'])==1
check=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check-final.log').write_text(check.stdout+check.stderr);assert check.returncode==0
fold=json.loads(subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold','--json']))
if isinstance(fold,dict):fold=list(fold.values())
selected=[x for x in fold if x['id'] in L['proposed']]
covered={e for x in selected if source in x['where'].get('commits',[]) for e in x['where'].get('experience',[])}
assert set(C['added']+C['updated'])<=covered
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
section=(O/'changelog-section.md').read_text()
section+=('\n本节收尾（'+stamp+'）：源'+source+'，实际live合入'+M['merged']+'，上线登记'+M['release_commit']+'/eval '+M['eval_version']+'；刷新'+str(M.get('refresh_commit'))+'、合前'+M['base']+'、知识重叠/冲突0，其他知识blob保持。源初稿/定稿均tsc0/vitest0/214文件2289例，定稿是初序数字校正后的重跑；合后tsc0/vitest0/'+str(M['live_tests']['files'])+'文件'+str(M['live_tests']['cases'])+'例、首轮通过，无测试失败或超时重跑。只经账本CLI将'+','.join(L['proposed'])+'共'+str(len(L['proposed']))+'项改proposed，新增/退役无、check0，覆盖21经验条目；0211更早首证更正为T082/A0且prior=yes与原历史保留，其余首证/先验/claim/全部旧支持/repeat/版本保持。不写accepted/shipped，未纳入条目不动。账本CLI空evidence初稿首行被拒且零行落账，修正后成功，原拒绝/更正保留。无源码/生成器/手写知识/其他角色/新用药规则改动、不重建；主目录本节/账本只追加不提交，调用方提交。交接learner/runs/20261007-063003-experience-update/handoff-ops.md，由调用器experience-done通知运维核实际发布后CLI登记shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。\n')
(O/'changelog-section.md').write_text(section)
with (O/'gitleaks-changelog.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/'changelog-section.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
target=ROOT/'paper/materials/experience-changelog-silent.md';title=(O/'changelog-title.txt').read_text().strip()
assert not any(line.strip()=='## '+title for line in target.open())
size=target.stat().st_size
def prefix_hash(limit):
    h=hashlib.sha256()
    with target.open('rb') as f:
        while limit:
            b=f.read(min(1048576,limit));assert b;h.update(b);limit-=len(b)
    return h.hexdigest()
before=prefix_hash(size)
with target.open('ab') as h:h.write(('\n'+section).encode())
assert prefix_hash(size)==before
(O/'changelog-append-check.json').write_text(json.dumps(dict(old_bytes=size,old_sha256=before,new_bytes=target.stat().st_size,old_prefix_unchanged=True,title=title),ensure_ascii=False,indent=2)+'\n')
mechanisms=['力量与共享撕咬','敏捷/爆发/余像','暴露清挡清制品','临时减力与敌成长','滚石轮初成长','限损与凋萎','胆小盾与退场','应急卡牌禁挡','施毒/触媒与剩血截断']
report=dict(task='experience-update',version=C['version'],commit=source,merged=M['merged'],added=len(C['added']),updated=len(C['updated']),retired=0,active=C['active'],mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=M['source_tests']['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
handoff=(f'# 静默经验第63次增量交接\n\n记录时间：{stamp}。\n\n源提交{source}（exp-silent）已实际合入live {M["merged"]}，固定上线登记{M["release_commit"]}/S1.exp63；经验2026-10-07.8→.9，新增2、更新19全补证、退役0、active135/49258字。源定稿及合后固定沙箱均tsc0/vitest0/214文件2289例；初稿源亦通过，初序28项文字校正后定稿重跑，无测试失败/超时重跑。完整沙箱外套件请由调度器补跑。\n\n保存七项自动刷新{M.get("refresh_commit")}，合前{M["base"]}、知识冲突0、其他知识blob保持；无生成器改动不重建。\n\n来源：HSX4HYATB4E2/WYB0NCD6W83J A10及有效勘误，暴露清除子机制另53FLQ68CETW0 A6，胆小机制全历史22支持局。旧76局七数组及血档/节点/回血/SL重算一致，新78局1217房68死。机制逐项支持与进阶/完整局号见经验和主目录变更记录本节。\n\n账本CLI已将以下24项改proposed/check0：'+','.join(L['proposed'])+'。请运维依据experience-done、实际合入提交及版本，通过learner/ledger.py登记shipped/S1.exp63，不另设审核；0211首证更正更早T082DRCUHRRD/A0，prior=yes和原R0历史保持，其他首证/先验/claim/版本/repeat保持。没有新增或退役账本项。\n\n主目录experience-changelog-silent.md只追加本节，旧字节前缀已校验不变；账本仅CLI追加，主目录未由本任务提交，交调用方提交。原始片段、112MB旧抽数初稿、TD1专用口径修正、沙虫28项文字校正、账本空列表拒绝及修正、全部检查和合入证据留本任务目录；无生产代码新bug、无待Dai决定事项。没有新用药规则，不停对局、不运行play、不推送。\n')
(O/'handoff-ops.md').write_text(handoff)
with (O/'gitleaks-handoff.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/'handoff-ops.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
print(json.dumps(report,ensure_ascii=False))
print('变更记录只追加一节，旧前缀校验通过；交接已落盘。')
