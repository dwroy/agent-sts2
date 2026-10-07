import json,pathlib,subprocess,re
O=pathlib.Path(__file__).parent;ROOT=pathlib.Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(name):
 t=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t))))
st=tests('test-source-retry.log' if (O/'test-source-retry.rc').exists() else 'test-source.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log');assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json'];assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp64';assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.9→.10，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5292的87LCSDR5P3DL A10/F9和:5298的TKXQ6L4N9A6U A10/F22，06:57:20/06:59:20勘误、静默第六十四次增量及本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，旧首证/先验/claim/支持/repeat/版本历史保持，新增与退役账本无，0213独立纯bug状态保持。毒素来源另C48LLXBGKXQ9/T082DRCUHRRD/CSBR5CRDWQNB等17局（完整12位局号见经验/账本），最早C48牌面、T082实际付费；16局51次能量−1，CSBR一张5伤减2挡损3/两张0挡损10后毒杀，TKX末两张需10、7血先死、敌6/1血与11/14毒未结算。'
 '敏捷普通/升级2/3逐张加挡不追补，TKX T4斗篷6已得后建立3敏、T5两防御各8盖13；87LC脆弱7挡实5、36攻损31，雕像10力25弱后18而2血10挡仍死。尖啸0/3→−6/−3只当轮，次轮恢复并继续敌成长；毒雾实际补毒与未到下一轮分账。巨兽本体250/回血30/实伤280、T10本体清后T11自爆44弱后33、10挡损23，整战损54；群蛇三场0施放不预支6伤。路线/营火未选线没有受控因果，问号血价与未来回复分别核。'
 '旧78局七数组/血档/节点/回血/SL逐行重算一致，新80局1233房70实死/A10四十局519房40死，MCCK仅进数字；新16房2死、无真正重打，历史74场322試26赢/A10 41场181试14赢不变。'
 f'新增1更新8全补证/纯数字0退役0，active135→136、49258→49920字，高66中41低29；A8 129条46813字/A9 130条47112字，240配对切片增量中位{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。源tsc0/vitest0/{st["files"]}文件{st["cases"]}例，合后tsc0/vitest0/{lt["files"]}文件{lt["cases"]}例，'
 +('合后首轮失败重跑通过，原日志保留；' if M.get('test_first_rc') else '合后首轮通过；')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识冲突0、其他知识blob保持。离线null角色/started字段初稿错误及更正原件保留，不当生产或自测失败。无源码/生成器/手写知识/其他角色/新用药规则改动，不重建。主目录本节和账本只追加不提交，交接learner/runs/20261007-070019-experience-update/handoff-ops.md及完成回报交调用器experience-done通知运维，核实际发布后CLI登记11项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.10；源{M["source_commit"]}；87LCSDR5P3DL/TKXQ6L4N9A6U A10及有效勘误、本角色历史。增1改8退0、active136/49920字；毒素付费/末伤先于敌毒、敏捷逐牌与脆弱、毒雾实际轮初、临时减力/敌成长、巨兽本体/自爆、能力未建及路线观察；旧78局重算一致，无新用药规则或源码改动，源与合后tsc/vitest0；11项proposed交运维据完成事件登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check');patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.10 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt);(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n');print('上线登记',M['release_commit'],name)
