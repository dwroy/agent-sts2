# 交接：Jev 代打杀戮尖塔 2（xdwin：Windows 跑游戏，WSL 跑控制器）

来自 Mac 上的 session「JEV 模型快速决策研究」。Dai 已确认分工：你在 xdwin 上负责落地和跑对局，Mac 侧负责协调和盯进度。本文存于 `~/Projects/sts2-jev/HANDOFF.md`，上下文被压缩后回来重读。

**第 0 步**：确认 `pwd` 是 `/home/dw/Projects/sts2-jev`。不是的话只回一句「交接说明发错 session 了」然后停止。

## 目标

让 TypeSafe 的 Jev 模型驱动杀戮尖塔 2 自动打一局。Jev 是 System One 模型，只回答 Choice / Score / Noul 三种带概率的类型化问题，不生成文本，单次 70–500ms。

- **阶段一**（本次）：链路端到端跑通，留下决策日志。
- **阶段二**（之后）：按日志迭代打法。

不追求胜率。公开项目里纯 Jev 在 A10 上 0 胜，唯一的 A0 通关靠大模型兜底了 213 次。

## 选定方案（Mac 侧已调研，别换）

- **底座 mod：CharTyr/STS2-Agent**，Steam 创意工坊 id 3796486050。游戏内开本地 HTTP `127.0.0.1:8080`，端口被占会顺延，实际端口看 `/health`。mod 从 v0.8.1 起只兼容游戏 v0.111.0，而 v0.111.0 只在 Steam 的 public-beta 分支。正式版 v0.107.1 配不了当前 mod。
- **控制器：DiscreteTom/jev-sts2**，TypeScript，Node ≥ 20。
  - 命令：`doctor`、`shadow`（只决策不动手）、`play`、`record`、`replay`、`explain`。
  - 自带保护：合法动作闸门、状态指纹防过期、预算上限、单实例锁；教程弹窗不自动确认，遇到会停。
  - 作者是对着 STS2-Agent 0.12.5 加游戏 v0.111.0 开发的。当前 mod 是 0.15.x，`doctor` 会报版本差异警告，属预期。
- **不用的**：
  - STS2MCP：上游修 v0.111 的 PR 还没合。
  - Zboubkiller/jev-plays-sts2 自带的预编译 DLL：来源不可信，别下载别装。
  - 一代杀戮尖塔的 CommunicationMod 系项目。

## 这台机器的事实（2026-09-23 实测）

- **系统与网络**：你在 WSL 里，Ubuntu 26.04，用户 dw。`networkingMode=mirrored` 加 `hostAddressLoopback=true`，WSL 访问 Windows 的 127.0.0.1 端口实测可通，所以控制器直接连 `http://127.0.0.1:8080`。
- **游戏路径**：Windows 用户是 XD，Steam 在 `C:\Program Files (x86)\Steam`。
  - 游戏目录：`/mnt/c/Program Files (x86)/Steam/steamapps/common/Slay the Spire 2/`，版本看其中的 `release_info.json`。
  - 分支看 `steamapps/appmanifest_2868840.acf` 的 buildid 和 BetaKey。正式版 buildid 23811903 就是 v0.107.1。
  - 创意工坊内容落在 `steamapps/workshop/content/2868840/`。
- **调 Windows 命令**：powershell 用绝对路径 `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`，而且要加 `</dev/null`，不然它会吞掉后续 stdin。它的中文输出是 GBK 乱码，让它输出英文或数字。
- **权限与工具**：sudo 要密码，别用 apt。缺 node、npm、gh、uv、jq。Node 装到用户目录，见步骤 1。GitHub 公共仓库用 https 克隆，不需要 gh。
- **出网**：经新加坡。api.typesafe.ai 握手约 0.14s，npm 和 GitHub 正常。
- **硬件**：5950X、RTX 3090、62G 内存，不是瓶颈。

## 步骤与闸门

2026-09-24 11:10 的现状：
- 游戏仍是正式版 v0.107.1，没订阅 mod，游戏没开。
- Jev key 还没给。

所以先做 1 和 2。从步骤 3 起等 Dai。

