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
versions=json.load(open(LIVE/paths[1]));name='S1.exp62';assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.7→.8，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5259的QNTW139MGECA SILENT A10/F28及05:21勘误/05:24机制补记、静默第六十二次增量与本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；证据局QNTW139MGECA，地道虫历史另LRN0HPZ0FZS1/ZZMYZ5UBCG72/HMVJKM56S4Q8/F4QKG4J1AJJZ/PU80F84P6HPN/VPW8YH7A4QFM。账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，交运维核实际发布后登记shipped；0207全历史状态发现四个更早支持、首证F4Q/A9更正LRN/A0，prior=yes及原记录历史保持，其余首证/先验/claim/旧版本/repeat保持。'
 +'旧75局七数组/各血档/源节点/回血/SL逐行复算一致，新76局1189房66实死，A10三十六局475房36死，MCCK2602T1SR仅进数字。本局12房1死、无重打，当前SL日志一行仅仪式兽attempt1首胜；历史真重打71场311次24赢/A10 38场170次12赢不变。'
 +'棱柱火花3/6/9按技能累积污染，T3非凡技艺/步法建1力3敏不加污染；T5三技能24挡、污染18使攻击33，损9、第三挡相对两张省2；T4尖啸减力−2→−8、6污染后8攻被8挡盖，次轮−2恢复。末六攻击61先扣22挡再扣39血、毒3后敌余2；6血8挡对24需损16、差10，实归零只扣6。仪式兽T4萎靡X3减4→1力、24→15攻但零挡损15；T5直伤到149跨160清阶段/旧力，后力4/8，73→17损56/12轮首胜。'
 +'埋地清盾七次A0/A2/A9/A10皆敌存活、转眩晕并取消当轮攻击；最早LRN清7挡取消17攻，VPW敌34血不变取消15攻，本局清20挡取消23攻、玩家29血不变，不设固定拿牌/击杀优先级。羽毛8局58次公式全对，本局到火39另休息88，吃蛋7/换幕17→65另列。群蛇全局0次支付不预支，T1护栏省3血多8伤却撤爆发机会，未选原线/早铺能力/路线/休息无受控整战结果、不新增repeat或确定纯bug。'
 +f'新增1更新11（全补证、纯数字0）退役0、active132→133/48258→{C["chars"]}字、高64中40低29；A8 {C["applicable"]["8"]["entries"]}条/{C["applicable"]["8"]["chars"]}字，A9 {C["applicable"]["9"]["entries"]}条/{C["applicable"]["9"]["chars"]}字。240配对切片中位增量{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。源及合后tsc0/vitest0、各{st["files"]}/{lt["files"]}文件、{st["cases"]}/{lt["cases"]}例，'+('合后重跑通过；' if M.get('test_first_rc') else '初稿源/合后首轮通过，操作来源补核后更正为盾归零触发，定稿源/合后各再测一轮通过，无测试失败；')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识冲突0、其他知识blob保持；无源码/生成器/手写知识/其他角色/新用药规则变更、不重建。主目录本节/账本只追加不提交，运维交接learner/runs/20261007-052654-experience-update/handoff-ops.md，调用器experience-done通知运维核实际发布后CLI登记15项shipped，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.8；源{M["source_commit"]}；QNTW139MGECA A10及有效勘误/补记、本角色历史。增1改11退0、active133/{C["chars"]}字；埋地清盾七局/首证A0、力敏与污染血价/临时减力/阶段清力、羽毛与休息、能力实际支付及路线观察；旧75局重算一致，无新用药规则/源码改动，源及合后沙箱tsc/vitest0，15项proposed交运维核实际发布后登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.8 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)
