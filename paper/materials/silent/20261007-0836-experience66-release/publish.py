import json, re, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(name):
    t=(O/name).read_text();return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t))))
st=tests('test-source.log');lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log')
assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json']
assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp66';assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
z=C['after'];b=C['before']
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.11→.12，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5329的P5HT1272P5SB SILENT A10/F25及静默第六十六次增量、本角色历史HSX4HYATB4E2 A10勒紧实打；来源条目'+','.join(C['updated'])+'；证据局号P5HT1272P5SB/HSX4HYATB4E2，历史完整12位支持/反例见经验JSON；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，旧首证/先验/claim/证据/repeat/版本历史保持。'
 '步法3敏三牌增9挡、同族24挡对36仍损12；神官0/3/6/9力三击9/18/27/36，胧光虚弱20→15不关起航加力。覆甲T4剩1/T5零，不预支4。F19夜魇复制三磨蚀+实打，1敏/6荆棘累4/24、能量仍3仅现场费用观察；F25先施步法再夜魇实际选富足，T2三复制品未用不记额外9敏或三次随机能力收益，T8生成后才施磨蚀+、6荆棘/3毒使40→31。'
 '勒紧专属防御9→13、26攻仍需损13杀3血；历史HSX F31 T2先5加爆发双9实23/损0，预测漏8另交0218纯bug。暴露+仍3易伤/消耗，预览可复用错误独立0217；0217/0218不改状态或宣称修复转胜。胧光三清幻象后T4/5/9回21、毛需血213/实伤175/余38；8胧光与1雾菇召唤观察分账，不移起航规则或定击杀顺序。'
 'F22事件付10、F23损12、F24锻造仍40/77，F25问号损40死；未选回血即时63与未来F27/boss77未实打，不定血线或路线/锻造因果。旧82局七数组/血档/节点/回血/SL逐行一致，新12房1死，83局1256房73实死，A10四十三局542房43实死；MCCK仅进数字。新SL1行仅首试赢，无重打；历史74场322试26赢/A10 41场181试14赢不变。'
 f'新增0更新12全补证/只数字0退役0，active{b["active"]}→{z["active"]}、{b["chars"]}→{z["chars"]}字，高{z["confidence"]["high"]}中{z["confidence"]["med"]}低{z["confidence"]["low"]}；A8 {z["by_asc"]["8"]["entries"]}条{z["by_asc"]["8"]["chars"]}字/A9 {z["by_asc"]["9"]["entries"]}条{z["by_asc"]["9"]["chars"]}字，240配对切片中位增量{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}。源定稿tsc0/vitest0/{st["files"]}文件{st["cases"]}例，合后tsc0/vitest0/{lt["files"]}文件{lt["cases"]}例；源第一轮旧稿亦通过，收尾补A10标签与胧光/雾菇证据拆分后第二轮通过，随后核回旧含药事实为4D4J8USKCPAV、保持原分句且补局号后第三轮定稿重测，非失败或超时重跑。'
 +('合后首轮失败重跑通过，原日志保留；' if M.get('test_first_rc') else '合后首轮通过；')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识不同blob冲突0、其他知识blob保持。离线pending/选择过渡/敌ID与初次冻结路径失败及更正均留盘，不作生产故障。无源码/生成器/手写知识/铁甲知识/新药水规则改动，不重建；主目录第66节与账本仅追加不提交。交接learner/runs/20261007-075642-experience-update/handoff-ops.md及完成JSON交调用器experience-done通知运维核实际发布后CLI登记14项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.12；源{M["source_commit"]}；P5HT1272P5SB A10、本角色历史及HSX勒紧实打。增0改12退0、active136/{z["chars"]}字；逐牌敏捷/逐击力量与虚弱、覆甲耗尽、夜魇次轮复制/磨蚀叠加、寻龙尺生成施放、勒紧专属挡、暴露保留消耗、召唤复活及未来回血观察。旧82局复算一致，无新用药规则或源码变化；源定稿与合后tsc/vitest0，14项proposed交运维据完成事件核实际发布后登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:
    subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.12 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)
