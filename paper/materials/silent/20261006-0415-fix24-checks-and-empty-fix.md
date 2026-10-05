# 修复完整补测与无新增修复批次归档

- 2026-10-06 04:21 处理04:15两事件：20261006-025911-fix-batch固定发布473a62f475dc5af126f231061a1c3c33880ed7a9/树7c1e62938ff417daeee8978b1eb6ff5a7cf6e46b完整外部tsc + vitest exit0，239文件2876通过/2跳过，03:59:11开始494.75秒；原日志ops/codex-ops/learner/20261006-025911-fix-batch.fallback-7c1e62938ff417daeee8978b1eb6ff5a7cf6e46b.checks.log，62956字节/SHA256 21ef22434511fe22fc33e36efb76be6c305699f43edab887d72e2702d9fe4108。调度器checks映射、checks_pending=false、发布树及main/live祖先、唯一S1.fix24均已核对，完整待办关闭。所有旧固定树失败、撤源失败、夹具修正和恢复通过历史保留，不回改为通过。
- 20261006-040345-fix-batch学习者exit0/success，base=054458768f7a9451328739834ecc20f9ce8e48b1，fixes为空、merged=null，源沙箱tsc0及188文件2068例首过；本批没有新增代码、待提交内容或待合并修复。108项原修复提交逐项核对为基线及固定live发布祖先，codex-dev已提交HEAD=993ae8ca16252a442d6788e184695f62740b3a0b与基线源码/测试无差异，main与固定发布的指定目录只有ops/inbox-dev.md记录差异；交接报告与本轮首次检查均为工作区干净，记录时工作区状态为"M agent/src/brain/build-facts.ts\n?? agent/tests/silent-route-relic-evidence.json\n?? agent/tests/silent-route-relic.test.ts"，后续未提交内容全部保留，不由本空批次兜底混入。既有修复已上线，merged=null表示本批没有新合并，运维不创建空提交/空合并、发布版本、台账更新或重复完整套件。
- 原跳过项仍为策略类、mod超时/Codex缓存实测证据不足、整场模拟性能需独立任务；回报中的旧授权措辞沿已有独立学习任务处理，没有本轮新Roy待定。仅存学习者分析和原证据，不由运维补打法机制。
- 调度状态却将本批标state=failed/rc=0/merged=null，并设置一小时后的retry_at；定位ops/learner_checks.py:35只把verified合并当成功，ops/codex-ops-learn.py:323-324给失败加重派时间，ops/learner_jobs.py:92-96按同触发键最多重派三次。这是非阻塞完成判读缺口，已另入fix-queue交下一学习者处理；不能用假merged或重复上线掩盖，也不修改运行状态文件。有效无新增产出与有产出未合入应保留不同结果口径。
- 本轮仅记录提交，免代码测试，无新版本/账本行，不刷新未触发的论文全库或操作对局进程。

原产出摘要（文件原处保留）：

```json
[
  {
    "path": "learner/runs/20261006-040345-fix-batch/report.json",
    "bytes": 879,
    "sha256": "129064eeda8ac4ade1b95554e0793d83463d21385bced35ea9ce2138577ea26f"
  },
  {
    "path": "learner/runs/20261006-040345-fix-batch/handoff-ops.md",
    "bytes": 1635,
    "sha256": "6d8f3aeddc20ae27f5e874e2fe0ff28c71dc5d9b17aaff7296123dc11580f2ae"
  },
  {
    "path": "learner/runs/20261006-040345-fix-batch/already-fixed.md",
    "bytes": 10420,
    "sha256": "e4a9b10c63d38abb9d667592b84ce0fbe798013ff8ff7f6accef9b9efb8b5890"
  },
  {
    "path": "learner/runs/20261006-040345-fix-batch/already-fixed.json",
    "bytes": 17839,
    "sha256": "949caeb57be3070f2175daebc942e06c4aec2bac32d8603d53ac09cc9a404af8"
  },
  {
    "path": "learner/runs/20261006-040345-fix-batch/source-audit.txt",
    "bytes": 241,
    "sha256": "b68483897e4c04e1855a0cb51a3db6ea9592a8b3b437bd32b4436651fbad6889"
  },
  {
    "path": "learner/runs/20261006-040345-fix-batch/sandbox-tests.log",
    "bytes": 501,
    "sha256": "56114dae8c3dfc15e6bc0c7cbf5fce019fc4db71c330aca5889824d445c38f42"
  },
  {
    "path": "ops/codex-ops/learner/20261006-040345-fix-batch.out",
    "bytes": 2640,
    "sha256": "5e28ab3bc43677fe2bdd7b46a2c1c5e3dbdadcab21c41ea95d2e244911c87141"
  }
]
```

学习者原108项提交核对清单：

# 已修条目核对

