本文件保存本批取证过程中出现的诊断错误；未修改生产源码、知识或原日志。

- 初期队列读取未先 fold，输出了多次历史 update 并被终端裁剪。改用根 code_proposals.py 的官方 fold，只保存本批十个 id；原提案逐份按 SHA 核验。
- 初期源码定位使用了不存在的 agent/src/eye/loop.ts、agent/src/reflex/jev/ask.ts、agent/src/loop.ts、agent/src/sl/giant-phase.ts、agent/src/reflex/combat.ts。rg/sed 报文件不存在；随后用 rg --files 定位 agent/src/hand/loop.ts、agent/src/reflex/combat-plan.ts、agent/src/sl/attempts.ts。最终源码清单只有真实路径。
- 读取旧复盘 states-numbered.jsonl 时，第一行含数字前缀而非纯 JSON；json.loads 报 JSONDecodeError: Extra data: line 1 column 7 (char 6)。没有继续信任该读取结果。本批改用既有 offset 索引回读根 logs 原字节，verify_inputs.py exit 0，8293 行 SHA 均一致。
- 初次差异分类器只识别以 * 或 // 开始的注释，漏掉 /** 单行注释，抛 AssertionError；第二次按同位置逐行复核仍在 agent/src/sl/controller.ts:221 拒绝。添加 /** 到诊断分类后，六个不同文件共41个变化行均精确满足旧行 Roy→Dai，且均为注释。生产文件未改；最终分类保存 source-difference-classification.json，原字节副本及 base-live-source.patch 保留。
- 辅助 SL 查询初稿读取 explore.anchor 而得到 None。原行核到真实路径 explore.target.anchor 后修正报告材料；不是日志缺失，也不是游戏反证。原 summary 初稿保存 attempt-summaries.initial.json；原始日志完全保留，最终 summary 使用真实嵌套字段。
- KEN 末试 T9 轮初尚未建敏捷、T9 后段才建立2，T10轮初保留2；报告不将“延迟到T9”写成“T9轮初已有敏捷”。
