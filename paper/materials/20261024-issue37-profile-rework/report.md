# #37 实际 profile 八失败返工

原冻结输入在隔离副本中复现同名 **8 败**；修正验证装配和一个测试路径后，同组 **8 过、0 败**。三个被包装的 Python 模块另行实跑 **123 过**，开发树 production tsc、隔离 profile production/tools 两项 tsc 均退出 0。没有运行完整测试、游戏或模型，没有改 live/STOP、原 ops 检查树或其他会话。

原 ops 完整结果仍为 673 文件、6562 过/8 败/2 历史跳，SHA `ccb80fd81490386b0c0458bf38f07e526e84427c590f40de4a8882efc3f3e8eb`；原 revision5 main 的 6661 过/0 败/2 跳也保持其原受测范围。新定向结果不替代下一实际组合完整检查。

## 逐项分类和修正

| 失败 | 原因与证据 | 修正 |
|---|---|---|
| agent-board-poll 包装 | Python 六例在 setUp 读取 `.agents/board.yaml` 时全部 FileNotFoundError | 从原冻结宿主提交补齐该配置，作为验证夹具，不启用派发器 |
| brain-view 包装 | Python 保护标题的真实 Board 合同缺同一配置；另外的 ResourceWarning 并非失败原因 | 同上，保留真实保护规则及所有断言 |
| learner-tabs 包装 | Python setUp 缺同一配置，尚未执行生命周期断言 | 同上，123 项模块测试含所有生命周期保护，不操作真实 tab |
| check-imports | 已装入宿主 `ops-herdr.test.ts`，却只选 `*.test.ts`，遗漏其静态导入的 `herdr-workspace-fixture.ts` | 从同一宿主提交补齐非 test 后缀的辅助模块，不排除导入检查 |
| learner-wrapper-scripts 的三例 | 宿主 wrapper/recycler 文件实际存在，但测试 `git ls-tree HEAD` 查的是原游戏基线，那里没有 `ops/learner_tabs.py`；两种输入身份混用 | 给实际执行的游戏＋宿主输入建立独立、仅验证用途的 Git 快照，HEAD 如实列出输入；不改三个测试，逐一删必需脚本的负控继续执行 |
| brain-claude/version | `checkClaudeBin` 把含完整 bin 路径的错误截到 200 字。长 TMPDIR 下，重复的绝对路径使 ENOENT 落在截断之后 | 测试使用 `./` 加相对 tmpdir 的受控缺失文件路径；函数原本在 tmpdir 启动，目标仍是同一个不存在的文件。原 ENOENT、非零退出、超时断言全部保留；生产实现不改 |

两份新增夹具均来自原 `host_source_head=a4cc9b0eba109fa4ea676e506f38e0f0679ac73c`，SHA 见 [verification.json](verification.json)。原 2760 份输入中只有 `agent/tests/brain-claude.test.ts` 在修复副本改变；另加上述两份夹具。原 ops 输入 2760 份、依赖 1417 份复核均未变，九产品叶全部保持原 SHA。因此本次八失败可在验证装配与测试路径层消除，无须改 Jev、大脑逻辑、预算或知识。

## 固定复现方法

`reconstruct.py` 是本次离线复验配方，不是发布入口，也不启动 full。它只读原冻结树，复制清单并逐份核 SHA，在本开发树 `.artifacts/` 下创建独立 fixture；共享的仅为不可变 Git objects 和既有 node_modules，refs/index 独立。目标已存在或输入漂移则失败，不覆盖。repair 阶段补两份夹具、应用精确测试差量并保存实际输入快照，不修改原 owner 的 HEAD/index。

在本开发树执行，`MAIN_CHECKOUT` 指向主检出，`CHECKOUT` 指向本开发树：

```bash
nice -n 19 python3 paper/materials/20261024-issue37-profile-rework/reconstruct.py baseline \
  --repository "$MAIN_CHECKOUT" \
  --materials "$MAIN_CHECKOUT/paper/materials/20261024-issue37-actual-full-ops" \
  --destination "$CHECKOUT/.artifacts/issue37-profile-rework/profile"
# 原同名八项定向：得到 baseline.json 的八失败，退出 1。
nice -n 19 python3 paper/materials/20261024-issue37-profile-rework/reconstruct.py repair \
  --repository "$MAIN_CHECKOUT" \
  --materials "$MAIN_CHECKOUT/paper/materials/20261024-issue37-actual-full-ops" \
  --destination "$CHECKOUT/.artifacts/issue37-profile-rework/profile"
```

在 profile/agent 中直接执行 Node CLI，使用长 TMPDIR、nice19、threads 单 worker/不并行文件；线程不新增 worker PID，Python 或假 CLI 子进程串行，任务最多两个进程：

```bash
nice -n 19 node node_modules/vitest/vitest.mjs run \
  tests/agent-board-poll.test.ts tests/brain-claude.test.ts tests/brain-view.test.ts \
  tests/check-imports.test.ts tests/learner-tabs.test.ts tests/learner-wrapper-scripts.test.ts \
  --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=60000 \
  -t 'keeps the minute dispatcher|checkClaudeBin:|renders and follows fixed brain logs|relative imports all resolve|reclaims only verified terminal learner tabs|learner wrapper published script closure' \
  --reporter=json --outputFile="$CHECKOUT/.artifacts/issue37-profile-rework/repaired.json"
```

结果按八项选定断言计数。JSON 中另外 14 项是名称筛选未选中的同文件用例，不能混称原完整测试的两项历史跳过，也不宣称六文件全用例通过。对应三个 Python 模块另外 123 项全跑通过。production/tools tsc 都使用各自原 tsconfig，noEmit，无安装依赖。

## 交还集成员与 ops

开发分支已合当前 main，保留 #41/#44 的整份采样时钟、预算耗尽对照和 afterEach，补回原开发三行历史记录。新增提交的可部署运行代码差量为零；检查配方和本地快照不进入产品九叶，`.artifacts/` 不进 git。快照仅说明本次混合输入，不能冒称宿主新发布或经验 source commit。

下一实际组合必须重新冻结当时 live/宿主输入，保留 **R430 新策略库、目录及后续自然刷新**，不使用本次为复现而保留的旧 R429 知识覆盖生产。装配时同时收齐配置和辅助模块，记录各自宿主提交/SHA，将有效验证 HEAD 与九产品叶的发布清单分账，再协调唯一完整检查窗口。不要直接重启旧 publisher，也不能用本次八项或原 main full 代不同输入组合 full。

091302 `source_commit=null`、原 failed/rc0、净12经验候选和 .2 排除不变；实际源码发布、首自然局 Jev 无 open_book/无调用错误、其他 issue 的自然门与科学父均保持开放。
