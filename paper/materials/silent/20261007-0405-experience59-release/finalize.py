import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=O.parents[2]
M=json.load(open(O/'live-merge.json'))
C=json.load(open(O/'changes.json'))
L=json.load(open(O/'ledger-result.json'))
S=json.load(open(O/'slice-summary.json'))
assert M['test_rc']==0 and M.get('eval_version')=='S1.exp59'
assert (O/'live-flow.rc').read_text().strip()=='0'
subprocess.run(['nice','-n','19','python3',str(O/'changelog.py')],check=True)
check=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check-final.log').write_text(check.stdout+check.stderr)
assert check.returncode==0
assert hashlib.sha256((ROOT/'.worktrees/exp/knowledge/characters/silent/experience.json').read_bytes()).hexdigest()==(O/'experience-final.sha256').read_text().strip()
source=M['source_commit']
mechanisms=['步法逐牌敏捷','力量/逐击虚弱','毒雾轮初成长','尖啸临时减力','音叉独立触发挡','凋萎结束预算','棱柱技能污染','加湿器休息增长','启动/保血兑现观察','沙漏重打/成长观察']
handoff=(f'静默经验第59节完成；请据experience-done核实际合入并登记上线。\n\n源：{source}（exp-silent），实际live合入：{M["merged"]}，上线记录：{M["release_commit"]}，eval：{M["eval_version"]}。经验2026-10-07.4→2026-10-07.5；新增1、更新11均补证、退役0，active130/{C["chars"]}字；A8 123条47420字/A9 124条47719字/A10 125条48299字。证据UMVLWER4CD98 SILENT A10及03:31:15勘误和本角色历史，旧71局全部复算一致，72局1138房62实死。\n\n加湿器本局十回血共321、每次上限/当前血另增5，F16 51/85→81/90、F47 31/115→70/120；F9锻造不变，prior=unknown保持，无其他角色或新用药规则。末沙漏7敏/2力但未建毒雾，T11牌挡15＋音叉7=22，40攻击＋12凋萎需损30、8血差22，敌313；首末抽序/升级/时点/探索同变，六败不定单牌因果。棱柱护栏短段零损后重问多两技能，玩家污染3→9、三击6→18，5挡实损13，原线整战未知。\n\n源测试：tsc0/vitest0，{M["source_tests"]["files"]}文件/{M["source_tests"]["cases"]}例；合后：tsc0/vitest0，{M["live_tests"]["files"]}文件/{M["live_tests"]["cases"]}例，首轮通过，无失败重跑。固定排除入口不变；完整沙箱外套件交调度器。刷新{M.get("refresh_commit")}及合前{M["base"]}，知识重叠0、其余知识blob保持；仅decision-log追加历史并集，双方有序原文全部保留。\n\n账本仅CLI/by=learner:experience-update登记proposed：'+','.join(L['proposed'])+'；新增/退役无，最终check0。请运维确认上述实际发布后仅经learner/ledger.py将这13项登记shipped/S1.exp59，不另设审核；学习者未写accepted/shipped，首证/prior/claim/旧version/repeat保持。加湿器0204沿既有复盘条目，无重复add。\n\n主目录paper/materials/experience-changelog-silent.md仅追加第59节，ledger.jsonl仅CLI追加，由调用方提交；其他主目录文件未改。完整抽取/统计/机制/切片及测试原件保存在本目录，source-staged.patch/release.patch/相关记录gitleaks0。调用器在读取最终回报后发送experience-done通知运维；不推送、不停对局、不运行play。\n')
(O/'handoff-ops.md').write_text(handoff)
report=dict(task='experience-update',version='2026-10-07.5',commit=source,merged=M['merged'],added=1,updated=11,retired=0,active=130,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=M['source_tests']['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for name in ['handoff-ops.md','report.json']:
    with (O/('gitleaks-'+name+'.log')).open('w') as h:
        subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
subprocess.run(['git','-C',str(ROOT/'.worktrees/exp'),'diff','--check'],check=True)
assert not subprocess.check_output(['git','-C',str(ROOT/'.worktrees/exp'),'status','--porcelain'],text=True).strip()
subprocess.run(['git','-C',str(ROOT/'.worktrees/live'),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
print('最终账本校验0；变更记录只追加，运维交接及回报已保存；源工作树干净。')
print(json.dumps(report,ensure_ascii=False))
