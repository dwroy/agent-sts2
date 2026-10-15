"""Append the explicitly authorized post-publication counterevidence notice to both inboxes."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT/'.worktrees/live'
state = json.loads((HERE/'publication.json').read_text())
assert state['sandbox_exit'] == 0 and state['publication'] and not state.get('rolled_back')
assert not (HERE/'notification.json').exists(),'never duplicate inbox delivery'
source = (HERE/'source-commit.txt').read_text().strip()
assert subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',source,state['publication']]).returncode == 0
stamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
(HERE/'notification-date.log').write_text(stamp+'\n')
ledger = (HERE/'ledger-id.txt').read_text().strip()
text = (f'\n- {stamp} Codex学习者 / {HERE.name}：Roy已授权新功能静默boss校准定期刷新已实际合live '
        f'{state["merged"]}，发布{state["publication"]}/tree{state["publication_tree"]}，'
        f'专题{state["version"]}（统一release_id由ops核实际提交分配），源{source}，账本{ledger}仅proposed。'
        '限定反证须沿ops→watcher→Roy告知：旧规则/统计为无厌沙虫B2 n43、打穿比1.296，按原四指标可信；'
        '新规则/统计为n44、Brier0.1271≤整体0.1108×1.25、胜率差达标，但打穿比1.316超过原1.3上限，自动移出B2可信。'
        '原107调参keys、切点、模型、Platt和准入门槛保持。B2可信7→6，B3仍6；无厌沙虫B3因Brier/打穿比继续低可信。'
        '新增该boss证据VNSXWCWXR3VW F33尝试1 T1–7实际胜，完整22新实际结局（16胜6死）仅扩验证438→460；'
        '旧silent-0484的43场已发布历史/claim/首证/先验/状态/版本均保留，仅CLI追加contradict证据，新发现独立登记。'
        '预期影响：既有B2消费者读取该boss低可信标记；源与实际live各28项数据读取通过，不声称自然采用或胜率收益。'
        'A10整体胜率残差B2/B3为+3.5/+3.9个百分点、打穿比1.313/1.329；F49验证n29、数量缺0，'
        'Brier0.1862/0.1663、胜率差+30.0/+25.6个百分点、打穿比2.681/2.774，继续低可信。'
        '完整证据/模型版本/旧报告/失败及中断历史见paper/materials/silent/boss-sim-calibration.md、'
        f'本批scratch/report.md和experiments/boss-sim/silent/ae0da4720d7ec28643a6cb9367bc6c2bc30cc8ee4c476f2e05d6f7bbc84f17c6。'
        '本表仅验证所列冻结模型，当前生产模型与其差异未重新校准。费用/药水/保血/目标/SL阈值及铁甲/其他角色保持。'
        f'回退：持live锁仅将knowledge/characters/silent/boss-trust.json恢复到合前{state["before_code"]}，'
        '保留归档与其他刷新，自测后另记回退版本。正式shipped/统一编号和完整外部检查交原ops/调度器；'
        '这是两收件箱追加回执，watcher接收及Roy已知/ACK待其本人确认，不代填。\n')
receipts = []
for name in ('notes/for-roy.md','ops/inbox-dev.md'):
    path = PROJECT/name
    with path.open('a+b',buffering=0) as handle:
        fcntl.flock(handle,fcntl.LOCK_EX)
        handle.seek(0,2)
        raw = text.encode()
        assert os.write(handle.fileno(),raw) == len(raw)
        offset = os.lseek(handle.fileno(),0,os.SEEK_CUR)-len(raw)
        assert os.pread(handle.fileno(),len(raw),offset) == raw
        receipts.append({'path':str(path),'offset':offset,'length':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'status':'appended'})
(HERE/'notification.json').write_text(json.dumps({'date':stamp,'receipts':receipts,
    'scope':'Both authorized inbox append operations read back; watcher/Roy receipt and ACK not claimed.'},ensure_ascii=False,indent=1)+'\n')
print(json.dumps({'inboxes_appended':len(receipts),'ledger':ledger},ensure_ascii=False))
