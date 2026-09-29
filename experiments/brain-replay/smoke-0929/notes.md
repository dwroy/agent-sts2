# 冒烟测试记录（2026-09-29）

题目：jev-sts2-dsh 数据集里分层抽的 5 题（q000 reward/card、q003 rest/plan、q008 selection/upgrade、q050 shop/plan、
q083 run-plan），系统提示用当时的 data/system-prompt.txt；93 题的用户消息全部能由 src/brain/message.ts 逐字节重建。
汇总表见 summary.md（由 tools/brain-replay.ts 生成）；知识库工具还没合进来，带工具的几题挂的是
experiments/brain-replay/fake-tools.mjs 里的假工具 kb_session_check。

- deepseek（默认配置，v3 的请求原样）：5/5 首答合法；p50 22.5 s；5 题共 $0.027；缓存命中 99%（系统提示和记忆前缀）。
- deepseek + 假工具（原生函数调用，工具在进程内）：2/2 合法，两题都调了假工具。
- claude sonnet（claude-sonnet-5，订阅登录态）：不带工具 3 题 + 带假工具 2 题（stdio MCP），5/5 首答合法；
  带工具的 q083 调了假工具（服务端有记录），q050 没调（模型自己判断不需要）。
- claude opus（`--model opus`，解析为 claude-opus-5-5）：不带工具 2 题，2/2 合法，与 sonnet、deepseek 决定相同。

过程中发现并修掉的问题：
1. route_review.routes 本身带 "keep" 时，route 的 enum 出现重复，Claude CLI 拒收 schema（本地校验，没发请求）；
   已去重，93 题的 schema 全部检查过无重复 enum。这两次失败的运行已从 results.jsonl 去掉。
2. 跨题几乎没有缓存读：Claude Code 把 --json-schema 变成一个工具定义，排在系统提示前面，按题不同的 schema
   （选项键做 enum）让每题都从头写缓存；随机的临时工作目录也写进了模型看到的环境说明。改为：同一类问题用同一个
   schema（specs.ts stableSchema，题目自己的键由路由器校验），工作目录每个进程固定路径（每次调用前新建、用完删掉）。
   复测（../cache-check-0929）：q008、q000 是按题 schema + 固定工作目录（只命中之前问过的同一题）；q010、q011 是按类
   schema：两道不同的 reward/card，第二题读到了第一题写入的系统提示前缀，成本减半。
   复测里每次调用都是两次 API 请求（输入约为提示的两倍），疑为超集 schema 把 4 个可选字段设成必填、模型第一次提交
   结构化答案被拒后重交；已把这 4 个字段改为可选。这一改动没有再用真机验证（Claude 调用数已到上限）。

Claude 真机调用：隔离实测 3 次 + 冒烟 7 次 + 缓存复测 4 次 = 14 次模型调用；另有 3 次在本地就失败、没有发出请求
（--bare 未登录 1 次、schema 被拒 2 次）。