1. **装 Node 22 LTS 到用户目录，不用 sudo。**
   - 从 nodejs.org 下官方 linux-x64 tarball，用同目录的 `SHASUMS256.txt` 校验。
   - 解压到 `~/.local/node`，把它的 bin 加进 `~/.profile` 和 `~/.bashrc` 的 PATH。
   - 验证 `node -v` ≥ 20。
2. **克隆控制器并离线自检。**
   - 把 `https://github.com/DiscreteTom/jev-sts2` 克隆到 `~/Projects/sts2-jev/jev-sts2`，记下 commit SHA。
   - 先看 `package.json` 和 lockfile，再 `npm ci`。没有 lockfile 就 `npm install`。
   - 跑 `npm test`。
   - 用 `npm run fake-mod` 起假 mod，另开进程跑 `npm run doctor -- --no-jev`，确认离线链路通。
3. **【闸：Dai 在 Windows 上操作】**
   - Dai 要做的：
     1. 关掉这个游戏的 Steam 云存档。
     2. 切到 public-beta，等更新到 v0.111.0。
     3. 订阅 STS2 AI Agent。
     4. 「带 Mod 启动」，同意提示、启用 mod、重启游戏。
     5. 新建一个存档位给机器人用。
   - 你来核实：看 `release_info.json`，再跑 `curl -s http://127.0.0.1:8080/health`，确认游戏是 v0.111.0、mod 版本号、状态 ready。
   - 不要开 mod 自带的自动游玩，不要在它的 F8 面板里配模型，否则两个控制器会抢操作。
   - 核实完跑 `npm run doctor -- --no-jev`。
4. **【闸：Dai 给 key】**
   - 把 `TYPESAFE_API_KEY` 写进 `jev-sts2/.env`，权限设 600，确认 `.env` 在 `.gitignore` 里。
   - `JEV_MODEL` 保持钉在 `jev-1.13.0`。
   - key 不许打印，不许写进日志或消息。
   - 如果 Dai 给的是 OpenRouter 的 key，加一行 `TYPESAFE_BASE_URL=https://openrouter.ai/api`。
   - 然后跑 `npm run doctor`，它会用真 Jev 做一次冒烟测试。
5. **shadow 模式试跑。**
   - 跑 `npm run shadow -- --max-decisions 20`，只看不动手。
   - 汇总 `logs/decisions.jsonl`：各屏幕 Jev 延迟的 p50 和 p95、置信度分布、有没有回退或报错。
6. **【闸：Dai 点头】真打一局。**
   - 跑 `npm run play -- --max-runs 1 --max-minutes 60`。
   - 遇到教程确认弹窗，程序会停下交给人，这是设计如此。叫 Dai 去点。
   - 跑完汇报：打到第几层、死因、决策数、Jev 请求数和花费、耗时。

## 边界

- Steam 账号上的动作全部由 Dai 操作，你只核实。包括切分支、订阅、改云存档、购买。
- 代码只放 `~/Projects/sts2-jev`，别动 `~/Projects` 下的 notes、work、fomo 三个仓库。
- 不下载来路不明的二进制，npm 依赖以 lockfile 为准。
- 预算保持 `.env` 的默认上限：MAX_REQUESTS 2000，MAX_TOKENS 20M。按每百万 token $0.042 算，一个会话最多约 $0.84。
- 要改 jev-sts2 的代码就开本地分支改，不要推到任何远端。

## 阶段二（链路通了再说，先别做）

照 paulwei 的思路迭代：
1. 读 `decisions.jsonl` 找出错的步。
2. 改提问措辞或状态投影。伤害、斩杀线、能量先在代码里算好，再喂给 Jev。
3. 用 `replay --ask` 离线回归。
4. 再实战。

已知弱点：战斗时一次问 19 个选项，Jev 的最高概率常常只有 0.2。可以先用代码剪枝再问，或者拆成多个 Noul。设计上参考 `yzxoi/RSI-Jev-Slay-the-Spire-2` 的 `docs/design-discussion.md`：代码负责算，Jev 负责判断，大模型只处理少见的难题。

## 汇报

- **对 Dai**：在你自己的 session 里正常汇报。每过一个闸，说清楚现在卡在谁身上。
- **对 Mac 侧**：完成步骤 2、3、5、6 时，各用 SendMessage 回复来信方发一行进度，也就是交接消息的 from 地址。失败了也要发。
