## 修 bug 回报

- 合并基线：main → a43decfe89e60877dea41d91157d4b32dbc989b8（开工工作区干净，先执行 git merge --no-edit main，结果 Already up to date）。
- 修复（每条一行）：无新增源码修复；未创建空提交。
- 已被别人修掉的：45 个已有具体子项（44 个原源码提交是当前基线/live 祖先，1 个是已核实的等价文件集成）；下表和 queue-audit-shell.json 保存逐项源码提交、main/live 祖先核验及原队列未划掉条目的账本/提案读回。
- 没修的：既有策略提案、独立架构任务与未核定根因的调查项保留，具体范围见下文。
- 测试：tsc 退出码 0；Vitest 主段 395 文件/3833 用例，paths 段 1 文件/11 用例，合计 396 文件/3844 用例、退出码 0；首轮通过、未重跑。
- 合入：未合入（无新增源码；不重复合入既有提交）。
- 需要 Roy 定的事：无。

本批只改任务 scratch 中的核查脚本、报告和检查输出；修复队列、源码、知识、原日志、学习账本、提案队列和 live 均未修改。没有新提案，没有实现领域，没有上线/版本/双通知，不把旧源码或旧红绿验证记作本批新增修复。临时文件均在本任务指定目录。

### 仍需原链处理的范围

| 范围 | 原因与接续 |
| --- | --- |
| silent-0308、0311、0319、0320、0322、0329、0334、0339、0344、0362、0365 等模型/药水/SL/资源项 | 策略类；沿原 strategy-proposal 链。账本的 bug-infra 分类不替代任务对游戏知识的边界；未补游戏机制、血价或未观察交互。 |
| 靴子、木札余像、纸鹤、吹哨、炼制容量、普通斗篷生成等近期条目 | 原条目明确绑定已有策略提案，不由本批重复实现或派发。 |
| silent-0332 双 Boss 接续资源契约 | 已有诊断与提案；缺具体触发样本/种子/首战末资源，根因证据不足，不能伪造正 HP 或吞掉异常。 |
| silent-0459 独立 run-plan 请求成本 | 队列明确保留 silent-proposal-6a39ea0a435755c5 原链，不另派普通修复；独立 question_id 去重与真实费用口径需原提案核实。 |
| sandbox-glob-startup-race 上游目录生命周期 | 会话前有界恢复及复盘租约 ID 子修复已有提交；具体目录删除者、注册时序拒绝点及自然竞态仍缺证，不凭推测更改 owner/回收/权限守卫。 |
| 调度公平性核查 | 仅有队列位置观测，原文明确尚非永久饥饿证明；没有核实 dispatch/seen_runs/新完局时间链，不擅改调度策略或状态。 |
| 框架/测试收尾 | 精确树定向补验、拒绝诊断、长题名、固定分组已实现；原一次性 merge-live.py 超时/旧锁的历史收尾不能当作仍在运行的源码缺陷，不操作旧进程或改旧回执。 |
| core-build-notify 原 rc2 的实际投递 | 失败诊断子项已有修复；没有本批核实的原生未发送证明，不重复发送、不补写他人 ACK、不把未知历史改成成功。 |
| named-card-facts 其他入口、v5-dpr-health、全漏斗/统一资源价值/全历史构筑/量化与 P1/P2 | 独立架构或研究任务，范围过大且已有 owner，普通纯 bug 批次不混入；已部署子项不关闭父要求。 |

上述项均保留原队列、提案、失败、冷却、租约和证据。没有新建重复任务或下级 agent。

### 本批验证口径

执行目录为本工作树 agent/，PATH 加 ~/.local/node/bin，TMPDIR 为本批 scratch，SANDBOX_WORKERS=2，使用 nice 19 的原 bash tools/test-sandbox.sh。脚本固定排除名单保持，末段 paths 使用原单 fork 入口。只运行固定数据测试，未运行 play、模型或网络请求。