108 项已有提交均是本批基线 HEAD 与 live 的祖先。当前 agent 源码、工具、测试、learner 实现、运维脚本、eval 与知识生成器和 live 无差异；ops/inbox-dev.md 仅为主分支收件箱记录差异。结合队列中的历史关闭记录与现有固定回归核对，未发现新的已定位纯 bug。

- 旧V4.1纯bug批次 — 已修，提交 531d15444f5e9c29d85d36ff098f3fbf33e647af
- fight-value wrapper — 已修，提交 aba384cc503e53001933fceb688e9d2c24442b19
- 旧大脑失败日志及JSON解析 — 已修，提交 6d2ce32a6bf3b7771d93355d7a55eff634785870
- 旧大脑解析补项 — 已修，提交 81de842c8459b425059cf8bc7c1df920d0164ef9
- 执迷锁牌 — 已修，提交 8f1106a122c871d28b038fe464f9d9a2f2b106d8
- 波纹水盆 — 已修，提交 d561ecde5ed8e537653ef544c8c9fd44f8cba37e
- Codex完整剪裁答案 — 已修，提交 a296b309fe28e189bc925c8c5472616ec29fe37d
- SL统计及状态闭合 — 已修，提交 af6f07adfee1ad62ec85d613ab36a7b11857ce89
- 沙坑连续斩杀 — 已修，提交 85d1e70744489411a597b0b2b6710a45fbe52aa1
- 刀刃陷阱 — 已修，提交 066f91599bc45161acd0b741a2d3fd8e39af8bfc
- boss时钟角色隔离 — 已修，提交 8948a2fb87ab90949b2464c59bf6569bd5f3931d
- fix-batch任务模板 — 已修，提交 5805dd187b7913a53b9e2645f40db1657eb5213c
- 经验模板及默认live — 已修，提交 16ebc4aecb12a1d4b2f34ee767bb2816a3a0b466
- 角色中性前缀 — 已修，提交 6d2de57ceae3def4caf073951ed9d2f9d1544cd7
- 流式大日志prompt dump — 已修，提交 6ee8e2a2c1edc31492962137b96af8c6e1d12093
- 自动经验派发 — 已修，提交 32c3f998bd3dc218f3fcafce5e48ced986445b7e
- 沙箱测试/完成事件及Inferno夹具 — 已修，提交 5c307224cd7ca34b249acd24f5c050a418a32c6f
- eval-metrics动作 — 已修，提交 ef46d720c74909aecff9a09ff7e6d443e06cd9d7
- 暴露易伤 — 已修，提交 62e1166475a715f84c4bfe8acd102762b5a3e50e
- boss跨SL统计 — 已修，提交 3f40af6fffbb37a06e258c0e4b314a9fe8faaede
- 融入暗影 — 已修，提交 82c50cc0e41d4206ae272c76a97fbcbe783827a9
- 腐蚀波 — 已修，提交 53cc31f453ef441d3770dd7598e3b7f071ea14c5
- 悔恨 — 已修，提交 3fcb1f5f0c373a04feb807aa9b2bedebe403edcc
- 灵动步法 — 已修，提交 d8a2b0090ba8145c0b6d20bcae700006f01e2c79
- 余像 — 已修，提交 e0541ebc4a8786250d08869731fa07d303c0c8b8
- 暗影步 — 已修，提交 90b1fbebf38f9896ad14ffa1ace80ce9e3feb013
- 胧光怪召唤 — 已修，提交 1e076b173c6874cef4bf90fd13cd3eb33355827a
- 毒模型 — 已修，提交 f6c5504a73b2ee3702812a5217dfcda8b14e18aa
- 跨SL实验体阶段 — 已修，提交 4ed3c72df30f27b881da637aebf528b97440e0bb
- tsc运行归档排除 — 已修，提交 7bc835803f2efd44a5cc6f2009933f3c3bee7653
- outcome-stats刷新缓存 — 已修，提交 2650aed8baa84b8cf26e1e98b975582a6d5ab537
- 萎靡X减益 — 已修，提交 0d7465a0962f4e0234530bb390da6ab0fcd5f8e2
- 首次开局时间判断重犯 — 已修，提交 2610945b6a2f9ea02cf3a7cd4b5980d24814ac39
- 撕咬共享成长 — 已修，提交 8ffd62ef082e59d53440ca9f9eb34184df832157
- 风的女儿 — 已修，提交 907a19f8d03ede74ed135c0395d120ed84232358
- 奖励屏较低终帧 — 已修，提交 098a54719bae87b909b25174a73ccebd68a17a61
- 策略任务及派发 — 已修，提交 afd652a3f75df6e7403439f01c565220327884da
- 兜底完整补测 — 已修，提交 f670884a188a047bbd3f7f007c260ade62fae36a
- 单次超时卡死误报 — 已修，提交 a4f4ec868d122dc92af510862c6240cf2eaff2b6
- 学习状态锁 — 已修，提交 233ede56047274ba53a4e1191a245fac816c37a8
- 账本来源更正接口 — 已修，提交 87c89b7aea90c7275e0fbb04b1e4148a4209630c
- 预判临时敏捷 — 已修，提交 cd55a88517ed1d44c3f8bf64e0c9f2ab14ccb2e2
- 计算下注 — 已修，提交 3cd9fc6c6b6bfa378508f7bd5ca2219c1088ad39
- 涂毒 — 已修，提交 e3e7068b028e9d9bb75441b99a973161e9d90f4d
- 动作说明与静态回归 — 已修，提交 ed86d537bc1d6f91364abb77156060edb13ab4ba
- 药水测试数据隔离 — 已修，提交 e78352f784d39cf25671446348daaada6ef2060b
- 异蛇头骨毒雾触发 — 已修，提交 166594ed6b0a0fb206a6cee40bfb208da142d5f1
- 脆弱下新增敏捷格挡取整 — 已修，提交 71af970600794f87a993df428cdde14dd7809dd7
- Codex会话模式隔离误拒子项 — 已修，提交 35565208b4eaae0039daa30abd964c8ef8b0d66a
- boss后构筑模拟与低胜率题面 — 已修，提交 de5dd9f17b9bec09934fc3ed2b63082f5d520b5d
- 钢笔尖 — 已修，提交 26c1e77269e098f52e215b98f5d4127d17c4fc95
- 魂缚锁牌 — 已修，提交 2864d3612722571bfaf69382435acc4c8800f8c3
- X费串刺零能量 — 已修，提交 7e69e6731b2e66268991b6cd82928a165139bc56
- 滚石回合开始稳定等待 — 已修，提交 c301574ee9cfb2018a39b6a15692efb2948241b4
- SL重载接受战中选牌屏 — 已修，提交 0660f9972e2edce46b637713863acb62a3400f20
- SL敌人分节名字 — 已修，提交 7564be3661d759ddb6c0595dc940f57567f32807
- 无惧疼痛判官虚无格挡 — 已修，提交 a677f159027f3d761067d07d5fe6f41f23e1a70b
- 果汁持有时B3合成开局 — 已修，提交 7f4759dd3f863ab989ad25f1e6c35699a3979c60
- 蜥蜴尾巴首次路径 — 已修，提交 8c93fa43927760be3088e1e7fc7dbdd7c0851edf
- SL手牌回合末伤害 — 已修，提交 491eaeb5bfb6e779cfe853e1e0e5faddf9f29ef3
- SL已知抽牌与随机目标 — 已修，提交 3c95965ce77827b5864254ea46dc25275dff5810
- SL下回合自身失血判官 — 已修，提交 fcc89d85209f7855845fc99f315fa1d08cbfd2f7
- SL探寻打击与回放 — 已修，提交 914515cf46390020ff8da4c8a2f1bc50ef0e4652
- 抽牌自身失血/上限判官 — 已修，提交 79ef4eb0446ef3c15d65689c3de756261da19456
- least-loss回合内自杀 — 已修，提交 08ec8f98fcd9a43df332a5d858c50faf9e9d214a
- SL抽牌换线与首战去重 — 已修，提交 cab3c3f4f4b9d669a091ed7581c34299e2e92b52
- 缩小伤害 — 已修，提交 b0e96183a8798c77676fe83f386042abf2851254
- SL整回合去重与护手药水费用 — 已修，提交 f4f4b0d3b666b3802114380bf3a7a4ca6df7cb70
- 尾巴复活后继续受伤 — 已修，提交 91e2219b47f9fc57cede5bf6465111e27a192319
- 巨兽自爆与沙坑判官 — 已修，提交 0727c1cd2d44801b02ed82a36056e166d2ef200f
- SL药水位置去重 — 已修，提交 61d236ceeb38a0752da47e15a9d35bd7fc0cf12f
- 小刀出牌目标 — 已修，提交 7023574b375743bb02ff8150952ac9ee5904723b
- SL重放/混沌牌堆顶 — 已修，提交 554951daa4908ad2a0116fa9ac928cfbc82a8508
- 狱火判官多层失血 — 已修，提交 3dfc2af7438ce075d80044a7ce4f2675193dab7f
- 狱火求解器多层失血与开局稳定 — 已修，提交 03eedec0b340e6f67363f59d14e3342811af53ff
- SL剑柄打击断序与引擎题面 — 已修，提交 ed03f4cee65e1ace987b0aa772b503180b90cabd
- SL换线执行/最佳参照 — 已修，提交 8939eb0e7511559a765f393a3adf8cc7512d5492
- 乱码路线字段与换线实际一致性 — 已修，提交 0b12aa1a34c6403cdf64e9f92ac7f09c2617ab0f
- 进程扫描竞态假stall — 已修，提交 9692ea6d632162edbd674fa6d83344e380d15e1b
- 知识前缀变化误判配置变化 — 已修，提交 d6af9894e4d990db6bbffe08ab4e01044605c52c
- 旧事件选项屏重问 — 已修，提交 25ce09bee5576b1adff8baf196fbe8b197a5ef11
- 未校准静默时钟事实子项 — 已修，提交 79f7579e29e39e1dcae9e1ea3bdceb53bf9a734b
- CARDS_VIEW覆盖层重复决策 — 已修，提交 518b6880b46db88752f3666ff8471267c3f6638d
- 静默阶段结束事实子项 — 已修，提交 1d57f9d0dbbb63603e9ce9768e74cb2021478464
- 幻影之刃同方案首刀增伤 — 已修，提交 d65609ff2bc98ec5ec2e06b558159aba89d93032
- 音叉技能计数漏算7挡（6EV5V6PJJS9D F39 T3；T082DRCUHRRD F12 T7；silent-0108/0072） — 已修，提交 dba8d7caf9f2b44dd2fd11fd8861ecc14be4c09b
- 融入暗影+升级分支 — 已修，提交 2184caaab265ebf86c0627aaef39c2e7a170a990
- 预判+升级分支 — 已修，提交 d91f9600286a67480b5044e019dbb1041e2239af
- 策略任务xhigh测试契约 — 已修，提交 d73a29ad5185ae2669260f3e4b1b9e693a122e97
- 爆发增益未进入后续技能推演（silent-0114） — 已修，提交 dce7dc19c15f8cd1de57a5fffb2011ca1aac2187
- 持续安全订阅额度采样及周/五小时窗口映射（Roy批准架构） — 已修，提交 bd41843192173de8344e805de45bfde74b9cfa5c
- 五组件token与成本归集、论文表和累计曲线（Roy批准架构） — 已修，提交 637ed9dc0ef71177cdb480eceacbf7ab2c8988e4
- 升级爆发2层技能重复漏入推演；VN7RQJMJEFMX A6 F27 T6、机制silent-0115 — 已修，提交 dafd280bc04f10573cf4205d55e5b80e1400be03
- 额度/成本测试在未设置TMPDIR时失败 — 已修，提交 6bfbe3d2e2aa6e5e8c1969d5ee1cca08671ae02a
- 补齐成本分层：日志库组件用量/规范额度日志/每局刷新/未归属学习批次（Roy批准架构） — 已修，提交 83b73312a420f4aff612f017a95dfebace562a4d
- 旧血量护栏 setup 例外失效子项 — 已修，提交 984b950b3a1f8e099f4a199041eb49635f210a0d
- 钗 SAI 格挡漏建模 — 已修，提交 16e0b16a3f0c11f6837e02cd9b8e22be841af19b
- 迷失鬼火逐能力伤害漏建模 — 已修，提交 c68bf255a5ca8da5806ec89f6f4f1e704590d3f4
- 尾巴回合末复活追踪与 GAME_OVER 虚假 SL 记录 — 已修，提交 e32c8b7584181486ffcf3b70c0ec4f9a5608c17d
- Jev计价及TypeSafe全部角色日志核对 — 已修，提交 80199dcc3f7a66bfceeb7d8c028c6c3bad935b7c
- 缺眩晕后继/伤害预测标未知（silent-0127） — 已修，提交 631f94856702772a4bc5e27d38ddfc140fb0d714
- Inferno测试首次读取/真实时间竞态 — 已修，提交 195869aa77dc216de08e6d1c5842782b239cb670
- 单行动重复扣挡 — 已修，提交 779c954876d56d08dab92f89f27345c9788e3d87
- herdr关闭注册表竞态 — 已修，提交 526b71cc316bc1824b76500b7003a9c02a725b60
- 02:40/03:00预算硬截止与单调时钟传播 — 已修，提交 9889436c3b332a3984cdb7f850a1349f464182d1
- 升级腐蚀波3层抽牌施毒（2PVLGRBGUX9S F48首T11；silent-0076/0137） — 已修，提交 a62cf381f26435693ce30548c9433d219f750b02
- 静默专长科学2力2敏捷（2PVLGRBGUX9S F48首T2/T4；silent-0136/0138） — 已修，提交 32daefc69239c5d23741f35e2f5ce71bef25ebce
- 升级萎靡X+1（LLYSRQQ35AVW F33 T3/F38 T1/F48 T2；silent-0144） — 已修，提交 d48d16129b10e5060dc9d33a1b96e3340c7b82b8
