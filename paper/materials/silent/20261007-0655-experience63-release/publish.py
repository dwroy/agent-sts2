import json, subprocess, re
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(path):
    text=(O/path).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text))))
st=tests('test-source.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log')
assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json']
assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp63';assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.8→.9，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5272的HSX4HYATB4E2 A10/F48及有效勘误、紧后WYB0NCD6W83J A10/F15，静默第六十三次增量与本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；证据新两局、暴露另53FLQ68CETW0，胆小另21历史局（完整局号见经验/账本），首证T082DRCUHRRD。账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0；0211追加更正first_run为T082/A0、prior=yes和原R0历史保持，0208仍53FLQ/A6首证、其他首证/先验/claim/版本/repeat保持，交运维据完成事件确认实际发布后CLI登记shipped，不另设审核。'
 +'旧76局七数组及全部血档/节点/回血/SL逐行复算一致，新78局1217房68实死/A10三十八局503房38死，MCCK仅进数字。新28房2死，HSX沙虫三试1赢/构装体两试1赢/沙漏六试0赢，WYB无重打；全历史真重打74场322试26赢/A10 41场181试14赢。'
 +'暴露同一步清33挡/全部3制品施2易伤后实际9毒，旧53FLQ重放清33挡/2制品施6易伤，清除子机制2支持0反例；顺序更早启毒不定整战赢。胆小22支持0反例、现场6/7盾与毒截断退场分核，WYB末5毒仅扣4取消21攻，余11攻对10挡杀1血，无固定目标序。应急一局两战胜败各1，F15 T6挡6+30=36盖33、T7禁挡防御0损22、T8恢复10仍死，保留能力未建不预支。'
 +'HSX1力四段撕咬12/16合28，末2敏重放两次防御14+余像5=19；双尖啸4→−8力仅当轮，后恢复4并长9。凋萎两张9与26攻击减19挡需25，律动限20仍超过2血，实死截断不称仅受2伤。滚石仪式兽轮初实136/沙虫140，而沙漏六次0施放；触媒晚建不追补旧轮。第二/第四沙漏T4同19血445敌血，换线多付14血多打41、仍判死，没有单组件/运气或未选路线胜因。HSX十回血合223无锻造、WYB回21与事件10分账，未来boss模拟不当下一精英胜率，不设安全血线。'
 +f'新增2更新19（全补证、纯数字0）退役0，active133→135、47737→49258字、高65中41低29；A8 128条46151字、A9 129条46450字。240配对切片中位增量{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。初稿源及抽序28项文字更正后定稿源均tsc0/vitest0、214文件2289例；合后tsc0/vitest0、{lt["files"]}文件{lt["cases"]}例，'+('合后首轮失败后重跑通过，原日志保留；' if M.get('test_first_rc') else '首轮通过无失败/超时重跑；')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识冲突0、其他知识blob保持。离线TD1同房重启抽取初稿差异及更正原件保留，非生产源码失败；无源码/生成器/手写知识/其他角色/新用药规则改动，不重建。主目录本节/账本只追加不提交，运维交接learner/runs/20261007-063003-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后CLI登记{len(L["proposed"])}项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.9；源{M["source_commit"]}；HSX4HYATB4E2/WYB0NCD6W83J A10及有效勘误、本角色历史。增2改19退0、active135/49258字；暴露清挡制品两局、胆小盾22局、应急卡牌禁挡、力敏/重放/余像、滚石实际建立、单轮限损与凋萎、SL换线血价及路线观察；旧76局重算一致，无新用药规则/源码改动，定稿源与合后沙箱tsc/vitest0。账本proposed交运维确认实际合入后登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.9 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)
