import hashlib, json, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp';LIVE=ROOT/'.worktrees/live'
M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'))
assert M['merged'] and M['test_rc']==0 and M['eval_version']=='S1.exp61'
assert (O/'test-source.rc').read_text().strip()=='0'
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True)
(O/'ledger-check-final.log').write_text(p.stdout+p.stderr);assert p.returncode==0
experience='knowledge/characters/silent/experience.json'
assert (EXP/experience).read_bytes()==(LIVE/experience).read_bytes()
assert not subprocess.check_output(['git','-C',str(EXP),'status','--porcelain'],text=True).strip()
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['merged'],'HEAD'],check=True)
record=ROOT/'paper/materials/experience-changelog-silent.md';before=json.load(open(O/'changelog-before.json'))
assert hashlib.sha256(record.read_bytes()[:before['bytes']]).hexdigest()==before['sha256']
versions=json.load(open(LIVE/'eval/versions.json'));assert len([v for v in versions['versions'] if v['name']=='S1.exp61' and v['commit']==M['merged']])==1
mechanisms=['灵体玩家无实体','步法逐牌敏捷','力量与虚弱','脆弱逐牌取整','疑虑持牌虚弱','萎靡与独立成长','雕刻师仪式增长','华丽收场空堆条件','铜质鳞片逐击反伤','南瓜蜡烛充能能量','巨兽本体与爆炸','知识恶魔回血与SL观察','能力实际支付与保护窗口观察']
handoff=(f'静默第61节完成，请据experience-done确认实际合入后登记上线。\n\n源提交：{M["source_commit"]}（exp-silent），实际live合入：{M["merged"]}，上线登记：{M["release_commit"]}，eval：S1.exp61。经验2026-10-07.6→2026-10-07.7；新增1/更新14均补证/只数字0/退役0，active131→132、50163→48258字，高63中40低29；A8 125条45151字/A9 126条45450字/A10 127条46030字。证据8R5CXD5C8PW8 SILENT A10/F35及04:55:17有效勘误、本角色历史；旧74局七数组及血档/源节点/回血/SL逐行重算一致，75局1177房65实死。\n\n新增灵体机制沿已登记silent-0206，首证本局/A10/prior=unknown保持；1费/无实体1/消耗，15/24攻击变1，5挡全挡与零挡损1分别核，保护不停止仪式。雕刻师萎靡+X3各4使18→14力、33→21攻，随后仍增长23/32/41；未建步法/群蛇不预支。末脆弱三牌19→13挡/虚弱直伤16→11，6血13挡对42需损29、差23，实际归零只扣6，12毒另3荆棘使敌44→29。首COMBAT在小血瓶前，统计净损60/操作损62；三虫统计26/操作28，口径未改。\n\n知识恶魔重打T6收场+空堆实75、304→229，本轮净扣92/损12，T14毒收12敌血、余20赢；雕刻师T3非空不可打/贡献0。两试初31抽序同、到手轮/防御/后续动作不同，不单归收场转胜。巨兽两试初序26/25不同，T8均清本体；首T10的41爆炸对24血14挡差3未结束，重打T9的28对13挡损15余17过关。本局两场4试2赢，历史真重打71场311试24赢/A10 38场170试12赢。\n\nHP护栏两次局部预计合省23血/少26当轮伤、延后施毒，原线整战未知；三回血共63、缩放仪另25/22，F34新路线未来火与商店未达，首走廊高血死；不新增喝药规则/确认老错repeat/确定纯bug。无手写知识/源码/生成器/其他角色改动，不重建。\n\n源及合后固定沙箱首轮tsc0/vitest0，均214文件2289例，无失败/超时重跑；固定排除入口保持，完整沙箱外套件交调度器。240配对切片增量中位−100字、最大5351→5075字。刷新'+str(M.get('refresh_commit'))+f'、合前{M["base"]}，知识重叠/冲突0、其他知识blob保持。\n\n账本仅CLI/by=learner:experience-update改proposed：'+','.join(L['proposed'])+'，新增/退役无，最终check0。请运维确认实际发布后仅经learner/ledger.py将这18项登记shipped/S1.exp61，first_run/prior/claim/旧version/repeat保持，不另设审核；学习者未写accepted/shipped。\n\n主目录experience-changelog-silent.md仅追加第61节，ledger.jsonl仅CLI追加，由调用方提交，未提交主检出。原片段/旧基线/机制/SL/切片/自测/gitleaks/初稿更正原件保留本目录；调用器读取最终JSON后发experience-done通知运维。不推送、不停对局、不运行play。\n')
(O/'handoff-ops.md').write_text(handoff)
report=dict(task='experience-update',version=C['version'],commit=M['source_commit'],merged=M['merged'],added=1,updated=14,retired=0,active=132,mechanisms=mechanisms,tests=dict(tsc=0,vitest=0,cases=M['source_tests']['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for name in ['handoff-ops.md','report.json','changelog-section.md']:
    with (O/('gitleaks-'+name+'.log')).open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('源工作区干净、经验源/live一致、实际合入及唯一eval版本核对、账本最终check0、变更记录旧文逐字保持；运维交接与最终JSON落盘')
print(json.dumps(report,ensure_ascii=False))
