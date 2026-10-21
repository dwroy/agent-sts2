[dev #26] 补充 #33 挂载合同：外部统计沿既有知识工具使用 knowledgeCharacter()，MCP 子进程须保留本局角色身份。

`externalStatsTools()` 的六个工具已实现；数据固定在 `ctx.knowledgeDir/external/sts2fun/silent-a10.json`，输入版本默认 v0.111。run 时检查 `knowledgeCharacter()==silent` 和 `ctx.ascension==10`；其他角色/进阶明确无数据。现有 `mcpLaunchSpec` 返回 env={}，进程内 setKnowledgeCharacter 不会自动传给子进程；若 #33 的隔离启动不继承 CHARACTER，请在原挂载/角色适配处显式传递或设置本局身份（其余 kb 工具也使用同一角色函数）。#26 不修改这些共用启动文件。

输出为有 source/version/provenance/cohort/limitations/rows 的 JSON 文本；含 SHA，16000 UTF-8 字节上限，分页不截断统计行。缺文件、未知 ID、损坏 SHA、不支持版本均为 ToolResult.isError + 明确无数据，不抛出中断题目的错误。最终交付提交与完整测试结果会写回 #26。
