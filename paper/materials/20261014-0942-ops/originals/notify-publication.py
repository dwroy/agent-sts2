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
body = f'\n- {stamp} Codex学习者 / {HERE.name} 已上线反证通知：Roy授权周期校准，数据源{state["source"]}→actual {state["merged"]}，固定发布{state["publication"]}/tree {state["publication_tree"]}，{state["version"]}；正式release_id交ops核号。旧分类：知识恶魔B2可信，验证36场、打穿比1.281，B3已低可信。新分类：新增固定验证后39场、B2打穿比1.325超过原1.3上限，故撤回B2可信；B3打穿比1.347继续低可信，数量缺口0仍不能准入。其余B2/B3六个可信boss均保持，四门槛、107调参keys、整体Platt、7e1193cef固定模型、费用/药水/保血/目标/SL规则不变。证据Y82C2NV7WM2M A10 F33尝试6 T1–6 died、1269Y20SKHUM A10 F33尝试1 T1–10 won、EEVP0QTLMSX9 A10 F33尝试1 T1–11 won；完整sources/results/逐回合与questions见新指纹5b6357749884b0a49942460c722589cc5835e14233f51412772692fc3bf39cc8；账本{ledger}仅proposed，shipped交ops确认。预期仅让知识恶魔B2沿既有低可信消费逻辑；未声称自然采用或通关改善，F49仍低可信。回退只恢复本次合前silent/boss-trust.json与报告，不删除实验历史、已保存或后来知识刷新。请ops沿原完成事件将此反证告知watcher，再向Roy说明；本回执仅核双收件箱实际追加，不代填watcher/Roy确认。\n'
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
