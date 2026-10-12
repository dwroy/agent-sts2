# M2 验收回放：完整地图 + 节点序列 + 合法性校验（2026-09-30）

汇总表 summary.md 由 tools/route-replay.ts 生成；原始行（results.jsonl、brain.jsonl、deepseek-reasoning.jsonl）不提交。
只用 DeepSeek（deepseek-flash，思考强度同线上，KNOWLEDGE_PREFIX=full，前缀 sha 9eba95380dc4、170,256 字）；没有调用 Claude。

## 设置

- 地图：从日志库按字节偏移点查 states.jsonl（frames / state_index，没有整读），按 hash 顺序确定性抽取：A9 一幕 9、二幕 7、
  三幕 6（A9 到三幕的局少，三幕含 A8），每局每幕一张、有岔路、不是远古节点；另加 4 张飞行靴剩余次数 > 0 的地图（A8/A9，
  剩 1–3 次）。共 22 张，都走 src/screens/map.ts 的 map/route-plan 问法（整张地图、节点 id 规则、下一步可走节点、boss），
  经路由器（AnswerSpec = routePlanSpec，不合法时补问一次）问 DeepSeek，再用题面的 plan.resolve 落成路线计划。
- memory：RunJournal 只按当前状态渲染（没有历史段：重建历史要读整局日志）。
- 选牌 5 题、多步事件最后一问 5 题：前一层的地图 + 实际走的节点，路线计划用「经过该节点的第一条合法路线」（代码造的，
  只为检验路线块和路线修正），题面照线上构造（reward/card、event/choose、event/plan），答案经题目自己的 resolve 解析。

## 结果（详见 summary.md）

- map/route-plan：首答合法 22/22，补问后 22/22；首答错误 0 类。飞行靴 4 张里 1 张用了跳跃（EN55 第 8 步，合法）。
  每题耗时中位数 37 s（最长 158 s，思考 max，输出 token 中位数约 9.3K）；输入约 12.3 万 token/题，缓存命中合计 72%
  （并发 3，头几题前缀未缓存）；22 题 $0.52。
- 选牌/事件 10 题：路线块都在，DeepSeek 都给了 route：keep 6、change 4，改的路线全部通过校验（首答无路线错误，未补问）；
  10 题耗时中位数 31 s，$0.19。
- 真实数据里没有出现不合法首答，补问路径没被触发；它由单元测试覆盖（tests/brain-router、brain-deepseek、route-review
  的「非法路线补问一次」用例，含 scripted DeepSeek 客户端的端到端循环）。

## 事件「最后一问」的口径

一页事件题能不能是最后一问取决于选哪个选项：日志里的多步事件（滑脚木桥、巨型花朵、无尽传送带）每一页都是「一个选项结束事件、
一个选项进下一页」。按 src/knowledge/event-pages.json（tools/build-event-pages.py 从 2,167 次事件选择统计）的口径：只要页上
有选项会结束事件，就带路线块；所有选项都进下一页的页不带。日志里 1,963 次事件题：全部选项结束 1,727、混合 236、全部继续 0，
所以这个口径下多步事件的每一页都带路线块（本次 14 页全带）。要做到「只在真正的最后一步」，需要 Roy 定：例如混合页照带，
但所选选项会进下一页时不采用这一页的路线答案（下一页再问）。
