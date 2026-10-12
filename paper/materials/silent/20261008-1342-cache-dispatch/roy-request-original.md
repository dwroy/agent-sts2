### codex 大脑缓存几乎为零（Roy 2026-10-08 13:31，高优先，单独派）
证据：A10 期间 brain:codex 输入 3.29 亿 token，缓存命中只有 127 万（约 0.4%）；学习者和运维会话同期约 95%。logs/codex-calls.jsonl 最近各行：mode=session、reverted=true、同一 thread（例 01a119fc-33a…），每题 inputTokens 约 12.7–13.2 万、cachedInputTokens 恒为 0。每题都按全价付十几万 token 的知识前缀，额度和时间（单次约 14 秒）都浪费在这里。请：
1. 查明原因：可能的方向——每题前缀是否在变（知识前缀在知识文件或 notes/lessons.md 变化时重渲染，复盘每局都改 lessons.md；前缀里有没有每题变化的内容排在不变内容之前）；会话模式 thread + revert 的用法是否让服务端每次都当成新请求；service tier / prompt_cache_key / 前缀长度上限等；用一次受控实验（同一题连问两次、固定前缀）确认缓存能不能命中。
2. 修复，让稳定的知识前缀能命中缓存（例如把每局 / 每题变化的部分放到最后、前缀只在批次边界更新、给 prompt_cache_key），不降低推理强度、不删题面内容；改动对铁甲保持等价或说明。
3. 上线后在 codex-calls / brain.jsonl 和成本统计里核对命中率，并报告前后对比（命中率、每题 token、单次耗时、额度消耗速度）。
