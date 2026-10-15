"""Append the explicitly authorized post-publication rule notice to both existing inboxes."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'
state = json.loads((HERE / 'publication.json').read_text())
assert state['sandbox_exit'] == 0 and state['publication']
assert not (HERE / 'notification.json').exists(), 'do not append a duplicate notification'
source = (HERE / 'source-commit.txt').read_text().strip()
assert subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', source, 'HEAD']).returncode == 0
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'notification-date.log').write_text(stamp + '\n')
ledger = (HERE / 'ledger-id.txt').read_text().strip()
text = (f'\n- {stamp} Codex学习者 / {HERE.name}：Roy已授权静默boss校准刷新已实际合live '
    f'{state["merged"]}，固定发布{state["publication"]}/tree{state["publication_tree"]}，'
    f'{state["version"]}（正式release_id交ops核号），源{source}，账本{ledger}仅proposed。'
    '旧规则：无厌沙虫B2验证39场，Brier0.1424超过当时整体1.25倍，保持低可信。'
    '新规则：固定调参/模型/Platt/切点不变，23个新实际结局仅扩验证415→438；'
    '无厌沙虫B2验证43场，Brier0.1299≤0.1401、预测/实际0.699/0.674、打穿比1.296，'
    '按原四指标自动进入可信名单；B2可信6→7，B3仍6、该boss的B3因Brier/打穿比继续低可信。'
    '证据：YUWMCVH6MFUH F33尝试1 T1–10、REEBQHPHSWGK F33尝试2 T1–6、'
    'UPAB38G2PA02 F33尝试1 T1–9、HLAWCGM3KHVB F33尝试1 T1–9均实际胜；'
    '完整23场、原始SHA/版本/SL排除及旧样本见paper/materials/silent/boss-sim-calibration.md和'
    f'本批scratch/report.md。预期影响：既有B2消费者可读取新的可信标志；'
    '固定候选及实际live各28项读取检查通过，不声称新自然对局采用或胜率收益。'
    'F49 n27数量缺0但Brier/胜率差/打穿比均失败，仍低可信；A10整体打穿比1.318/1.332，'
    '不泛化整体可信。费用/药水/保血/目标/SL阈值、铁甲和其他角色保持。'
    f'回退：持live锁只将knowledge/characters/silent/boss-trust.json恢复至合前'
    f'{state["before_code"]}，保留实验归档和其他知识刷新；自测后另记回退版本。'
    '正式shipped/编号及完整外部检查交原ops/调度器；未代填watcher或Roy确认。\n')
receipts = []
for name in ('notes/for-roy.md', 'ops/inbox-dev.md'):
    path = PROJECT / name
    with path.open('a+b', buffering=0) as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.seek(0, 2)
        raw = text.encode()
        assert os.write(handle.fileno(), raw) == len(raw)
        offset = os.lseek(handle.fileno(), 0, os.SEEK_CUR) - len(raw)
        assert os.pread(handle.fileno(), len(raw), offset) == raw
        receipts.append({'path': str(path), 'offset': offset, 'length': len(raw),
                         'sha256': hashlib.sha256(raw).hexdigest(), 'status': 'appended'})
(HERE / 'notification.json').write_text(json.dumps({'date': stamp, 'receipts': receipts,
    'scope': 'Both authorized inbox append operations read back; watcher/Roy read or ACK not claimed.'},
    ensure_ascii=False, indent=1) + '\n')
print(json.dumps({'notified_inboxes': [r['path'] for r in receipts], 'ledger': ledger}, ensure_ascii=False))
