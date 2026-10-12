import json,subprocess,re
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(name):
 t=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t))))
st=tests('test-source.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log');assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp65';assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.10→.11，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5311的02HB4L0C3C67 A10/F12及:5317的T3FW7R2R2306 A10/F8，按紧后勘误、静默第六十五次增量及本角色历史；来源条目'+','.join(C['updated'])+'；证据局号02HB4L0C3C67/T3FW7R2R2306，历史完整12位支持/反例见经验JSON；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，旧首证/先验/claim/repeat/版本历史保持。'
 '骇鳗A10基伤18/活力6到24、虚弱到18，跨75眩晕取消12攻后99易伤把18→27，15挡需损12杀6血、敌仍36；异鸟力量0—5令三击15→21→27，T4弱后15，T6 16血10挡需损17而死。毒雾T1已建2、T2—6毒20加直接57共77仍缺13，末余5毒不预支；防御轮没停敌加力。护栏保毒雾、省当轮8血少6伤、原线整战未实打，不作必胜或纯bug。02HB首火前52损、两火实回42/事件付10、未来火及商店未到；T3回21到61仍精英死、飞靴余3，另一跳线未实打。'
 '旧80局七数组/血档/源节点/回血/SL逐行一致；新11房2死，82静默局1244房72实死，A10四十二局530房42死，MCCK仅进数字；新无SL，历史74场322试26赢/A10 41场181试14赢不变。'
 f'新增0更新7全加证据/纯数字0退役0，active136→136、49920→49822字，高66中41低29；A8 129条46715字/A9 130条47014字，240配对切片增量中位{S["median_delta"]}，最大{S["before_max"]}→{S["after_max"]}。源tsc0/vitest0/{st["files"]}文件{st["cases"]}例，合后tsc0/vitest0/{lt["files"]}文件{lt["cases"]}例，'
 +('合后首轮失败重跑通过，原日志保留；' if M.get('test_first_rc') else '源与合后均首轮通过；')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识不同blob冲突0、其他知识blob保持。中毒已建模仍按未知攻击折扣纯bug0216保持observed/交独立修复，首证按K3676LU8B0UH A1勘误；无源码/生成器/手写知识/其他角色/新用药规则改变，不重建。离线facts初稿无chosen行KeyError及更正原件保留，非生产或自测失败。主目录本节/账本只追加不提交，交接learner/runs/20261007-073027-experience-update/handoff-ops.md及完成JSON交调用器experience-done通知运维核实际发布后CLI登记8项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.11；源{M["source_commit"]}；02HB4L0C3C67/T3FW7R2R2306 A10及有效勘误、本角色历史。增0改7退0、active136/49822字；骇鳗阈值及活力/易伤、异鸟逐段力量/虚弱、毒雾实结算、营火前血价及未来回复、能力建立与护栏局部观察，旧80局复算一致，无新用药规则或源码变化；源与合后tsc/vitest0，8项proposed交运维据完成事件登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check');patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.11 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
