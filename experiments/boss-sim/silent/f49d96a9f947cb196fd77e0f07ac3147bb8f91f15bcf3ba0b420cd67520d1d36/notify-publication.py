"""Append the explicitly authorized post-publication rule notice without overwriting other records."""
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
assert state.get('publication') and state['sandbox_exit'] == 0
assert subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', state['source'], 'HEAD']).returncode == 0
receipt = HERE / 'dual-notification.json'
assert not receipt.exists()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
body = f'\n- {stamp} Codex学习者 / 20261013-161307-silent-boss-calibration 已上线反证通知：Roy授权周期校准，源码数据源{state["source"]}→actual {state["merged"]}，固定发布{state["publication"]}/tree {state["publication_tree"]}；正式release_id交ops核号。旧规则/结果：知识恶魔B3可信，验证34场、打穿比1.297。新规则/结果：新增固定验证后36场、打穿比1.306，超过原1.3上限，故B3退回低可信；数量缺口0仍不能准入。B2仍全部达标，打穿比1.281。四项门槛、107调参keys、Platt、7e1193cef固定模型、费用/药水/保血/目标/SL规则不变。证据WCDTYJKUDS4T A10 F33尝试6 T1–7 died、D9XJAX5KCSU2 A10 F33尝试1 T1–10 won；完整sources/results/逐回合记录在新指纹f49d96a9f947cb196fd77e0f07ac3147bb8f91f15bcf3ba0b420cd67520d1d36；账本{ledger}仅proposed，shipped交ops。预期仅让构筑题知识恶魔B3显示低可信，未声称自然采用/通关改善；F49继续低信度。回退只恢复本次合前silent/boss-trust.json与报告，保留已保存知识刷新、旧报告和新实验历史。请ops沿原完成事件将此反证告知watcher，再向Roy说明；这里只核双收件箱实际追加，不代填watcher/Roy确认。\n'
payload = body.encode()
evidence = []
for name in ('notes/for-roy.md', 'ops/inbox-dev.md'):
    path = PROJECT / name
    before = path.read_bytes()
    descriptor = os.open(path, os.O_WRONLY | os.O_APPEND)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        assert os.write(descriptor, payload) == len(payload)
    finally:
        os.close(descriptor)
    after = path.read_bytes()
    assert after.startswith(before)
    offset = after.index(payload, len(before))
    evidence.append({'path': str(path), 'offset': offset, 'length': len(payload),
                     'sha256': hashlib.sha256(payload).hexdigest(), 'old_prefix_sha256': hashlib.sha256(before).hexdigest()})
(HERE / 'dual-notification.md').write_text(body)
receipt.write_text(json.dumps({'written_at': stamp, 'source': state['source'], 'ledger': ledger,
                  'actual_append_evidence': evidence, 'watcher_received': False, 'roy_notified': False,
                  'scope': 'Actual dual append only; ops forwarding and downstream role confirmations remain separate.'}, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({'dual_append_verified': True, 'watcher_and_roy_ack': 'not claimed'}))
