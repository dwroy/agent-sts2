"""Fixed checklist growth fixtures; no production state, credentials, games or models."""
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ops_current as current


class ChecklistBudget(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.directory = self.root / "ops/codex-ops"
        self.directory.mkdir(parents=True)
        self.write("ops/inbox-dev.md", b"fixed original instructions\n")
        self.authorization = b"STOP remains; no restart; retain original failure and pending tasks.\n"
        self.write("notes/authorization.md", self.authorization)
        self.context = {"summary": "STOP remains; fixed original failure retained.",
                        "authorization": {"path": "notes/authorization.md", "sha256": hashlib.sha256(self.authorization).hexdigest()},
                        "takeover_receipt": "notes/takeover.json", "external_tasks": []}
        self.write("notes/takeover.json", b'{"failure":"original wake failed before delivery"}\n')
        self.versions = json.dumps([{"release_id": "V6-R398", "commit": "a" * 40}]).encode()
        self.patches = [patch.object(current, "git", return_value="a" * 40),
                        patch.object(current, "stamp", return_value="2026-10-20T06:37:00+08:00"),
                        patch.object(current.subprocess, "check_output", return_value=self.versions)]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)

    def write(self, name, raw):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)

    def generate(self):
        self.write("notes/ops-current-context.json", json.dumps(self.context, ensure_ascii=False).encode())
        result = current.generate(self.root, self.directory)
        raw = (self.directory / "current.json").read_bytes()
        text = (self.root / "notes/ops-current.md").read_text()
        self.assertLessEqual(len(text.encode()), 12288)
        self.assertIn(hashlib.sha256(raw).hexdigest(), text)
        self.assertEqual(json.loads(raw), result)
        self.assertEqual(result["restoration_context"], self.context)
        self.assertEqual(result["sources"][str(self.root / "notes/authorization.md")]["sha256"], self.context["authorization"]["sha256"])
        return result, text

    def test_long_authorization_summary_is_complete_and_requires_original_readback(self):
        self.context["summary"] += "原授权与失败不能删除。" * 1800 + "FINAL_AUTHORIZATION_AND_FAILURE"
        result, text = self.generate()
        self.assertIn("索引模式", text)
        self.assertIn("处理前必须核 SHA", text)
        self.assertIn("authorization 路径/SHA", text)
        self.assertIn("FINAL_AUTHORIZATION_AND_FAILURE", result["restoration_context"]["summary"])
        self.assertIn("缺失或冲突时停止", text)

    def test_active_queue_notice_and_transaction_growth_retains_all_sources(self):
        long = "固定失败与未完成事实" * 250
        state = {"batches": {f"batch-{i}": {"state": "running", "task": long, "pid": i,
                 "resume_thread": f"thread-{i}", "worktree": str(self.root / f".worktrees/fixed-{i}")}
                 for i in range(30)}, "learning_requests": {f"request-{i}": {"state": "blocked", "next": long} for i in range(40)}}
        self.write("ops/codex-ops/learn.json", json.dumps(state, ensure_ascii=False).encode())
        originals = {}
        for i in range(100):
            name = f"ops/codex-ops/learning-notices/{i:024}.json"
            originals[name] = json.dumps({"id": str(i), "kind": long, "watcher_received": False, "roy_notified": False}, ensure_ascii=False).encode()
            self.write(name, originals[name])
        for i in range(20):
            self.write(f"ops/codex-ops/queue/{100+i}-stall.md", (long + str(i)).encode())
            self.write(f"ops/codex-ops/pending-integrations/{i}.json", json.dumps({"phase": long, "completed": False}).encode())
        result, text = self.generate()
        self.assertIn("索引模式", text)
        self.assertEqual(len(result["active_batches"]), 30)
        self.assertEqual(len(result["open_requests"]), 40)
        self.assertEqual(len(result["pending_notices"]), 100)
        self.assertEqual(len(result["queued_events"]), 20)
        self.assertEqual(len(result["not_marked_completed_transactions"]), 20)
        self.assertEqual(result["active_batches"]["batch-29"]["task"], long)
        for name, raw in originals.items():
            self.assertEqual((self.root / name).read_bytes(), raw)
            self.assertEqual(result["sources"][str(self.root / name)]["sha256"], hashlib.sha256(raw).hexdigest())
        event = self.root / "ops/codex-ops/queue/119-stall.md"
        self.assertEqual(result["sources"][str(event)]["sha256"], hashlib.sha256(event.read_bytes()).hexdigest())
        self.assertIn("队列 20", text)
        self.assertIn("未确认 100", text)

    def test_small_checklist_keeps_existing_inline_authorization(self):
        _, text = self.generate()
        self.assertNotIn("索引模式", text)
        self.assertIn("当前授权：" + self.context["summary"], text)

    def test_invalid_authorization_still_retains_previous_checklist(self):
        self.write("notes/ops-current.md", b"previous checklist retained\n")
        self.context["summary"] *= 2000
        self.context["authorization"]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "authorization SHA mismatch"):
            self.generate()
        self.assertEqual((self.root / "notes/ops-current.md").read_bytes(), b"previous checklist retained\n")

    def handoff(self):
        return 'state: in-flight\nissue: 35\n\n进行中的事: 原发布未完\n在等谁: 原自然边界\n下一步: 核原回执\n\n'.encode()

    def test_refresh_and_index_fallback_keep_role_section_without_refreshing_declaration(self):
        prefix=self.handoff()
        path=self.root/'notes/ops-current.md'; path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(prefix+current.GENERATED+'）\n原投影\n'.encode()); os.utime(path,ns=(123456789,123456789))
        self.generate()
        receipt=self.directory/'ops-current-handoff.json'
        first=json.loads(receipt.read_bytes())
        self.assertEqual(first['declared_at_ns'],123456789)
        self.assertEqual(first['sha256'],hashlib.sha256(prefix).hexdigest())
        self.context['summary']+='保留原授权和原失败。'*2000
        _,text=self.generate()
        self.assertTrue(text.startswith(prefix.decode())); self.assertIn('索引模式',text)
        self.assertEqual(json.loads(receipt.read_bytes()),first)

    def test_explicit_handoff_update_keeps_generated_body_and_can_reaffirm_same_content(self):
        _,text=self.generate(); prefix=self.handoff()
        with patch.object(current.time,'time_ns',return_value=2000000000):
            first=current.write_handoff(self.root,self.directory,prefix)
        after=(self.root/'notes/ops-current.md').read_bytes()
        self.assertEqual(after,prefix+text.encode())
        with patch.object(current.time,'time_ns',return_value=3000000000):
            second=current.write_handoff(self.root,self.directory,prefix)
        self.assertEqual(second['sha256'],first['sha256'])
        self.assertEqual(second['declared_at_ns'],3000000000)
        self.assertEqual((self.root/'notes/ops-current.md').read_bytes(),after)

    def test_concurrent_role_update_is_retained_and_not_overwritten(self):
        path=self.root/'notes/ops-current.md'; prefix=self.handoff()
        path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(prefix+current.GENERATED+b')\nold\n')
        replacement=prefix.replace(b'35',b'20')+current.GENERATED+b')\nnew\n'
        calls=0
        def advance(*args,**kwargs):
            nonlocal calls
            calls+=1
            if calls==3: path.write_bytes(replacement)
            return 'a'*40
        with patch.object(current,'git',side_effect=advance),self.assertRaisesRegex(ValueError,'handoff changed'):
            self.generate()
        self.assertEqual(path.read_bytes(),replacement)

    def test_oversize_handoff_is_not_truncated_and_bad_draft_does_not_overwrite(self):
        path=self.root/'notes/ops-current.md'; prefix=self.handoff()+b'x'*12000+b'\n\n'
        path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(prefix+current.GENERATED+b')\nold\n')
        before=path.read_bytes()
        with self.assertRaisesRegex(ValueError,'exceeds 12KB'): self.generate()
        self.assertEqual(path.read_bytes(),before)
        with self.assertRaisesRegex(ValueError,'complete role handoff'):
            current.write_handoff(self.root,self.directory,b'state: clear-ok\nissue: 20\n')
        with self.assertRaisesRegex(ValueError,'must not include generated'):
            current.write_handoff(self.root,self.directory,before)
        self.assertEqual(path.read_bytes(),before)


if __name__ == "__main__":
    unittest.main()
