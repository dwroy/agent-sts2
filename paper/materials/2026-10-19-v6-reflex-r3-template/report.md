# V6 reflex R3 模板准备

日期：2026-10-19 22:06 CST。基线 f7580b3f5。仅准备第三轮模板，未派发、未续跑任何学习批次。

输入要求冻结第二轮 reflex 草稿、scratch 数值与程序、全部已结束 Silent 局和244条经验，以及结束并核验后的核心构筑卡第二轮组合。要求将可算的观察值写入严格 signal，逐项关联 n、独立局数、误差、design=observational 和计算口径，保留85条与37,902回合起点的完整对账，按频率×效应排序。

格式核对：当前 numeric signal 的 kind 为 hp/win，unit 为 hp/probability，仅允许 value 和可选 se；n/design/method 通过现有 evidence/metrics 与 reflex_id 关联审计，不添加非法字段、不假称这些字段已经进入 signal。组合引用只接受冻结核心卡第二轮的实际 ID。

本提交只改任务模板和记录，不含游戏知识、运行代码或正式知识。校对严格 schema 与第二轮模板；无代码改动，不要求 tsc/vitest。提交前运行 gitleaks。启动仍等待 Claude 在核心卡第二轮结束后另行指派 xhigh / 240分钟。
