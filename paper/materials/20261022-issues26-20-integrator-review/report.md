# #26、#20 集成核验

核验时间：2026-10-22T07:24:34+08:00。角色：[watcher] 集成员。#26 先核工具层，不等待 #33；两项精确补丁在一个隔离工作树合并检查，源码先 #26、后 #20，均已合 main。技术通过与生产验收分开登记，issue 均不在本次关闭。

## 交付与集成身份

- #26：`c3716ba15d94aa36f6eb99d47ff958efac181119`，集成补丁提交 `c905b2d63f8f4cac53eef1144c49e9b56477870f`。
- #20：`dec42bc988be9aeb4b177ca1f25943ad8cac96a8`，父 `466e54561` 已合 main；本次补丁提交 `5029ba8fde363b1e17551124872d63c3ee651544`。
- 私有 kit：`95f1efb3251a27f3f702540773a2b466920821e9`，独立经 Windows ssh.exe 只读核远端 main，同提交全部六文件核 SHA，原文件副本的固定测试通过。未发布私有源码到 STS2。
- 受检基线 `09cc184b4dbaf4e6e55c8b697a64a61ba0d4d265`；工作树 `.worktrees/integrator-26-20-20261022`；集成 main `7b8762a7c80b75597b3c0b9bee100a241bc9649d`。精确源补丁已应用并记录两个源提交祖先，未引入其未核父树。
- 开发源提交中两处 decision-log 追加未直接套入；本轮追加自己的核验记录，保留并行 ops 脏记录。未 push、未碰 live/STOP、未运行 play、未实际派发/恢复/回收其他会话。

## #26 技术结论

实读六工具实现、构建器、34 项固定用例、报告和 #33 原注册合同（issuecomment-6326522042，作者 dwroy、前缀 [dev #33]）。导出 `externalStatsTools(): ToolDef[]`，不修改 registry、引擎、题面、路由。#33 明确在同一控制器进程执行，共用 `knowledgeCharacter()/ctx.ascension`，其实际挂载另验。

投影从固定 Git 的 #24/#30 聚合输入逐字节重建；数据 1775714 字节、SHA `88eef1cd8b875ab27d47c3abc39335f271705672b53bd71a0f4b30286168ac07`。运行时限定 Silent A10，锁文件 SHA，版本分账；未知 ID、缺失、损坏和不适用角色返回明确无数据，不读取原库、网络或自有统计。每次返回来源、下载日、数据库/聚合 SHA、样本口径、区间和限制；16000 UTF-8 字节硬上限，只按完整行分页。

固定读回包括 SNAKEBITE 提供 2188/拿取 533、第一幕跳过 1456/13307、DECIMILLIPEDE_ELITE 死亡 52/762 场且 758 独立局/82 玩家。机会数不冒充独立局；逐行未知玩家/局数明确未知；玩家/幕调整只返回原表差值，不补造两组调整胜率。结束张数保留未来信息/存活偏差；遭遇 gross damage 不当作自有 HP 净损失；共现 lift 不当作收益。流派及共现成功/错误均保留“现有样本无法区分流派优劣、不作方向依据”，无法分辨不等于等效。

工具层准入通过。交 #33 按精确提交做六工具联合查询、角色隔离及挂载；ops 在同期或其后自然局边界发布、首局实际读回，主管核收后关闭。不追加 Roy 已取消的上线前后检查点指标对比。

## #20 技术结论

实读 STS2 补丁、私有 board/watchdog 引擎与新增固定用例，核开发原件及脱敏回放 SHA。`idle/done` 可输入；有活且连续观察空闲默认 30 分钟，普通同 issue+角色两小时限频；固定错误走十分钟退避。普通/快速共用三次无进展上限，第三次后留回应窗口，再加 needs:roy 与 digest，不发第四次。每 pane 每 tick 最多一次尝试；原 sending/uncertain 不因进展/换 pane 自动重发；尾屏仅内存判断。相关角色评论/提交/事件记进展，不将共享 main 的无关提交算进展。

