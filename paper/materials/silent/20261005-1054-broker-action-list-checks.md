# 动作说明遗漏修复，待上线

{
  "source": "061d1ca9f3471a952e291efde38cfbeb6a44bd55",
  "base": "86b24a1f33dba25e4b00427e48a35c4c85ecd73b",
  "step_checks": {
    "exit": 0,
    "files": 165,
    "cases": 1957,
    "log": "/tmp/sts2-1054-step-sandbox.log"
  },
  "targeted_test": "/tmp/sts2-1054-action-list-test.log",
  "pending": "live merge lock busy"
}

归档时间：2026-10-05 11:02。观察者补测live cf11fab8：tsc0，vitest214文件2758通过/1失败；唯一报告失败为tests/ops-codex.test.ts的“every action is implemented by ops/codex-ops-actions.sh and listed by ops/codex-ops-do.sh”，缺strategy-proposal。

独立工作树.worktrees/step（step）以live 86b24a1f为基线，仅修改ops/codex-ops-do.sh动作注释及docs/codex-ops.md，未改执行逻辑、白名单、游戏知识、配置或对局代码。原用例在修前同样失败，修后1用例通过/其余11未选择；固定沙箱入口tsc0、165文件1957用例通过，分为164文件1946用例和1文件11用例。未新增或放宽测试排除。提交已扫描gitleaks并通过。

非阻塞取ops/live-merge.lock失败，未执行live合并，没有本批MERGE_HEAD；不等待或重试。修复源061d1ca9已提交但尚未上线，不能将本轮沙箱结果称作live合后或完整沙箱外检查。完整补测机制f670884a已由学习者实现并合入live，包含learner-recheck入口、源提交核验、树固定与去重、失败历史、日志及learner-checks事件；不重复实现。

锁释放后的manual：只取固定源061d1ca9f3471a952e291efde38cfbeb6a44bd55，按live流程保留当前数据/版本/记录、测试及合入，同步main，接着经白名单命令 `bash ops/codex-ops-do.sh learner-recheck 20261005-102754-experience-update` 补跑含该修复的当前live树。该经验批次源e6ec5653已实际合入；不要用旧cf11fab8的失败或本次step沙箱结果冒充修复后完整检查，不修改原回报/账本，不回滚对局。
