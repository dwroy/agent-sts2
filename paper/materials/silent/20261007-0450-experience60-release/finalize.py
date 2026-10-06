import hashlib
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent
ROOT=Path('/home/dw/Projects/agent-sts2')
E=ROOT/'.worktrees/exp'
LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'))
C=json.load(open(O/'changes.json'))
L=json.load(open(O/'ledger-result.json'))
S=json.load(open(O/'slice-summary.json'))
assert M['test_rc']==0 and M['eval_version']=='S1.exp60'
assert (O/'live-flow.rc').read_text().strip()=='0'
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check-final.log').write_text(p.stdout+p.stderr)
assert p.returncode==0
exp='knowledge/characters/silent/experience.json'
assert (E/exp).read_bytes()==(LIVE/exp).read_bytes()
assert not subprocess.check_output(['git','-C',str(E),'status','--porcelain'],text=True).strip()
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
entries=json.load(open(E/exp))['entries']
assert sum(len(e['lesson']) for e in entries if e['status']=='active')==C['chars']
record=ROOT/'paper/materials/experience-changelog-silent.md'
before=json.load(open(O/'changelog-before.json'))
assert hashlib.sha256(record.read_bytes()[:before['bytes']]).hexdigest()==before['sha256']
source=M['source_commit']
mechanisms=['步法逐牌敏捷','力量/虚弱/敏捷','毒雾未来轮初','触媒逐次毒','尖啸临时减力','族母削益与毒','仪式成长','群蛇触发与敌挡','弃牌与当前虚弱观察','能力/输出兑现观察']
handoff=(f'静默经验第60节完成，请据experience-done核实际合入并登记上线。\n\n源：{source}（exp-silent），实际live合入：{M["merged"]}，上线记录：{M["release_commit"]}，eval：S1.exp60。经验2026-10-07.5→2026-10-07.6；新增1、更新11均补证、纯数字0、退役0，active130→131/{C["chars"]}字，高62中40低29；A8 124条46887字/A9 125条47186字/A10 126条47766字。证据TU3XB4CAEDAW,V0383V5S9BCQ SILENT A10及04:23:18勘误、本角色历史；旧72局七数组/血档/节点/回血/SL逐行重算一致，74局1163房64实死。\n\n新增生存者弃中和观察沿复盘已登记silent-0205，首证53FLQ68CETW0 A6/prior=partly保持；两支持零反例、med/[6,20]，没有完整保留线整战胜负。TU仪式9/步法4敏/尖啸36→30、弱后38→33，18挡实损15，T7两触媒32＋30清62；末青蛙群蛇两触发只扣8敌挡、43毒伤后仍118敌血/零挡对28/8血差20死亡。V0雕像首44、全85仍差47，苏醒轮临时减力不抵后续10力/25攻击，末差3血。药水只事实，旧分句逐字保持，无新用药规则。\n\nTU啃咬机两试初序30项及到手轮同，一判死一胜，但触媒数与后续攻/目标同时改变；猎人两试初序31项同、到手轮不同，一判死一胜；青蛙四试0赢且抽序/探索改变，不定单组件转胜。TU问号换线使下火F40→F42，笨拙换节日拉炮未回血，F40死亡；V0已回21仍死精英，boss投影54依赖未到火。均无未选路线/休息的受控因果。\n\n源及合后首轮固定沙箱均tsc0/vitest0、214文件2289例，无失败/超时重跑；固定排除入口未改，完整外部套件交调度器。240配对切片增量中位−52，最大5498→5374字。刷新提交'+str(M.get('refresh_commit'))+f'，合前{M["base"]}，知识不同blob冲突0、其他知识blob保持。无源码/生成器/手写知识/其他角色改动、不重建。临时取数/模板/空切片更正仅离线初稿，原历史留draft-corrections.md和任务转录，不当生产失败。\n\n账本仅CLI/by=learner:experience-update登记proposed：'+','.join(L['proposed'])+'；新增/退役无，最终check0。请运维确认实际发布后仅经learner/ledger.py将这13项登记shipped/S1.exp60，不另设审核；首证/先验/claim/旧version/repeat保持。学习者未标accepted/shipped。\n\n主目录paper/materials/experience-changelog-silent.md仅追加第六十节，ledger.jsonl仅CLI追加，由调用方提交；未提交主检出。抽取/旧基线/机制/SL/切片/自测/敏感信息扫描原件留本目录。调用器读取最终JSON后发experience-done通知运维；不推送、不停对局、不运行play。\n')
(O/'handoff-ops.md').write_text(handoff)
report=dict(task='experience-update',version='2026-10-07.6',commit=source,merged=M['merged'],added=1,updated=11,retired=0,active=131,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=M['source_tests']['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for name in ['handoff-ops.md','report.json']:
    with (O/('gitleaks-'+name+'.log')).open('w') as h:
        subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('账本最终校验0，经验源/live一致、源干净，变更记录旧文逐字保持，运维交接和最终JSON已落盘。')
print(json.dumps(report,ensure_ascii=False))
