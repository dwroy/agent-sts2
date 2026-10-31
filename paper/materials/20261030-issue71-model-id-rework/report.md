# #71 原链返工：10/28 safe-cache model_id 缺口

2026-10-30，按 #20/6523733863 在原工作树、原分支、原线程恢复。开工及交付前均核本地 main 与 GitHub main 为 `1b7c652cbd5ef2355687e1e159fccacb2a73da06`；原交付 `282155113e65293f62d557e1d82aeeb147d7406b` 已在其祖先中，原树干净后仅 fast-forward，未重做原功能。

## 问题与修复

10/28 诊断原件在 `paper/materials/20261028-issue56-external-codex3-ops/`。当前 main 的 `ops/external_stock_source.py` 仍为原严格 model ID 校验，问题未修。用固定 main 的旧源码对原安全缓存重现 `invalid projected model ID`。

55 个不匹配字段全部是两个 v0.109 完整窗口的房间 ID：monster 30、elite 14、boss 5、event 6。它们使用 `ACTSFROMTHEPAST-` 命名空间；旧校验不接受连字符。来源是 #54 原允许列投影中原样保存的 room model_id，未查询数据库，也未借此推导游戏机制。

修复仅在房间字段接受该已观察命名空间：monster/elite/boss 的 `ENCOUNTER.ACTSFROMTHEPAST-`、event 的 `EVENT.ACTSFROMTHEPAST-`，尾部仍限大写字母、数字及下划线。其他命名空间、类型错配、卡牌/遗物/选择/变换中的连字符、额外标点仍拒绝。没有整体放宽通用 ID 正则，没有去前缀、过滤轨迹、重写缓存、改投影或重算分母。

含这些房间的计划在冻结 work-spec 中逐完整窗口 key 标出命名空间，要求提炼时分账、保留限制，不视同原版机制或原版适用性证据；`has_modifiers=0` 不能代替内容适用性核验。不含这些房间的原计划文本保持原生成方式，既有身份及不可变对象不迁移。

## 验证及失败保留

- `safe-cache-verification-r2.json` 绑定最终四叶 SHA。对原 7,445,459 字节 gzip（SHA `5c040c644cce7ad28eb247aef33f90413030ee23bc7015ac84366390e830b58f`）及 681 字节 receipt（SHA `8f71e081787e100cf1ae1ebbf05e95ccd0f69b58e74cd42c95dfcf4e65dcd57c`）只读验证：旧 main 报错，修复后 6,348/6,348 通过，五版本及精确 build 分母均通过原核对。逐记录比较房间 ID、完整窗口、版本/build、胜败与稳定 key 全部未变，缓存及 receipt SHA 读前读后相同。旧阶段结果 `safe-cache-verification.json` 保留，不冒最终测试叶。
- 新增固定数据用例重现两条轨迹的 55 个字段，核整批导入、原发布源校验、计划分母、完整页、限制与 key 原样传递，以及其他命名空间/字段/类型和 SHA 拒绝。新测试使用独立 source fixture，避免创建无关的 240 条调度库存。
- `targeted-vitest-r3.log`：三个文件 45/45 通过，内含 Python 30/30；外部证据消费者、原 backfill 与 stock 全通过。threads 单 worker、无文件并行、nice 19，串行执行其他检查。
- `production-tsc-r2.log`：生产 `tsc -p tsconfig.json --noEmit` rc=0；空日志属正常成功，退出及 SHA 另见 `checks.json`。
- 早期新增测试误把 `external.source()` 返回的 tuple 当 manifest，报 1 error，改为读固定 manifest 后直接 Python 30/30 通过（3.822 秒）；此为测试代码错误，未修改生产校验来过关。后续 `stock-python.log` 30/30，3.656 秒。
- `targeted-vitest.log`、`stock-vitest-recheck.log` 保留两次包装子进程 20 秒超时；`targeted-vitest-r2.log` 保留 Python 全通过（19.482 秒）但触发 Vitest 默认 15 秒超时。核 `/tmp` 为 tmpfs、项目统一临时目录为 ext4，耐久夹具的 fsync 在磁盘目录更慢。因此本文件包装子进程和测试均显式 60 秒，与当前组合 full 的 testTimeout 对齐；断言与 fsync 未删除。r3 实测 Python 17.646 秒。
- 未启动另一份完整回归或 sandbox 全量；当前实际组合的唯一完整检查交原集成链，不把定向绿或历史 full 当新组合 full。

复核命令：`nice -n 19 python3 -B paper/materials/20261030-issue71-model-id-rework/verify_safe_cache.py --root <原缓存所在主检出>`。脚本只输出安全缓存身份及聚合诊断，不输出原始轨迹或原数据库内容。

公开归档将诊断 JSON 字段 `stable_keys_sha256` 改名为 `record_identity_digest`，数值不变；gitleaks 的 generic-api-key 对前者与其高熵 SHA 组合产生误报。原始输出逐字节保留在本树 `.cache/issue71-verification-originals/`，原件 SHA 见 `checks.json`，复核脚本仅同步输出字段名。未设置扫描豁免。测试日志为原始输出，保留其末尾空行。

## 精确交付与运行接管

部署差量只有 ROOT 的 `ops/external_stock_source.py`、`ops/external_stock.py`。ROOT-only 测试为 `ops/tests/test_external_stock.py`、`agent/tests/external-stock.test.ts`，材料中的验证脚本仅供复核；零 LIVE 叶、零宿主安装、零数据发布。各叶前像 Git blob、后像与 SHA256、模式和回退映射见 `source-map.json`。原 #71 七叶中其余五叶已在 main，本轮不重交旧批或强制重装。

固定新 HEAD 由 `issue-71-a10-continuous-learning` 保留；`ops/board_queue_request.py` 仅准备新 ID `issue-71-model-id-r1` 请求到本树 `ops/codex-ops/delivery-71-model-id-r1.json`。不 submit、不启用队列、不改 main authority。#79/#69 不作为本次独立源码的新增依赖；真实发布若遇原门或 owner hold，保留并由原负责链接续。

原集成按当时实际 main 冻结组合、跑唯一完整检查，核两 ROOT 后像；ops 在原 learn.lock/发布/配额/owner 门下沿原 CLI 重新核 safe-cache 和 prepare 状态，已有 control 时不得重初始化。随后由自然 tick 维护 ready 库存并启动原批次，不从本报告补记实际读取、提炼、K1 发布或消费者读回。回退只还原本轮两 ROOT 源码到所列前像；已登记不可变对象、旧批、读回和现场保留，control 的 hold/恢复交原 ops，不倒填成功。

本轮未运行生产 prepare/tick、模型或 play，未改 live/STOP、运行开关/容量/配置，未停其他会话。未分配 release_id。父 issue 继续等待两份不同后继自然单元及读完→提炼→K1 发布→消费者读回，不声称自然采用或胜率收益；原树、原线程及旧失败全保留，不 complete 或回收。
