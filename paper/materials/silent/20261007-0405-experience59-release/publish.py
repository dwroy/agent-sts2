import json
import re
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=O.parents[2]
LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'))
C=json.load(open(O/'changes.json'))
L=json.load(open(O/'ledger-result.json'))
S=json.load(open(O/'slice-summary.json'))
source=(O/'commit.txt').read_text().strip()
assert M['merged'] and M['test_rc']==0 and L['check']==0
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def tests(file):
    text=(O/file).read_text()
    return dict(tsc=0,vitest=0,files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',text))),cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',text))))
st=tests('test-source-final.log')
lt=tests('test-live-retry.log' if M.get('test_first_rc') else 'test-live.log')
assert st['cases'] and lt['cases']
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
paths=['paper/materials/decision-log.md','eval/versions.json']
assert not git('diff','--cached','--name-only') and not git('diff','--name-only','--',*paths)
versions=json.load(open(LIVE/paths[1]));name='S1.exp59'
assert not any(x['name']==name for x in versions['versions'])
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M'],text=True).strip()
message=(f'Codex学习者经验自测后上线：静默经验2026-10-07.4→.5，源{source}→实际live合入{M["merged"]}，eval {name}。来源notes/lessons.md:5220的UMVLWER4CD98 SILENT A10/F48及03:31:15理由勘误、静默第五十九次增量和本角色历史；来源条目'+','.join(C['added']+C['updated'])+'；账本'+','.join(L['proposed'])+'仅CLI/by=learner:experience-update proposed/check0，首证/先验/claim/旧version/repeat保持，交运维核实际发布后登记shipped。'
    +'旧71局七数组/血档/源节点/回血/SL重算一致，新72局1138房62实死，A10三十二局424房32实死；MCCK2602T1SR仅进数字。加湿器首证本局/A10/prior=unknown：十次回血共321，每次最大血与当前血另增5，F16基础25＋5使51/85→81/90、F47基础34＋5使31/115→70/120，F9锻造54/75不变；更早71局原帧无持有该遗物可比记录。只已观察非满血窗口，不外推未知选项/截断或确定胜因。'
    +'沙漏六次同70/120、前五T10/8/10/11/11判死读档、末T11实死；末三步法3＋2＋2=7敏、燃烧2力，防御+8＋7敏=15加音叉7合22，40攻击＋12凋萎需损30、8血差22，实扣剩8为死亡截断，12毒结算后敌313/535。首试T2/T3建5毒雾实扣317，末未建毒雾11轮扣222；抽序42/46项不同、升级/到手轮/药水事实与SL探索同变，差95只观察，不定单牌转胜因果；历史真正重打66场299次20赢，A10 33场158次8赢，沙漏真正10场48次2赢/A10四场24次0赢。'
    +'棱柱T3护栏短段题面零损后重问再打两技能，玩家污染3→6→9、三击6→12→18，5挡实损13、实扣17；本场77→36损41胜，不能把初题预计节9血视作整轮零损。巨斧护栏即时零损兑现但毒雾至T5建，36→37净回复含尾巴触发，非无损或保住复活；未选原线整战未实打。F44回血后三骑士损51、F47又回到70，沙漏仍六败，预测抵达与能过双boss分核。'
    +f'新增1更新11（全部补证、只数字0）退役0，active129→130、50536→{C["chars"]}字，高62中39低29；A8 {C["applicable"]["8"]["entries"]}条{C["applicable"]["8"]["chars"]}字/A9 {C["applicable"]["9"]["entries"]}条{C["applicable"]["9"]["chars"]}字。240配对切片增量中位{S["median_delta"]}、最大{S["before_max"]}→{S["after_max"]}字，不冒充完整V4前缀。'
    +f'源tsc0/{st["files"]}文件{st["cases"]}例/vitest0，合后tsc0/{lt["files"]}文件{lt["cases"]}例/vitest0，'+('合后首轮失败、重跑通过。' if M.get('test_first_rc') else '源与合后首轮通过、无失败重跑。')
    +f'刷新提交{M.get("refresh_commit")}、合前{M["base"]}，不同知识blob冲突0、其他知识保持；追加历史冲突若有则保留双方有序原文。临时机制断言初稿把玩家污染读作敌增益、修字段后通过，非生产代码或自测失败；原记录保留。无源码/生成器/手写知识/其他角色改动、不重建，无新用药规则。主目录本节/账本只追加不提交，交运维据experience-done及learner/runs/20261007-034303-experience-update/handoff-ops.md核实际合入后CLI登记shipped，完整沙箱外套件交调度器，不另审核、不停对局、不运行play、不推送。')
with (LIVE/paths[0]).open('a') as h:h.write('\n- '+stamp+' '+message+'\n')
versions['versions'].append(dict(name=name,family='Silent',commit=M['merged'],source=f'decision-log {stamp}（静默经验2026-10-07.5；源{source}；UMVLWER4CD98 A10及理由勘误、本角色历史。增1改11退0，active130/{C["chars"]}字；加湿器回血/上限增长、力敏/音叉/凋萎分账、毒雾实际启动、棱柱重问后整轮验收与路线血池观察；旧71局重算一致，无新用药规则/源码变更，源及合后沙箱tsc/vitest0，13项proposed交运维据实际合入登记shipped，完整外部交调度器。）'))
(LIVE/paths[1]).write_text(json.dumps(versions,ensure_ascii=False,indent=2)+'\n')
git('add',*paths);git('diff','--cached','--check')
patch=O/'release.patch';patch.write_text(git('diff','--cached','--binary')+'\n')
with (O/'gitleaks-release.log').open('w') as h:
    subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(patch)],stdout=h,stderr=subprocess.STDOUT,check=True)
git('-c','user.name=dwroy','-c','user.email=roy.dongwei@gmail.com','commit','-m','Record Silent experience 2026-10-07.5 deployment','-m','Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
M.update(eval_version=name,release_commit=git('rev-parse','HEAD'),release_time=stamp,source_tests=st,live_tests=lt)
(O/'live-merge.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
print('上线登记',M['release_commit'],name)
