# 本任务取证与转录诊断历史

这些是复盘工具／转录问题，未列为生产纯bug，原始日志不改。

- compact.py初稿直接取codex决策的chosen，计划附加记录没有此字段，抛KeyError。compact-initial.py与compact-initial.txt保留，修正用get后的完整输出是compact-v2.txt。

```text
Traceback (most recent call last):
  File "/home/dw/Projects/agent-sts2/learner/runs/20261013-091302-postmortem/compact.py", line 8, in <module>
    print('d'+str(r['_line']),'F'+str(r['floor']),r['label'],r['chosen'],r.get('rationale'))
KeyError: 'chosen'
```

- 内联题面读取初稿把route_review误放在state内，并假定act_boss_sim总是对象；F16该字段是说明字符串，取items抛AttributeError。routes.py改为读取payload根的route_review，并保存真实route-evidence.json／routes.txt；不把分析器错误记成游戏机制。

```text
Traceback (most recent call last):
  File "<stdin>", line 7, in <module>
AttributeError: 'str' object has no attribute 'items'
```

- 追加前核验纠正初稿“F17首轮两防御合20挡”为实际生存者20挡，纠正末试T9轮初46激光与末显示30的朝向差异。lesson-draft-initial.md与write-draft-initial.py保留，实际追加正文为lesson-draft.md；18项初步数值检查的原结果verification-before.json保留。
- 正文追加后核得F31进场是2只MYTE，初稿错误写为3只，总HP131／净损15及各轮进度无误。遵守只追加规则，未编辑原复盘；erratum.md与根lessons.md同一时间勘误保留。此误读不进入bug-infra账本。最终核验明确包含两体数量。
- 补链过程中首次账本快照／check与第二提案CLI可能重叠；原快照和检查分别保存ledger-final-initial.json／ledger-check-initial.txt，第二提案完成后顺序重新find／check，以后者为最终检查结果。
- resource_chain原敌HP审计包含巨兽999999999占位体，保留原JSON。复盘按明确EXPLODE_MOVE与DeathBlow另计本体结束／自爆阶段，不采用它的近十亿“需伤”；同ID多体与退出缺帧限制保持。