没有本批源码补丁，因此“撤掉本批修复时失败”不适用；不把其他批次的历史红绿验证冒称本次执行。原沙箱不支持的 IPC/HTTP/配置测试仍按脚本排除，不冒报完整宿主通过。

审计输入与输出：audit_queue.py、queue-audit-shell.json、source-shell.diff、baseline-sandbox.log、baseline-sandbox.exit。queue-audit-shell.json 记录队列字节数/SHA256、完整基线与 tree、逐源码祖先、未划掉条目的原文和只读账本/提案状态。原队列不划条目。

### 已有源码逐项核验

队列冻结 1278 行，SHA256 `2dfb7a3002caa9f097e4c2ab453062c2d2bba7f3744927e6c8cef7cb35d49d4e`。当前基线 tree `356172dff36715da1193c05f4d97c8811bb934a5`；只读观察 live `d9bfb65a4ec28cdda8706a150fc4341d28db1227`。下表仅说明原具体子项，不关闭宽父要求。

| 原条目/已修子项 | 已有源码提交 | 当前基线祖先 | live 祖先 |
| --- | --- | --- | --- |
| 无动作开场死亡的战斗归因 | `3b48088dec5fc6eafe576a1296bbdadde43432ee` | 是 | 是 |
| 原生构筑通知失败诊断 | `5c92f2aaf0b758a1a5e7d591745694004664f83a` | 是 | 是 |
| 额度恢复后的余额基线 | `e5e2995d659d15af79ec8bba67a4a25c1cb7295f` | 是 | 是 |
| 升阶通知使用实际进阶 | `8045d9fbf0a12523b1dbe39bbed8af06c7497b09` | 是 | 是 |
| 既有 main 推送入口注册 | `c519952b31e3a0bb3acdd2115883ae8671b8a090` | 是 | 是 |
| Codex 退出测试模型契约 | `874ae603b3927173f805e0b2fe789330bab710c7` | 是 | 是 |
| 精确树宿主定向补验入口 | `24c2e3a75b5db6bac76d6c924f86b7fcd9438316` | 是 | 是 |
| 会话前临时 ENOENT 有界恢复 | `bc2c40e313cc36682196277c53c50e30744b88c5` | 是 | 是 |
| 已注册派发的固定夹具 | `2b09c47d431a580e9955d157f4dfb0e576186206` | 是 | 是 |
| 空受阻经验批次不误派补链 | `84366ad06ee4f978394c1b9489a82c83ea12bd36` | 是 | 是 |
| 多角色药水前缀固定隔离 | `5ef3c4612bd2673c19968c5a2d24bf62af519ee1` | 是 | 是 |
| 事件具名卡资料入口 | `42c920f34d9dc1c783ce894659849ab37ed6fd1b` | 是 | 是 |
| 模拟池缓存签名固定隔离 | `8fbb441eb61eef226eb7366f9612003480c83988` | 是 | 是 |
| rollout 最佳线路固定隔离 | `bbc5b993a7524bbb8e80a975f204f8d193657b46` | 是 | 是 |
| 未派发原提案的机械处置绑定 | `3a98e213a826e94f9708af4b1a265e1892659f4e` | 是 | 是 |
| 卡死检查异步固定执行器 | `95e7f050ef2abe5c85a0367555392652ad73fbfe` | 是 | 是 |
| Jev 明确上下文错误无损重试 | `fab7c90945bd4a899d411438a22952b252272aa4` | 是 | 是 |
| batch-c 固定时钟 | `5dd8a20c9d2dd4ed43120b1684e5577b993ac2ff` | 是 | 是 |
| eval 固定版本夹具 | `d9881ba593b0b8d701ebbe1c95626c0ebdd554c7` | 是 | 是 |
| 神化固定模拟时钟 | `9e8c93555131c3347f9e809d9722a848a75c2692` | 是 | 是 |
| 论文 Git refs 一致快照 | `16bfe0bd6ecaa91d04a91c01edc94cecc781f71f` | 是 | 是 |
| boss-sim 透传隔离 home | `5921f8cd045853182c867a6430e75c3fcde00a87` | 是 | 是 |
| runLoop 固定时间上限夹具 | `b3c6dd700b00d0d8b17d5d2efe6fe9aa353618fa` | 是 | 是 |
| 宿主补验拒绝原因 JSON | `63f656fb07a21a7496353234269901a832eae497` | 是 | 是 |
| broker 容量及回执失败隔离 | `a136ddc4b5b0a8696f10b2fae3073322d57e724c` | 是 | 是 |
| autoplay 无故障标记显式退出 | `db072ddab47ba94efb46dce2913927f936ecb97e` | 是 | 是 |
| JSONL 截断尾行追加边界 | `9b07240b18f862efdbe630889ade04e8976eaace` | 是 | 是 |
| 普通通知 ACK 无父任务校验 | `672e198a4730012330f599068a0ef1efadb02002` | 是 | 是 |
| 失败且无复盘不误派补链 | `3fdcd77927f01b35c20c6c5c1fcfd790676032d2` | 是 | 是 |
| 通知前阶段回执重核 | `1594def2e1b65b665d3b345f31444194eb4d09e6` | 是 | 是 |
| 复盘时间戳租约 ID | `d9983263ffecea1bed4e29d65e7f854a3d2e33d7` | 是 | 是 |
| 历史牌组约束消费者夹具 | `c0999eaa251133454540e157b2d6fe641731ad65` | 否 | 否 |
| 公共经验固定文件快照 | `8390c62d76fc8c7d7b6b7292121a621f4666d39c` | 是 | 是 |
| 路径拒绝固定异步夹具 | `df5f2e3fac5db56e3c92a241e2b4a170c6962212` | 是 | 是 |
| Codex 长思考固定时钟夹具 | `a18376cce22eb9e47377d474a85fb864f7c636e2` | 是 | 是 |
| 宿主精确长题名承载 | `f8896692b0d868b900ccffc8ed910321d0f3e765` | 是 | 是 |
| 升阶审计异步固定 Python 分组 | `a11e32ae1a01ecf75cc57519be21f2d144c2cd18` | 是 | 是 |
| 策略研究固定分组 | `cd1f5593430a2d13479368679b5d42994540f7c8` | 是 | 是 |
| 药水 MC 有界固定验收 | `519b63549f1c61276755066e5a76d0351cf09a7c` | 是 | 是 |
| rollout 排序有界固定验收 | `b68a650ab95c15a492cccac598906f32284229be` | 是 | 是 |
| 注册 feature 的角色回执校验 | `38b2f572d90b3b97a23f9eae983f583287492f9a` | 是 | 是 |
| tracked-source Python 缓存回收 | `1e8af775f6b90f100f20ff7c4a08dfddaba893a9` | 是 | 是 |
| 包装及参数化测试期限解析 | `56c256dad0d33b231b82b53113d3bdd84f9bfa20` | 是 | 是 |
| producer 到通知身份的绑定 | `1dd4d434aef67f1d065dbdba23a875ae82741a88` | 是 | 是 |
| run-plans 真实 run 身份提取 | `78e9b05929366d097a728761d693d790ff16ac87` | 是 | 是 |

