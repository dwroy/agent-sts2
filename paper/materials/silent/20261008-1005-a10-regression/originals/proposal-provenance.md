# 静默 Jev 药水题面跨角色来源隔离修复

角色：silent；已核 A0 与冻结 83 局 A10。来源隔离来自项目协议，不是新药水知识。账本 silent-0285；来源与实现任务均为独立 silent-a10-regression，完成通道 fix-batch。授权：Roy 2026-10-08 08:36/08:51 及学习协议的角色隔离。

旧行为：jevExperience 对所有非 boss 题注入 POTION_BOSS_DATA 的两段铁甲 A8/A9 硬编码战绩。静默经验虽然按目录读取，仍附带旧角色先验。

新行为：character_id 为 SILENT 时省略这个 data 字段。本角色经验、原 note/整局计划文字、候选、求解、排序、药水血价与 SL 保持；铁甲、未知及其他角色按固定控制保持原字节。

证据：C48LLXBGKXQ9 A0 F2 T1 原 Jev 请求；MGA0CZDDKC0P A10 F2 T1 固定原帧与请求。冻结 12353 条 A10 请求中 5454 条含两段旧统计。偏移、SHA 与分幕计数见 cross-character-provenance.json、contamination-counts.json、jev-experience-index.json 和 scratch/frozen-logs/jev-prompts.jsonl。

因果强弱：来源污染及协议违反有直接字节证据；最早 A10 即存在，不能作为 double-boss 上线后的新增回归。缺少同帧只替换此字段的真实 Jev 或整场对照，不能宣称改变选择或提升胜率。boss 原本无此字段；静默自有经验保留；IRONCLAD、未知及其他角色固定控制的 potion 上下文完全相同。

不拟合参数，不采用其他角色战绩或机制。统计切点 2026-10-08T01:05:21Z；83 独立完局，SL 另账。修复依据本角色实际输入和既有来源隔离协议。历史完整 dirty 知识树、脑系统 prefix 正文未存；选择反事实与胜率收益未知，不补机制或权重。

验证：真实固定 MGA0 帧四例；初稿 1 红/3 绿，修复后 4 绿；撤生产文件原字节 1 红/3 绿，恢复修复原字节 4 绿。每次提交前及合后用原 test-sandbox 入口，不修改排除名单。结果见 red-green.json、source-sandbox.log、live-sandbox.log。

预期影响：静默 Jev 不再收到旧角色统计，改善实验来源完整性；胜率影响待后续独立局评估。回退：live 锁内仅逆向本提交的 jev-experience.ts 角色门控，保留知识刷新和并行代码；固定测试验证。不整体退回 live。

提案 CLI 在源码实际成为 live 祖先后登记 implemented；本报告不代替运维 shipped。

实际发布：源码 693318efb3a72061c53ccdc06802c380ed3ff54a；初合 cad1261b151c18efdb41a3cbbb782daf8541391f 意外继承基线六个派发路径，已恢复为净三路径 0ccb002595cc5a1b2604d8b18427ab5e90aaafe3，其他4711路径逐blob保持。唯一 S1.a10-regression1，发布记录 8ef00878e539c8abf24d63254a9fa57eaf70c675。源/合后原沙箱分别 248文件/2608例、248文件/2608例，均tsc/vitest0；原失败publication-first-merge.json与merge-live.err保留。
