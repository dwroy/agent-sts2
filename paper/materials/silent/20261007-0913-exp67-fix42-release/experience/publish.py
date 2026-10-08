import json,pathlib,re,subprocess
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0

def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def test(name):
 t=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t))))
st=test('test-source.log');lt=test('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log');assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp67';assert not any(v['name']==name for v in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.12→.13，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5335的KQQELQSZ382Z SILENT A10及三处勘误、静默第六十七次增量、本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；证据KQQELQSZ382Z，蛇咬历史KAY522KT5NXR/VN7RQJMJEFMX/8CFMW9SAGFWQ/2SU6XN2AEJRD/3KME36ADUE4U/4Y94N8RDPGPM/MGA0CZDDKC0P/U8K28UUGYP3U，其他12位支持/反例见经验JSON；账本'+','.join(L['proposed'])+'只CLI/by=learner:experience-update proposed/check0，原first_run/prior/claim/证据/repeat/版本历史保留，0220补真实升级观察，0216/0219纯bug状态不动。'
'旧83局七数组/血档/源节点/回血/SL逐行一致，新84局1265房74实死、A10四十四局551房44实死；MCCK只进数字。蛇咬9纳证局48次实际施放，普通8/升级2局有重叠、毒+7/10不即时扣HP，普通实见2费与KAY早期免费个例分账；本局末T4/T7各花2给7、结算12/16余11/15，首T11负2力仍给7。族母T7/T11吸取力敏各−2、敌+2，冲刺8→6伤挡、防御1/偏折0；尖啸末T5的20双击→8、8挡零损，T6恢复力14攻穿9损5，不作永久关成长。'
'族母六次64/75同初24抽序均败，蛇咬首次到手T4/5/4/4/4/4、首次施放T7/6/7/4/7/4，后抽时点/动作改变，未到手不作故意跳过；末毒130＋直接71=201/233，T13的5血6挡对20需损14差9，敌32/9毒未兑。不认定单卡胜因或早打必胜。三火实回21/21/22合64、末64血仍败；F16原始592样本零胜、校准0.0474不是已有赢样本。全史真正重打75场328试26赢/A10 42场187试14赢，族母纳证4场24试1赢。'
f'新增1更新6（全补证/只数字0）退役0、active136→137/49049→49709字，高68中43低26；A8 130条46602字/A9 131条46901字。240配对切片增量中位4、最大5276→5379字。源{st["files"]}文件{st["cases"]}例/合后{lt["files"]}文件{lt["cases"]}例、tsc/vitest0；'+('合后首轮失败重跑通过，原件保留；' if M.get('test_first_rc') else '源与合后均首轮通过；')+
f'刷新{M.get("refresh_commit")}、合前{M["base"]}、知识不同blob冲突0/其他知识blob保持。离线started字段、SL结果断言和update早于summary的失败/更正原件留盘，不作生产失败。无源码/生成器/手写知识/其他角色/新用药规则改动，不重建；主目录本节与账本仅追加不提交。交learner/runs/20261007-084302-experience-update/handoff-ops.md及experience-done通知运维核实际上线后登记9项shipped，完整外部交调度器，不另审核；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.13；源{M["source_commit"]}；KQQELQSZ382Z A10及本角色历史，蛇咬保留7/10毒与免费个例分账、尖啸临时减力、族母吸取/毒窗口与三火回血观察。增1改6退0、137 active/49709字；旧83局复算一致，无新药水规则/源码变化。源与合后tsc/vitest0，9项proposed交运维核实际上线后CLI登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n');git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.13 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
