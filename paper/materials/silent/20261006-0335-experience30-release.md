# 静默经验第30批上线核实

- 2026-10-06 03:40 experience-done 20261006-025911-experience-update exit0；运行目录learner/runs/20261006-025912-experience-update（启动时间相差1秒）。固定源0dba4029da21e3f514050bfd9d7b7dfba9f9c1fd→实际live 3a2a2a48ed594dea69b9c088edfe9259ac89bac8→发布25a520d92d46d1d644a3ca14a05406a4a1246238，唯一S1.exp30；发布树50d1b0df8d4b0a218bf7a0f8c4cd500d15f67538。
- 来源LLYSRQQ35AVW SILENT A8及旧36本角色完局，学习者记录新增1/更新24/退役0，active100→101、52601字符；A8/A9各95条50169字符。只转录回报，不另审游戏知识。新增帐篷经验对应0145/0146；0053/0138的原claim校正由学习者写，运维不补写或改变先验。
- 源草稿和最终源均tsc0、184文件2054例；学习者校正文案后复测，合后首次tsc0、184文件2054例。原摘要和日志SHA分别保存下方；完整外部检查由调度器补跑，当前checks_pending=True，不提前记为通过。
- live经验从.3到.5，已包含待合.4源8f7d061a5dde6da3ce0e3b6fcd7f96a5a38d1e87；旧17条proposed和第二十九节已由02:48事件归档7258600c5209ed75b0565349ac52ab88f8a82c82，本轮不新建S1.exp29或虚构其上线时刻。原记录冲突和忙锁历史保持，后续按同一实际S1.exp30发布处理其登记归属。
- 本批26条原proposed及第三十节32496字节归档，SHA256 a77d67b3c9cd3ef9d0a33ab527d191457d1c425cad8f6d25e45c79e5535ef9e3；本批26项与旧29批17项共33个唯一id（10项重叠）。机械同步main后通过ledger.py/by=ops登记实际shipped/S1.exp30，分清每项原来源。未提交前不冒记完成。
- 0144升级萎靡模型覆盖缺口保持observed未修；0051未升级原模型状态保持，经验文字上线不代表推演代码修复。0145是帐篷购法/实际收益，0146是同营火选项/顺序，不再与0144混关联。既有完整预算失败历史交在跑修复批次及后续事件，本轮不改测试断言、策略代码或运行进程。无Roy新待定。
- live自动刷新190464022a29cfaf1602ad4066edd0ef1698926b已由学习者锁内提交，本次集成保留已提交刷新；其他工作区论文成本、运行日志和新刷新不混提交。原交接learner/runs/20261006-025912-experience-update/handoff-ops.md；回报SHA256 b262e42eea06f70f5bf3f77136176fd9fb4cba46240c14a5c86e94003e8daf33。

```json
[
  {
    "log": "learner/runs/20261006-025912-experience-update/test-source-draft.log",
    "summary": {
      "tsc": 0,
      "vitest": 0,
      "files": 184,
      "cases": 2054
    },
    "bytes": 490,
    "sha256": "725e1ac2cf77187b5e76f94c57c441f6fde9ae453d1f30a8bbd12fc6b005e58c"
  },
  {
    "log": "learner/runs/20261006-025912-experience-update/test-source.log",
    "summary": {
      "tsc": 0,
      "vitest": 0,
      "files": 184,
      "cases": 2054
    },
    "bytes": 491,
    "sha256": "dc95a98e97db4a785065730372b25cdd366ed51798fd10f0bb3b0f5b0386adb5"
  },
  {
    "log": "learner/runs/20261006-025912-experience-update/test-live.log",
    "summary": {
      "tsc": 0,
      "vitest": 0,
      "files": 184,
      "cases": 2054
    },
    "bytes": 492,
    "sha256": "fcc20571052c9fa76a2b65b0f74f45c4d250617342c82c0cca156ac340e3453c"
  }
]
```

- 2026-10-06 03:45 本轮完成：原26条proposed及第三十节changelog归档9e901eaa999095af05c4e8dbae77d66e16564d7f；main机械同步固定已测发布25a520d92d46d1d644a3ca14a05406a4a1246238/树50d1b0df8d4b0a218bf7a0f8c4cd500d15f67538的合并提交735ac4411310d375cc52c237997dfefa89989034。1002项源码/测试blob与已测发布相同，8项知识blob使用该发布（含19046402已提交的7项自动刷新），其余main最新2091项blob保持；decision-log唯一冲突已保留双方全部历史。未改live在线工作区。
- CLI/by=ops登记33个唯一id为shipped/S1.exp30：第30批26项、第29批17项，其中10项重叠只登记一次，旧批独有7项0030/0069/0102/0140/0141/0142/0143随本次实际合入结案。原两个源和证据分别保留，没有独立S1.exp29，没有把旧A7/A0发现归A8。原first_run/prior/prior_note/evidence/repeat/claim/effect不变；0144仍observed、0051仍S1.fix5。
- /home/dw/Projects/agent-sts2/paper/materials/learning/ledger.jsonl: 146 item(s), 0 problem(s)。静默学习曲线使用本轮提交账本快照生成，工作区其他原始账本行保留未重排，其他角色曲线及后台成本/ops/notes文件未加入提交；A8小结历史窗口与原CSV行保持，只追加窗口后上线状态。
- 完整外部测试仍由调度器按本批checks_pending补跑，未声称通过；以前exp28/strategy4的完整预算断言失败及派发记录保持。本轮不停止对局/调度、无Roy新待定。
