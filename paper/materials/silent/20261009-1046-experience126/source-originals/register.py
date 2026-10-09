import collections
import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))
M=json.load(open(O/'ledger-map.json'))
R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
N='NTMAU4XZ2NN2'
rows=json.load(open(O/'registration-cli.json')) if (O/'registration-cli.json').exists() else []
known=json.load(open(O/'ledger-matches.json'))+json.load(open(O/'ledger-poison.json'))+json.load(open(O/'ledger-stab.json'))+[json.load(open(O/'ledger-rest.json')),json.load(open(O/'ledger-deck.json'))]
known={x['id']:x for x in known}

def cli(args,data):
    p=subprocess.run(['python3',str(ROOT/'learner'/args[0]),*args[1:]],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    rows.append({'命令':args,'数据':data,'stdout':p.stdout,'stderr':p.stderr,'退出码':p.returncode})
    (O/'registration-cli.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()

for ident in dict.fromkeys(i for ids in M.values() for i in ids):
    if any(x['命令']==['ledger.py','update'] and x['数据']['id']==ident and x['退出码']==0 for x in rows):
        continue
    linked=[c for c in C if ident in M[c['id']]]
    data={'id':ident,'by':'learner:experience-update','where':{'experience':[c['id'] for c in linked]},'note':'第126批证据/提案预关联；状态、首证、prior、claim及旧版本保持，提交后登记proposed。'}
    if not any(x['run']==N for x in known[ident]['evidence']):
        data['evidence']=[{'run':N,'floor':14,'role':'support','note':'本批原字节与状态核验；'+ '；'.join(c['after']['lesson'] for c in linked)}]
    cli(['ledger.py','update'],data)

groups={
    'resources':['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation'],
    'mechanisms':[c['id'] for c in C if c['id'] not in ['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation']]
}
plans={
    'resources':('路线实到血量与生成护栏取舍验收','当前护栏用8血容差替换；本题预计损12→2、节点伤0→10，原线取消生成3小刀，替换线实损2扣10。候选行为：固定回放将生成/抽弃节点后的重规划与完整轮血价分列，路线投影显式核上一场获胜消耗及营火补量。F11投影F14为63/p75为58，F12实际66后F13损23，实43；旧线42未实走。不能由投影差改8血阈值、路线门槛、药水持有值或断言原线能赢。'),
    'mechanisms':('覆甲延迟挡及感染毒攻击按实帧核终局','当前实现已有力量/覆甲/延迟挡/感染/毒预算；F14T10 least-loss -7表示hpAfter，8-(9+11-5)=-7，非新漏算bug。候选行为：以本角色固定状态核同招力量0/2/4→7/9/11、覆甲4/3/2/1消失、附魔环即时7及两轮各7、感染3×张先耗挡再结毒取消已死敌攻击，仍计幸存虫11。F14T9 6+9-8=7；T10毒结束1血虫而另虫8→4，残22/4并实死。只在发现可复现实现差异时修机制/终局，不从已持有未施放卡预支未来格挡，不定提前毒或固定目标顺序。')
}
proposals=[]
for name,ids in groups.items():
    ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]))
    title,body=plans[name]
    lines=['# '+title,'','角色silent；直接证据A10，历史证据分阶见下表。来源任务experience-update，实现任务strategy-proposal；账本'+','.join(ledger)+'。','',body,'','## 证据与反例','','| 条目 | 支持/反例及进阶 | 已核案例 |','| --- | --- | --- |']
    for c in C:
        if c['id'] not in ids:continue
        e=c['after']
        lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}，{dict(collections.Counter(R[r]["ascension"] for r in e["evidence"]))} | {e["lesson"]} |')
    lines+=['','完整支持/反例12位局号见changes.json；原帧与原字节核验见verification.json，分阶统计见audit.json、baseline-check.json、mechanism-evidence.json。战斗失败不是机制反例。','', '## 拟合、验证、缺数据','', '不拟合无受控对照的药价、阈值或胜率。按时间将旧162局用于原实现核对、新局验收；固定回放逐层逐轮核状态/动作及生成重问，不跑play或boss模拟池。机制支持按局，具体参数按实打动作分母，不能用159个泛属性主题局冒充每条公式159次独立隔离。缺完整运行dirty源码、原护栏线/早施毒/留药/改线另一方案整场实打、永久敌ID与末击毛伤；若当前live祖先已有实现按源码登记duplicate，证据不足waiting保持原行为。','', '## 预期影响与回退','', '预期减少把投影、未施放能力、未兑现毒或生成节点输出当实到资源，不承诺胜率改善。不改铁甲战士及未观察等级。若独立任务改源码，跑固定自测与原沙箱、gitleaks、live预检；回退revert实际源码提交，本次经验可恢复experience-before.json。Roy-2026-10-07-learning仅提供规则授权，不提供游戏事实；本提案未实现，不登记implemented或shipped。']
    path=O/f'proposal-{name}.md'
    path.write_text('\n'.join(lines)+'\n')
    item={'character':'silent','ledger':ledger,'runs':[N],'source_task':'experience-update','target_task':'strategy-proposal','domains':['combat','potion','terminal'] if name=='resources' else ['combat','terminal'],'summary':title+'；先核现有实现，缺整场对照保持规则','proposal':str(path),'experience':ids,'rule_changes':False,'authorization':'Roy-2026-10-07-learning'}
    (O/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
    pid=cli(['code_proposals.py','add','--character','silent'],item)
    assert pid.startswith('silent-proposal-'),pid
    proposals.append(pid)
    print(pid)
(O/'code-proposals-results.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n')
