# #20 三批补交独立核验：输入证明缺口，暂不准入

2026-10-22T20:29:09+08:00：公共 d9c4849b1fa69b6fae5510a82f20cf95abf796a8、kit 26130354b86fbdbb4a1baddda07a770b0b9d6fd5。已实读 #20 三批补交、主管逐项要求及原失败材料。**普通定向绿，但独立负例确认旧结果可被错误复用；已开 [#43](https://github.com/dwroy/agent-sts2/issues/43) 交主管排期。当前源码不准入 main/live，未跑或排队完整 Vitest。** 既有 #20 生产安装与早期已合部分不因本次结论被回退。

## 可复核的阻塞

`ops/release_plan.py:27` 的 inventory 只拒绝列举的部分未跟踪后缀，遗漏 `.mts`。临时 Git 仓库的已跟踪标准 `.test.ts` 导入普通0644未跟踪 `.mts`；模块返回1时真实单文件 Vitest过，改为2时真实相同测试失败。前后 inventory完全相同且没有模块条目。

另用原 release checks 状态机和**模拟 full 命令执行器**验证门禁：旧模拟回执建立后仅改该模块，第二次仍退出0、exact-reuse/reused、新增命令0。两个模拟回执明确以 mocked 命名，只证明门禁缺陷，不代表真实 full 绿或任何发布准入。真实测试失败原件是 untracked-module/consumer-after.log；之前的绿是独立的 consumer-before.log，未重跑覆盖。两个内容SHA和全部字段见 untracked-module/result.json。类似后缀应由开发盘点，不把尚未逐项实测的扩展写成已复现。

原执行脚本存 raw/probe_untracked_module-first.py。可移植复现脚本只调整根与输出路径，语义相同：在新隔离源工作树运行 `REVIEW_WORKTREE=/path/to/worktree REVIEW_OUTPUT=/path/to/worktree/.artifacts/fresh-probe python3 -B paper/materials/20261022-issue20-integrator-r4/probe_untracked_module.py`。输出目录必须全新且在该工作树内，使用固定临时仓库、单worker与nice19；退出1表示复现了门禁缺陷，修复后再留新回执，不能覆盖本次原件。

## 已完成的正向与原负控

- 两仓三层清单按各层精确来源Git字节独立核SHA：机器26/26、收件箱9/9、发布14/14。不是把父层清单冒充最终所有文件的字节。source-readback.json逐项保留。
- kit完整自身Python固定测试113项过；公共生命周期64项过；原启动回归23项过；09:37资源事件回放1项过，两个独立临时项目实例覆盖legacy36退出后ops33优先外项目dev35，未扫描或操作另一个真实项目。
- 生产tsc退出0；4个指定Vitest文件20项过，内含公共发布检查/顺序等Python桥接。它是定向集合，不能记成整个Vitest通过。命令、时间、日志均保留；不将内层测试与外层20项相加充作独立总数。
- 1969个源/测试/配置输入前后SHA相同；before.json/after.json公开清单逐项同值；原map字节在本地保留，公开清单包含原map SHA。此项只覆盖已枚举输入，不掩盖上述独立夹具显示的枚举缺口。
- #41 c6428609c 的 v6-card-option-loop.test.ts 与本候选Git blob均 ecabd4a4f050b5e82db13743383d48f185833c6d，完整时钟修复未被裁掉。
- 收件箱9项固定负控已含三类触发、重复/重启/重贴标签、路径配置、dry-run零写、sending/uncertain不重发；机器协议含进程租约、优先级与跨实例；发布原负控含第二发布queued、冻结/失败保留、源码/预像/依赖/知识/超时/漂移拒绝、数据消费者失败。它们通过与新反例失败并存。

## 后续边界

主管决定 #43 沿原 #20 开发线还是独立交付；集成员未开开发会话或派活。修复不得只降低断言/过滤此夹具，保留未跟踪.ts与知识消费者负控，定向复验后再交唯一完整检查窗口。#20保持 #37→#20 同文件顺序，原 high→40→35→28→37→36 不变。本轮只读 merge-tree 对当时main f3b93a2 显示 ops/report.py 和 decision-log 两处冲突；冲突树不是候选，没有提交合并或解决生产冲突。

新发布门候选默认false；仍由原ops核在途、唯一入口和自然边界迁移，旧v1/自定义历史回执不升级、不因此额外重跑既有full。机器级申领与每项目独立实例、各自部署回执不代彼此。#39启动发布/pin/首局、#40实际发布回执、真实回收与自动接续等自然验收继续待核。#40已交原ops的326d5636f仍按主管授权复用bb1c16完整结果，仅R412定向；本轮没有新的实际发布证据，也不重full或修改暂停。#27 CLI兼容阻塞与科学父保留。

本轮仅追加核验材料/交接/日志与issue记录；未合入 #20 源码、改生产安装/开关/队列/STOP/pin/账号/ops prompt，未play或调用模型，未替其他项目部署。

公开材料扫描首轮generic-api-key告警2项，均为清单中learner-keycheck-retry.test.ts路径后面的64位文件SHA，不是凭据。核实全部清单值仅文件SHA后，公开副本改为path/sha256分行列表，保留全部路径和值及原map字节SHA；原扫描和原map不改写。未加全局扫描豁免。
