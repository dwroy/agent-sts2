import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))
mapping=json.load(open(O/'ledger-map.json'))
L={r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
rows={}
for c in C['entries']:
 for lid in mapping[c['id']]:
  r=rows.setdefault(lid,dict(id=lid,by='learner:experience-update',where={'experience':[]},evidence=[],
                            note='第89批经验提案预关联；保留原claim、首证、prior、repeat与旧上线历史，机制局部收益和整战因果分开。'))
  r['where']['experience'].append(c['id'])
  known={e['run'] for e in L[lid]['evidence']}|{e['run'] for e in r['evidence']}
  for run in c['new_runs']:
   if run not in known:
    r['evidence'].append(dict(run=run,role='support',note='本批已核原日志及复盘/勘误，支持'+c['id']+'；逐层/回合见facts.json及changes.json对应典型案例，不冒认整战胜因。'))
rows['silent-0125']=dict(id='silent-0125',by='learner:experience-update',where={'experience':['silent-deck-burst-observation']},
                          note='仅关联MTQ0 F11T1省8血、多2候选即时伤但未建立4毒的护栏观察；复盘已补本局support，不追加其他构筑局为护栏证据。保留原首证/prior/claim与上线历史。')
for r in rows.values():
 if not r.get('evidence'):r.pop('evidence',None)
payload=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows.values())
(O/'ledger-prelink-input.jsonl').write_text(payload)
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
(O/'ledger-prelink.log').write_text(q.stdout+q.stderr);q.check_returncode()
resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal']
sl=['silent-myte-toxic-block-sl-observation','silent-decimillipede-reattach-poison','silent-ceremonial-beast-threshold-growth-sl','silent-deck-burst-observation']
mechanisms=[c['id'] for c in C['entries'] if c['id'] not in resources+sl]
common='''角色：silent；新观察仅A10，基础公式按关联经验的已观察历史进阶，未观察组合和其他角色保持等价。
来源：experience-update/20261008-053105-experience-update，第89批，版本2026-10-08.6；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据：7X0W3U8TVA2A F31T1/T2/T5/T6/T11/T13；MTQ0EUBJ3R6T F11T1、F17T4-T8、F20T3、F23四试T2-T5。复盘和05:28勘误只读，869条决策/901帧状态/54条实际Codex脑回答；DeepSeek窗内0。runs角色逐局核SILENT。facts.json、sl-t3-comparison.json、机制全史窗口、原字节偏移、changes.json和旧版保留本scratch。
方法/切分：旧116静默完局按上一批口径重新逐局核、七数组/全部血档/节点转移/实回复/SL逐行一致；新两局作为后续观察，共118完局。支持/反例局号、按进阶分母见mechanism-evidence.json，替打法失败不当基础机制反例；同盘SL后续动作亦变化，不把局部收益当整战因果。
旧行为/待核：知识已记录部分机制，但不能据条目假定代码已完整消费；原运行均dirty、完整源码未知，只以实际日志和固定状态定位。先核当前live等价处理和真实祖先；已有实现给duplicate及真实commit，证据不足waiting。
限制：毛伤事件账、原护栏线/其他路线/留药或提前建立磨蚀的完整反事实、未知抽牌和dirty原树未记录；不填预训练机制，不制定未经验证的安全血线或喝药门槛。
验证/回退：只用本批固定原帧做最小回放，关键输出须与实际HP/挡/毒/接续/能力时点一致；无关角色/未观察进阶做等价控制。按仓库原沙箱入口tsc+vitest，自测后锁内上线；独立源码commit单独回退，经验数据可恢复本批before。实际上线再按授权双通知Roy，不冒报本提案已implemented/shipped。
'''
groups=[('mechanisms',mechanisms,['combat','potion'],'逐牌敏捷、临时减力、持牌伤和已建立能力的时间边界',
'''拟议行为：只在已核边界上检验并补齐逐牌格挡、临时敏捷/力量撤回、磨蚀反伤、迷雾施毒以及昏眩单牌限制。MTQ0 F23T3两毒素10与实际攻击17合需27挡；速度+5由两防御/妙计兑现29，少防御仅19损8。7X0 F31T2步法+不追补旧7挡、T1臂甲首张16与后继弃牌分开，蛇咬和头骨施毒不当即时本体伤。药水只认实饮/临时层，基础毒药水与头骨贡献未隔离，不设留药权重。本经验任务未修改源码；纯bug0268/0273沿复盘原提案处理，不把修复文字下发给大脑。
'''),
('sl',sl,['combat','potion','sl','terminal'],'同抽重打饱和死亡率与持续敌血池的终局价值审计',
'''拟议行为：独立任务先核SL替线的实际格挡、持牌伤和当轮严格存活；两候选均24/24死亡时，不能仅由“未更常死亡”认更安全。MTQ0 F23末T3代码插打击删防御，损0→8、净扣13→19且未击杀；末T5才实死，前三T6判死截断不补未执行毒/攻击。以实际HP/持牌伤/能否当前终结核终局比较；缺完整胜线，不能禁止一切探索或声称原线能赢。7X0 F31暂死段重接要保留身份/进度：初150+已发生175、实扣278后残47，不能以局部活段清零当整战终结；模型入口修复0268/0273由原代码提案承担。仪式兽阈值及清状态只按现场160/实毒核，不推内部瞬间。未校准模拟不替代原必死边界，未观察随机抽牌保持未知。
'''),
('resources',resources,['structure'],'连续赢战、已到回复与下一房入口分源记录',
'''拟议行为：核路线/休息事实入口是否保留实际赢战消耗、当前最大HP与已到节点，不把未抵达F24营火当F23已有血量。MTQ0 F19入59→46、F20入46→8，开场各补2另账；幕间19→59补40、休息57、开场14及SL恢复27不同来源。7X0休息补61、幕间28→61补33、F30胜耗3后67血进精英失败。跨幕同上限⌊缺失HP×80%⌋只在已核A9/A10用于记录/校核；低阶/其他先古不外推。不从两路线的非随机选择拟合因果或更改安全阈值，若现有事实链等价则duplicate，否则在独立实现中补事实来源并保留旧决策逻辑。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
 lids=sorted({lid for eid in eids for lid in mapping[eid]})
 if name=='sl':lids.append('silent-0125')
 path=O/f'proposal-{name}.md'
 path.write_text('# 静默猎手第89批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
 row=dict(character='silent',ledger=lids,runs=['7X0W3U8TVA2A','MTQ0EUBJ3R6T'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
 (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
 q=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True)
 (O/f'proposal-{name}-cli.log').write_text(q.stdout+q.stderr);q.check_returncode()
 pid=q.stdout.strip();assert pid.startswith('silent-proposal-'),pid
 ids.append(pid);print(name,pid)
(O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-ids.json').write_text(json.dumps(sorted(rows),ensure_ascii=False,indent=2)+'\n')
