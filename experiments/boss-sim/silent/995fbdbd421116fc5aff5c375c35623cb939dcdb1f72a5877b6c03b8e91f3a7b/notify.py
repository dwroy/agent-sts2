"""Append the authorized actual-release notice without replacing parallel inbox records."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess

HERE=Path(__file__).resolve().parent
PROJECT=Path('/home/dw/Projects/agent-sts2')
state=json.loads((HERE/'publication.json').read_text())
summary=json.loads((HERE/'summary.json').read_text())
previous=json.loads((HERE/'previous-trust.json').read_text())
trust=json.loads((HERE/'candidate-boss-trust.json').read_text())
ledger=(HERE/'ledger-id.txt').read_text().strip()
assert state['sandbox_exit']==0 and state['publication'] and not state.get('rolled_back')
assert not (HERE/'notification.json').exists()
assert subprocess.run(['git','-C',str(PROJECT/'.worktrees/live'),'merge-base','--is-ancestor',state['source'],state['publication']]).returncode==0
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
(HERE/'notification-date.log').write_text(stamp+'\n')
changes=[]
for use,start in (('b2','t1'),('b3','pre')):
    for boss in trust['bosses']:
        old=boss in previous['trusted_'+use]
        new=boss in trust['trusted_'+use]
        if old!=new:
            a,b=previous['bosses'][boss][start],trust['bosses'][boss][start]
            changes.append(f'{boss}/{use}: 旧可信{old}、n{a["n"]}、打穿比{a["leak_ratio"]}；新可信{new}、n{b["n"]}、Brier{b["brier"]}、预测/实际{b["mean_pred"]}/{b["actual_win"]}、打穿比{b["leak_ratio"]}、失败指标{b["failed"]}')
f49=summary['f49']
text=(f'\n- {stamp} Codex学习者 / {HERE.name}：Roy已授权新功能静默boss校准刷新实际合live {state["merged"]}，'
    f'发布{state["publication"]}/tree{state["publication_tree"]}，专题{state["version"]}（正式release_id交ops核号），源{state["source"]}，账本{ledger}仅proposed。'
    f'旧规则/数据：冻结107调参/{previous["split"]["val_n"]}验证；新规则/数据：107调参/{summary["val"]}验证，新增{summary["new"]}个实际结局/{summary["new_runs"]}局，'
    f'327完局/1425次尝试，切点、整体Platt、冻结模型、原四项门槛保持。可信变化{summary["changes"]}；'
    +('逐项变化及限定反证须沿ops→watcher→Roy告知：'+'；'.join(changes)+'。' if changes else 'B2/B3名单保持，只更新本批验证与低可信原因数值。')
    +f'证据局/层/尝试/回合及SL口径完整见paper/materials/silent/boss-sim-calibration.md、experiments/boss-sim/silent/{summary["artifact"]}；'
    f'初始JH49PP3EYJH8六事件索引滞后已在原冻结runs/SL快照内恢复，原587场/逐回合输入核同，初始缺帧记录保留。'
    f'A10残差B2/B3={summary["a10"]["t1"]["gap"]}/{summary["a10"]["pre"]["gap"]}；F49独立n{f49["t1"]["n"]}，'
    f'Brier{f49["t1"]["brier"]}/{f49["pre"]["brier"]}，继续低可信；F48胜不当整局通关。'
    '预期影响：现有B2/B3消费者读取新验证表；候选及live各28项读回，不声称自然采用或收益。费用/药水/保血/目标/SL策略阈值与铁甲数据不改。'
    '本批验证冻结模型，不声称当前生产模型全部变化已重校准。两个main新增Node子进程包装受EPERM限制，原Python夹具直接0、标准尝试保留；源和live可执行集合tsc/Vitest0，完整无排除外检交原调度器。'
    f'回退：持live锁仅将knowledge/characters/silent/boss-trust.json恢复到合前{state["before_code"]}，保留归档及其他刷新，自测后另记回退版本。'
    'shipped/统一编号由ops核实；本次仅双收件箱追加并读回，不代填watcher/Roy接收ACK，不关闭宽父要求。\n')
receipts=[]
for name in ('notes/for-roy.md','ops/inbox-dev.md'):
    path=PROJECT/name
    with path.open('a+b',buffering=0) as handle:
        fcntl.flock(handle,fcntl.LOCK_EX)
        handle.seek(0,2)
        raw=text.encode()
        assert os.write(handle.fileno(),raw)==len(raw)
        off=os.lseek(handle.fileno(),0,os.SEEK_CUR)-len(raw)
        assert os.pread(handle.fileno(),len(raw),off)==raw
        receipts.append({'path':str(path),'offset':off,'length':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'status':'appended'})
(HERE/'notification.json').write_text(json.dumps({'date':stamp,'receipts':receipts,'scope':'Actual inbox append/readback only; no watcher or Roy ACK.'},ensure_ascii=False,indent=1)+'\n')
print(json.dumps({'inboxes_appended':len(receipts),'ledger':ledger}))