### 未划复选框的账本读回

| 原队列行 | 账本 | 当前账本状态 | 原提案状态（仅机械读回） |
| --- | --- | --- | --- |
| 784 | silent-0254 | shipped | 无本行直接关联记录 |
| 789 | silent-0256 | shipped | silent-proposal-4111ed10f08739cb:implemented；silent-proposal-756ddf20db14797f:pending；silent-proposal-14c20d7897195ef5:pending；silent-proposal-9e14d9e11b63d153:pending；silent-proposal-9d3aa16e535ba576:pending；silent-proposal-970122d4fa57bba7:pending；silent-proposal-02f163dca3b4a264:pending；silent-proposal-fbf0f7c66acd1ed0:pending |
| 793 | silent-0260 | shipped | silent-proposal-1b9e29122364fa68:duplicate；silent-proposal-ec2b210f613d5e26:pending；silent-proposal-f97980a3266f2665:pending；silent-proposal-438a0eb4516e7975:pending；silent-proposal-04cbbf6b3a547aea:pending；silent-proposal-04a40369c2652c83:pending；silent-proposal-b1100cb810a53d18:pending；silent-proposal-a65ae6b794cf6cd2:pending；silent-proposal-8c3597e382f7a5df:pending；silent-proposal-dfaa8a379488fbdc:pending |
| 797 | silent-0263 | shipped | silent-proposal-cfecb5580938873d:duplicate |
| 801 | silent-0266 | shipped | silent-proposal-9b4049b484730143:duplicate；silent-proposal-bc4b92d590f2c4ce:waiting |
| 912 | silent-0308 | observed | silent-proposal-0ff91bb5da98a252:pending；silent-proposal-ee4e3012ebfe746a:pending；silent-proposal-a234d05e459d0cc0:pending |
| 918 | silent-0311 | observed | silent-proposal-d04933cbd408d85b:pending；silent-proposal-189334c36ff1fdbb:pending；silent-proposal-ee5c8b197b4136f3:pending；silent-proposal-95f1cb3069770821:pending |
| 923 | silent-0317 | proposed | silent-proposal-2d2fa55483ceb71c:pending；silent-proposal-144a45719fb56478:pending；silent-proposal-d5b70e0669c2e9c6:pending；silent-proposal-ec97ec8f3860ad02:pending；silent-proposal-ff52d13a438e4800:implemented |
| 929 | silent-0319 | observed | silent-proposal-cbf5f609bb228ee5:pending；silent-proposal-0e0f404b9c683ace:pending；silent-proposal-9343a6f35cc15d46:pending；silent-proposal-492a48646d1e2e84:pending；silent-proposal-e274353e336eb492:pending |
| 930 | silent-0320 | observed | silent-proposal-689c132e17b5c70f:pending；silent-proposal-97150100609faaec:pending |
| 935 | silent-0322 | observed | silent-proposal-53b3db220508b3d9:pending；silent-proposal-84d4c469867ba70e:pending；silent-proposal-46ebe0b559d993ce:pending；silent-proposal-f4709125bce8a5e4:pending；silent-proposal-3964ad8708c64f41:pending；silent-proposal-1e78bb4b585dcc43:pending |
| 940 | silent-0324 | shipped | silent-proposal-e7ed37db21fc698a:pending；silent-proposal-c99563720f3efe72:pending；silent-proposal-e7adad48b46c15d9:pending；silent-proposal-a810b416ac79dae0:pending |
| 945 | silent-0329 | observed | silent-proposal-90e0bc4e45916d16:pending；silent-proposal-2d70265e0aee98eb:pending |
| 959 | silent-0332 | proposed | silent-proposal-0b28f52e415d80d1:pending；silent-proposal-ecbd4b68c5fad954:pending；silent-proposal-5aa2672bd7cd1bf4:pending |
| 964 | silent-0334 | observed | silent-proposal-6a5c67f606bd5af7:pending；silent-proposal-b72a995c76eb1496:pending；silent-proposal-bf35116dad5b1200:pending；silent-proposal-15778ad72ad640f9:pending |
| 964 | silent-0153 | shipped | 无本行直接关联记录 |
| 968 | silent-0338 | shipped | silent-proposal-8d88108e5417f650:pending；silent-proposal-513c9f6b73a09264:implemented |
| 980 | silent-0339 | observed | silent-proposal-c232010cd405fe44:pending；silent-proposal-f9794186c0f1383d:pending；silent-proposal-a8b6beb464e2a1a9:pending |
| 992 | silent-0344 | observed | silent-proposal-8e17a61707d2ca02:pending；silent-proposal-23bab41ff3cb2e72:pending；silent-proposal-3193a243c8f927a6:pending；silent-proposal-0277f3bf5cdf193c:pending |
| 992 | silent-0289 | shipped | silent-proposal-7cfd0f9b6b0fbbda:pending；silent-proposal-829ca94fc68fcbb6:pending；silent-proposal-dd8ccc33fcfd3ee8:pending；silent-proposal-9cfa5d113016871d:pending；silent-proposal-688f83528d939ab0:pending；silent-proposal-8e17a61707d2ca02:pending；silent-proposal-23bab41ff3cb2e72:pending；silent-proposal-0b91fe96a4336bd5:pending；silent-proposal-3193a243c8f927a6:pending；silent-proposal-0277f3bf5cdf193c:pending；silent-proposal-3c46f81c08c130e1:pending；silent-proposal-d48a4892c31d855e:pending |
| 992 | silent-0345 | shipped | silent-proposal-8e17a61707d2ca02:pending；silent-proposal-2189f026997baac0:pending；silent-proposal-0259be72ce8eddc1:pending |
| 1001 | silent-0347 | observed | silent-proposal-43156dee9f23ae43:pending；silent-proposal-5e907442ae7a9650:pending；silent-proposal-885e084d3b85582f:pending；silent-proposal-925630dd458d4e22:pending；silent-proposal-febf716b9ff8e85f:pending；silent-proposal-bf13103f32407f17:pending；silent-proposal-e3fc856ae3d844fa:pending |
| 1005 | silent-0349 | proposed | silent-proposal-bb7597d8a1fe63ff:pending；silent-proposal-b1551f6c1627e828:pending；silent-proposal-b9b6a3815c12ac26:pending；silent-proposal-21aeb82fb5b777bc:pending；silent-proposal-02f163dca3b4a264:pending；silent-proposal-5c94d6e25e29bc49:pending；silent-proposal-09bb4373dbe1b3a1:pending；silent-proposal-7cd7cba90a0e2c46:implemented |
| 1020 | silent-0362 | observed | silent-proposal-0031b60b7dade5cf:pending |
| 1022 | silent-0365 | observed | silent-proposal-70c22e94eda8f8a9:pending；silent-proposal-f0d8ccab0f5bdcdb:pending；silent-proposal-b38a8d9a2c15e55f:pending；silent-proposal-6d24408d60c084b4:pending |
| 1024 | silent-0367 | shipped | silent-proposal-196013f88a9d7c1c:pending；silent-proposal-062dbd5895a97e52:pending |

### 核查脚本接续记录

逐提交/批量短 SHA 的 Python 子进程采集未及时返回；保留原脚本、原工具输出及 60 秒/30 秒/30 秒期限退出事实，未据此改游戏源码或将原沙箱测试记失败。最终使用 batch-git-graph.sh 直接冻结完整提交图，再由本脚本做本地前缀唯一性和祖先集合比对；原短 SHA 采集不作为验收结果。已有完整 396 文件/3844 用例首轮通过，无测试重跑。

历史 cap 夹具源 `c0999eaa251133454540e157b2d6fe641731ad65` 本身不是当前祖先；实际 main 集成 `ec8c578b66bf5498372f1b779ae58a766dff8112` / live 集成 `64cc53f99311364d6e3082e65d51a459d48260dc` 均为当前 main/live 祖先。原四测试叶子的 mode/blob/path 在 source/main/live 三树逐字一致，凭证见 historical-{source,main,live}-tree.txt；当前消费者仍使用原 historical-run-constraints-fixture。此项按实际集成追溯，不冒称原 source 为祖先。

最终保留原队列 1278 行、37 条未划复选框，工作树 Git 状态及 source-shell.diff 均为空。修复与提交数均为 0，merged=null；未执行 live 合并或状态/账本/版本写入。
