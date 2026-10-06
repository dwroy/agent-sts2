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
versions=json.load(open(LIVE/paths[1]));name='S1.exp61';assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.6→.7，源{M["source_commit"]}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5246的8R5CXD5C8PW8 SILENT A10/F35及04:55:17有效勘误、静默第六十一次增量与本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持，交运维核实际发布后登记shipped。'
 +'旧74局七数组/各进阶血档/源节点/回血/SL逐行重算一致，新75局1177房65实死，A10三十五局463房35死；MCCK2602T1SR仅进数字。新14房1死；首COMBAT部分在小血瓶前，雕刻师60→补2到62→0、统计净损60/操作战损62，三虫41→补2到43→15、统计26/操作28；口径未改。'
 +'灵体每张1费/无实体1/消耗，雕刻师T2/T3的15/24攻变1，5挡零损与零挡损1分别兑现，三保护轮扣45/损1；未建步法/群蛇不预支，T2开场仪式9、力9/18后T4萎靡+X3减4到14、33→21，仍增长23/32/41、弱后28/35/42。末羞耻脆弱令三牌19→13挡、疑虑虚弱令16→11直伤，42−13需29而6血差23，实际归零只扣6；即加回6挡仍差17血，不定单咒败因。末12毒另3荆棘，敌44→29；T2—T7每击荆棘3合18，全挡亦反伤。'
 +'华丽收场+知识恶魔重打T6空堆实扣75、304→229，本轮净扣92/损12，T14毒清12余20赢；死亡战T3非空不可打/贡献0。知识恶魔两试70/70初31抽序同而到手轮/防御/后续动作不同，首T13的8血7挡对15恰判死、97敌血28毒未结算读档，不单归收场转胜。巨兽两试69/70初序26/25与到手轮不同，T8均清本体；首T10的41爆炸对24血14挡差3未结束，末T9的28对13挡损15余17过关。两场4试2赢，历史真重打71场311次24赢/A10 38场170次12赢。'
 +'F8/F17护栏预计合省23血/少26当轮伤、推迟4/6毒，替线局部兑现而原线整战未知，不添确定bug或repeat。三营火回血各21合63，缩放仪F17另25/F33另22；A10 214火143回血共3543、后战136/18死/活损中位25。F34改线增精英前火与商店删咒未达，首走廊高血仍死；蜡烛F29添火不回血、轮初基础4/侧步另+1与实际能力支付分核。'
 +f'新增1更新14全补证/纯数字0退役0，active131→132、50163→{C["chars"]}字，高63中40低29；A8 {C["applicable"]["8"]["entries"]}条{C["applicable"]["8"]["chars"]}字/A9 {C["applicable"]["9"]["entries"]}条{C["applicable"]["9"]["chars"]}字。240配对切片增量中位{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字。源及合后tsc0/vitest0各{st["files"]}/{lt["files"]}文件{st["cases"]}/{lt["cases"]}例，'+('合后重跑通过；' if M.get('test_first_rc') else '首轮通过无重跑；')
 +f'刷新{M.get("refresh_commit")}、合前{M["base"]}，知识重叠/冲突0，其他知识blob保持。临时抽数null/clean字段/抽堆位置初稿更正保留，不当生产失败；无源码/生成器/手写知识/其他角色/新用药规则改动，不重建。主目录本节/账本只追加不提交，交运维据experience-done和learner/runs/20261007-045607-experience-update/handoff-ops.md确认实际合入后CLI登记18项shipped，不另设审核，完整沙箱外套件交调度器；不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.7；源{M["source_commit"]}；8R5CXD5C8PW8 A10及有效勘误、本角色历史。增1改14退0、active132/{C["chars"]}字；灵体保护与仪式增长、空堆75伤/SL多组件、脆弱/虚弱/反伤、能力支付及路线血池观察；旧74局重算一致，无新用药规则/源码改动，源及合后沙箱tsc/vitest0，18项proposed交运维核实际发布后登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.7 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)