生命周期例外严格核 Codex 直接父进程、真实 exe、完整 argv/固定脚本 SHA、无 Linux 子进程；其他 PowerShell 与任务子进程仍保留，未读真实剪贴板。显式 resume 仅恢复 allocating/allocated/creating-tab/tab-created，核同仓/branch/base/干净状态、进程、tab 和 terminal。创建回执丢失先查实物，确证未创建才允许显式重试；starting/prompt 不确定继续原 register。require-node 在 allocate 内失败并留安全原因/原回执，不安装依赖，不把可选共享工具全局改成必需。

147 项固定 Python 独立通过：kit 59、生命周期 62、共享工具/分配 11、原回收器 15。21:58/22:08 回放只产生一条快速接续，另外两处现场均用固定输入，未冒充生产操作。

源码及私有 kit 技术准入通过。ops 需按原安装说明在有效 off、无在途 tick、锁与 journal 保留的条件下升级精确 kit；`watchdog.py` 必须与 `board.py` 同目录，不能沿用旧四文件拷贝。各项目 owner 授权、正式宿主登记与唯一入口仍待主管/原角色确认；之后才沿原 stall 核首 tick、done 送达、接续/升级及真实命名/锁忙/回收。off 为回退；保留 uncertain，新账本已有 escalate 时不降级旧引擎并打开。本次不关闭整个 #20。

## 独立检查与原件

受检精确组合：最终聚合重建、生产 tsc、独立一整轮 Vitest 全部退出 0；648 文件、6124 通过、2 既有跳过、0 失败。nice 19、单 fork/单 worker、不并行文件，不拼接重跑当完整检查。全部 2098 项所列输入检查前后一致；外部数据另核 SHA。稀疏副本的 issue29 固定 results.jsonl 仅从受检基线 Git 补齐，不生成新游戏输入。原 identity.json 的 materialized_fixed_input 误为空值，原件保留；正确路径、逐字节 Git 核同与 SHA 另列 identity-correction.json。

本轮首次独立全检为 6123 通过/1 失败/2 跳过：既有 ordinary-close-isolation 包装在原 15000ms Python 子进程限时下耗时16.50秒、返回 status=null（6 项只输出前4项进度）；符合超时表现，但原包装未打印 error/signal，具体原因不能确证。保留原全检日志/JSON，原预算和未变源码定向复测 1 项通过、耗时 14.09 秒；第二次完整检查为 6123 通过/1 失败/2 跳过：check-imports 发现稀疏副本中既有 paper/materials/issue29-brain-speed/results.jsonl 缺失。最初曾手工物化该文件，但未纳入稀疏规则；消失的具体触发原因未确证。通过原分配器 set_profile 正式纳入固定文件及两项交付材料，补齐字节与基线 Git 相同，随后再独立完整检查全部 648 文件取得以上最终全绿。三次全检分目录保留，未放宽限时、改源码/夹具或把定向结果拼成全检；稀疏规则前后及修复回执一并归档。

开发 #26 首次失败、原样复测及最终分组全检，#20 两次范围变化中止（130）、旧包装数量断言失败/修复/最终全检均保留，原件 SHA 已核。它们不替代本轮独立全检；不覆盖失败记录。

合 main 在原 live-merge.lock 内先备份绑定，finally 恢复并核 SHA 及权限一致；合后代码输入核同（剔除六项明确运行记录；三份持续追加日志与 win-notified 另核 Git blob 与受检输入相同）。回执见 integration.json。首次合入尝试在隔离树暂存原交付日志时被 .gitignore 拒绝，main 未改变且绑定已恢复；核实际状态后仅对原提交列明的文件强制暂存再继续，原回执 integration-attempt1.json 保留，未改受检源码。合后原断言把三份持续追加的 ops 日志误列入源码核对而失败；main 已合，不重试合并，保留 integration-attempt2.json，另核2092项输入及日志 Git blob 全同，运行追加原样保留。没有调整生产开关、登记、会话或调度。公开材料/提交前差异、展开开发原件、私有 kit、本轮检查与评论发前均经 gitleaks；完整日志/JSON 压缩原件及双层 SHA 见 raw-manifest.json。

记录扫描：把含压缩原件的 --binary 补丁当普通文件扫描时出现5处 访问凭据规则 告警；展开原件与材料目录均通过。改用 gitleaks 原生 git --pre-commit --staged 扫描实际暂存差异通过，未放宽规则或加白名单；原失败保留本地，见 record-scan-correction.json。
