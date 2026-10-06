import hashlib,json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));source=(O/'commit.txt').read_text().strip();title=(O/'changelog-title.txt').read_text().strip()
assert M['merged'] and M['test_rc']==0 and M['release_commit'] and M['eval_version']=='S1.exp56'
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['release_commit'],'HEAD'],check=True)
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',source,'HEAD'],check=True)
cli=['python3',str(ROOT/'learner/ledger.py')];check=subprocess.run(cli+['check'],text=True,capture_output=True);(O/'ledger-check-final.log').write_text(check.stdout+check.stderr);assert check.returncode==0
before=json.load(open(O/'ledger-before.json'))
for ident in L['proposed']:
 now=json.loads(subprocess.check_output(cli+['show',ident],text=True));assert now['status']=='proposed'
 for key in ['first_run','prior','prior_runs','prior_note','claim','version']:assert now.get(key)==before[ident].get(key),(ident,key)
 assert source in now['where']['commits'] and title in now['where']['changelog']
assert json.loads(subprocess.check_output(cli+['show','silent-0197'],text=True))['status']=='observed'
ver=json.load(open(LIVE/'eval/versions.json'));matches=[x for x in ver['versions'] if x['name']==M['eval_version']];assert len(matches)==1 and matches[0]['commit']==M['merged']
assert (ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json').read_bytes()==(LIVE/'knowledge/characters/silent/experience.json').read_bytes()
names=[('力/敏与敌成长','silent-strength-weak-observation'),('余像逐牌挡','silent-afterimage-per-card-block'),('触媒毒触发','silent-accelerant-triggers'),('尖啸临时减力','silent-piercing-wail-temporary-strength'),('预判临时敏捷','silent-anticipate-temporary-dexterity'),('爆发技能重放','silent-burst-next-skills-replay'),('毒雾实际启动','silent-noxious-fumes-growth'),('收场空堆条件','silent-grand-finale-empty-draw'),('构筑/本体输出观察','silent-deck-burst-observation'),('王室猛毒＋小血瓶组合净值观察','silent-royal-poison-blood-vial-opening-net')]
E={e['id']:e for e in json.load(open(LIVE/'knowledge/characters/silent/experience.json'))['entries']}
report=dict(task='experience-update',version=C['version'],commit=source,merged=M['merged'],added=len(C['added']),updated=len(C['updated']),retired=len(C['retired']),active=C['active'],mechanisms=[x[0] for x in names],tests=dict(tsc=0,vitest=0,cases=M['source_tests']['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
closing=(f'本节收尾（{stamp}）：源{source}，实际live合入{M["merged"]}，上线登记{M["release_commit"]}、eval {M["eval_version"]}。源定稿tsc0/vitest0、{M["source_tests"]["files"]}文件{M["source_tests"]["cases"]}例；初轮提前启动读压缩稿通过，定稿重跑通过，非失败/超时；合后tsc0/vitest0、{M["live_tests"]["files"]}文件{M["live_tests"]["cases"]}例，'+('重跑通过、原首轮日志保留' if M.get('test_first_rc') else '首轮通过')+'。新增1更新14（11补证/0只数字/3仅压缩）退役0，active126→127、56138→56154字，高59中40低28；开工四条压1160至54978，旧文/局号/数字/证据/含药分句保持；A8 120条52878字、A9 121条53177字、A10 122条53757字；240配对中位+39、最大5748→5816。旧67局全部七数组/血档/节点/回血/SL一致，新68局1076房58死、本局17房1死，无读档，真正SL63场285次19赢不变。王室猛毒＋小血瓶两窗口净−2、缺独立结算不拆公式；余像/敏捷/牌挡分账，双尖啸当轮省36非永久、触媒毒杀当前爪牙不保本体输出/停召唤；本体六轮扣50仍105，持有未施放组件不预支。首COMBAT与操作帧差异按开场遗物分账，保留原统计口径。账本新增/退役无，proposed '+','.join(L['proposed'])+'、最终check0，首证/prior/claim/旧version/repeat保持，0198本局/unknown、0197 A0/no保留observed，后者纯bug留独立修复任务。'
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识重叠/冲突0、其他知识blob保持；无源码/生成器/手写知识/其他角色改动，不重建、无新用药规则。交接learner/runs/20261007-010232-experience-update/handoff-ops.md及调用器experience-done通知运维，运维核实际合入后CLI登记15项shipped、完整沙箱外套件交调度器。主目录本节/账本只追加不提交；不停对局、不运行play、不推送。需要Dai定：无。')
(O/'changelog-closing.md').write_text(closing+'\n')
handoff=(f'# 静默经验第五十六次上线交接\n\n记录时间：{stamp}\n\n- 经验版本：2026-10-07.1→2026-10-07.2；源{source}（exp-silent）。\n- 实际live合入：{M["merged"]}；上线登记：{M["release_commit"]}；eval唯一{M["eval_version"]}指向实际合入。\n- 源定稿tsc0/vitest0，{M["source_tests"]["files"]}文件{M["source_tests"]["cases"]}例；合后tsc0/vitest0，{M["live_tests"]["files"]}文件{M["live_tests"]["cases"]}例。源初轮读压缩稿原日志保留，定稿重跑非失败；合后首轮状态{M["test_first_rc"]}。\n- 新增1、更新14（11补证/0只数字/3压缩）、退役0；127 active/56154字，配对中位+39、最大5816；A8 120/52878，A9 121/53177。\n- 来源VPW8YH7A4QFM SILENT A10及01:01勘误、本角色全部历史；旧67局全部逐行一致，新68局1076房58死，无新用药规则/源码改动。首COMBAT早于遗物结算时保持原口径，操作损单列。\n- 15项proposed/check0：'+','.join(L['proposed'])+'。仅由运维根据实际合入与experience-done将这15项CLI登记shipped/S1.exp56；首证/prior/claim/repeat/旧版本保持。0198本局/unknown、0197 Y6GM A0/no保持，0197仍observed，评分纯bug留独立修复，不代登记。\n'
 +f'- 自动刷新提交{M.get("refresh_commit")}、合前{M["base"]}，知识重叠0；七份刷新与其他知识blob保持，无生成器改动不重建。主目录变更节/账本只追加、由调用方提交。\n- 请求调用器experience-done通知运维确认实际上线，并由调度器补跑沙箱外完整tsc/vitest；无需新增审核。\n- 本批脚本/分流/断言初稿/药水分句拦截/两轮源自测/合后自测/切片/账本/差异/回报均在本目录；初稿失败不当生产代码失败，gitleaks通过。\n- 需要Dai定：无；不停对局、不运行play、不推送。\n')
(O/'handoff-ops.md').write_text(handoff)
for name in ['changelog-closing.md','handoff-ops.md','report.json']:
 with (O/('gitleaks-'+name+'.log')).open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a') as f:f.write('\n'+closing+'\n')
manifest=dict(source=source,merged=M['merged'],release=M['release_commit'],version=M['eval_version'],experience_sha256=hashlib.sha256((LIVE/'knowledge/characters/silent/experience.json').read_bytes()).hexdigest(),ledger=L,files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [O/'report.json',O/'changelog-section.md',O/'changelog-closing.md',O/'source-staged.patch',O/'test-source-final.log',O/'test-live.log']})
(O/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False));print(check.stdout.strip())
