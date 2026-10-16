"""Report observed calibration, checks and actual deployment without inferring delivery."""
import json
import re
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')
def read(name):
    return json.loads((HERE/name).read_text())
summary,tests,table=map(read,('summary.json','tests-summary.json','boss-trust-table.json'))
state=read('publication.json')
source=(HERE/'source-commit.txt').read_text().strip()
ledger=(HERE/'ledger-id.txt').read_text().strip()
deployment=read('deployment-readback.json') if (HERE/'deployment-readback.json').exists() else None
scans={label:int((HERE/(label+'-gitleaks.exit')).read_text().strip()) if (HERE/(label+'-gitleaks.exit')).exists() else None for label in ('merge-main','source','refresh','merge','publication')}
assert all(v in (0,None) for v in scans.values())
merged=state.get('merged') if not state.get('rolled_back') else None
log=(HERE/'live-sandbox.log').read_text() if (HERE/'live-sandbox.log').exists() else ''
live_checks={'tsc':0 if state.get('sandbox_exit')==0 else None,'vitest':state.get('sandbox_exit'),
    'files':sum(map(int,re.findall(r'Test Files\s+(\d+) passed',log))),
    'cases':sum(map(int,re.findall(r'Tests\s+(\d+) passed',log))),
    'additional_cli_exclusions':tests['additional_cli_exclusions']}
f49=summary['f49']
lines=[f'# {HERE.name}','','Roy已授权新功能静默boss模拟校准的定期刷新；fix-batch是调度通道。','',
    f'数据来源提交：{source}；实际live合入：{merged}；发布：{state.get("publication")}；固定发布树：{state.get("publication_tree")}。',
    f'专题版本：{state.get("version")}；统一release_id由ops核实际提交分配。账本{ledger}仅由学习者登记proposed及出处，shipped由ops确认。','',
    f'冻结{summary["finished_runs"]}个结束SILENT局/{summary["attempts"]}次boss尝试/{summary["usable"]}场可用；新增{summary["new"]}场/{summary["new_runs"]}局，结局{summary["new_outcomes"]}。固定107调参、验证460→{summary["val"]}，切点与调参keys/Platt/进阶项选择不移动。',
    '模型7e1193cef9467416bc10c8e344a49f4fd98390c7，209个仓库输入逐SHA与提交一致，外部game-data另核SHA；200样本/起点、seed=1+原全量行号×101。新增只扩验证，4个历史对照起点除耗时完全相同。',
    '初始索引缺JH49PP3EYJH8六事件；live常规索引追上后只在原冻结runs/SL字节内恢复6尝试/1实际结局，原587场和逐回合输入核同。初始缺帧资料和恢复凭据均保留，未写原日志或DB。',
    f'B2/B3 Brier={summary["b2"]["brier"]}/{summary["b3"]["brier"]}；A10残差={summary["a10"]["t1"]["gap"]}/{summary["a10"]["pre"]["gap"]}，打穿比={summary["a10"]["t1"]["leak_ratio"]}/{summary["a10"]["pre"]["leak_ratio"]}。',
    'A0–4和A5–9独立验证各0、各缺10场；只保留其调参残差。F48战胜不等于整局通关；F49独立四项准入，未估计连战联合胜率。',
    f'名单变化{summary["changes"]}；数量门槛保持10，所有boss均同时检查Brier、胜率差和打穿比。','',
    '| boss | B2 n/不足/失败指标 | B3 n/不足/失败指标 | B2/B3可信 |','|---|---|---|---|']
for boss,entry in sorted(table.items()):
    a,b=entry['b2'],entry['b3']
    lines.append(f'| {boss} | {a["n"]}/{a["missing"]}/{",".join(a["failed"]) or "无"} | {b["n"]}/{b["missing"]}/{",".join(b["failed"]) or "无"} | {a["trusted"]}/{b["trusted"]} |')
