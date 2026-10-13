## 复盘回报
- 已追加：D2JR3FN0VYH5（A10，第31层，产卵虫／幼虫战T8以8血10挡结束后阵亡）
- 新的纯 bug（file:line）：
  - 无；既有随机施毒bug已补证据。
- 写成「未记录」的项：D2JR3FN0VYH5：墨影首试退出帧、部分敌归零帧／同ID实体杀序、完整候选兑现比例、未执行替线及药水时点的受控整战、末轮逐击毛伤与致死顺序、有效boss时钟及实打比、Jev缓存与实付账单。
- 学习账本：D2JR3FN0VYH5：新增 无；更新 silent-0295、silent-0009、silent-0125、silent-0005、silent-0010、silent-0027、silent-0134、silent-0366、silent-0282、silent-0378、silent-0020、silent-0224、silent-0227（老错 silent-0295、silent-0009）；`ledger.py check` 退出码0。
- 代码提案（均关联本局证据／账本，独立strategy-proposal待调度，未实施）：
  - silent-proposal-d9712a0e7c616f76：F31T6／T8随机施毒保证边界；silent-0295；缺修后受控整战。
  - silent-proposal-6f992cbbb023ae8d：F31T3启毒条件兑现；silent-0009／0010／0366；缺先施毒或换构筑实盘。
  - silent-proposal-626364804c7f6170：F9T1／T5护栏后续代价；silent-0125／0005／0134；原线未实打，暂保留阈值。
  - silent-proposal-180ed0cc13aea648：F31T2药水生成与资源归属；silent-0282／0020／0027／0224／0227；缺改时点整战。

```json
{"task": "postmortem", "appended": ["D2JR3FN0VYH5"], "skipped": [], "bugs": [{"run": "D2JR3FN0VYH5", "where": "agent/src/reflex/turn-solver.ts:2380", "what": "多敌随机施毒集中到最高HP目标，伪标确定斩杀；silent-0295及fix-queue-v4已有。", "new": false}], "ledger": {"added": [], "updated": ["silent-0295", "silent-0009", "silent-0125", "silent-0005", "silent-0010", "silent-0027", "silent-0134", "silent-0366", "silent-0282", "silent-0378", "silent-0020", "silent-0224", "silent-0227"], "repeats": ["silent-0295", "silent-0009"], "check": 0}, "code_proposals": ["silent-proposal-d9712a0e7c616f76", "silent-proposal-6f992cbbb023ae8d", "silent-proposal-626364804c7f6170", "silent-proposal-180ed0cc13aea648"], "implementation_domains": ["combat", "potion", "terminal"], "report": "/home/dw/Projects/agent-sts2/learner/runs/20261013-194302-postmortem/report.md"}
```
