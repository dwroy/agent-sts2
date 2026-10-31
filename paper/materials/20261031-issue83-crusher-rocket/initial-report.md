# #83 优先批：CRUSHER+ROCKET 数据量及 ETA

接主管83/6542053381，优先顺序改为 CRUSHER+ROCKET → KNOWLEDGE_DEMON → 原四Boss。原树/线程恢复，旧八项研究差量保留；R462/off工具工程已接收，不重做其full。新口径先于派生提交6246816cd，自有新增窗口截止2026-10-31 18:16 CST，原107 tune/551 val不动，新增只val。

| Silent A10自有，全部引擎盘点 | CRUSHER+ROCKET | KNOWLEDGE_DEMON |
|---|---:|---:|
| 全尝试源记录 | 302 | 204 |
| SL核ordinal=1的首试 | 113 | 104 |
| 重试（另列） | 189 | 100 |
| 首试实际胜/死 | 47/6 | 69/0 |
| 首试预测死中止（实际未知） | 60 | 35 |
| 首试实际tune | 1 | 1 |
| 首试实际val：原窗口 + 前补样 + 本次补样 | 31+20+1=52 | 34+32+2=68 |

以上是数据可用量，不是新模型准入结果，也不是纯Codex胜率；引擎、版本及未知仍须独立认证。val完整性/新模型指标、实际Plan/候选完整覆盖和真实Jev两臂均未通过，不能因n≥10就开。

原runs日志逐行核实最近14局全负，其中5局终局death_enemy_ids为CRUSHER+ROCKET、1局KNOWLEDGE_DEMON，五局CRUSHER都在10/31 CST。五局ID：DJ0FNHDE0DKZ、4W4X62DRSTWA、QE18E5JXBUZB、Q49RJLSL7QTG、TBFLR466YFJG。其首次尝试均是predicted_death后SL中止；最后run失败与首次实际死亡不是同一分母。因此5局进入重点失败复盘，但不补造5个首试实际死亡。逐局时间、raw行SHA、T1 off/SHA与SL原件在initial-data-inventory.json。

外部只读#82已审计1003份Silent A10/v0.111.0安全投影，逐文件重新核SHA。完整下载仍partial，未加自有val。外部KAISER_CRAB_BOSS以199个combat_start的真实CRUSHER、ROCKET实体证明对应，不能仅凭字符串搜索得到错误的0样本。

| 原投影first源标记（独立分母修正见下） | 发现 | 留出 | 重试另列 |
|---|---:|---:|---:|
| CRUSHER+ROCKET，全部观察层数 | 114（81胜/11负/22缺end） | 58（41胜/6负/11缺end） | 27 |
| CRUSHER+ROCKET，仅act2 F33 | 110（78胜/11负/21缺end） | 57（40胜/6负/11缺end） | 27 |
| KNOWLEDGE_DEMON，全部观察层数 | 97（72胜/10负/15缺end） | 65（40胜/7负/18缺end） | 40 |
| KNOWLEDGE_DEMON，仅act2 F33 | 96（71胜/10负/15缺end） | 64（39胜/7负/18缺end） | 40 |

五个CRUSHER外部首试在F35，另列，不凑F33。原按seed的发现/留出划分不变；缺end不算死亡，外部统计是观察分布，不能证明某打法因果有效。来源manifest SHA5626aa6e…；完整SHA和各窗口计数见JSON。

预计时间从本次18:14恢复计：**今晚20:30 CST前**给CRUSHER+ROCKET首版机制/失败复盘、至少三条有证据候选和#87紧凑档案；**23:30前**补模型偏差定位、原题面/Plan完整性与可配对样本盘点；在nice19、最多两进程限制下，**11/1 00:30–04:30**给首轮校准及离线配对结论（通过或未通过及缺口）。旧200样本/两起点717场已实跑到10/31 03:21，说明不能把重放视作即时；优先复用源码/输入/知识SHA都匹配的原始基线，缺失及改动臂另跑，明确复用范围。原组合检查/真实Jev响应耗时与准入不通过可延长开启时间；这些是首轮结论ETA，不承诺届时一定通过或生产已开。若预计滑期，先在issue报实际进度和新ETA。

KNOWLEDGE_DEMON排下一批，先同步盘点给#87；CRUSHER首版/首轮检查未完成前不抢其计算资源。开发不运行play、不改live/STOP/生产变量/其他会话，逐Boss开启仍由原ops在验证通过后按原授权及自然边界执行，原回滚条件不变。#87当前可先用事实计数/unknown，不能把候选当已发布K1策略或已证机制。

本次首轮提取误用了无duckdb的系统Python，未改数据/安装依赖；原错误日志保留，改用既有data/logdb-venv后只读提取成功：新增30个结束Silent A10局、95尝试、48实际可用，未sync或写生产DB。较早原窗口/较晚val、外部/自有继续分账。


## 18:40 独立分母复核修正

初报把投影的first源标记作为首次场次，进一步查出同一run/act/floor存在带#1后缀的新combat_id且attempt_id重新从0开始。CRUSHER的172标记含14个重复冲突段，KNOWLEDGE_DEMON的162含9个。不能算独立首试，也不擅自推定后段就是哪一次重试。按每个run/act/floor最早start_line保留“首个观察段”，后来冲突段另列unknown；原投影first/retry/default_eligible不改写。

修正后CRUSHER为158个首个观察段（发现104/留出54）；仅F33为153（发现100/留出53）。KNOWLEDGE_DEMON为153（发现95/留出58）；仅F33为151（发现94/留出57）。所有胜败/缺end及冲突原件见external-first-conflict-audit.json。按seed分组不变，自有113/104和val52/68不受影响。原计数表及旧提交保留用于审计，#87应用修正分母。
