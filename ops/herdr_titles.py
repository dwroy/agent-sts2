"""Readable tab titles; pane labels remain stable lifecycle identifiers."""
import re
import sys

TYPES = {
    "postmortem": "复盘", "experience-update": "经验更新", "strategy-proposal": "策略提案",
    "fix-batch": "修复", "boss-sim-batch": "Boss模拟",
}


def learner_title(label):
    match = re.fullmatch(r"learner-(?:log-)?(\d{8}-\d{6})(?:-(.*))?", label)
    if not match:
        return ""
    batch, task = match.groups()
    task = task or "postmortem"
    kind = TYPES.get(task, "策略提案（二组）" if task == "s2-strategy-proposal" else task)
    return f"学习大脑 · {batch} · {kind}"


if __name__ == "__main__":
    print(learner_title(sys.argv[1]))