lines += ['',f'F49验证n={f49["t1"]["n"]}，数量缺口{max(0,10-f49["t1"]["n"])}；Brier={f49["t1"]["brier"]}/{f49["pre"]["brier"]}，预测/实际={f49["t1"]["mean_pred"]}/{f49["t1"]["actual_win"]}、{f49["pre"]["mean_pred"]}/{f49["pre"]["actual_win"]}，打穿比={f49["t1"]["leak"]["enemy_ratio"]}/{f49["pre"]["leak"]["enemy_ratio"]}；继续低可信。','',
    f'前置完整main可执行集合={tests["main_full_unchanged_code"]}；数据刷新后定向夹具tsc/Vitest0，{tests["files"]}文件/{tests["cases"]}项；live检查{live_checks}。Python校准12、自动化57、派发48和候选/live消费者各28项。',
    '标准入口两次中断130：先发现旧历史副本65个缺引用，SHA保全1096项后恢复环境；再发现main新增Node子进程包装EPERM。最终使用原脚本，仅在命令行排除global-build-health/global-build-funnel两个包装，对应原Python固定夹具直接执行0且stdout为空。原固定排除名单、源码、测试断言与时限未改。标准130/包装EPERM不报通过；完整无排除检查由原调度器在沙箱外补跑。',
    '默认刷新入口在提取阶段中断130以保留固定模型；增量重放保存29起点后串行续算。原日志、指纹、初稿及索引缺帧历史保留。',
    f'部署读回：{deployment}；gitleaks：{scans}。',
    '本表只验证冻结模型；当前生产与其不同的源码/知识未重新校准，不声称自然采用或胜率收益。费用、药水、保血、目标、SL阈值及铁甲数据保持。',
    f'定期入口agent/tools/boss-sim/refresh-silent.py，升阶或20个新实际boss结局触发；每小时:13/:43及学习完成事件检查。固定模型恢复入口restore-model.py；完整复现参数refresh-command.json。新指纹{summary["artifact"]}，旧目录不覆盖；重复档案及阈值不足跳过，不派子进程且输出字节不变。',
    'Roy提供隔离、模型复用、整体Platt、切分、准入门槛和刷新架构；样本、残差和可信结论来自结束SILENT日志。',
    '报告paper/materials/silent/boss-sim-calibration.md；归档experiments/boss-sim/silent/'+summary['artifact']+'。',
    f'发布阻塞/回退：{state.get("blocked") or state.get("rolled_back") or "无"}。双通知实际追加/读回见notification.json，不代填watcher/Roy ACK。',
    'code_proposals=[]，implementation_domains=[]；不关闭学习宽父、自然消费者或收益验收。','']
(HERE/'report.md').write_text('\n'.join(lines))
out={'task':'fix-batch','base':(HERE/'original-base.txt').read_text().strip(),
    'fixes':[{'item':'Roy 已授权新功能：静默 boss 模拟校准','commit':source,'nature':'授权新功能的定期数据校准刷新',
        'test':'原test-sandbox脚本及明确的沙箱限制；固定Python夹具；实际B2/B3数据消费者',
        'fails_without_fix':False,'fails_without_fix_note':'本批为新功能数据刷新，无bug撤码对照；旧表不含本批新增验证。','ledger':[ledger]}],
    'skipped':[{'item':'SL predicted_death','count':summary['censored'],'reason':'截断样本保留来源，不计入实际胜负拟合'},
        {'item':'A0–4/A5–9独立验证','missing_each':10,'reason':'固定切分下独立验证均0，保留调参残差'}],
    'merged':merged,'publication':state.get('publication'),'fixed_release_tree':state.get('publication_tree'),
    'tested_live_tree':state.get('tested_tree'),'version':state.get('version'),'release_id':None,'release_id_status':'ops核实际提交后统一分配',
    'tests':{**tests,'live':live_checks,'external_full':'pending original scheduler'},
    'code_proposals':[],'implementation_domains':[],'boss_trust':table,'a10_residuals':summary['a10'],'f49':f49,
    'refresh':{'entry':'agent/tools/boss-sim/refresh-silent.py','trigger':'升阶或20次新实际结局；每小时:13/:43及完成事件',
        'new_validation_fights':summary['new'],'tune':summary['tune'],'val':summary['val'],'artifact':summary['artifact']},
    'commits':{'main_merge':(HERE/'main-merge-commit.txt').read_text().strip(),'source':source,
        **{k:state.get(k) for k in ('initial_live','refresh_commit','before_code','merged','publication')}},
    'ledger':[ledger],'deployment_readback':deployment,'gitleaks':scans,
    'blocked':state.get('blocked') or state.get('rolled_back'),
    'calibration_report':'paper/materials/silent/boss-sim-calibration.md','report':str(HERE/'report.md'),
    'calibration_method_commit':'7e1193cef9467416bc10c8e344a49f4fd98390c7','current_production_model_recalibrated':False,
    'notification':read('notification.json') if (HERE/'notification.json').exists() else None}
(HERE/'report.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'source':source,'merged':merged,'publication':state.get('publication'),'report':str(HERE/'report.md')}))
