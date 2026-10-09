# 静默全部历史整套构筑学习报告

请求 `roy-20261009-historical-core-builds`；批次 `20261009-222802-fix-batch`；离线学习者 Codex；生成时间 2026-10-09T23:19:44+08:00。输入SHA256：`cae0078bf43043b3b131afaf5670a4b380f0f96e1414f64a5e289ce7a43040f0`。

结论：完成全部181局输入核对和四类候选整理，但通用性目标证据不足。173局纯Codex首试6胜、含SL最终10胜；A10纯Codex135局0胜，其他引擎A10共6局也0胜。没有“比较轻松过所有boss”的合格组合，也不能把低阶胜率外推A10。模板仅供后续大脑接入提案；没有修改生产知识、代码、参数、调度器、运维prompt，没有提交、合入或部署。

## 1. 冻结、角色隔离和完整输入覆盖

已先读README、最新STATE、decision-log末尾、学习协议、Codex战绩口径以及两份Roy请求。请求文件是任务目标，不作游戏知识。冻结输入181个唯一run_id完整纳入，范围2026-10-04T14:35:40.361Z至2026-10-09T14:24:09.910Z。原件副本及首次本轮哈希见 `originals-manifest.json`；原始冻结切点为输入frozen_at，不混后续局。

| 日志 | 冻结字节上限 | 本角色原行核对数 | 保存原字节数 |
|---|---|---|---|
| runs.jsonl | 272388 | 181 | 79381 |
| run-config.jsonl | 1115965 | 183 | 836243 |
| sl-attempts.jsonl | 25475637 | 1094 | 22535015 |
| brain.jsonl | 352843274 | 5945 | 207991787 |
| decisions.jsonl | 874906767 | 116614 | 416571455 |
| states.jsonl | 10353421740 | 121622 | 4097640224 |

六日志只从只读DuckDB现有索引查询指定局号并约束 `off+len<=log_byte_limits`，随后 `seek(off); read(len)` 核角色/局号、计算SHA并保存原字节。全流程nice、单进程，DuckDB threads=1；不执行sync。`*-query.json`保存精确SQL；`*-offsets.jsonl.gz`保存每行源文件/偏移/长度/保存行号/SHA；`*-raw.jsonl.gz`为逐原行原字节，`*-compact.jsonl.gz`是本轮原文重抽的分析字段。`states-augmented.jsonl.gz`另立终局字段修订，原抽取未覆盖。

可复算命令：在本工作树中执行 `nice -n 10 /home/dw/Projects/agent-sts2/data/logdb-venv/bin/python learner/runs/20261009-222803-silent-historical-core-builds/extract_evidence.py`；随后 `nice -n 10 python3 .../augment_endpoints.py` 和 `nice -n 10 python3 .../analyze_history.py`。报告脚本 `build_report.py`仅读冻结抽取产物。实际各次stdout/stderr/退出码单独保存；重算应另立目录，不能覆盖本批原稿或重跑账本追加。初次分析v1语法失败rc1、探索路径失败、v2/v3口径修订见 `early-command-records.json`、`revisions/`、`changes.jsonl`。

SHA限制：输入明确未测全日志前缀哈希，本报告没有补造它；本轮哈希测量的是实际保存行及文档副本。缺帧不等于零表现：JMH5C51RLN4E F17只从T3可见，TXZ6RVMQA09D F49只有死亡摘要/终局。其余已索引原行核对不证明内部逐击或遗漏脑题完整。一次全局首行架构探查误触其他角色已留档，未用作任何游戏事实。

完整逐局清单如下。来源由成功脑回答核验，代码是结束记录code（dirty不意味着完整代码可重建）。各run-config重启、完整commit/experience版本/知识prefix SHA、脑模型与题型成功数、每日志行数、偏移范围、非连续层跳转及缺证范围均在 `run-inventory.json`。源日志行SHA由清单中的引用连接到offsets文件。

| run_id | A | code | 实际脑 | 首试 | 最终 | 终层 | 状态/决策/脑/SL行数 | 缺帧或特别限制 |
|---|---|---|---|---|---|---|---|---|
| C48LLXBGKXQ9 | 0 | bf3ebb7c | codex | predicted_death | 败 | 33 | 1131/1108/32/8 | 动作内部帧/未记录脑题未知 |
| Y6GM2CHWJBEY | 0 | 9692ea6d+dirty | codex | predicted_death | 败 | 17 | 575/557/20/6 | 动作内部帧/未记录脑题未知 |
| LRN0HPZ0FZS1 | 0 | 8d79fd5b+dirty | codex | predicted_death | 败 | 48 | 830/793/50/4 | 动作内部帧/未记录脑题未知 |
| T082DRCUHRRD | 0 | 8d79fd5b+dirty | codex | predicted_death | 败 | 48 | 1073/1034/47/9 | 动作内部帧/未记录脑题未知 |
| 1HC609GTLGN3 | 0 | 4915e3b3+dirty | codex | predicted_death | 败 | 22 | 573/561/21/6 | 动作内部帧/未记录脑题未知 |
| R0HEV5E3QT6G | 0 | 5de5d518 | codex | predicted_death | 败 | 48 | 825/801/47/8 | 动作内部帧/未记录脑题未知 |
| KAY522KT5NXR | 0 | 5de5d518+dirty | codex | predicted_death | 胜 | 48 | 875/848/55/5 | 动作内部帧/未记录脑题未知 |
| E6AVMMVCSRPC | 1 | 7be569b1+dirty | codex | predicted_death | 败 | 17 | 486/475/18/6 | 动作内部帧/未记录脑题未知 |
| XYYQYBRM2A01 | 1 | bb19732f+dirty | codex | predicted_death | 败 | 33 | 892/874/33/7 | 动作内部帧/未记录脑题未知 |
| K3676LU8B0UH | 1 | ccf1fcde+dirty | codex | predicted_death | 胜 | 48 | 830/805/48/4 | 动作内部帧/未记录脑题未知 |
| CSBR5CRDWQNB | 2 | c4c7ad97+dirty | codex | predicted_death | 败 | 33 | 592/573/33/8 | 动作内部帧/未记录脑题未知 |
| ZZMYZ5UBCG72 | 2 | b9c46d66+dirty | codex | won | 胜 | 48 | 822/797/48/3 | 动作内部帧/未记录脑题未知 |
| 10GPK5XGHCK3 | 3 | 9e0fda2e+dirty | codex | won | 胜 | 48 | 1020/986/50/4 | 动作内部帧/未记录脑题未知 |
| 1NZ8FE5F34R9 | 4 | 45965f49+dirty | codex | predicted_death | 败 | 29 | 495/477/29/9 | 动作内部帧/未记录脑题未知 |
| F9PP859XZ3RJ | 4 | d283e641+dirty | codex | died | 败 | 37 | 635/614/37/2 | 动作内部帧/未记录脑题未知 |
| 9YBKCNBFP0X5 | 4 | d9a3ea37+dirty | codex | predicted_death | 败 | 48 | 1065/1035/47/9 | 动作内部帧/未记录脑题未知 |
| 1LMBFGSMCWKU | 4 | 86b24a1f+dirty | codex | won | 胜 | 48 | 689/663/45/3 | 动作内部帧/未记录脑题未知 |
| ZE8F192FKX24 | 5 | 452f7bc7+dirty | codex | predicted_death | 胜 | 48 | 771/741/46/5 | 动作内部帧/未记录脑题未知 |
| FH2HB2X17F2H | 6 | f8229263+dirty | codex | died | 败 | 6 | 95/90/9/0 | 动作内部帧/未记录脑题未知 |
| UACFSW4VDDLD | 6 | 103fd5ff+dirty | mixed | predicted_death | 败 | 48 | 1236/1202/50/13 | 动作内部帧/未记录脑题未知 |
| VN7RQJMJEFMX | 6 | 42ac6c1d+dirty | codex | died | 败 | 42 | 764/739/41/2 | 动作内部帧/未记录脑题未知 |
| 75X1BARMNZ03 | 6 | 0a066c2f+dirty | codex | predicted_death | 败 | 20 | 392/376/20/5 | 动作内部帧/未记录脑题未知 |
| ARKQLHG6RS4W | 6 | 25a408ef+dirty | codex | predicted_death | 败 | 33 | 666/651/32/7 | 动作内部帧/未记录脑题未知 |
| 6EV5V6PJJS9D | 6 | 3ebbdc6c+dirty | mixed | died | 败 | 39 | 670/645/38/2 | 动作内部帧/未记录脑题未知 |
| 8CFMW9SAGFWQ | 6 | 7c7f22e3+dirty | codex | died | 败 | 24 | 375/362/27/1 | 动作内部帧/未记录脑题未知 |
| 2L1BNN9ZJEFU | 6 | 7c7f22e3+dirty | codex | predicted_death | 败 | 48 | 1176/1130/45/8 | 动作内部帧/未记录脑题未知 |
| 53FLQ68CETW0 | 6 | ee1f4fd1+dirty | codex | predicted_death | 败 | 48 | 1227/1202/54/10 | 动作内部帧/未记录脑题未知 |
| ENKYQMS9W4ZD | 6 | 65d99e74+dirty | codex | predicted_death | 败 | 43 | 818/790/40/3 | 动作内部帧/未记录脑题未知 |
| 2SU6XN2AEJRD | 6 | 2ec81b9f+dirty | codex | won | 胜 | 48 | 818/798/58/4 | 动作内部帧/未记录脑题未知 |
| SADL3CGYTGSR | 7 | 2c81eb76+dirty | codex | predicted_death | 败 | 48 | 1151/1115/54/10 | 动作内部帧/未记录脑题未知 |
| Z6CFLDR3N4SB | 7 | 48f2bf5a+dirty | codex | predicted_death | 败 | 48 | 767/742/49/4 | 动作内部帧/未记录脑题未知 |
| 3KME36ADUE4U | 7 | 5ae08a3d+dirty | codex | predicted_death | 败 | 27 | 546/524/26/6 | 动作内部帧/未记录脑题未知 |
| VLV17NUSFS61 | 7 | 7bea7d99+dirty | codex | predicted_death | 败 | 48 | 1024/980/45/14 | 动作内部帧/未记录脑题未知 |
| 9YT51CK8RC39 | 7 | 0d0c4b69+dirty | codex | predicted_death | 败 | 17 | 566/558/16/6 | 动作内部帧/未记录脑题未知 |
| 2PVLGRBGUX9S | 7 | 9988ca8b+dirty | codex | predicted_death | 败 | 48 | 1226/1189/48/9 | 动作内部帧/未记录脑题未知 |
| 4Y94N8RDPGPM | 7 | 8b268858+dirty | codex | won | 胜 | 48 | 719/693/42/3 | 动作内部帧/未记录脑题未知 |
| LLYSRQQ35AVW | 8 | bf63ab40+dirty | codex | won | 胜 | 48 | 679/651/54/3 | 动作内部帧/未记录脑题未知 |
| HMVJKM56S4Q8 | 9 | 6566b7d3+dirty | codex | predicted_death | 败 | 33 | 664/642/31/9 | 动作内部帧/未记录脑题未知 |
| F4QKG4J1AJJZ | 9 | 3a2a2a48+dirty | codex | predicted_death | 败 | 38 | 728/703/37/4 | 动作内部帧/未记录脑题未知 |
| G403VCZ3BH1B | 9 | 473a62f4+dirty | codex | predicted_death | 胜 | 48 | 654/635/48/4 | 动作内部帧/未记录脑题未知 |
| MGA0CZDDKC0P | 10 | a999dba8+dirty | codex | predicted_death | 败 | 17 | 436/423/19/6 | 动作内部帧/未记录脑题未知 |
| 25226ZFLNR1J | 10 | 9852b39f+dirty | codex | predicted_death | 败 | 48 | 889/862/45/9 | 动作内部帧/未记录脑题未知 |
| JLN5SK17W4FQ | 10 | f1d951ec+dirty | codex | predicted_death | 败 | 33 | 810/790/37/8 | 动作内部帧/未记录脑题未知 |
| JMH5C51RLN4E | 10 | 41bd4a44+dirty | codex | predicted_death | 败 | 49 | 880/853/53/13 | F17入口T1–T2缺 |
| 9TG1RP5LFAAK | 10 | 141df614+dirty | codex | predicted_death | 败 | 49 | 923/903/47/11 | 动作内部帧/未记录脑题未知 |
| JQPT83P8KDSZ | 10 | 3cbc6955+dirty | codex | predicted_death | 败 | 25 | 523/510/24/5 | 动作内部帧/未记录脑题未知 |
| 4D4J8USKCPAV | 10 | 1e047a36+dirty | codex | predicted_death | 败 | 17 | 546/527/16/6 | 动作内部帧/未记录脑题未知 |
| TD1HVGS7H6LB | 10 | c1f61de9+dirty | codex | predicted_death | 败 | 17 | 368/358/22/1 | 动作内部帧/未记录脑题未知 |
| PJ2LL9KU7FHD | 10 | eabdd307+dirty | codex | predicted_death | 败 | 17 | 641/635/18/6 | 动作内部帧/未记录脑题未知 |
| S9UZAK0JP0C0 | 10 | be0ee6df+dirty | codex | predicted_death | 败 | 33 | 861/826/33/10 | 动作内部帧/未记录脑题未知 |
| MCCK2602T1SR | 10 | 4fb81b17+dirty | deepseek | died | 败 | 7 | 164/159/9/0 | 动作内部帧/未记录脑题未知 |
| UJ0K3G10609Y | 10 | 4fb81b17+dirty | deepseek | predicted_death | 败 | 48 | 958/913/45/8 | 动作内部帧/未记录脑题未知 |
| U8K28UUGYP3U | 10 | 4fb81b17+dirty | deepseek | died | 败 | 11 | 240/233/10/0 | 动作内部帧/未记录脑题未知 |
| L9SGRBB5R698 | 10 | 4fb81b17+dirty | deepseek | predicted_death | 败 | 17 | 653/635/16/6 | 动作内部帧/未记录脑题未知 |
| D4LJ9QMGFB8Q | 10 | 4fb81b17+dirty | deepseek | predicted_death | 败 | 22 | 408/397/21/6 | 动作内部帧/未记录脑题未知 |
| 0NZXA12NLDMH | 10 | 0fd8e845+dirty | codex | predicted_death | 败 | 33 | 678/669/31/7 | 动作内部帧/未记录脑题未知 |
| 4ANT8D00TP72 | 10 | b219de68+dirty | codex | predicted_death | 败 | 37 | 651/627/42/9 | 动作内部帧/未记录脑题未知 |
| XBD8Z9XLPCPN | 10 | da2ccb92+dirty | codex | predicted_death | 败 | 33 | 553/537/31/8 | 动作内部帧/未记录脑题未知 |
| PU80F84P6HPN | 10 | 0581ecb3+dirty | codex | predicted_death | 败 | 33 | 1064/1033/31/12 | 动作内部帧/未记录脑题未知 |
| NB8KCF6HRGVF | 10 | 56c64ff8+dirty | codex | died | 败 | 31 | 484/466/31/1 | 动作内部帧/未记录脑题未知 |
| 5X2GHKJ89PN1 | 10 | 3599ab0a+dirty | codex | predicted_death | 败 | 48 | 948/929/49/11 | 动作内部帧/未记录脑题未知 |
| TCFAHJ9K19VY | 10 | d4026dbb+dirty | codex | predicted_death | 败 | 17 | 489/476/16/6 | 动作内部帧/未记录脑题未知 |
| LS8035TB32P3 | 10 | 74f82413+dirty | codex | predicted_death | 败 | 42 | 838/816/41/6 | 动作内部帧/未记录脑题未知 |
| L704TLETMZBM | 10 | cc1bdc59+dirty | codex | predicted_death | 败 | 48 | 870/848/55/7 | 动作内部帧/未记录脑题未知 |
| KUZVERN40NGK | 10 | 28e339fa+dirty | codex | predicted_death | 败 | 17 | 418/413/15/6 | 动作内部帧/未记录脑题未知 |
| BVF22RSFVBS9 | 10 | 28e339fa+dirty | codex | predicted_death | 败 | 23 | 434/424/23/6 | 动作内部帧/未记录脑题未知 |
| ZVYUL2YP3518 | 10 | 6ac57ea6+dirty | codex | predicted_death | 败 | 49 | 1147/1110/46/10 | 动作内部帧/未记录脑题未知 |
| VPW8YH7A4QFM | 10 | 3caa860b+dirty | codex | died | 败 | 39 | 707/686/49/2 | 动作内部帧/未记录脑题未知 |
| DPYF2BAA3DKT | 10 | ad01f74a+dirty | codex | predicted_death | 败 | 48 | 991/964/47/9 | 动作内部帧/未记录脑题未知 |
| CRK2HNYKSCZC | 10 | 884c9f33+dirty | codex | died | 败 | 11 | 152/148/10/0 | 动作内部帧/未记录脑题未知 |
| HUVEPWQAHWFU | 10 | 9e20ade9+dirty | codex | predicted_death | 败 | 35 | 739/714/34/4 | 动作内部帧/未记录脑题未知 |
| UMVLWER4CD98 | 10 | ebd920b4+dirty | codex | predicted_death | 败 | 48 | 1202/1165/50/9 | 动作内部帧/未记录脑题未知 |
| TU3XB4CAEDAW | 10 | 0068600d+dirty | codex | predicted_death | 败 | 40 | 791/759/40/11 | 动作内部帧/未记录脑题未知 |
| V0383V5S9BCQ | 10 | 3ac2445a+dirty | codex | died | 败 | 11 | 191/184/10/0 | 动作内部帧/未记录脑题未知 |
| 8R5CXD5C8PW8 | 10 | e8a6fb71+dirty | codex | predicted_death | 败 | 35 | 671/653/35/4 | 动作内部帧/未记录脑题未知 |
| QNTW139MGECA | 10 | 98d2d508+dirty | codex | died | 败 | 28 | 487/476/33/1 | 动作内部帧/未记录脑题未知 |
| HSX4HYATB4E2 | 10 | 09ac8004+dirty | codex | predicted_death | 败 | 48 | 1013/927/49/13 | 动作内部帧/未记录脑题未知 |
| WYB0NCD6W83J | 10 | e33ca6e0+dirty | codex | died | 败 | 15 | 231/222/14/0 | 动作内部帧/未记录脑题未知 |
| 87LCSDR5P3DL | 10 | e33ca6e0+dirty | codex | died | 败 | 9 | 179/173/10/0 | 动作内部帧/未记录脑题未知 |
| TKXQ6L4N9A6U | 10 | e33ca6e0+dirty | codex | died | 败 | 22 | 378/367/22/2 | 动作内部帧/未记录脑题未知 |
| 02HB4L0C3C67 | 10 | e33ca6e0+dirty | codex | died | 败 | 12 | 221/211/12/0 | 动作内部帧/未记录脑题未知 |
| T3FW7R2R2306 | 10 | 98df162d+dirty | codex | died | 败 | 8 | 158/154/8/0 | 动作内部帧/未记录脑题未知 |
| P5HT1272P5SB | 10 | 1a89c2d4+dirty | codex | died | 败 | 25 | 423/409/25/1 | 动作内部帧/未记录脑题未知 |
| KQQELQSZ382Z | 10 | f8e01696+dirty | mixed | predicted_death | 败 | 17 | 530/516/16/6 | 动作内部帧/未记录脑题未知 |
| YLYLZWHA0GKU | 10 | f65cbfac+dirty | codex | died | 败 | 45 | 683/655/42/2 | 动作内部帧/未记录脑题未知 |
| 7ZUC4VPMDS41 | 10 | f0c9dfbf+dirty | codex | predicted_death | 败 | 17 | 565/550/18/6 | 动作内部帧/未记录脑题未知 |
| 2Y27VAYZDA02 | 10 | 1a5e1217+dirty | codex | predicted_death | 败 | 22 | 663/654/21/8 | 动作内部帧/未记录脑题未知 |
| TDLBRNA0R05B | 10 | dc899f95+dirty | codex | predicted_death | 败 | 49 | 972/947/49/14 | 动作内部帧/未记录脑题未知 |
| MCT1GPTL8D35 | 10 | 0061f599+dirty | codex | predicted_death | 败 | 42 | 720/696/42/7 | 动作内部帧/未记录脑题未知 |
| W7BHM8U02RKG | 10 | 910604a4+dirty | codex | predicted_death | 败 | 17 | 389/384/16/6 | 动作内部帧/未记录脑题未知 |
| 01H1533KSS5C | 10 | f8dd742d+dirty | codex | predicted_death | 败 | 17 | 550/545/17/6 | 动作内部帧/未记录脑题未知 |
| 2K4H3JEJHRSB | 10 | 2518c73d+dirty | codex | died | 败 | 23 | 336/326/25/1 | 动作内部帧/未记录脑题未知 |
| ULP4TN1GNHMK | 10 | 92376ca3+dirty | codex | predicted_death | 败 | 17 | 493/484/16/6 | 动作内部帧/未记录脑题未知 |
| CA5KE8GFJ9X2 | 10 | 33f02a6f+dirty | codex | died | 败 | 13 | 282/265/11/0 | 动作内部帧/未记录脑题未知 |
| 61E2QS63Y9WU | 10 | 03d50f0b+dirty | codex | predicted_death | 败 | 28 | 462/443/27/7 | 动作内部帧/未记录脑题未知 |
| 5PM6JAQG6FNQ | 10 | f56da22b+dirty | codex | predicted_death | 败 | 39 | 660/638/39/7 | 动作内部帧/未记录脑题未知 |
| DUZUBAJ3A8GP | 10 | 93298980+dirty | codex | predicted_death | 败 | 30 | 623/602/29/6 | 动作内部帧/未记录脑题未知 |
| VLZ6CCT8AQ0A | 10 | ac321b1f+dirty | codex | died | 败 | 45 | 729/699/46/2 | 动作内部帧/未记录脑题未知 |
| 8JRE1C4H4Z2W | 10 | b0f41f03+dirty | codex | predicted_death | 败 | 33 | 676/659/31/7 | 动作内部帧/未记录脑题未知 |
| YF0LXT1QSTGG | 10 | 91c1db90+dirty | codex | predicted_death | 败 | 48 | 1091/1065/47/11 | 动作内部帧/未记录脑题未知 |
| XP2SL33HT0D9 | 10 | 60685510+dirty | codex | predicted_death | 败 | 33 | 730/712/31/7 | 动作内部帧/未记录脑题未知 |
| 751FN9QM9MHQ | 10 | 79bee0fc+dirty | codex | predicted_death | 败 | 17 | 624/615/15/6 | 动作内部帧/未记录脑题未知 |
| KV0JHNJCKXLS | 10 | 70c8352b+dirty | codex | predicted_death | 败 | 33 | 686/669/32/7 | 动作内部帧/未记录脑题未知 |
| YQL8RZ8BWN1E | 10 | b0b0e679+dirty | codex | predicted_death | 败 | 17 | 582/571/18/6 | 动作内部帧/未记录脑题未知 |
| KEN58SH9SLZ6 | 10 | f9db52c1+dirty | codex | predicted_death | 败 | 17 | 558/548/18/6 | 动作内部帧/未记录脑题未知 |
| TXZ6RVMQA09D | 10 | f17e15ca+dirty | codex | predicted_death | 败 | 49 | 840/762/48/6 | F49入口/过程缺 |
| WQZVENQ7DTRP | 10 | 31914e4b+dirty | codex | predicted_death | 败 | 33 | 798/766/31/9 | 动作内部帧/未记录脑题未知 |
| 1913SE84AXQF | 10 | 734c0860+dirty | codex | died | 败 | 31 | 413/398/31/1 | 动作内部帧/未记录脑题未知 |
| Q6M2Y34MWKRE | 10 | a881e27a+dirty | codex | died | 败 | 9 | 135/131/10/0 | 动作内部帧/未记录脑题未知 |
| NHA2KW0RB7VP | 10 | b8ca9311+dirty | codex | predicted_death | 败 | 33 | 602/584/34/7 | 动作内部帧/未记录脑题未知 |
| G33HU22H2543 | 10 | 710dc4dc+dirty | codex | predicted_death | 败 | 48 | 879/850/45/8 | 动作内部帧/未记录脑题未知 |
| P74C04AEPL1F | 10 | fd4c8e52+dirty | codex | predicted_death | 败 | 23 | 410/395/23/5 | 动作内部帧/未记录脑题未知 |
| RC61MFQM63Y6 | 10 | 0d6c1a82+dirty | codex | predicted_death | 败 | 33 | 694/674/33/7 | 动作内部帧/未记录脑题未知 |
| BTSRF7JL1W1Y | 10 | 6ad5584f+dirty | codex | predicted_death | 败 | 31 | 653/635/28/4 | 动作内部帧/未记录脑题未知 |
| XTSV1U9JD34T | 10 | 03f4ffe0+dirty | codex | predicted_death | 败 | 49 | 810/775/49/10 | 动作内部帧/未记录脑题未知 |
| 9Z9H2EXKLF3T | 10 | 6c3d8187+dirty | codex | predicted_death | 败 | 48 | 1018/932/51/9 | 动作内部帧/未记录脑题未知 |
| 7X0W3U8TVA2A | 10 | 047c809e+dirty | codex | died | 败 | 31 | 461/445/31/1 | 动作内部帧/未记录脑题未知 |
| MTQ0EUBJ3R6T | 10 | ceb74207+dirty | codex | predicted_death | 败 | 23 | 440/424/23/5 | 动作内部帧/未记录脑题未知 |
| KFRDELW2TH2P | 10 | a73ce7cc+dirty | codex | predicted_death | 败 | 33 | 620/587/35/8 | 动作内部帧/未记录脑题未知 |
| GXNKW8X1XYJP | 10 | b1714285+dirty | codex | predicted_death | 败 | 45 | 673/649/48/7 | 动作内部帧/未记录脑题未知 |
| PD9AYQVMLQW6 | 10 | 7f6d5b4b+dirty | codex | predicted_death | 败 | 49 | 1125/1017/55/11 | 动作内部帧/未记录脑题未知 |
| L2TSFU62Z57Z | 10 | c1dd721f+dirty | codex | predicted_death | 败 | 17 | 447/442/17/6 | 动作内部帧/未记录脑题未知 |
| ZTRGYYMLR8SC | 10 | aa1e2136+dirty | codex | predicted_death | 败 | 17 | 607/594/16/6 | 动作内部帧/未记录脑题未知 |
| K2JAGKVJAWZJ | 10 | 6fd495cc+dirty | codex | predicted_death | 败 | 46 | 814/722/48/3 | 动作内部帧/未记录脑题未知 |
| 79UCJ0K6R9C1 | 10 | f8947651+dirty | codex | died | 败 | 14 | 243/235/14/0 | 动作内部帧/未记录脑题未知 |
| NEWRFAYKTQHR | 10 | cecc8317+dirty | codex | predicted_death | 败 | 31 | 675/658/30/10 | 动作内部帧/未记录脑题未知 |
| 9R916WW0V65N | 10 | 8ef00878+dirty | codex | predicted_death | 败 | 49 | 1405/1165/50/12 | 动作内部帧/未记录脑题未知 |
| T0DGVABPV60U | 10 | 261af56e+dirty | codex | predicted_death | 败 | 48 | 1116/1071/46/12 | 动作内部帧/未记录脑题未知 |
| G8NHLL09DLBX | 10 | d61bf0ec+dirty | codex | predicted_death | 败 | 24 | 747/726/25/6 | 动作内部帧/未记录脑题未知 |
| LYBHQ1X230ZB | 10 | 5925a43d+dirty | codex | predicted_death | 败 | 30 | 478/455/28/5 | 动作内部帧/未记录脑题未知 |
| H1T1F8ML9FUE | 10 | 1a0adbaa+dirty | codex | predicted_death | 败 | 48 | 930/844/49/9 | 动作内部帧/未记录脑题未知 |
| AD3QSC3P41JU | 10 | a340c1ec+dirty | codex | predicted_death | 败 | 49 | 728/708/43/9 | 动作内部帧/未记录脑题未知 |
| 9DAS5L8YM1CN | 10 | 7f0c04dd+dirty | codex | predicted_death | 败 | 23 | 396/387/22/6 | 动作内部帧/未记录脑题未知 |
| BJLTVSYXCSGS | 10 | 722518cd+dirty | codex | predicted_death | 败 | 42 | 628/594/43/8 | 动作内部帧/未记录脑题未知 |
| Y5H4CFAQ2WTG | 10 | 2b1a5f6d+dirty | codex | died | 败 | 33 | 517/496/32/3 | 动作内部帧/未记录脑题未知 |
| SY0WMJNNVRLM | 10 | 650a6a84+dirty | codex | predicted_death | 败 | 33 | 722/636/37/10 | 动作内部帧/未记录脑题未知 |
| 4XLZURXMD872 | 10 | 187c025a+dirty | codex | predicted_death | 败 | 33 | 610/591/33/11 | 动作内部帧/未记录脑题未知 |
| QHK1XQ928TTM | 10 | 69a7b441+dirty | codex | predicted_death | 败 | 33 | 767/746/34/10 | 动作内部帧/未记录脑题未知 |
| UZ1T7AH49WMB | 10 | c70efc8c+dirty | codex | predicted_death | 败 | 25 | 422/406/24/5 | 动作内部帧/未记录脑题未知 |
| 7BNC8QX746YP | 10 | c70efc8c+dirty | codex | died | 败 | 14 | 159/152/14/0 | 动作内部帧/未记录脑题未知 |
| CNKR125PFHJ5 | 10 | c70efc8c+dirty | codex | died | 败 | 33 | 416/399/30/3 | 动作内部帧/未记录脑题未知 |
| PF90JTU0UZ5M | 10 | 433144fb+dirty | codex | predicted_death | 败 | 22 | 455/444/23/7 | 动作内部帧/未记录脑题未知 |
| 2H311EAD34GD | 10 | e838a975+dirty | codex | predicted_death | 败 | 17 | 661/647/16/6 | 动作内部帧/未记录脑题未知 |
| WZL2AMEY85S7 | 10 | d07c38fc+dirty | codex | predicted_death | 败 | 17 | 390/381/15/6 | 动作内部帧/未记录脑题未知 |
| R3AJCGQGGMR4 | 10 | 11d759cf+dirty | codex | predicted_death | 败 | 45 | 697/668/45/7 | 动作内部帧/未记录脑题未知 |
| M0GY0A4M2F7H | 10 | 9949a5de+dirty | codex | predicted_death | 败 | 17 | 539/526/18/6 | 动作内部帧/未记录脑题未知 |
| Z91JN3S3PQX2 | 10 | 049dff24+dirty | codex | died | 败 | 33 | 505/481/31/2 | 动作内部帧/未记录脑题未知 |
| LY83ZMTFVKJH | 10 | 049dff24+dirty | codex | predicted_death | 败 | 21 | 556/538/19/3 | 动作内部帧/未记录脑题未知 |
| HEMND3SMQYB8 | 10 | 72499093+dirty | codex | predicted_death | 败 | 49 | 966/850/47/9 | 动作内部帧/未记录脑题未知 |
| P2M3DFJ4DEZ3 | 10 | 3541bc54+dirty | codex | predicted_death | 败 | 49 | 1367/1247/51/14 | 动作内部帧/未记录脑题未知 |
| PBUBM0LRTEDD | 10 | 8149e4ca+dirty | codex | predicted_death | 败 | 49 | 963/934/48/13 | 动作内部帧/未记录脑题未知 |
| FU8ZUQHBHNV9 | 10 | a7c2a411+dirty | codex | died | 败 | 8 | 159/153/9/0 | 动作内部帧/未记录脑题未知 |
| 456MRNGCPD8E | 10 | a7c2a411+dirty | codex | died | 败 | 31 | 655/634/30/3 | 动作内部帧/未记录脑题未知 |
| J8PHG72DGD90 | 10 | 20cec89a+dirty | codex | predicted_death | 败 | 33 | 978/818/33/9 | 动作内部帧/未记录脑题未知 |
| 0DJ6GFZZ0TG9 | 10 | 3cadc990+dirty | codex | died | 败 | 33 | 414/401/34/2 | 动作内部帧/未记录脑题未知 |
| KSX97DF5H3NY | 10 | 3cadc990+dirty | codex | predicted_death | 败 | 31 | 544/517/30/6 | 动作内部帧/未记录脑题未知 |
| SV2GP9NX4HQD | 10 | 52aa3fcc+dirty | codex | predicted_death | 败 | 48 | 1244/1108/46/9 | 动作内部帧/未记录脑题未知 |
| CSLHFCBSC1UM | 10 | 3d05e954+dirty | codex | predicted_death | 败 | 17 | 480/468/16/6 | 动作内部帧/未记录脑题未知 |
| RZ6YAC7K89NM | 10 | cfa8112d+dirty | codex | died | 败 | 12 | 216/208/12/0 | 动作内部帧/未记录脑题未知 |
| SDY5T9XCSQN2 | 10 | cfa8112d+dirty | codex | predicted_death | 败 | 17 | 652/644/17/6 | 动作内部帧/未记录脑题未知 |
| VAC6Z1PZ1QJG | 10 | bb728531+dirty | codex | predicted_death | 败 | 48 | 1212/1185/52/9 | 动作内部帧/未记录脑题未知 |
| NG1FBJTSRLHS | 10 | 57a7f485+dirty | codex | died | 败 | 9 | 128/121/9/0 | 动作内部帧/未记录脑题未知 |
| NTMAU4XZ2NN2 | 10 | 57a7f485+dirty | codex | died | 败 | 14 | 220/214/13/0 | 动作内部帧/未记录脑题未知 |
| E6DYYXRX7GVE | 10 | 5ff4270d+dirty | codex | predicted_death | 败 | 45 | 752/706/41/5 | 动作内部帧/未记录脑题未知 |
| XZUJR08FW801 | 10 | 9a7dc931+dirty | codex | predicted_death | 败 | 29 | 493/471/28/6 | 动作内部帧/未记录脑题未知 |
| JBX9JLH46KVN | 10 | d5f290f4+dirty | codex | predicted_death | 败 | 49 | 1079/979/48/16 | 动作内部帧/未记录脑题未知 |
| RMNXHZKV716Y | 10 | 6519b8909+dirty | codex | predicted_death | 败 | 49 | 1059/981/51/11 | 动作内部帧/未记录脑题未知 |
| NBJBVSBNPYQB | 10 | 10168ac71+dirty | codex | predicted_death | 败 | 49 | 768/737/47/10 | 动作内部帧/未记录脑题未知 |
| AF76L5UTPP8U | 10 | d5ad91e80+dirty | codex | died | 败 | 23 | 454/438/22/1 | 动作内部帧/未记录脑题未知 |
| 833ZM0MJGWHC | 10 | 57b661f07+dirty | codex | predicted_death | 败 | 49 | 905/860/47/12 | 动作内部帧/未记录脑题未知 |
| 64R0P0MTZWAX | 10 | 7375067d7+dirty | codex | predicted_death | 败 | 33 | 955/873/31/9 | 动作内部帧/未记录脑题未知 |
| C6Z8ATNBNHZ7 | 10 | c7e1e0ed3+dirty | codex | predicted_death | 败 | 23 | 427/412/24/5 | 动作内部帧/未记录脑题未知 |
| XW8B5CHJ814J | 10 | c7e1e0ed3+dirty | codex | predicted_death | 败 | 49 | 1276/1223/46/14 | 动作内部帧/未记录脑题未知 |
| R6WDLYS19ZTY | 10 | c308b61e1+dirty | codex | predicted_death | 败 | 42 | 843/827/41/7 | 动作内部帧/未记录脑题未知 |
| HNX4A2WBC34W | 10 | 5957f0563+dirty | codex | predicted_death | 败 | 48 | 912/850/50/7 | 动作内部帧/未记录脑题未知 |
| HXCY44VD9QWU | 10 | d6a39489f+dirty | codex | predicted_death | 败 | 17 | 375/370/18/6 | 动作内部帧/未记录脑题未知 |
| N8A2W8LH39N0 | 10 | 29cd6a323+dirty | codex | died | 败 | 15 | 255/248/14/0 | 动作内部帧/未记录脑题未知 |
| 54G5683J0E5S | 10 | eaf3ac162+dirty | codex | died | 败 | 44 | 670/639/49/3 | 动作内部帧/未记录脑题未知 |
| 9663Y88TYK73 | 10 | 6e8de8ea4+dirty | codex | predicted_death | 败 | 46 | 743/718/44/6 | 动作内部帧/未记录脑题未知 |
| 0PH64C4AWAX9 | 10 | a8bb1ebe5+dirty | codex | predicted_death | 败 | 24 | 335/315/23/5 | 动作内部帧/未记录脑题未知 |
| Q389KW7SVWKH | 10 | a8bb1ebe5+dirty | codex | predicted_death | 败 | 48 | 770/743/47/9 | 动作内部帧/未记录脑题未知 |

## 2. 战绩、首试截断与分析分母

首试在同局首条predicted_death结束时刻截断；后续任何boss或成型记录不回填首试。无预测死亡但有SL计数的胜局不冒报首胜。首试预测死亡是判官截断，不等于已观察HP=0，字段保留区别。含SL最终结果按输入结局独立run_id计，一局多次重打不加样本；boss分母是独立局的同层同encounter到达。早期战斗、未到boss和未成型败局全部留在整局分母。

| 脑来源 | A | 结束局数 | 首试胜 | 最终胜 | 首试predicted_death截断局 |
|---|---|---|---|---|---|
| codex | 0 | 7 | 0 | 1 | 7 |
| codex | 1 | 3 | 0 | 1 | 3 |
| codex | 2 | 2 | 1 | 1 | 1 |
| codex | 3 | 1 | 1 | 1 | 0 |
| codex | 4 | 4 | 1 | 1 | 2 |
| codex | 5 | 1 | 0 | 1 | 1 |
| codex | 6 | 9 | 1 | 1 | 5 |
| codex | 7 | 7 | 1 | 1 | 6 |
| codex | 8 | 1 | 1 | 1 | 0 |
| codex | 9 | 3 | 0 | 1 | 3 |
| codex | 10 | 135 | 0 | 0 | 103 |
| deepseek | 10 | 5 | 0 | 0 | 3 |
| mixed | 6 | 2 | 0 | 0 | 1 |
| mixed | 10 | 1 | 0 | 0 | 1 |

纯Codex默认主战绩；DeepSeek/mixed是本角色学习证据，统计另列，不能说173以外被删除。successful-brain覆盖只限已记脑题，不从启动engine/deepseek_calls等兼容字段回填。各代码版本每局列明；这里的聚合不是同版本试验。

| 最终胜局 | A | 首试 | 本局已记最大reload |
|---|---|---|---|
| KAY522KT5NXR | 0 | predicted_death | 1 |
| K3676LU8B0UH | 1 | predicted_death | 1 |
| ZZMYZ5UBCG72 | 2 | won | 0 |
| 10GPK5XGHCK3 | 3 | won | 0 |
| 1LMBFGSMCWKU | 4 | won | 0 |
| ZE8F192FKX24 | 5 | predicted_death | 1 |
| 2SU6XN2AEJRD | 6 | won | 0 |
| 4Y94N8RDPGPM | 7 | won | 0 |
| LLYSRQQ35AVW | 8 | won | 0 |
| G403VCZ3BH1B | 9 | predicted_death | 1 |

## 3. 从实际阶段牌组形成的四类候选

识别集合和首次成型表在 `analyze_history.py:match`、`first-formation.json`、`deck-history.json`；逐房实际入口在 `combat-segments.json`。最小条件是本轮可检验签名，不声称已证明必要或充分；“拥有组件”与“实战收益已兑现”分开。候选重叠，不能将59+33+24+6加成独立样本。持有但没打出的牌、战内随机获得能力和升级/临时药水不能自动变成永久构筑。

### P. 施毒触媒与持续防御

核心及最低观察组合：已拥有至少一种实际施毒源（毒雾/毒药/弹跳药瓶/带毒刺击/毒性爆发/腐蚀波/涂毒）+触媒+灵动步法/蜃景/余像之一；实战成型还需实际施毒、建立触媒并支付当轮生存。

首次观察：T082DRCUHRRD F37 T未知 [E001]。当时序列为先读该层实际牌组后匹配，未用终牌组倒填。全历史成型59局、最终4胜；首试截断前成型54局。各实际成型层/回合与首试是否仍在窗口见first-formation。

运转目标：使已观察施毒、额外毒结算及当轮防御同时能够兑现；显示实际已建毒而非最终牌组标签。

启动与资源缺口：没有已结算或已建立毒：触媒的额外结算不能当伤害，蜃景/咕嘟冒泡不能预支无毒收益（silent-0010/0011/0027）。；有毒但缺防御：把当前可付格挡/减伤与活敌攻击列出；成型样本也会死亡，不设通用安全HP（silent-0005/0021）。；持有核心但尚未打出：列首次实毒/触媒/防御建立回合；YF沙虫首试T8建雾、T9触媒，重试T2触媒/T3雾是不同执行，不证明早建因果。

已观察补强/替代：施毒：毒雾提供后续轮初补毒，带毒刺击/毒药/弹跳药瓶为已观察其他入口；互为待验证供给选择，不认定胜率等价。；防御：灵动步法+多张格挡、已有毒后的蜃景、实际逐牌余像；ZZMY同局干瘪之手降低随机后续牌费用只是已观察帮助，不能指定免费目标。

过渡：早期仍由实际普通攻击和格挡通过房间；首次完整签名前不把P胜率套用。获得施毒入口后才评估依赖毒的收益，再把实际触媒启动与生存窗口并列。

失效、暂停或转型条件：若没有实毒/不能付启动费用/当前已记录存活窗口内没有启动记录，保留为未成型目标或暂停该收益估值；不按未知阈值自动弃牌。阶段清毒、制品拦毒时重新核当前毒，不继承旧阶段进度。

已有账本（复用机制，不重复登记）：silent-0010, silent-0011, silent-0027, silent-0005, silent-0023, silent-0025, silent-0067。具体典型实战和原件引用见第4节；模板机器字段见construction-templates.json。

| A | 成型局/首试前成型 | 首试整局胜/最终整局胜 | 来源 |
|---|---|---|---|
| 0 | 3/3 | 0/1 | {"codex": 3} |
| 2 | 1/1 | 1/1 | {"codex": 1} |
| 3 | 1/1 | 1/1 | {"codex": 1} |
| 4 | 1/1 | 0/0 | {"codex": 1} |
| 6 | 2/2 | 0/0 | {"codex": 1, "mixed": 1} |
| 7 | 3/3 | 0/0 | {"codex": 3} |
| 8 | 1/1 | 1/1 | {"codex": 1} |
| 9 | 1/1 | 0/0 | {"codex": 1} |
| 10 | 46/41 | 0/0 | {"codex": 44, "deepseek": 2} |

未形成的进阶：A1, A5；这些进阶所有boss的候选到达为0，通过率未知。不能解释成0%已验证失败。

### D. 叠敏捷多挡与持续输出

核心及最低观察组合：至少两张灵动步法；另有后空翻/扫腿/冲刺及已观察施毒/速行者/撕咬/流星锤之一。单步法+夜魇不作多步法替代，4Y实际复制毒牌；速行者持有但未施放不算实战收益。

首次观察：1HC609GTLGN3 F21 T未知 [E002]。当时序列为先读该层实际牌组后匹配，未用终牌组倒填。全历史成型30局、最终3胜；首试截断前成型25局。各实际成型层/回合与首试是否仍在窗口见first-formation。

运转目标：把实际敏捷重复作用于后续多张格挡，输出另列实毒、攻击或已建立抽牌伤害。

启动与资源缺口：敏捷能力持有而未建立：列已建敏捷及来源，遗物/速度药水的临时敏捷不能当牌组永久成长（silent-0005）。；有敏捷但没有后续可打格挡：当前已有挡不倒补；R0末线已有4敏捷仍没有后续挡（silent-0005）。；防住一轮不等持续输出：对照当前敌余血和实际已完成回合输出，不填固定DPS（silent-0021）。

已观察补强/替代：重复步法+后续格挡的实证见K367沙漏第二次T11，8敏捷使冲刺+/防御21+13=34；普通与升级各有已观察数据，不推所有牌。；后空翻有牌挡及抽牌，速行者只有实际建立后抽牌才触发；其输出与攻击/毒分账（silent-0045）。

过渡：只有一张步法时记防御组件，未满足多步法签名不套整套统计；保留实际过渡攻击/施毒与抽牌。

失效、暂停或转型条件：当前不能打后续挡、能力费用挤掉本轮生存或输出始终没有兑现记录时，标出缺口并暂停完整套牌标签；负敏捷、脆弱、能力加费以现场重核。没有证据设自动删除/换流派阈值。

已有账本（复用机制，不重复登记）：silent-0005, silent-0045, silent-0021, silent-0067。具体典型实战和原件引用见第4节；模板机器字段见construction-templates.json。

| A | 成型局/首试前成型 | 首试整局胜/最终整局胜 | 来源 |
|---|---|---|---|
| 0 | 2/1 | 0/0 | {"codex": 2} |
| 1 | 1/1 | 0/1 | {"codex": 1} |
| 3 | 1/1 | 1/1 | {"codex": 1} |
| 4 | 1/1 | 0/0 | {"codex": 1} |
| 6 | 1/1 | 0/0 | {"codex": 1} |
| 7 | 2/2 | 1/1 | {"codex": 2} |
| 10 | 22/18 | 0/0 | {"codex": 22} |

未形成的进阶：A2, A5, A8, A9；这些进阶所有boss的候选到达为0，通过率未知。不能解释成0%已验证失败。

### S. 小刀供给增益与逐牌防御

核心及最低观察组合：小刀来源（刀刃之舞/斗篷与匕首/隐秘匕首/无尽刀刃/先制打击/刀扇）+精准/幻影之刃/手里剑/苦无/螺线飞镖之一+余像/灵动步法/苦无/螺线飞镖/风的女儿之一。分支共享供刀，增益各不等价。

首次观察：KAY522KT5NXR F46 T未知 [E003]。当时序列为先读该层实际牌组后匹配，未用终牌组倒填。全历史成型24局、最终3胜；首试截断前成型22局。各实际成型层/回合与首试是否仍在窗口见first-formation。

运转目标：核本轮实际生成、实际打出的刀数及每刀/攻击张数/逐牌触发；防御独立验收。

启动与资源缺口：尚未生成/没有手位/尚未打出的小刀不预计伤害或触发；容量边界见silent-0149/0257。；精准逐刀、幻影之刃每轮首刀、手里剑攻击张数成长分别记；不以攻击段数替代牌张数（silent-0054/0063/0101）。；敏捷触发在已有格挡之后不倒补；螺线飞镖临时，苦无持久到本战，余像按实际出牌，不能混成同一等价组件（silent-0085/0105/0023）。

已观察补强/替代：已观察供刀替代件列入目标选择，但没有同条件互换胜率；刀刃陷阱要有已消耗小刀，空堆实际0伤（silent-0004）。；可搭配实际后续格挡、减力/虚弱或毒；KAY混合胜局含触媒/涂毒/多段/力量等，不归因单一刀核心。

过渡：有供刀而无增益时仍按实际小刀基础伤与当前防御分析；只有触发遗物而无刀源也不标完整S。

失效、暂停或转型条件：敌限伤/滑溜、能力没建立、手位不足或后续格挡没兑现时暂停该分支的未实现收益；CSBR双蟹六败、YF实验体六败保留反例，不设已证明可通杀的路线。

已有账本（复用机制，不重复登记）：silent-0004, silent-0014, silent-0023, silent-0054, silent-0063, silent-0085, silent-0101, silent-0105, silent-0149, silent-0257。具体典型实战和原件引用见第4节；模板机器字段见construction-templates.json。

| A | 成型局/首试前成型 | 首试整局胜/最终整局胜 | 来源 |
|---|---|---|---|
| 0 | 1/1 | 0/1 | {"codex": 1} |
| 2 | 1/1 | 0/0 | {"codex": 1} |
| 3 | 1/1 | 1/1 | {"codex": 1} |
| 4 | 2/2 | 0/0 | {"codex": 2} |
| 6 | 5/5 | 1/1 | {"mixed": 1, "codex": 4} |
| 7 | 1/1 | 0/0 | {"codex": 1} |
| 10 | 13/11 | 0/0 | {"deepseek": 1, "codex": 12} |

未形成的进阶：A1, A5, A8, A9；这些进阶所有boss的候选到达为0，通过率未知。不能解释成0%已验证失败。

### R. 抽弃循环与遗物攻防收益

核心及最低观察组合：至少两种实际弃牌组件，含杂技/计算下注/必备工具/手上技法之一，且持有铜钹或结实绷带；实际弃牌后才有收益。

首次观察：1LMBFGSMCWKU F15 T9 [E004]。当时序列为先读该层实际牌组后匹配，未用终牌组倒填。全历史成型6局、最终1胜；首试截断前成型6局。各实际成型层/回合与首试是否仍在窗口见first-formation。

运转目标：按实际弃牌数兑现遗物伤害/格挡，再用真实抽入牌接续输出与生存；抽牌本身不等收益。

启动与资源缺口：没有铜钹/绷带的抽弃是过渡动作，不记为完整R；铜钹伤害与原牌攻击分账，随机落点未知（silent-0284）。；结实绷带按实际弃牌补挡；未执行、被抽牌封锁或改变弃牌后，旧整线输出/格挡不能继承（silent-0194/0157/0205）。；抽弃可能弃去中和或原计划关键牌，需列实际剩牌而非原始计划收益（silent-0205）。

已观察补强/替代：1L以投掷匕首/计算下注/必备工具等持续产生实际弃牌，铜钹为附加伤；L704爆发重放杂技两次弃牌分别补3挡，计算下注9张实际补27。；这些是不同遗物与动作，不能把铜钹的伤害数和绷带格挡当普遍同一套餐。

过渡：尚未取得收益遗物时使用实际牌效果，完整R样本率不套用；成型后仍需要既有格挡/施毒/攻击，R不是被证实可独立输出的循环。

失效、暂停或转型条件：收益遗物缺失、实际弃牌/抽入牌未发生或防御缺口尚在时暂停完整循环估值；L704三败证明组件收益不足以保证胜利，没有证据规定自动弃牌顺序。

已有账本（复用机制，不重复登记）：silent-0194, silent-0284, silent-0157, silent-0205。具体典型实战和原件引用见第4节；模板机器字段见construction-templates.json。

| A | 成型局/首试前成型 | 首试整局胜/最终整局胜 | 来源 |
|---|---|---|---|
| 4 | 1/1 | 1/1 | {"codex": 1} |
| 10 | 5/5 | 0/0 | {"codex": 5} |

未形成的进阶：A0, A1, A2, A3, A5, A6, A7, A8, A9；这些进阶所有boss的候选到达为0，通过率未知。不能解释成0%已验证失败。

被保留或放弃的初步解释：

- 单步法—夜魇作为叠敏捷替代：撤去代理签名，不作为完整D。初稿将持有夜魇视为潜在多步法代理；4Y F33T4实际选蛇咬+，F48T10选致命毒药+，不能从持有复制技能推已复制步法。严格签名改为至少两张步法；旧33局口径、原0353 add与后续更正均保留。 证据4Y94N8RDPGPM, P5HT1272P5SB, UJ0K3G10609Y, XTSV1U9JD34T，账本silent-0353。

- 回返流星锤—多段杀灭—力量增长：保留个案，不升级为独立通用候选。KAY A0实验体SL胜局确实兑现力量、多段和回返攻击，但同时有精准、施毒、触媒、敏捷和药水；缺同组件独立重复、跨boss成型入口及A10整局验证。未证明只有这一条输出轴。 证据KAY522KT5NXR，账本silent-0042。

- 群蛇形态主轴：作为该胜局核心的归因被否定，卡牌整体价值未知。K367取得且大脑列为主轴但全局未施放；该胜局不能作为实际群蛇形态协作验证。 证据K3676LU8B0UH，账本silent-0057。

夜魇代理撤去的原始选择证据：4Y94N8RDPGPM F33T4 实选蛇咬+，返回completed: Action completed. [E005]；4Y94N8RDPGPM F48T10 实选致命毒药+，返回completed: Action completed. [E006]。旧33局签名保留在revisions/pre-strict-d-*，严格D为30局；这是口径更正，不是发现一个已验证复制步法新规则。

## 4. 真实伤害、生存、药水与失败反例

有效伤害只累计相邻原状态同一敌身份/位置的正HP下降，按剩余HP裁剪，未知过量不加；不把剩余毒层当已经扣血。可见回血/HP上涨、死亡复活、实验体阶段重建、巨兽巨大占位HP和敌消失分别列。终局原文仍有敌HP时补入实际死亡出口；预测死亡没有未执行出口。胜战经常缺末击后敌血，表中的扣HP为可见下界，而非完整实战DPS。初始/尾部毒、受击回血等同一步内部抵销也可能使下界偏低；攻击/毒/遗物分解只有已隔离的局部例子可解释。

每场尝试细表 `real-attempts.json` 包含逐回合可见扣HP、启动增益首次/最大值、实毒首次、进出血、逐帧HP正损及增益、实战plays、药水执行/弃药引用及SL回载。临时药/遗物提供的首次正敏捷不是灵动步法建立时间。损血总和与净差分开；巨兽自爆、敌复活不是玩家回血，玩家战内增血/复活候选在resource-events中另列。模拟/重放预测未加入本表；模拟树虽然存在于SL原文，分析只读实际summary与真实状态。

| run/A/层/尝试 | boss/候选 | 结果 | HP入→SL摘要出口 | 记录回合 | 可见有效伤害≥/记录回合 | 实喝药摘要数 | 证据 |
|---|---|---|---|---|---|---|---|
| ZZMYZ5UBCG72/A2/F33/1 | THE_INSATIABLE/P | won | 63→52 | 5 | ≥255/≥51.0 | 1 | [E007] [E008] [E009] |
| ZZMYZ5UBCG72/A2/F48/1 | QUEEN+TORCH_HEAD_AMALGAM/P | won | 66→39 | 8 | ≥425/≥53.125 | 1 | [E010] [E011] [E012] |
| LLYSRQQ35AVW/A8/F48/1 | QUEEN+TORCH_HEAD_AMALGAM/P | won | 70→60 | 7 | ≥460/≥65.714 | 1 | [E013] [E014] [E015] |
| HNX4A2WBC34W/A10/F33/1 | THE_INSATIABLE/P | predicted_death | 58→12 | 11 | ≥235/≥21.364 | 1 | [E016] [E017] [E018] |
| HNX4A2WBC34W/A10/F33/2 | THE_INSATIABLE/P | won | 58→19 | 10 | ≥333/≥33.3 | 1 | [E019] [E020] [E021] |
| HNX4A2WBC34W/A10/F48/1 | AEONGLASS/P | predicted_death | 78→21 | 7 | ≥317/≥45.286 | 2 | [E022] [E023] [E024] |
| HNX4A2WBC34W/A10/F48/3 | AEONGLASS/P | died | 78→0 | 8 | ≥405/≥50.625 | 2 | [E025] [E026] [E027] |
| K3676LU8B0UH/A1/F48/1 | AEONGLASS/D | predicted_death | 73→38 | 11 | ≥363/≥33.0 | 1 | [E028] [E029] [E030] |
| K3676LU8B0UH/A1/F48/2 | AEONGLASS/D | won | 73→5 | 12 | ≥503/≥41.917 | 1 | [E031] [E032] [E033] |
| 4Y94N8RDPGPM/A7/F48/1 | QUEEN+TORCH_HEAD_AMALGAM/D | won | 76→9 | 15 | ≥506/≥33.733 | 4 | [E034] [E035] [E036] |
| CSBR5CRDWQNB/A2/F33/1 | CRUSHER+ROCKET/S | predicted_death | 36→19 | 4 | ≥121/≥30.25 | 1 | [E037] [E038] [E039] |
| CSBR5CRDWQNB/A2/F33/6 | CRUSHER+ROCKET/S | died | 38→0 | 4 | ≥151/≥37.75 | 1 | [E040] [E041] [E042] |
| KAY522KT5NXR/A0/F48/1 | TEST_SUBJECT/P,S | predicted_death | 66→23 | 11 | ≥397/≥36.091 | 5 | [E043] [E044] [E045] |
| KAY522KT5NXR/A0/F48/2 | TEST_SUBJECT/P,S | won | 66→8 | 14 | ≥590/≥42.143 | 5 | [E046] [E047] [E048] |
| 2SU6XN2AEJRD/A6/F48/1 | AEONGLASS/S | won | 88→24 | 10 | ≥481/≥48.1 | 2 | [E049] [E050] [E051] |
| YF0LXT1QSTGG/A10/F48/6 | TEST_SUBJECT/P,S | died | 27→0 | 5 | ≥159/≥31.8 | 1 | [E052] [E053] [E054] |
| 1LMBFGSMCWKU/A4/F48/1 | QUEEN+TORCH_HEAD_AMALGAM/R | won | 62→21 | 11 | ≥527/≥47.909 | 1 | [E055] [E056] [E057] |
| 25226ZFLNR1J/A10/F48/1 | AEONGLASS/P,D,R | predicted_death | 33→4 | 8 | ≥102/≥12.75 | 0 | [E058] [E059] [E060] |
| L704TLETMZBM/A10/F48/3 | TEST_SUBJECT/P,R | died | 66→0 | 6 | ≥169/≥28.167 | 2 | [E061] [E062] [E063] |

逐样本启动记录另列。首次正敏捷可来自石头/药水，不能直接称首次步法；最大敏捷为已见瞬时值，可能临时。首刀是summary中的实际出牌，弃牌类只列实际技能施放，未记录的内部弃牌顺序仍未知。

| run/层/尝试 | 已建增益首次/最大 | 首次实毒 | 首次实打小刀T | 首次抽弃类技能T | 实际plays证据 |
|---|---|---|---|---|---|
| ZZMYZ5UBCG72/F33/1 | DEXTERITY_POWER: T1首次1,最大1 [E008]; NOXIOUS_FUMES_POWER: T1首次3,最大3 [E064]; ACCELERANT_POWER: T1首次1,最大3 [E065] | T2 [E066] | 未知 | 4 | [E007] |
| ZZMYZ5UBCG72/F48/1 | DEXTERITY_POWER: T1首次1,最大2 [E011]; ACCELERANT_POWER: T2首次1,最大3 [E067]; NOXIOUS_FUMES_POWER: T4首次3,最大3 [E068] | T1 [E069] | 2 | 2 | [E010] |
| LLYSRQQ35AVW/F48/1 | DEXTERITY_POWER: T1首次2,最大2 [E070]; AFTERIMAGE_POWER: T3首次1,最大1 [E071]; ACCELERANT_POWER: T4首次2,最大2 [E072]; NOXIOUS_FUMES_POWER: T5首次3,最大3 [E073] | T1 [E074] | 1 | 未知 | [E013] |
| HNX4A2WBC34W/F33/1 | ACCELERANT_POWER: T2首次2,最大2 [E075]; DEXTERITY_POWER: T2首次5,最大5 [E076]; AFTERIMAGE_POWER: T6首次1,最大1 [E077] | T1 [E078] | 未知 | 未知 | [E016] |
| HNX4A2WBC34W/F33/2 | ACCELERANT_POWER: T2首次2,最大2 [E079]; DEXTERITY_POWER: T3首次5,最大5 [E080]; AFTERIMAGE_POWER: T5首次1,最大1 [E081] | T1 [E082] | 未知 | 未知 | [E019] |
| HNX4A2WBC34W/F48/1 | ACCELERANT_POWER: T1首次2,最大2 [E083]; AFTERIMAGE_POWER: T2首次1,最大1 [E084]; DEXTERITY_POWER: T4首次2,最大2 [E085] | T3 [E086] | 7 | 6 | [E022] |
| HNX4A2WBC34W/F48/3 | ACCELERANT_POWER: T1首次2,最大2 [E087]; AFTERIMAGE_POWER: T2首次1,最大1 [E088]; DEXTERITY_POWER: T4首次2,最大2 [E089]; NOXIOUS_FUMES_POWER: T5首次2,最大2 [E090] | T3 [E091] | 7 | 4 | [E025] |
| K3676LU8B0UH/F48/1 | DEXTERITY_POWER: T2首次3,最大6 [E092]; NOXIOUS_FUMES_POWER: T3首次3,最大3 [E093] | T3 [E094] | 未知 | 未知 | [E028] |
| K3676LU8B0UH/F48/2 | DEXTERITY_POWER: T2首次3,最大8 [E095]; NOXIOUS_FUMES_POWER: T3首次3,最大3 [E096] | T3 [E097] | 12 | 未知 | [E031] |
| 4Y94N8RDPGPM/F48/1 | DEXTERITY_POWER: T3首次3,最大9 [E098] | T1 [E099] | 5 | 7 | [E034] |
| CSBR5CRDWQNB/F33/1 | 未记录指定增益 | T1 [E100] | 未知 | 未知 | [E037] |
| CSBR5CRDWQNB/F33/6 | 未记录指定增益 | T1 [E101] | 1 | 未知 | [E040] |
| KAY522KT5NXR/F48/1 | ACCURACY_POWER: T1首次8,最大8 [E102]; DEXTERITY_POWER: T1首次1,最大3 [E103]; SPEEDSTER_POWER: T1首次2,最大2 [E104]; ACCELERANT_POWER: T5首次1,最大1 [E105] | T4 [E106] | 11 | 未知 | [E043] |
| KAY522KT5NXR/F48/2 | DEXTERITY_POWER: T1首次1,最大3 [E107]; SPEEDSTER_POWER: T1首次2,最大2 [E108]; ACCELERANT_POWER: T5首次1,最大1 [E109]; ACCURACY_POWER: T7首次4,最大4 [E110] | T4 [E111] | 8 | 未知 | [E046] |
| 2SU6XN2AEJRD/F48/1 | DEXTERITY_POWER: T1首次1,最大8 [E050]; NOXIOUS_FUMES_POWER: T1首次2,最大5 [E112]; PHANTOM_BLADES_POWER: T5首次9,最大9 [E113] | T4 [E114] | 9 | 1 | [E049] |
| YF0LXT1QSTGG/F48/6 | DEXTERITY_POWER: T1首次3,最大6 [E115]; ACCELERANT_POWER: T4首次2,最大2 [E116] | T3 [E117] | 1 | 4 | [E052] |
| 1LMBFGSMCWKU/F48/1 | DEXTERITY_POWER: T3首次3,最大8 [E118] | T1 [E119] | 未知 | 未知 | [E055] |
| 25226ZFLNR1J/F48/1 | DEXTERITY_POWER: T1首次1,最大5 [E059]; NOXIOUS_FUMES_POWER: T3首次3,最大3 [E120]; ACCELERANT_POWER: T7首次2,最大2 [E121] | T5 [E122] | 未知 | 未知 | [E058] |
| L704TLETMZBM/F48/3 | DEXTERITY_POWER: T1首次1,最大4 [E062]; NOXIOUS_FUMES_POWER: T1首次3,最大3 [E123]; ACCELERANT_POWER: T3首次2,最大2 [E124] | T1 [E125] | 未知 | 3 | [E061] |

药水动作完成性另列，原动作与返回文字均在potion-action-audit.json。pending未逐项配后状态，这些动作不能全算已确认消耗；未派发与弃药分开。下表和boss药数采用不同口径，不能相加。

| 动作 | 返回状态 | 行数 |
|---|---|---|
| discard_potion | completed | 24 |
| discard_potion | not_dispatched | 1 |
| use_potion | completed | 1789 |
| use_potion | not_dispatched | 1 |
| use_potion | queued_pending_unpaired | 398 |

P：ZZMY A2沙虫T1已建毒雾3/触媒1，五个记录回合63→52血；女王T2触媒、T4毒雾，八回合66→39。LLY A8女王七回合70→60，一瓶技能药，说明有低净消耗的局部样本；仍不足以外推其他进阶/所有boss。HNX A10沙虫同58入血，首试T11判死、重试T10胜19血；随后沙漏三次78入血均败，末次T1触媒、T5毒雾、T8真实死0血，实际总扣535→130=405（无可见回血），残余毒结算已在末帧体现。首试与重试的能力时点不同，但不是受控单因比较。依据silent-0011/0027/0021、上述原件及逐回合记录。

D：K367 A1沙漏首战T11判死38血，第二次T12胜但仅5血，不能称轻松；第二次8敏捷、多张挡实测协作见silent-0005 T11。4Y A7女王15回合76→9，开场四瓶药，最大已见9敏捷，持有夜魇/速行者不等实际已建收益；输出仍由真实攻击/施毒推进。25226 A10沙漏八回合首试判死，P/D/R共同成型仍只有33→4血、可见扣HP102，表明防御组件或抽弃共现不能覆盖实际输出/生存缺口。无同条件移除组件对照。

S：KAY A0实验体第一试T11判死、SL第二试T14胜8血，两次五个饮药摘要；胜线可见扣HP至少590，阶段重建500HP单列，不作回血或首血600误称。本局同时有触媒、速行者、力量/多段等，不能给精准或供刀单独归功；silent-0042/0045/0054为收益子证据。CSBR A2双蟹六次无胜，末次38→0、四回合可见扣151，实际刀伤及攻击触发已发生（silent-0063），说明组件存在仍可失败。YF A10实验体六次无胜，27血入场，末次T5死亡，苦无/灵动步法有实际敏捷但未付足末轮生存（silent-0085），仍缺160敌血。2SU A6沙漏首试10回合88→24，两药、可见伤至少481，是另一分支局部通过；不能合成A10通杀率。

R：1L A4女王首试11回合62→21，一瓶速度药；铜钹随实际弃牌附加伤与核心毒/格挡并存（silent-0284）。L704 A10实验体三次无胜，首试64→7判死，末试66→0；绷带收益确实兑现但不能证明整场可赢，实际弃牌9张补27挡/两次弃牌各3见silent-0194。末试可见阶段HP恢复198单列，不误算敌治疗；先前血量不同保留原值，不将SL算额外独立样本。

四候选的完整伤害/消耗分布从逐boss矩阵和real-attempts可复算。启动回合不是常数：同签名P既见T1建立也见T8/T9建立；D/S/R也必须按具体增益/实际弃牌读取。未观察自动选择规则不写入模板。

### 4.1 前面哪些战斗消耗了终局资源

下面各案例逐房入口、末战状态、第一非战斗HP、药水执行和HP增益分别留档；赢的走廊/精英也计。`resource-traces.json`保存全部181局，不只终局幸存者。两个房间之间HP回升仅称原帧增血：来源由screen及原run资源核对，未隔离回血/复活/SL内部顺序的记未知，不把它加到初始血预算。药水弃掉、饮用和SL恢复记录分开。

**ZZMYZ5UBCG72**：按原字节顺序的赢败战斗均列；T1缺帧的入口未知不得补。SL房重试不是新房间。

| 房/段 | 敌 | 当时HP入→末战→非战斗 | 当时候选 | 首试窗口 | 入口/末态证据 |
|---|---|---|---|---|---|
| F2/段1 | CORPSE_SLUG+CORPSE_SLUG | 56→56→56 | 未成型 | True | [E126] [E127] |
| F3/段2 | TOADPOLE+TOADPOLE | 56→56→56 | 未成型 | True | [E128] [E129] |
| F5/段3 | SLUDGE_SPINNER | 49→49→49 | 未成型 | True | [E130] [E131] |
| F6/段4 | PUNCH_CONSTRUCT | 49→43→43 | 未成型 | True | [E132] [E133] |
| F9/段5 | SKULKING_COLONY | 43→43→43 | 未成型 | True | [E134] [E135] |
| F12/段6 | CORPSE_SLUG+CORPSE_SLUG+CORPSE_SLUG | 64→64→64 | 未成型 | True | [E136] [E137] |
| F15/段7 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER | 61→52→52 | 未成型 | True | [E138] [E139] |
| F17/段8 | LAGAVULIN_MATRIARCH | 52→10→10 | 未成型 | True | [E140] [E141] |
| F19/段9 | TUNNELER | 58→58→58 | 未成型 | True | [E142] [E143] |
| F22/段10 | EXOSKELETON+EXOSKELETON+EXOSKELETON | 53→53→53 | 未成型 | True | [E144] [E145] |
| F23/段11 | MYTE+MYTE | 53→53→50 | 未成型 | True | [E146] [E147] |
| F24/段12 | INFESTED_PRISM | 50→39→39 | 未成型 | True | [E148] [E149] |
| F28/段13 | BOWLBUG_ROCK+BOWLBUG_SILK+SLUMBERING_BEETLE | 60→59→59 | 未成型 | True | [E150] [E151] |
| F29/段14 | THE_OBSCURA | 59→46→46 | P | True | [E152] [E153] |
| F30/段15 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON | 46→42→42 | P | True | [E154] [E155] |
| F31/段16 | LOUSE_PROGENITOR | 42→42→42 | P | True | [E156] [E157] |
| F33/段17 | THE_INSATIABLE | 63→52→52 | P | True | [E008] [E009] |
| F35/段18 | SCROLL_OF_BITING+SCROLL_OF_BITING+SCROLL_OF_BITING | 66→60→60 | P | True | [E158] [E159] |
| F37/段19 | LIVING_SHIELD+TURRET_OPERATOR | 60→60→60 | P | True | [E160] [E161] |
| F38/段20 | FROG_KNIGHT | 60→60→60 | P | True | [E162] [E163] |
| F39/段21 | AXEBOT | 60→53→53 | P | True | [E164] [E165] |
| F45/段22 | SOUL_NEXUS | 61→58→58 | P | True | [E166] [E167] |
| F46/段23 | GLOBE_HEAD | 58→57→57 | P | True | [E168] [E169] |
| F48/段24 | QUEEN+TORCH_HEAD_AMALGAM | 66→39→39 | P | True | [E170] [E012] |

原帧HP上涨事件（逐场损血不可与它混算）：F11 noncombat_hp_gain +21 [E171][E172]；F18 noncombat_hp_gain +48 [E173][E174]；F27 noncombat_hp_gain +21 [E175][E176]；F32 noncombat_hp_gain +21 [E177][E178]；F34 noncombat_hp_gain +14 [E179][E180]；F44 noncombat_hp_gain +19 [E181][E182]；F47 noncombat_hp_gain +9 [E183][E184]

饮药与弃药原动作：F9T1 use_potion FIRE_POTION [E185]；F9T2 use_potion DISTILLED_CHAOS [E186]；F12T1 use_potion EXPLOSIVE_AMPOULE [E187]；F15T1 use_potion ENERGY_POTION [E188]；F17T3 use_potion POTION_SHAPED_ROCK [E189]；F19T3 use_potion POTION_SHAPED_ROCK [E190]；F22T1 use_potion POTION_SHAPED_ROCK [E191]；F22T1 use_potion LIQUID_MEMORIES [E192]；F23T1 use_potion POTION_SHAPED_ROCK [E193]；F24T1 use_potion POTION_SHAPED_ROCK [E194]；F28T1 use_potion POTION_SHAPED_ROCK [E195]；F29T1 use_potion WEAK_POTION [E196]；F29T1 use_potion POTION_SHAPED_ROCK [E197]；F30T1 use_potion STRENGTH_POTION [E198]；F30T1 use_potion POTION_SHAPED_ROCK [E199]；F31T1 use_potion FLEX_POTION [E200]；F31T1 use_potion POTION_SHAPED_ROCK [E201]；F33T1 use_potion POTION_SHAPED_ROCK [E202]；F35T1 use_potion POTION_SHAPED_ROCK [E203]；F37T1 use_potion POTION_SHAPED_ROCK [E204]；F38T1 use_potion POTION_SHAPED_ROCK [E205]；F38T4 use_potion BLOCK_POTION [E206]；F38T5 use_potion BLOCK_POTION [E207]；F39T1 use_potion STRENGTH_POTION [E208]；F39T1 use_potion POTION_SHAPED_ROCK [E209]；F42TNone discard_potion FOUL_POTION [E210]；F42TNone discard_potion FOUL_POTION [E211]；F42TNone discard_potion FOUL_POTION [E212]；F45T1 use_potion POTION_SHAPED_ROCK [E213]；F46T1 use_potion POTION_SHAPED_ROCK [E214]；F48T2 use_potion POTION_SHAPED_ROCK [E215]

**4Y94N8RDPGPM**：按原字节顺序的赢败战斗均列；T1缺帧的入口未知不得补。SL房重试不是新房间。

| 房/段 | 敌 | 当时HP入→末战→非战斗 | 当时候选 | 首试窗口 | 入口/末态证据 |
|---|---|---|---|---|---|
| F2/段1 | FUZZY_WURM_CRAWLER | 56→53→53 | 未成型 | True | [E216] [E217] |
| F3/段2 | SHRINKER_BEETLE | 53→53→53 | 未成型 | True | [E218] [E219] |
| F5/段3 | LEAF_SLIME_M+LEAF_SLIME_S+TWIG_SLIME_S | 60→60→60 | 未成型 | True | [E220] [E221] |
| F6/段4 | CUBEX_CONSTRUCT | 60→60→60 | 未成型 | True | [E222] [E223] |
| F7/段5 | PHROG_PARASITE | 60→50→50 | 未成型 | True | [E224] [E225] |
| F9/段6 | FUZZY_WURM_CRAWLER+SHRINKER_BEETLE | 50→43→43 | 未成型 | True | [E226] [E227] |
| F13/段7 | BRUTE_RUBY_RAIDER+CROSSBOW_RUBY_RAIDER+TRACKER_RUBY_RAIDER | 80→78→78 | 未成型 | True | [E228] [E229] |
| F15/段8 | BYGONE_EFFIGY | 78→57→57 | 未成型 | True | [E230] [E231] |
| F17/段9 | CEREMONIAL_BEAST | 69→50→50 | 未成型 | True | [E232] [E233] |
| F19/段10 | BOWLBUG_EGG+BOWLBUG_ROCK | 75→75→75 | 未成型 | True | [E234] [E235] |
| F23/段11 | THIEVING_HOPPER | 75→68→68 | 未成型 | True | [E236] [E237] |
| F30/段12 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON | 82→76→76 | 未成型 | True | [E238] [E239] |
| F33/段13 | KNOWLEDGE_DEMON | 82→74→66 | 未成型 | True | [E240] [E241] |
| F35/段14 | DEVOTED_SCULPTOR | 78→77→77 | 未成型 | True | [E242] [E243] |
| F38/段15 | SCROLL_OF_BITING+SCROLL_OF_BITING+SCROLL_OF_BITING | 77→77→77 | D | True | [E244] [E245] |
| F43/段16 | CUBEX_CONSTRUCT+CUBEX_CONSTRUCT+PUNCH_CONSTRUCT | 82→69→69 | D | True | [E246] [E247] |
| F45/段17 | FABRICATOR | 82→58→58 | D | True | [E248] [E249] |
| F48/段18 | QUEEN+TORCH_HEAD_AMALGAM | 76→9→9 | D | True | [E035] [E036] |

原帧HP上涨事件（逐场损血不可与它混算）：F4 noncombat_hp_gain +7 [E250][E251]；F11 noncombat_hp_gain +9 [E252][E253]；F11 noncombat_hp_gain +23 [E253][E254]；F12 noncombat_hp_gain +5 [E255][E256]；F16 noncombat_hp_gain +12 [E257][E258]；F18 noncombat_hp_gain +25 [E259][E260]；F24 noncombat_hp_gain +14 [E261][E262]；F32 noncombat_hp_gain +6 [E263][E264]；F34 noncombat_hp_gain +12 [E265][E266]；F40 noncombat_hp_gain +5 [E267][E268]；F44 noncombat_hp_gain +13 [E269][E270]；F47 noncombat_hp_gain +18 [E271][E272]

饮药与弃药原动作：F6T2 use_potion FORTIFIER [E273]；F7T2 use_potion SKILL_POTION [E274]；F23T1 use_potion CLARITY [E275]；F33T2 use_potion SPEED_POTION [E276]；F33T4 use_potion SKILL_POTION [E277]；F35T3 use_potion LUCKY_TONIC [E278]；F43T1 use_potion GIGANTIFICATION_POTION [E279]；F43T1 use_potion POTION_OF_BINDING [E280]；F48T1 use_potion HEART_OF_IRON [E281]；F48T1 use_potion COLORLESS_POTION [E282]；F48T1 use_potion ATTACK_POTION [E283]；F48T1 use_potion SKILL_POTION [E284]

**HNX4A2WBC34W**：按原字节顺序的赢败战斗均列；T1缺帧的入口未知不得补。SL房重试不是新房间。

| 房/段 | 敌 | 当时HP入→末战→非战斗 | 当时候选 | 首试窗口 | 入口/末态证据 |
|---|---|---|---|---|---|
| F2/段1 | LEAF_SLIME_S+TWIG_SLIME_M+TWIG_SLIME_S | 56→56→56 | 未成型 | True | [E285] [E286] |
| F3/段2 | SHRINKER_BEETLE | 56→52→52 | 未成型 | True | [E287] [E288] |
| F4/段3 | NIBBIT | 52→52→52 | 未成型 | True | [E289] [E290] |
| F5/段4 | FOGMOG | 52→35→35 | 未成型 | True | [E291] [E292] |
| F6/段5 | FUZZY_WURM_CRAWLER+SHRINKER_BEETLE | 35→22→22 | 未成型 | True | [E293] [E294] |
| F8/段6 | WRIGGLER+WRIGGLER+WRIGGLER+WRIGGLER | 64→62→62 | 未成型 | True | [E295] [E296] |
| F12/段7 | VINE_SHAMBLER | 67→56→56 | 未成型 | True | [E297] [E298] |
| F14/段8 | BYGONE_EFFIGY | 75→32→32 | 未成型 | True | [E299] [E300] |
| F17/段9 | CEREMONIAL_BEAST | 54→35→35 | 未成型 | True | [E301] [E302] |
| F19/段10 | EXOSKELETON+EXOSKELETON+EXOSKELETON | 67→67→67 | 未成型 | True | [E303] [E304] |
| F20/段11 | THIEVING_HOPPER | 67→53→53 | 未成型 | True | [E305] [E306] |
| F21/段12 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON | 53→45→45 | P | True | [E307] [E308] |
| F28/段13 | ENTOMANCER | 61→59→59 | P | True | [E309] [E310] |
| F30/段14 | CHOMPER+CHOMPER | 59→54→54 | P | True | [E311] [E312] |
| F33/段15 | THE_INSATIABLE | 58→12→未知 | P | True | [E313] [E018] |
| F33/段16 | THE_INSATIABLE | 58→19→19 | P | False | [E020] [E021] |
| F35/段17 | LIVING_SHIELD+TURRET_OPERATOR | 63→57→57 | P | False | [E314] [E315] |
| F36/段18 | DEVOTED_SCULPTOR | 57→38→38 | P | False | [E316] [E317] |
| F39/段19 | OWL_MAGISTRATE | 38→1→1 | P | False | [E318] [E319] |
| F43/段20 | GLOBE_HEAD | 23→8→8 | P | False | [E320] [E321] |
| F48/段21 | AEONGLASS | 78→21→未知 | P | False | [E322] [E024] |
| F48/段22 | AEONGLASS | 78→2→未知 | P | False | [E323] [E324] |
| F48/段23 | AEONGLASS | 78→2→0 | P | False | [E026] [E325] |

原帧HP上涨事件（逐场损血不可与它混算）：F7 noncombat_hp_gain +21 [E326][E327]；F8 noncombat_hp_gain +21 [E328][E329]；F11 noncombat_hp_gain +5 [E330][E331]；F13 noncombat_hp_gain +19 [E332][E333]；F16 noncombat_hp_gain +22 [E334][E335]；F18 noncombat_hp_gain +32 [E336][E337]；F27 noncombat_hp_gain +22 [E338][E339]；F32 noncombat_hp_gain +22 [E340][E341]；F33 sl_restore +46 [E018][E020]；F34 noncombat_hp_gain +44 [E342][E343]；F40 noncombat_hp_gain +22 [E344][E345]；F44 noncombat_hp_gain +22 [E346][E347]；F45 noncombat_hp_gain +20 [E348][E349]；F47 noncombat_hp_gain +28 [E350][E351]；F48 sl_restore +57 [E024][E323]；F48 sl_restore +76 [E324][E026]

饮药与弃药原动作：F4T1 use_potion ENERGY_POTION [E352]；F6T1 use_potion FYSH_OIL [E353]；F12T1 use_potion ENERGY_POTION [E354]；F17T1 use_potion FYSH_OIL [E355]；F17T3 use_potion FORTIFIER [E356]；F28T1 use_potion DEXTERITY_POTION [E357]；F33T2 use_potion SPEED_POTION [E358]；F33T3 use_potion SPEED_POTION [E359]；F36T3 use_potion SPEED_POTION [E360]；F39T1 use_potion FIRE_POTION [E361]；F43T1 use_potion CLARITY [E362]；F48T1 use_potion CURE_ALL [E363]；F48T3 use_potion POISON_POTION [E364]；F48T1 use_potion POISON_POTION [E365]；F48T2 use_potion CURE_ALL [E366]；F48T1 use_potion CURE_ALL [E367]；F48T3 use_potion POISON_POTION [E368]

**YF0LXT1QSTGG**：按原字节顺序的赢败战斗均列；T1缺帧的入口未知不得补。SL房重试不是新房间。

| 房/段 | 敌 | 当时HP入→末战→非战斗 | 当时候选 | 首试窗口 | 入口/末态证据 |
|---|---|---|---|---|---|
| F2/段1 | TOADPOLE+TOADPOLE | 56→51→51 | 未成型 | True | [E369] [E370] |
| F3/段2 | SEAPUNK | 51→50→50 | 未成型 | True | [E371] [E372] |
| F5/段3 | CORPSE_SLUG+CORPSE_SLUG | 50→50→50 | 未成型 | True | [E373] [E374] |
| F6/段4 | CALCIFIED_CULTIST+SEAPUNK | 50→39→39 | 未成型 | True | [E375] [E376] |
| F11/段5 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER | 60→48→48 | 未成型 | True | [E377] [E378] |
| F14/段6 | CALCIFIED_CULTIST+DAMP_CULTIST | 48→50→50 | 未成型 | True | [E379] [E380] |
| F15/段7 | HAUNTED_SHIP | 50→50→50 | 未成型 | True | [E381] [E382] |
| F17/段8 | WATERFALL_GIANT | 70→55→40 | 未成型 | True | [E383] [E384] |
| F19/段9 | EXOSKELETON+EXOSKELETON+EXOSKELETON | 64→66→66 | 未成型 | True | [E385] [E386] |
| F22/段10 | TUNNELER | 66→56→56 | P | True | [E387] [E388] |
| F23/段11 | MYTE+MYTE | 56→58→58 | P | True | [E389] [E390] |
| F24/段12 | SPINY_TOAD | 58→26→26 | P | True | [E391] [E392] |
| F27/段13 | BOWLBUG_ROCK+BOWLBUG_SILK+SLUMBERING_BEETLE | 47→37→37 | P | True | [E393] [E394] |
| F28/段14 | CHOMPER+CHOMPER | 37→32→32 | P | True | [E395] [E396] |
| F31/段15 | OVICOPTER | 53→53→53 | P | True | [E397] [E398] |
| F33/段16 | THE_INSATIABLE | 53→4→未知 | P | True | [E399] [E400] |
| F33/段17 | THE_INSATIABLE | 55→20→20 | P | False | [E401] [E402] |
| F35/段18 | LIVING_SHIELD+TURRET_OPERATOR | 60→52→52 | P | False | [E403] [E404] |
| F36/段19 | DEVOTED_SCULPTOR | 52→19→19 | P | False | [E405] [E406] |
| F38/段20 | THE_FORGOTTEN+THE_LOST | 19→12→12 | P | False | [E407] [E408] |
| F45/段21 | FLAIL_KNIGHT+MAGI_KNIGHT+SPECTRAL_KNIGHT | 70→2→2 | P | False | [E409] [E410] |
| F46/段22 | BATTLE_FRIEND_V1 | 2→4→4 | P,S | False | [E411] [E412] |
| F48/段23 | TEST_SUBJECT | 25→17→未知 | P,S | False | [E413] [E414] |
| F48/段24 | TEST_SUBJECT | 27→13→未知 | P,S | False | [E415] [E416] |
| F48/段25 | TEST_SUBJECT | 27→5→未知 | P,S | False | [E417] [E418] |
| F48/段26 | TEST_SUBJECT | 27→5→未知 | P,S | False | [E419] [E420] |
| F48/段27 | TEST_SUBJECT | 27→8→未知 | P,S | False | [E421] [E422] |
| F48/段28 | TEST_SUBJECT | 27→18→0 | P,S | False | [E053] [E423] |

原帧HP上涨事件（逐场损血不可与它混算）：F8 noncombat_hp_gain +21 [E424][E425]；F11 combat_hp_gain_or_revive +2 [E377][E426]；F14 combat_hp_gain_or_revive +2 [E379][E427]；F15 combat_hp_gain_or_revive +2 [E381][E428]；F16 noncombat_hp_gain +20 [E429][E430]；F18 noncombat_hp_gain +24 [E431][E432]；F19 combat_hp_gain_or_revive +2 [E385][E433]；F22 combat_hp_gain_or_revive +2 [E387][E434]；F23 combat_hp_gain_or_revive +2 [E389][E435]；F24 combat_hp_gain_or_revive +2 [E391][E436]；F25 noncombat_hp_gain +21 [E437][E438]；F27 combat_hp_gain_or_revive +2 [E393][E439]；F28 combat_hp_gain_or_revive +2 [E395][E440]；F29 noncombat_hp_gain +21 [E441][E442]；F31 combat_hp_gain_or_revive +2 [E397][E443]；F33 combat_hp_gain_or_revive +2 [E399][E444]；F33 sl_restore +51 [E400][E401]；F34 noncombat_hp_gain +40 [E445][E446]；F35 combat_hp_gain_or_revive +2 [E403][E447]；F36 combat_hp_gain_or_revive +2 [E405][E448]；F38 combat_hp_gain_or_revive +2 [E407][E449]；F40 noncombat_hp_gain +21 [E450][E451]；F42 noncombat_hp_gain +21 [E452][E453]；F44 noncombat_hp_gain +16 [E454][E455]；F46 combat_hp_gain_or_revive +2 [E411][E456]；F47 noncombat_hp_gain +21 [E457][E458]；F48 combat_hp_gain_or_revive +2 [E413][E459]；F48 sl_restore +10 [E414][E415]；F48 sl_restore +14 [E416][E417]；F48 sl_restore +22 [E418][E419]；F48 sl_restore +22 [E420][E421]；F48 sl_restore +19 [E422][E053]

饮药与弃药原动作：F5T2 use_potion GLOWWATER_POTION [E460]；F11T1 use_potion COLORLESS_POTION [E461]；F19T1 use_potion ATTACK_POTION [E462]；F22T1 use_potion POWER_POTION [E463]；F24T1 use_potion DUPLICATOR [E464]；F28T1 use_potion OROBIC_ACID [E465]；F31T1 use_potion ATTACK_POTION [E466]；F33T7 use_potion POISON_POTION [E467]；F33T1 use_potion POISON_POTION [E468]；F36T4 use_potion POISON_POTION [E469]；F38T2 use_potion LIQUID_BRONZE [E470]；F45T1 use_potion STRENGTH_POTION [E471]；F46T1 use_potion MAZALETHS_GIFT [E472]；F48T1 use_potion MAZALETHS_GIFT [E473]；F48T1 use_potion MAZALETHS_GIFT [E474]；F48T1 use_potion MAZALETHS_GIFT [E475]；F48T1 use_potion MAZALETHS_GIFT [E476]；F48T1 use_potion MAZALETHS_GIFT [E477]；F48T1 use_potion MAZALETHS_GIFT [E478]

**1LMBFGSMCWKU**：按原字节顺序的赢败战斗均列；T1缺帧的入口未知不得补。SL房重试不是新房间。

| 房/段 | 敌 | 当时HP入→末战→非战斗 | 当时候选 | 首试窗口 | 入口/末态证据 |
|---|---|---|---|---|---|
| F2/段1 | SLUDGE_SPINNER | 56→53→53 | 未成型 | True | [E479] [E480] |
| F4/段2 | CORPSE_SLUG+CORPSE_SLUG | 53→53→53 | 未成型 | True | [E481] [E482] |
| F5/段3 | TOADPOLE+TOADPOLE | 53→53→53 | 未成型 | True | [E483] [E484] |
| F7/段4 | HAUNTED_SHIP | 45→45→45 | 未成型 | True | [E485] [E486] |
| F9/段5 | PUNCH_CONSTRUCT | 45→45→45 | 未成型 | True | [E487] [E488] |
| F12/段6 | SKULKING_COLONY | 66→60→60 | 未成型 | True | [E489] [E490] |
| F14/段7 | FOSSIL_STALKER | 60→60→60 | 未成型 | True | [E491] [E492] |
| F15/段8 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER | 60→45→45 | 未成型 | True | [E493] [E494] |
| F17/段9 | WATERFALL_GIANT | 66→51→49 | R | True | [E495] [E496] |
| F19/段10 | BOWLBUG_EGG+BOWLBUG_ROCK | 65→65→65 | R | True | [E497] [E498] |
| F20/段11 | THIEVING_HOPPER | 65→64→64 | R | True | [E499] [E500] |
| F21/段12 | OVICOPTER | 64→51→51 | R | True | [E501] [E502] |
| F23/段13 | BOWLBUG_EGG+BOWLBUG_NECTAR+BOWLBUG_ROCK | 51→51→51 | R | True | [E503] [E504] |
| F25/段14 | DECIMILLIPEDE_SEGMENT_BACK+DECIMILLIPEDE_SEGMENT_FRONT+DECIMILLIPEDE_SEGMENT_MIDDLE | 70→38→38 | R | True | [E505] [E506] |
| F30/段15 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON | 59→61→61 | R | True | [E507] [E508] |
| F33/段16 | KNOWLEDGE_DEMON | 61→25→21 | R | True | [E509] [E510] |
| F35/段17 | DEVOTED_SCULPTOR | 60→62→62 | R | True | [E511] [E512] |
| F37/段18 | LIVING_SHIELD+TURRET_OPERATOR | 62→60→60 | R | True | [E513] [E514] |
| F39/段19 | SLIMED_BERSERKER | 45→45→45 | R | True | [E515] [E516] |
| F40/段20 | GLOBE_HEAD | 45→43→43 | R | True | [E517] [E518] |
| F45/段21 | FROG_KNIGHT | 64→62→62 | R | True | [E519] [E520] |
| F48/段22 | QUEEN+TORCH_HEAD_AMALGAM | 62→9→21 | R | True | [E056] [E057] |

原帧HP上涨事件（逐场损血不可与它混算）：F11 noncombat_hp_gain +21 [E521][E522]；F16 noncombat_hp_gain +21 [E523][E524]；F18 noncombat_hp_gain +16 [E525][E526]；F24 noncombat_hp_gain +19 [E527][E528]；F27 noncombat_hp_gain +21 [E529][E530]；F30 combat_hp_gain_or_revive +2 [E507][E531]；F33 combat_hp_gain_or_revive +2 [E509][E532]；F34 noncombat_hp_gain +39 [E533][E534]；F35 combat_hp_gain_or_revive +2 [E511][E535]；F37 combat_hp_gain_or_revive +2 [E513][E536]；F39 combat_hp_gain_or_revive +2 [E515][E537]；F40 combat_hp_gain_or_revive +2 [E517][E538]；F44 noncombat_hp_gain +21 [E539][E540]；F45 combat_hp_gain_or_revive +2 [E519][E541]；F48 combat_hp_gain_or_revive +2 [E056][E542]；F48 noncombat_hp_gain +12 [E057][E543]

饮药与弃药原动作：F7T1 use_potion POWER_POTION [E544]；F14T1 use_potion DUPLICATOR [E545]；F17T1 use_potion FLEX_POTION [E546]；F17T1 use_potion BOTTLED_POTENTIAL [E547]；F19T1 use_potion DEXTERITY_POTION [E548]；F33T1 use_potion DUPLICATOR [E549]；F39T1 use_potion POTION_OF_BINDING [E550]；F45T1 use_potion FLEX_POTION [E551]；F48T6 use_potion SPEED_POTION [E552]

**L704TLETMZBM**：按原字节顺序的赢败战斗均列；T1缺帧的入口未知不得补。SL房重试不是新房间。

| 房/段 | 敌 | 当时HP入→末战→非战斗 | 当时候选 | 首试窗口 | 入口/末态证据 |
|---|---|---|---|---|---|
| F2/段1 | SEAPUNK | 56→53→53 | 未成型 | True | [E553] [E554] |
| F3/段2 | TOADPOLE+TOADPOLE | 53→45→45 | 未成型 | True | [E555] [E556] |
| F8/段3 | PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER+PHANTASMAL_GARDENER | 66→60→60 | 未成型 | True | [E557] [E558] |
| F11/段4 | CORPSE_SLUG+CORPSE_SLUG | 60→62→62 | 未成型 | True | [E559] [E560] |
| F14/段5 | SEWER_CLAM | 62→59→59 | 未成型 | True | [E561] [E562] |
| F17/段6 | WATERFALL_GIANT | 75→58→32 | 未成型 | True | [E563] [E564] |
| F19/段7 | THIEVING_HOPPER | 67→56→56 | 未成型 | True | [E565] [E566] |
| F20/段8 | BOWLBUG_NECTAR+BOWLBUG_ROCK | 56→52→52 | 未成型 | True | [E567] [E568] |
| F25/段9 | ENTOMANCER | 74→72→72 | 未成型 | True | [E569] [E570] |
| F28/段10 | EXOSKELETON+EXOSKELETON+EXOSKELETON+EXOSKELETON | 72→65→65 | 未成型 | True | [E571] [E572] |
| F31/段11 | CHOMPER+CHOMPER | 65→34→34 | P | True | [E573] [E574] |
| F33/段12 | CRUSHER+ROCKET | 76→42→42 | P | True | [E575] [E576] |
| F35/段13 | DEVOTED_SCULPTOR | 69→71→71 | P | True | [E577] [E578] |
| F42/段14 | SOUL_NEXUS | 76→24→24 | P | True | [E579] [E580] |
| F44/段15 | MECHA_KNIGHT | 76→9→9 | P | True | [E581] [E582] |
| F45/段16 | LIVING_SHIELD+TURRET_OPERATOR | 9→5→5 | P,R | True | [E583] [E584] |
| F46/段17 | GLOBE_HEAD | 5→3→3 | P,R | True | [E585] [E586] |
| F48/段18 | TEST_SUBJECT | 64→7→未知 | P,R | True | [E587] [E588] |
| F48/段19 | TEST_SUBJECT | 66→16→未知 | P,R | False | [E589] [E590] |
| F48/段20 | TEST_SUBJECT | 66→49→0 | P,R | False | [E062] [E591] |

原帧HP上涨事件（逐场损血不可与它混算）：F7 noncombat_hp_gain +21 [E592][E593]；F11 combat_hp_gain_or_revive +2 [E559][E594]；F14 combat_hp_gain_or_revive +2 [E561][E595]；F16 noncombat_hp_gain +22 [E596][E597]；F17 combat_hp_gain_or_revive +1 [E563][E598]；F18 noncombat_hp_gain +35 [E599][E600]；F19 combat_hp_gain_or_revive +2 [E565][E601]；F20 combat_hp_gain_or_revive +2 [E567][E602]；F24 noncombat_hp_gain +22 [E603][E604]；F25 combat_hp_gain_or_revive +2 [E569][E605]；F28 combat_hp_gain_or_revive +2 [E571][E606]；F31 combat_hp_gain_or_revive +2 [E573][E607]；F32 noncombat_hp_gain +18 [E608][E609]；F32 noncombat_hp_gain +24 [E610][E611]；F34 noncombat_hp_gain +27 [E612][E613]；F35 combat_hp_gain_or_revive +2 [E577][E578]；F40 noncombat_hp_gain +17 [E614][E615]；F43 noncombat_hp_gain +21 [E616][E617]；F43 noncombat_hp_gain +31 [E617][E618]；F45 combat_hp_gain_or_revive +2 [E583][E619]；F46 combat_hp_gain_or_revive +2 [E585][E620]；F47 noncombat_hp_gain +24 [E621][E622]；F47 noncombat_hp_gain +37 [E622][E623]；F48 combat_hp_gain_or_revive +2 [E587][E624]；F48 sl_restore +59 [E588][E589]；F48 sl_restore +50 [E590][E062]

饮药与弃药原动作：F8T1 use_potion STABLE_SERUM [E625]；F8T1 use_potion DEXTERITY_POTION [E626]；F11T1 use_potion VULNERABLE_POTION [E627]；F17T2 use_potion SHIP_IN_A_BOTTLE [E628]；F17T3 use_potion GAMBLERS_BREW [E629]；F25T1 use_potion FLEX_POTION [E630]；F31T2 use_potion DUPLICATOR [E631]；F32TNone discard_potion CUNNING_POTION [E632]；F33T1 use_potion DISTILLED_CHAOS [E633]；F33T2 use_potion BLOCK_POTION [E634]；F42T1 use_potion SKILL_POTION [E635]；F42T1 use_potion VULNERABLE_POTION [E636]；F42T1 use_potion POWER_POTION [E637]；F44T1 use_potion FLEX_POTION [E638]；F44T1 use_potion SWIFT_POTION [E639]；F44T1 use_potion ATTACK_POTION [E640]；F46T1 use_potion FIRE_POTION [E641]；F48T1 use_potion STRENGTH_POTION [E642]；F48T1 use_potion EXPLOSIVE_AMPOULE [E643]；F48T1 use_potion STRENGTH_POTION [E644]；F48T1 use_potion EXPLOSIVE_AMPOULE [E645]；F48T1 use_potion STRENGTH_POTION [E646]；F48T1 use_potion EXPLOSIVE_AMPOULE [E647]

## 5. 逐boss、进阶、来源矩阵与通用性

下表只展开有到达样本的格子；完整零到达格及来源分组见boss-matrix-complete.json，基础统计在boss-matrix.json。候选在实际boss入口就满足签名才纳入；TXZ缺入口不猜候选，JMH缺T1–T2的入口有左删失。首试到达要在整局首个predicted_death之前，含SL最终使用原run结局，不能把F48胜当整局胜。分母标成“胜/到达”，整局率的分母是该进阶该来源曾实际成型的全部局（含到boss前失败），不是只到该boss者；本列在同一候选/进阶/来源不同boss重复是有意的。

95% Wilson区间用于说明有限样本的不确定性，不是未来概率保证。HP列为最终通过尝试或最后失败尝试的净差，中位[min,max]/n；它不是无回血的纯损血。药数为该最终/失败尝试summary实际饮药次数；“全部尝试药数/额外尝试”保留SL执行代价，不解释成独立瓶数。首试截断以后才首次通过的boss存在路径SL依赖，但它未必在该boss本身重打。

### P. 施毒触媒与持续防御

| A/脑 | boss | 首试胜/到达 | 含SL最终胜/到达 | 最终率95%区间 | 整局首胜/首成型；最终胜/成型 | HP净耗中位[min,max]/n | 回合中位 | 药数/全尝试药数/额外尝试 |
|---|---|---|---|---|---|---|---|---|
| A0/codex | TEST_SUBJECT | 0/3 (0.0%) | 1/3 (33.3%) | [0.0615, 0.7923] | 0/3; 1/3 | 58 [41,80],n=3 | 11 [3,14],n=3 | 6/13/8 |
| A0/codex | THE_INSATIABLE | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/3; 1/3 | 48 [48,48],n=1 | 8 [8,8],n=1 | 2/2/0 |
| A2/codex | QUEEN+TORCH_HEAD_AMALGAM | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 27 [27,27],n=1 | 8 [8,8],n=1 | 1/1/0 |
| A2/codex | THE_INSATIABLE | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 11 [11,11],n=1 | 5 [5,5],n=1 | 1/1/0 |
| A3/codex | TEST_SUBJECT | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 38 [38,38],n=1 | 13 [13,13],n=1 | 2/2/0 |
| A4/codex | LAGAVULIN_MATRIARCH | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 0/1 | 32 [32,32],n=1 | 6 [6,6],n=1 | 1/1/0 |
| A6/codex | CRUSHER+ROCKET | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 27 [27,27],n=1 | 4 [4,4],n=1 | 1/6/5 |
| A6/mixed | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 0/1 | 11 [11,11],n=1 | 9 [9,9],n=1 | 1/1/0 |
| A7/codex | AEONGLASS | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/3; 0/3 | 67 [67,67],n=1 | 7 [7,7],n=1 | 1/6/5 |
| A7/codex | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/3; 0/3 | 4 [4,4],n=1 | 10 [10,10],n=1 | 0/0/0 |
| A7/codex | QUEEN+TORCH_HEAD_AMALGAM | 0/0（未知） | 0/1 (0.0%) | [0.0, 0.7935] | 0/3; 0/3 | 42 [42,42],n=1 | 5 [5,5],n=1 | 1/6/5 |
| A8/codex | CRUSHER+ROCKET | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 19 [19,19],n=1 | 5 [5,5],n=1 | 1/1/0 |
| A8/codex | QUEEN+TORCH_HEAD_AMALGAM | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 10 [10,10],n=1 | 7 [7,7],n=1 | 1/1/0 |
| A9/codex | CRUSHER+ROCKET | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 34 [34,34],n=1 | 4 [4,4],n=1 | 1/6/5 |
| A10/codex | AEONGLASS | 3/9 (33.3%) | 6/14 (42.9%) | [0.2138, 0.6741] | 0/39; 0/44 | 42.0 [8,78],n=14 | 7.5 [1,11],n=14 | 15/39/40 |
| A10/codex | CEREMONIAL_BEAST | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/39; 0/44 | 29 [29,29],n=1 | 9 [9,9],n=1 | 0/0/0 |
| A10/codex | CRUSHER+ROCKET | 6/6 (100.0%) | 6/10 (60.0%) | [0.3127, 0.8318] | 0/39; 0/44 | 58.5 [34,77],n=10 | 9.0 [4,10],n=10 | 14/34/15 |
| A10/codex | KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/39; 0/44 | 35 [35,35],n=1 | 8 [8,8],n=1 | 1/6/5 |
| A10/codex | KNOWLEDGE_DEMON | 5/6 (83.3%) | 7/8 (87.5%) | [0.5291, 0.9776] | 0/39; 0/44 | 24.5 [3,60],n=8 | 9.5 [7,13],n=8 | 10/20/5 |
| A10/codex | LAGAVULIN_MATRIARCH | 2/3 (66.7%) | 3/3 (100.0%) | [0.4385, 1.0] | 0/39; 0/44 | 28 [16,34],n=3 | 9 [9,10],n=3 | 1/2/1 |
| A10/codex | QUEEN+TORCH_HEAD_AMALGAM | 2/4 (50.0%) | 2/5 (40.0%) | [0.1176, 0.7693] | 0/39; 0/44 | 27 [23,48],n=5 | 4 [3,11],n=5 | 6/31/15 |
| A10/codex | SOUL_FYSH | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/39; 0/44 | 19 [19,19],n=1 | 7 [7,7],n=1 | 0/0/0 |
| A10/codex | TEST_SUBJECT | 0/5 (0.0%) | 1/7 (14.3%) | [0.0257, 0.5131] | 0/39; 0/44 | 50 [8,66],n=7 | 6 [2,13],n=7 | 8/38/31 |
| A10/codex | THE_INSATIABLE | 3/11 (27.3%) | 9/12 (75.0%) | [0.4677, 0.9111] | 0/39; 0/44 | 44.5 [17,70],n=12 | 8.5 [6,11],n=12 | 9/19/18 |
| A10/codex | VANTOM | 2/2 (100.0%) | 2/2 (100.0%) | [0.3424, 1.0] | 0/39; 0/44 | 43.5 [41,46],n=2 | 9.5 [9,10],n=2 | 3/3/0 |
| A10/codex | WATERFALL_GIANT | 1/2 (50.0%) | 1/2 (50.0%) | [0.0945, 0.9055] | 0/39; 0/44 | 28.5 [13,44],n=2 | 13.0 [10,16],n=2 | 2/2/0 |
| A10/deepseek | CRUSHER+ROCKET | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/2; 0/2 | 43 [43,43],n=1 | 9 [9,9],n=1 | 1/1/0 |
| A10/deepseek | TEST_SUBJECT | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/2; 0/2 | 71 [71,71],n=1 | 8 [8,8],n=1 | 0/0/5 |

A0零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A1零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A2零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A3零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A4零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A5零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A6零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A7零到达/缺证boss：CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A8零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A9零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A10零到达/缺证boss：；到达0、独立胜负0/0、通过率未知，资源未知。

通用性状态：跨boss有局部实际通过；整套通杀未验证。入口已观察覆盖12种实际encounter，实际通过11种；不同等级与来源的这些覆盖不能合成‘所有boss均能稳定通过’。按同A/脑的重复通过数和消耗复查，而非凭名称泛化。

### D. 叠敏捷多挡与持续输出

| A/脑 | boss | 首试胜/到达 | 含SL最终胜/到达 | 最终率95%区间 | 整局首胜/首成型；最终胜/成型 | HP净耗中位[min,max]/n | 回合中位 | 药数/全尝试药数/额外尝试 |
|---|---|---|---|---|---|---|---|---|
| A0/codex | TEST_SUBJECT | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/2 | 41 [41,41],n=1 | 3 [3,3],n=1 | 1/3/2 |
| A0/codex | THE_INSATIABLE | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 0/2 | 48 [48,48],n=1 | 8 [8,8],n=1 | 2/2/0 |
| A1/codex | AEONGLASS | 0/1 (0.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 1/1 | 68 [68,68],n=1 | 12 [12,12],n=1 | 1/2/1 |
| A1/codex | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 1/1 | 46 [46,46],n=1 | 10 [10,10],n=1 | 0/0/0 |
| A3/codex | TEST_SUBJECT | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 38 [38,38],n=1 | 13 [13,13],n=1 | 2/2/0 |
| A4/codex | QUEEN+TORCH_HEAD_AMALGAM | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 51 [51,51],n=1 | 9 [9,9],n=1 | 2/12/5 |
| A6/codex | AEONGLASS | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 75 [75,75],n=1 | 11 [11,11],n=1 | 0/0/5 |
| A6/codex | CRUSHER+ROCKET | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 0/1 | 37 [37,37],n=1 | 11 [11,11],n=1 | 0/0/0 |
| A7/codex | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/2; 1/2 | 4 [4,4],n=1 | 10 [10,10],n=1 | 0/0/0 |
| A7/codex | QUEEN+TORCH_HEAD_AMALGAM | 1/1 (100.0%) | 1/2 (50.0%) | [0.0945, 0.9055] | 1/2; 1/2 | 54.5 [42,67],n=2 | 10.0 [5,15],n=2 | 5/10/5 |
| A10/codex | AEONGLASS | 0/4 (0.0%) | 1/6 (16.7%) | [0.0301, 0.5635] | 0/18; 0/22 | 36.0 [8,70],n=6 | 8.5 [1,11],n=6 | 5/27/29 |
| A10/codex | CRUSHER+ROCKET | 0/1 (0.0%) | 1/2 (50.0%) | [0.0945, 0.9055] | 0/18; 0/22 | 45.0 [43,47],n=2 | 7.5 [5,10],n=2 | 1/4/8 |
| A10/codex | KNOWLEDGE_DEMON | 3/5 (60.0%) | 3/5 (60.0%) | [0.2307, 0.8824] | 0/18; 0/22 | 43 [22,60],n=5 | 11 [8,13],n=5 | 5/15/10 |
| A10/codex | LAGAVULIN_MATRIARCH | 2/2 (100.0%) | 2/2 (100.0%) | [0.3424, 1.0] | 0/18; 0/22 | 12.0 [8,16],n=2 | 8.0 [7,9],n=2 | 2/2/0 |
| A10/codex | QUEEN+TORCH_HEAD_AMALGAM | 1/2 (50.0%) | 2/6 (33.3%) | [0.0968, 0.7] | 0/18; 0/22 | 32.5 [7,84],n=6 | 4.5 [2,11],n=6 | 5/24/22 |
| A10/codex | TEST_SUBJECT | 0/5 (0.0%) | 4/7 (57.1%) | [0.2505, 0.8418] | 0/18; 0/22 | 52 [8,67],n=7 | 13 [2,17],n=7 | 9/33/25 |
| A10/codex | THE_INSATIABLE | 4/5 (80.0%) | 4/5 (80.0%) | [0.3755, 0.9638] | 0/18; 0/22 | 49 [23,64],n=5 | 10 [8,11],n=5 | 6/21/5 |
| A10/codex | VANTOM | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/18; 0/22 | 19 [19,19],n=1 | 11 [11,11],n=1 | 2/2/0 |
| A10/codex | WATERFALL_GIANT | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/18; 0/22 | 13 [13,13],n=1 | 10 [10,10],n=1 | 1/1/0 |

A0零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A1零到达/缺证boss：CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A2零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A3零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A4零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A5零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A6零到达/缺证boss：CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A7零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A8零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A9零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A10零到达/缺证boss：CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, SOUL_FYSH；到达0、独立胜负0/0、通过率未知，资源未知。

通用性状态：跨boss有局部实际通过；整套通杀未验证。入口已观察覆盖9种实际encounter，实际通过9种；不同等级与来源的这些覆盖不能合成‘所有boss均能稳定通过’。按同A/脑的重复通过数和消耗复查，而非凭名称泛化。

### S. 小刀供给增益与逐牌防御

| A/脑 | boss | 首试胜/到达 | 含SL最终胜/到达 | 最终率95%区间 | 整局首胜/首成型；最终胜/成型 | HP净耗中位[min,max]/n | 回合中位 | 药数/全尝试药数/额外尝试 |
|---|---|---|---|---|---|---|---|---|
| A0/codex | TEST_SUBJECT | 0/1 (0.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 1/1 | 58 [58,58],n=1 | 14 [14,14],n=1 | 5/10/1 |
| A2/codex | CRUSHER+ROCKET | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 38 [38,38],n=1 | 4 [4,4],n=1 | 1/6/5 |
| A3/codex | TEST_SUBJECT | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 38 [38,38],n=1 | 13 [13,13],n=1 | 2/2/0 |
| A4/codex | CRUSHER+ROCKET | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/2; 0/2 | 21 [21,21],n=1 | 10 [10,10],n=1 | 1/1/0 |
| A4/codex | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/2; 0/2 | 41 [41,41],n=1 | 10 [10,10],n=1 | 0/0/0 |
| A4/codex | QUEEN+TORCH_HEAD_AMALGAM | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/2; 0/2 | 51 [51,51],n=1 | 9 [9,9],n=1 | 2/12/5 |
| A6/codex | AEONGLASS | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/4; 1/4 | 64 [64,64],n=1 | 10 [10,10],n=1 | 2/2/0 |
| A6/codex | CEREMONIAL_BEAST | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/4; 1/4 | 58 [58,58],n=1 | 10 [10,10],n=1 | 0/0/0 |
| A6/codex | CRUSHER+ROCKET | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 1/4; 1/4 | 27 [27,27],n=1 | 4 [4,4],n=1 | 1/6/5 |
| A6/codex | TEST_SUBJECT | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 1/4; 1/4 | 84 [84,84],n=1 | 9 [9,9],n=1 | 1/6/5 |
| A6/mixed | KNOWLEDGE_DEMON | 0/1 (0.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/1; 0/1 | 38 [38,38],n=1 | 14 [14,14],n=1 | 1/2/1 |
| A6/mixed | TEST_SUBJECT | 0/0（未知） | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 66 [66,66],n=1 | 9 [9,9],n=1 | 1/6/5 |
| A7/codex | CEREMONIAL_BEAST | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 53 [53,53],n=1 | 14 [14,14],n=1 | 1/6/5 |
| A10/codex | AEONGLASS | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 0/10; 0/12 | 22 [22,22],n=1 | 6 [6,6],n=1 | 2/2/0 |
| A10/codex | CRUSHER+ROCKET | 1/3 (33.3%) | 1/3 (33.3%) | [0.0615, 0.7923] | 0/10; 0/12 | 33 [30,47],n=3 | 5 [4,10],n=3 | 0/0/10 |
| A10/codex | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/2 (50.0%) | [0.0945, 0.9055] | 0/10; 0/12 | 27.5 [27,28],n=2 | 12.0 [11,13],n=2 | 2/7/5 |
| A10/codex | QUEEN+TORCH_HEAD_AMALGAM | 1/4 (25.0%) | 1/5 (20.0%) | [0.0362, 0.6245] | 0/10; 0/12 | 32 [12,67],n=5 | 6 [2,12],n=5 | 6/31/20 |
| A10/codex | SOUL_FYSH | 2/2 (100.0%) | 2/2 (100.0%) | [0.3424, 1.0] | 0/10; 0/12 | 36.5 [27,46],n=2 | 11.5 [9,14],n=2 | 1/1/0 |
| A10/codex | TEST_SUBJECT | 0/3 (0.0%) | 1/4 (25.0%) | [0.0456, 0.6994] | 0/10; 0/12 | 38.5 [13,55],n=4 | 6.5 [5,15],n=4 | 7/30/17 |
| A10/codex | THE_INSATIABLE | 2/2 (100.0%) | 2/2 (100.0%) | [0.3424, 1.0] | 0/10; 0/12 | 25.5 [23,28],n=2 | 9.0 [8,10],n=2 | 0/0/0 |
| A10/deepseek | TEST_SUBJECT | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/1; 0/1 | 71 [71,71],n=1 | 8 [8,8],n=1 | 0/0/5 |

A0零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A1零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A2零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A3零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A4零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A5零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A6零到达/缺证boss：KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A7零到达/缺证boss：AEONGLASS, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A8零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A9零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A10零到达/缺证boss：CEREMONIAL_BEAST, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

通用性状态：跨boss有局部实际通过；整套通杀未验证。入口已观察覆盖8种实际encounter，实际通过8种；不同等级与来源的这些覆盖不能合成‘所有boss均能稳定通过’。按同A/脑的重复通过数和消耗复查，而非凭名称泛化。

### R. 抽弃循环与遗物攻防收益

| A/脑 | boss | 首试胜/到达 | 含SL最终胜/到达 | 最终率95%区间 | 整局首胜/首成型；最终胜/成型 | HP净耗中位[min,max]/n | 回合中位 | 药数/全尝试药数/额外尝试 |
|---|---|---|---|---|---|---|---|---|
| A4/codex | KNOWLEDGE_DEMON | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 42 [42,42],n=1 | 10 [10,10],n=1 | 1/1/0 |
| A4/codex | QUEEN+TORCH_HEAD_AMALGAM | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 41 [41,41],n=1 | 11 [11,11],n=1 | 1/1/0 |
| A4/codex | WATERFALL_GIANT | 1/1 (100.0%) | 1/1 (100.0%) | [0.2065, 1.0] | 1/1; 1/1 | 17 [17,17],n=1 | 10 [10,10],n=1 | 2/2/0 |
| A10/codex | AEONGLASS | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/5; 0/5 | 33 [33,33],n=1 | 8 [8,8],n=1 | 0/0/5 |
| A10/codex | TEST_SUBJECT | 0/1 (0.0%) | 0/1 (0.0%) | [0.0, 0.7935] | 0/5; 0/5 | 66 [66,66],n=1 | 6 [6,6],n=1 | 2/6/2 |
| A10/codex | THE_INSATIABLE | 1/2 (50.0%) | 1/2 (50.0%) | [0.0945, 0.9055] | 0/5; 0/5 | 61.5 [59,64],n=2 | 10.5 [10,11],n=2 | 2/2/0 |

A0零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A1零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A2零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A3零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A4零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, LAGAVULIN_MATRIARCH, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM；到达0、独立胜负0/0、通过率未知，资源未知。

A5零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A6零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A7零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A8零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A9零到达/缺证boss：AEONGLASS, CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, TEST_SUBJECT, THE_INSATIABLE, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

A10零到达/缺证boss：CEREMONIAL_BEAST, CRUSHER+ROCKET, KIN_FOLLOWER+KIN_FOLLOWER+KIN_PRIEST, KNOWLEDGE_DEMON, LAGAVULIN_MATRIARCH, QUEEN+TORCH_HEAD_AMALGAM, SOUL_FYSH, VANTOM, WATERFALL_GIANT；到达0、独立胜负0/0、通过率未知，资源未知。

通用性状态：遗物组件局部验证；整套跨boss重复性不足。入口已观察覆盖6种实际encounter，实际通过4种；不同等级与来源的这些覆盖不能合成‘所有boss均能稳定通过’。按同A/脑的重复通过数和消耗复查，而非凭名称泛化。

## 6. 最新向前每二十局的全漏斗

W1为最新20局，依次向前；W10仅最早1局。每窗完整run列表见twenty-run-funnels.json。B1=F17，B2=F33，B3a=F48，B3b=F49（仍第三幕第二boss，不是第四幕）；到达依据实际SL boss日志，且入口缺帧仍计到达。入二/三幕另据实际战斗段。所有窗口包含早亡、未成型及其他引擎，来源、进阶组成并列；纯Codex分母由第2节和机器清单复算。

| 窗/局数 | 进阶/脑组成 | 首试B1/B2/B3a/B3b 到达→过 | 最终B1/B2/B3a/B3b 到达→过 | 终胜首/末 | B1前亡 | 候选成型P/D/S/R |
|---|---|---|---|---|---|---|
| W1/20 | {'10': 20} {'codex': 20} | 17→15 ; 11→8 ; 6→2 ; 2→0 | 17→16 ; 12→11 ; 7→5 ; 5→0 | 0/0 | 3 | 6/6/2/1 |
| W2/20 | {'10': 20} {'codex': 20} | 18→12 ; 8→4 ; 4→1 ; 1→0 | 18→13 ; 9→6 ; 5→3 ; 3→0 | 0/0 | 2 | 4/2/2/0 |
| W3/20 | {'10': 20} {'codex': 20} | 18→15 ; 8→4 ; 3→1 ; 1→0 | 18→16 ; 11→6 ; 4→2 ; 2→0 | 0/0 | 2 | 6/2/2/1 |
| W4/20 | {'10': 20} {'codex': 20} | 19→14 ; 10→4 ; 4→1 ; 1→0 | 19→16 ; 11→6 ; 5→3 ; 3→0 | 0/0 | 1 | 7/3/2/0 |
| W5/20 | {'10': 20} {'codex': 19, 'mixed': 1} | 18→12 ; 8→4 ; 1→0 ; 0→0 | 18→13 ; 8→6 ; 2→1 ; 1→0 | 0/0 | 2 | 6/2/2/1 |
| W6/20 | {'10': 20} {'codex': 20} | 15→12 ; 8→6 ; 4→1 ; 1→0 | 15→13 ; 10→10 ; 5→1 ; 1→0 | 0/0 | 5 | 7/3/1/1 |
| W7/20 | {'10': 20} {'codex': 15, 'deepseek': 5} | 18→11 ; 8→5 ; 5→0 ; 0→0 | 18→14 ; 11→6 ; 5→2 ; 2→0 | 0/0 | 2 | 10/4/2/1 |
| W8/20 | {'10': 1, '9': 3, '8': 1, '7': 7, '6': 8} {'codex': 19, 'mixed': 1} | 20→18 ; 15→11 ; 9→3 ; 0→0 | 20→18 ; 15→13 ; 10→4 ; 0→0 | 3/4 | 0 | 7/3/5/0 |
| W9/20 | {'6': 3, '5': 1, '4': 4, '3': 1, '2': 2, '1': 3, '0': 6} {'codex': 19, 'mixed': 1} | 19→15 ; 14→11 ; 9→3 ; 0→0 | 19→17 ; 15→13 ; 11→6 ; 0→0 | 3/6 | 1 | 6/5/6/1 |
| W10/1 | {'0': 1} {'codex': 1} | 1→0 ; 0→0 ; 0→0 ; 0→0 | 1→1 ; 1→0 ; 0→0 ; 0→0 | 0/0 | 0 | 0/0/0/0 |

每窗更完整的终层直方图、实际入幕、具体run、成型分母均在机器文件；这些窗口是观察，不同版本/进阶不可作受控趋势。阶段缩失可见：整批181局F17到达163/通过137，F33到达103/通过77，F48到达54/通过27，F49到达17/通过0；低阶10胜在F48结束，A10须继续第二终局boss，不能直接比较两个终局结构。

纯Codex窗口主战绩另列，其他来源窗口漏斗保存在twenty-run-funnels-by-cohort.json，避免把其他引擎成绩混成主曲线：

| 窗/纯Codex局数 | 首试B1/B2/B3a/B3b 到达→过 | 最终B1/B2/B3a/B3b 到达→过 | 首胜/末胜 |
|---|---|---|---|
| W1/20 | 17→15 ; 11→8 ; 6→2 ; 2→0 | 17→16 ; 12→11 ; 7→5 ; 5→0 | 0/0 |
| W2/20 | 18→12 ; 8→4 ; 4→1 ; 1→0 | 18→13 ; 9→6 ; 5→3 ; 3→0 | 0/0 |
| W3/20 | 18→15 ; 8→4 ; 3→1 ; 1→0 | 18→16 ; 11→6 ; 4→2 ; 2→0 | 0/0 |
| W4/20 | 19→14 ; 10→4 ; 4→1 ; 1→0 | 19→16 ; 11→6 ; 5→3 ; 3→0 | 0/0 |
| W5/19 | 17→12 ; 8→4 ; 1→0 ; 0→0 | 17→13 ; 8→6 ; 2→1 ; 1→0 | 0/0 |
| W6/20 | 15→12 ; 8→6 ; 4→1 ; 1→0 | 15→13 ; 10→10 ; 5→1 ; 1→0 | 0/0 |
| W7/15 | 15→9 ; 7→4 ; 4→0 ; 0→0 | 15→12 ; 10→5 ; 4→2 ; 2→0 | 0/0 |
| W8/19 | 19→17 ; 14→10 ; 9→3 ; 0→0 | 19→17 ; 14→12 ; 10→4 ; 0→0 | 3/4 |
| W9/19 | 18→14 ; 13→11 ; 9→3 ; 0→0 | 18→16 ; 14→12 ; 10→6 ; 0→0 | 3/6 |
| W10/1 | 1→0 ; 0→0 ; 0→0 ; 0→0 | 1→1 ; 1→0 ; 0→0 ; 0→0 | 0/0 |

## 7. 构筑模板、接入建议与下一步缺数据

construction-templates.json含当前目标、最低观察签名、缺口检查、已见补强/替代、过渡、暂停/转型条件及账本来源。模板能提供有证据的待验证构筑方向，不能自动变成固定选牌优先级、药水持有价值、必死/SL或终局价值规则。主轴具体协作有实证，整套泛化未证。具体规则以第3节逐候选来源为准，原机制claim/prior/反例不被本轮改写。

建议开发会话先将角色模板作为数据草案接入现有静默知识/经验到大脑上下文路径，显示“当时已拥有/缺少/实际尚未建立”，只覆盖已观察静默A0–A10，禁止把低阶成型胜率用于A10。保留原选项完整性，大脑自行取舍；若需新模板消费者或阶段记录接口，属架构接入提案，先验证读取证据、首次成型标记、引用传递与未知字段不被改成0。报告落盘或账本observed不等上线，消费者读取和采用必须由开发/运维后续实际核实。详见integration-proposals.md，无注册实现或部署承诺。

下一步需要：同进阶/同实际版本可重复的各boss入口与终局敌HP；特别是A10同局F48→F49完整成型路径、药水/HP接续及首试无SL样本；同状态实际不同组件/顺序的配对结果，才能研究因果；不同供刀/施毒/格挡替代件的实际互换；明确回血、复活和SL恢复逐击帧。继续保留早亡和未成型局，不能只采最后boss。以上是采证要求，不是安排新对局或更改生产日志源码。

## 8. 账本查重、历史保留及限制

先保存只含silent的账本折叠快照，再经主项目learner/ledger.py find查触媒/敏捷/小刀/弃牌：64/110/53/50个匹配，原stdout已封存。已有机制/单局构筑归因全部仅关联原id；全历史四类可复算签名的到达/失败与限制为新增综合观察，保留prior=unknown：无法从历史证明大脑是否按这四模板决策，不能把过去会用机制写成新学习成功。仅经CLI追加observed，未标shipped；原prior/claim/反例不改。

新综合条目：silent-0352, silent-0353, silent-0354, silent-0355，均observed/prior unknown，原CLI及逐项show核验见ledger-registration.json；未shipped。

- A10全部141局最终0胜；纯Codex A10为0/135。没有可声称轻松通杀的整套构筑，F48局部通过不等于F49或整局通关。

- 冻结时未测整份日志前缀SHA；本轮仅能冻结181局索引抽取原字节、偏移与逐行SHA，并复核同一原字节。不能倒造冻结时全日志SHA或未记录帧。

- JMH5C51RLN4E A10 F17仪式兽入口缺T1–T2，原记录首个可见回合T3；入口牌组/HP及启动时间有左删失。TXZ6RVMQA09D A10 F49实验体只有SL死亡摘要和终局状态，缺整场入口/过程，不能以终局牌组倒填候选。

- 胜场最后攻击/毒结算经常不留战斗出口敌HP；有效伤害逐帧可见扣HP为下界，过量伤害、隐含末击和多数牌本体/毒/遗物分解未知。终局携带combat body时另据原文纳入。

- 状态帧只覆盖被日志记录的动作边界；内部逐击/复活/同一步回血顺序和未记录脑题不可补全。“原帧核对”指清单内已索引121622行，不宣称不存在缺失帧。

- 候选按当时实际牌组共现定义，互相重叠；最小成型条件是可复算识别条件，并非必要充分条件。不同进阶、版本、抽序、路线、遗物、药水、SL及存活选择混杂，没有配对反事实或因果胜率。

- 进场到SL摘要出口的HP净差包含战内回血/复活及可能战后收益；另列可见扣血和增血。重复SL药水执行次数不是独立携带瓶数或资源成本。

- 药水动作2213条：1813已完成、398排队pending未逐项配对后状态、2未派发；排队不一律计确认消耗。表内药数是实战SL summary口径，和全部动作数量、独立资源瓶数分开。

- 来源标签仅核已记录成功脑题；173纯Codex、5DeepSeek、3mixed单列。战斗Jev/代码与纯Codex大脑口径并不冲突；配置、费用字段不当实际来源。

- 许多code带dirty，run-config记录哈希/脏文件，不足以恢复完整当时源码；没有按版本受控比较，不能宣称某候选或本报告提高胜率。

- 历史开发探查一次预览全局日志首行，意外包含其他角色；已留边界偏差记录，该内容未进入候选、数值或学习结论，后续证据全部仅静默输入局。

- 本轮未运行play、网络、模型调用、模拟、二进制提取、测试或上线；构筑模板与接入建议为报告产物，消费者读取与采用未验证。

任务完成状态为 `insufficient_evidence`：全部请求章节及机器结果已交付，目标级通杀证据不足。`complete=true`表示本冻结批次分析交付完毕，不是证明已有合格组合。

## 9. 原件引用索引

以下每个引用均来自本角色冻结输入。层/回合未知时原样保留，SHA是本轮实际读出的那行原字节；同source/off在对应offsets文件可定位到gzip保存行号。统计表的完整样本run与每个boss入口/出口/SL原件见boss-run-outcomes.json，无隐藏模拟样本。

| 引用 | run/F/T | 原源/字节偏移/长度 | 原证据SHA256 |
|---|---|---|---|
| E001 | T082DRCUHRRD / F37 / T未知 | states.jsonl @6353800950 +33684 | c4333f292f09d74ea13515b30e51f78b19798bdd771b104540448369d7a95a07 |
| E002 | 1HC609GTLGN3 / F21 / T未知 | states.jsonl @6391455536 +29599 | cbb9a583d7a03263d0cda6c493a2c4433e6f0b713d024db47fecdde4807b5bbb |
| E003 | KAY522KT5NXR / F46 / T未知 | states.jsonl @6447742311 +42168 | 76e7161b13a183e6308f46620e2551766b369e0635f710b16c91d58aab4d0e14 |
| E004 | 1LMBFGSMCWKU / F15 / T9 | states.jsonl @6694615910 +20170 | 24c97cd601f794e913e7a735346e148d8cde7e0c5ff437c4010aa76bb28897cb |
| E005 | 4Y94N8RDPGPM / F33 / T4 | decisions.jsonl @549002567 +2410 | 061fb1123ca7b2a2927a173819fddc895790a9527341a79ee7dbdec6e2a59866 |
| E006 | 4Y94N8RDPGPM / F48 / T10 | decisions.jsonl @550101722 +2462 | 063b195bc0c9618dcc42a835dbb0d4a67171e303486922742dbc3bdf7f6fe9cd |
| E007 | ZZMYZ5UBCG72 / F33 / T未知 | sl-attempts.jsonl @4941370 +10194 | ee8cce443527a337643f1c01523f1f899f492d222f0fa9380f82afa6754d97d1 |
| E008 | ZZMYZ5UBCG72 / F33 / T1 | states.jsonl @6563810567 +36350 | 873e299c458b5cc57275193401ee8c40d758b7aae740f8aa15bcc277cf634759 |
| E009 | ZZMYZ5UBCG72 / F33 / T5 | states.jsonl @6564786583 +41075 | 9c6c83a4f5b5aac5a7928a5ae45b8ad27259d8f4236347aeeffd432366a68272 |
| E010 | ZZMYZ5UBCG72 / F48 / T未知 | sl-attempts.jsonl @4951564 +30796 | 0e445fb891e3aaa28a89057f761ad5a541a4a7457e303d62d762d19dd7a25a1a |
| E011 | ZZMYZ5UBCG72 / F48 / T1 | states.jsonl @6575123933 +52508 | 1e5c73642fe5fe464f3a4cec686b040cb77ea53352f92e9d26fd399909c2ee72 |
| E012 | ZZMYZ5UBCG72 / F48 / T8 | states.jsonl @6576833958 +51643 | 52a0df540c8dca7726725ddfcbe74c2ff801b361112d80ed3ff0524307a97aa6 |
| E013 | LLYSRQQ35AVW / F48 / T未知 | sl-attempts.jsonl @8104064 +18320 | 6569494c06bac51bd380a73ce8d7ed41f0d271021ba8c300ddfb1365d26c0b77 |
| E014 | LLYSRQQ35AVW / F48 / T1 | states.jsonl @7265158099 +58882 | 129aaa8b6886c6adab49317518dfdfd6734d47e1905c0b7f51a138d9450b50de |
| E015 | LLYSRQQ35AVW / F48 / T7 | states.jsonl @7267015540 +56292 | 1225e5ea292803d3ed358d2fda0c32e4f67aaee14c1d8c24f51e2aa316acf7ca |
| E016 | HNX4A2WBC34W / F33 / T未知 | sl-attempts.jsonl @24830685 +23808 | 38933bd0aaf988c5f579003abe122f0dbc25f76e66c069d6546dabf42b32ea47 |
| E017 | HNX4A2WBC34W / F33 / T1 | states.jsonl @10238043882 +40821 | 0e074132b28d5ab38dff7ca9f1bfeee397ec21c9f1b6e78dc2a1115efd3a8dde |
| E018 | HNX4A2WBC34W / F33 / T11 | states.jsonl @10239982967 +37004 | 41c597f3065aecee280ac9a5f64a5df2ec07fa127cb9ff33726c63f587401970 |
| E019 | HNX4A2WBC34W / F33 / T未知 | sl-attempts.jsonl @24854493 +26736 | 37681fc5f41307bdb1fe6889b26d2fc00a6382ca5fbb94a4da4762c72a4b12c5 |
| E020 | HNX4A2WBC34W / F33 / T1 | states.jsonl @10240019971 +40821 | 99039db0b5730af1d772a2738d154b353102538c3c5cbbd46ad4ef72ef9daacb |
| E021 | HNX4A2WBC34W / F33 / T10 | states.jsonl @10241708517 +38740 | 14f75815a74fae516c1d5fbc77724acbce54a4a071701bf1de4041d857baf7e9 |
| E022 | HNX4A2WBC34W / F48 / T未知 | sl-attempts.jsonl @24892808 +31095 | 00f07e6ee04b8a0d57750c509fb914014a152fe84985967ab1a14e9e3dc59523 |
| E023 | HNX4A2WBC34W / F48 / T1 | states.jsonl @10247613942 +49014 | 9242c34b06db7bb90fe279e568b20637f05b2328eb9c3a65653fed03120e07d9 |
| E024 | HNX4A2WBC34W / F48 / T7 | states.jsonl @10249910566 +47040 | e58fe06520ce436f04c19870a069b7188036b1133cd6d648c9465dab5eb64802 |
| E025 | HNX4A2WBC34W / F48 / T未知 | sl-attempts.jsonl @24969566 +46883 | 4211d2b197fff19027dbd8bd1d83d5c7a220640e980658d726103c847fc1c845 |
| E026 | HNX4A2WBC34W / F48 / T1 | states.jsonl @10252677816 +49014 | 0728086404259071f62bf369ae07fd6db5c4755670d12493f7f5b6ffb1166272 |
| E027 | HNX4A2WBC34W / F48 / T8 | states.jsonl @10255406298 +42867 | fe6426e87180d53ab181fa6ead6dbd58f6a19f9d4a3111fed18b3069ee58cf29 |
| E028 | K3676LU8B0UH / F48 / T未知 | sl-attempts.jsonl @4683446 +22975 | 00baddb847e5d64cbbb29b7ff6d9c6c4f54f9c3e053d3a034394ec15303a1842 |
| E029 | K3676LU8B0UH / F48 / T1 | states.jsonl @6522793773 +42717 | 114cb9cfe9a527a35c2360d8ac1dfb1677b9f18c9d70228d161fd3b0eb616974 |
| E030 | K3676LU8B0UH / F48 / T11 | states.jsonl @6525111783 +47201 | e6141463829ae1d54a4d9ffd12b200ef0370aab79a40cb3259a3e18ddee7c5cd |
| E031 | K3676LU8B0UH / F48 / T未知 | sl-attempts.jsonl @4706421 +30114 | b6404fbf72863939197e37181075ba46c7ca0a51b3e74b8441d869a6516dba28 |
| E032 | K3676LU8B0UH / F48 / T1 | states.jsonl @6525158984 +52182 | f8add066470fba355818e792145772f31e522fecb5baf07ddac3732bfaadbb0b |
| E033 | K3676LU8B0UH / F48 / T12 | states.jsonl @6528000386 +46592 | 1ca24b6e2d6bb0fcc28443f805accf2ac82d582e143b11c6d1b64b1afdd15b7d |
| E034 | 4Y94N8RDPGPM / F48 / T未知 | sl-attempts.jsonl @8033922 +35559 | a5d4536bf306b3fe340c2c7cc35408563ea77001db4e12e68ab452bf7f5e9d16 |
| E035 | 4Y94N8RDPGPM / F48 / T1 | states.jsonl @7239665258 +41604 | d9429e092fd330836dee9fafdda2b51350c167e6bfec80e4a640222a741ef36a |
| E036 | 4Y94N8RDPGPM / F48 / T15 | states.jsonl @7243584942 +45980 | 477242a0a837cfb9f94c8ee33cb5fdf2efa7cf4109e11db13ecab61d24e1a984 |
| E037 | CSBR5CRDWQNB / F33 / T未知 | sl-attempts.jsonl @4756187 +17550 | 4db439ea7b3951ef9b26c2051946347b7ea5a71addf1d7a755174ed6cd84d709 |
| E038 | CSBR5CRDWQNB / F33 / T1 | states.jsonl @6540299556 +37077 | 701210a6f9857258e835ca851e8172d78710683da3897a3024b66ef83602e675 |
| E039 | CSBR5CRDWQNB / F33 / T4 | states.jsonl @6541175725 +39072 | b794a5688ee89a98fd2c8df9c44a488c985043c3226b9ed6e119802aeab3d73b |
| E040 | CSBR5CRDWQNB / F33 / T未知 | sl-attempts.jsonl @4896238 +24748 | f35400a0f8cbece3ac315038baad671f03267a4e8e5c5bd9ebebe00e957b1c16 |
| E041 | CSBR5CRDWQNB / F33 / T1 | states.jsonl @6545792336 +43846 | e3d3eb0b1c1c580ca0bff44b1b684d9ca7a5d0d607039faefee65014b96a9b09 |
| E042 | CSBR5CRDWQNB / F33 / T4 | states.jsonl @6546896440 +39385 | 23a7396c667f2b7c8daffd4919783873e922105facb4c3ce827e5ad8c4994d37 |
| E043 | KAY522KT5NXR / F48 / T未知 | sl-attempts.jsonl @4230119 +41262 | 46ef35426a5d2a930237efc7a408005dc189b2cf958d54afb8150ca449388560 |
| E044 | KAY522KT5NXR / F48 / T1 | states.jsonl @6448004198 +49032 | fd375af6eca3c2f8228f5ca3891300f714a7a1a616826efa6fd410f5fbab7a6a |
| E045 | KAY522KT5NXR / F48 / T11 | states.jsonl @6452098788 +49433 | a40f1876a623dbdb045c9ccc1de60d44fc3770b82f3dac45927b0cced5354b12 |
| E046 | KAY522KT5NXR / F48 / T未知 | sl-attempts.jsonl @4271381 +40440 | a8122bc57dba0ec203391f40e5e266103fc20f4309f4fdac3ce9e34bdebe577d |
| E047 | KAY522KT5NXR / F48 / T1 | states.jsonl @6452148221 +63144 | bafceb93cde6995098a82c6164dbca1054d04d6ae57baa226f33d25a3e0d14dc |
| E048 | KAY522KT5NXR / F48 / T14 | states.jsonl @6457152485 +54596 | a4d59c4c21fe24e087efa5d3099929d529a6941ff168bc67149a3dcfc1f1f51c |
| E049 | 2SU6XN2AEJRD / F48 / T未知 | sl-attempts.jsonl @6914864 +28893 | 472419c1276d5b062e4543f587e751b93325c74f3ad354c9aa09f89118d465c4 |
| E050 | 2SU6XN2AEJRD / F48 / T1 | states.jsonl @7023105920 +63373 | 7bfb76a3cf025095639ec4f29c71cf71a979be4f4861e84668e8c053f97c581d |
| E051 | 2SU6XN2AEJRD / F48 / T10 | states.jsonl @7026915793 +62521 | 46ae7bbdf203e7a81b5fe02c5e43e4998d468f9f1989db8103131154ef9f93e4 |
| E052 | YF0LXT1QSTGG / F48 / T未知 | sl-attempts.jsonl @15265918 +22015 | 910bb032f36907f518cbe6fa3fbffc3544b1ee200bda4d47a9673592588fcb29 |
| E053 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8555387592 +50456 | 32a3cdfd4e1dce1d6ca8bd2025157d8dc0012201bab51f254e41b877a2e8e22b |
| E054 | YF0LXT1QSTGG / F48 / T5 | states.jsonl @8557090264 +43074 | 229bc12a96f88a78c04b930c2813de26576e58745c3c2f7cce4b6aff81f5b274 |
| E055 | 1LMBFGSMCWKU / F48 / T未知 | sl-attempts.jsonl @5528930 +34248 | a239cd0e04925c5bf784f75951fbd6f35a5f21038d0658f3fce945dc7ee1b10c |
| E056 | 1LMBFGSMCWKU / F48 / T1 | states.jsonl @6708335172 +41458 | 933d5753fc2cf43fb7936168e13afe3ce227486cb2bd4c373c478efef843c281 |
| E057 | 1LMBFGSMCWKU / F48 / T11 | states.jsonl @6710946721 +45910 | 5312a6462eeb286e9e4377772421f1a8a99cba46b20534e9105a17a83e778581 |
| E058 | 25226ZFLNR1J / F48 / T未知 | sl-attempts.jsonl @8598234 +11147 | f6766228aeb1fb810d16a9ea214443ae69e56cea65763ecf4cc19fce9e377991 |
| E059 | 25226ZFLNR1J / F48 / T1 | states.jsonl @7375192507 +51004 | 437467d517674f5d6f8fdbc07687f0269d14aebdda09ec4469ce6fd0d07399d9 |
| E060 | 25226ZFLNR1J / F48 / T8 | states.jsonl @7376934367 +49328 | 6e756e902de4cec32e9c3086fb14ee0674411083af2fa6870ec94f34e60d0e65 |
| E061 | L704TLETMZBM / F48 / T未知 | sl-attempts.jsonl @11626721 +31773 | 7994723857bcd08f8be159a4dd8f275217acc61dc3675f22deee3f46539425c4 |
| E062 | L704TLETMZBM / F48 / T1 | states.jsonl @7859497262 +57013 | 4844b412415824e81f3b0ae0a1eb41ed5ec4529a124aa04f680d723be3aedc94 |
| E063 | L704TLETMZBM / F48 / T6 | states.jsonl @7861825978 +49295 | 82bfcc29e9a695470d3a728e87b8d3a5b76f6f7cd06574b2ab9f9bff55e0deaa |
| E064 | ZZMYZ5UBCG72 / F33 / T1 | states.jsonl @6563890540 +42633 | 50294e3b19edbcbe3dabe24b5bc01c21977902cd65c4505a8ffd9984f4562050 |
| E065 | ZZMYZ5UBCG72 / F33 / T1 | states.jsonl @6563933173 +41739 | f981522214bbddc7c496494e93a43c53ca205ce898cd45691a8269823f9bddc5 |
| E066 | ZZMYZ5UBCG72 / F33 / T2 | states.jsonl @6564095821 +42362 | 65c0f8ed61fa8485fefdbb58f528ea585a1814d7037c30fcfe2c4def9d5f1748 |
| E067 | ZZMYZ5UBCG72 / F48 / T2 | states.jsonl @6575584140 +50506 | d96a8a02287fb730a08f89da96b0072b281d1ee656ee50505c377c564dfca796 |
| E068 | ZZMYZ5UBCG72 / F48 / T4 | states.jsonl @6576279090 +50154 | 4252f659e87d6435bcadf03f428c9f71a46bdbdd863b57893123ebd837c734ee |
| E069 | ZZMYZ5UBCG72 / F48 / T1 | states.jsonl @6575176441 +51657 | 2cdee72184ee634dffaec63bbc59fff06622bcbfb1b9cfb858591e03bfbe47f5 |
| E070 | LLYSRQQ35AVW / F48 / T1 | states.jsonl @7265332269 +56669 | e9b1b3671ab185807f943cbe8990a9bae1ae41ad268f24c1ab40bb3871ea753b |
| E071 | LLYSRQQ35AVW / F48 / T3 | states.jsonl @7266012564 +57998 | 3faf9041b65fb193d0721d5c13c8736d0909a1054b6a5ef61d1fdea4681722d4 |
| E072 | LLYSRQQ35AVW / F48 / T4 | states.jsonl @7266409366 +55049 | 66137c45a7351bd5af614d5f86c9bde6ba284d602403cb2b9700fe2d307b04ad |
| E073 | LLYSRQQ35AVW / F48 / T5 | states.jsonl @7266629684 +57362 | 029182818c9d0c506604eddccac05ab852767307cfceae2886d21126eeb54b50 |
| E074 | LLYSRQQ35AVW / F48 / T1 | states.jsonl @7265446791 +57408 | ef02762f26a68016e5033a55f1c0fee30fd55fb92da946c0016127d86bba92fe |
| E075 | HNX4A2WBC34W / F33 / T2 | states.jsonl @10238319171 +38234 | d0b0913d92cbf55c167a6ad7a398ff08bc8ec414cb496909cb27afba840731b1 |
| E076 | HNX4A2WBC34W / F33 / T2 | states.jsonl @10238394838 +37222 | 81cbdbeaaaad8aaf87057620cbf63eab4adefddfe755d01125de5144d2d2cde3 |
| E077 | HNX4A2WBC34W / F33 / T6 | states.jsonl @10239023888 +38276 | a04a7b92df3099138f5c0f5be6858c2fab2f692573f8f7c107965a2c69018059 |
| E078 | HNX4A2WBC34W / F33 / T1 | states.jsonl @10238164007 +38560 | cccb5068b6161899a417353ed871499713b1ebf28303f83dd1ce1a067df47081 |
| E079 | HNX4A2WBC34W / F33 / T2 | states.jsonl @10240295260 +38234 | a5ec839447efec570eecbe51708aab8196ceef1cde1eeca19653c04af0b4a2f0 |
| E080 | HNX4A2WBC34W / F33 / T3 | states.jsonl @10240450365 +42497 | c87a43a6aafe92a45b5eb3e6dea42f8b665196c9f7aacb9ce23c1101064214a5 |
| E081 | HNX4A2WBC34W / F33 / T5 | states.jsonl @10240966228 +36439 | 4d966a54471314d1e1c20e1b336bbea6592e8ac8e74b5f88199d189ee3dcda88 |
| E082 | HNX4A2WBC34W / F33 / T1 | states.jsonl @10240140096 +38560 | 22834f6e563bfd3ebcc1630cd46ea77249f542e8bb1bb3dfbc03b89fda1dd0a9 |
| E083 | HNX4A2WBC34W / F48 / T1 | states.jsonl @10247711954 +48104 | 3ef6cdea07f740c419aa3b2c1c1c5fbe1e0051a639a88a6d56e8e974e9954212 |
| E084 | HNX4A2WBC34W / F48 / T2 | states.jsonl @10248224151 +46605 | cbd3676a7d42bca0df3265c17f4ca3cd2ca8e97984ec344a56d5115551c4f4a3 |
| E085 | HNX4A2WBC34W / F48 / T4 | states.jsonl @10248831900 +46228 | d70f08dfdb10c2f1f8bb785bd6c9ef961be0b165c4dac16a7f6c532d48080a61 |
| E086 | HNX4A2WBC34W / F48 / T3 | states.jsonl @10248595744 +48063 | c42952539969ebb445c3f2d6845721542cb7c38aa4cf23d4857721deacd2a3ef |
| E087 | HNX4A2WBC34W / F48 / T1 | states.jsonl @10252775828 +48104 | badbe15916efeff3bc27cb8f5fc669810e78e21a76f24220521755512f93f41c |
| E088 | HNX4A2WBC34W / F48 / T2 | states.jsonl @10253288025 +46605 | f979db6e90e70a8991b8e772af22116e8cc5e5c2031b8c080d9b494248ffacdb |
| E089 | HNX4A2WBC34W / F48 / T4 | states.jsonl @10253895774 +46228 | 2d6462244fd465079d902d46f73a307486d746d881166b67f144cd1defb5bf9e |
| E090 | HNX4A2WBC34W / F48 / T5 | states.jsonl @10254311257 +47087 | e0894311253154a17088e76b23799410cb35cb329e59cc2d4e82f6a143d1a913 |
| E091 | HNX4A2WBC34W / F48 / T3 | states.jsonl @10253659618 +48063 | ffa10a59aa48f8ca09bdeea4f8fa912a790ca817db4d4467aeafcdc08421c427 |
| E092 | K3676LU8B0UH / F48 / T2 | states.jsonl @6523242728 +48907 | d06dc5bed9b58dc5b3a9615dc2b24a235bb4937e6c90554b6626c3d1e034442d |
| E093 | K3676LU8B0UH / F48 / T3 | states.jsonl @6523440231 +48878 | 17c79e3784cf08ca403ee6d7dff22e1e517d9009956cbffc9ba2539dd6575262 |
| E094 | K3676LU8B0UH / F48 / T3 | states.jsonl @6523489109 +47934 | 3aadcdb7bbec355172861191ba4a01f8d73c5106cdef52669472e958eea65094 |
| E095 | K3676LU8B0UH / F48 / T2 | states.jsonl @6525717097 +50283 | e4ff8415dda2aab206540262873017e759e102e5a55175363066ad6288d83bc3 |
| E096 | K3676LU8B0UH / F48 / T3 | states.jsonl @6525866541 +47890 | 3819a6373de1b3ec6e42aeba8dd5d0fb737e25e4c70cef9dc743cbebfe7720b6 |
| E097 | K3676LU8B0UH / F48 / T3 | states.jsonl @6525961316 +45941 | 944f61f40ece3e9ea537e533e1e272a7967cf5523c825ee6fece4ebdef733039 |
| E098 | 4Y94N8RDPGPM / F48 / T3 | states.jsonl @7240780328 +45771 | 67940354451ead9110d77899c5b3db0ef86020061f448862483e6cbee8c449a0 |
| E099 | 4Y94N8RDPGPM / F48 / T1 | states.jsonl @7239900960 +46810 | 041c4218e008298cd5efc591b44314c6baaea9b31434d11d715e4c29dafbaa3f |
| E100 | CSBR5CRDWQNB / F33 / T1 | states.jsonl @6540380479 +43072 | 05aaedcc8308e78bf65927cce7df0b92f060e51b03e2785df86ee4dad6385017 |
| E101 | CSBR5CRDWQNB / F33 / T1 | states.jsonl @6545836182 +43072 | 034601927011207a9ddf42df3baaca26507846f7cb6010926c6a503d8e4b1132 |
| E102 | KAY522KT5NXR / F48 / T1 | states.jsonl @6448662117 +51634 | 75c4468ac7a1bb8842433e6e9a2e52227f67325551648fa93b807a4ea6c59dc5 |
| E103 | KAY522KT5NXR / F48 / T1 | states.jsonl @6449021896 +50580 | 842666f9d51ee1a6636661b3d253a0fd1f70f7fcc1a80435fd0cb840f35534bd |
| E104 | KAY522KT5NXR / F48 / T1 | states.jsonl @6449072476 +49521 | 62ab97239b926cb09a88534a7d5c1a2b26b5b788796c8713adc1e44d17afa73b |
| E105 | KAY522KT5NXR / F48 / T5 | states.jsonl @6450261755 +51649 | 3fd698ae4c106af1c6c8b4e5f04a81ed3b2bea3d97a0826e409ab07227596230 |
| E106 | KAY522KT5NXR / F48 / T4 | states.jsonl @6449723199 +53113 | c7b0a08745fd55aff611084592635a1f749fd8edbe40de109cf948b70e1b093f |
| E107 | KAY522KT5NXR / F48 / T1 | states.jsonl @6452823401 +55094 | 23f4708b14856d1c1d8390129219b94eb564de39f44ac794280493891ffb0afe |
| E108 | KAY522KT5NXR / F48 / T1 | states.jsonl @6452878495 +53955 | 0c8a3ba25c33a2a445413008473fd64cbdaac302cee3c76960d7c0af02dc77c8 |
| E109 | KAY522KT5NXR / F48 / T5 | states.jsonl @6454005633 +51150 | 1ee78c65e8aa10ec66e363afaa73f06cf9af4ea8d3970da648d2eccaf3898a32 |
| E110 | KAY522KT5NXR / F48 / T7 | states.jsonl @6454580210 +51452 | f1d534d135f7fcd6a4675be908c763ba3d5071495a58e7ba42fd17dd07cff6cc |
| E111 | KAY522KT5NXR / F48 / T4 | states.jsonl @6453523372 +50975 | b553c4692f3339282f22901278a0ba7af4e0d87ac2c1f12fd09ca12c0a3da1da |
| E112 | 2SU6XN2AEJRD / F48 / T1 | states.jsonl @7023295735 +61571 | ed90bc69c8840f56ba214a999b67280574ae76192287663acfc44f4a6a911b57 |
| E113 | 2SU6XN2AEJRD / F48 / T5 | states.jsonl @7025379262 +58996 | e6281f8f6316cfb4bc4a5eca6a638ac678d80e825e0032e49b774609de055b60 |
| E114 | 2SU6XN2AEJRD / F48 / T4 | states.jsonl @7024893542 +61909 | 18024b2a0ea529467665bfbcf697d9dc6cc5bb31dc5117b346d093c8895462b5 |
| E115 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8555438048 +49571 | 3f2355d071b04ab9cbb5984328344dc90a871cc8b9e93b7a568244ad602fe832 |
| E116 | YF0LXT1QSTGG / F48 / T4 | states.jsonl @8556622717 +45477 | 8209a12b4ac6907cec2531a01d364dcbc0b5eba95c0e99fa0ca6cc5acdf6c7d7 |
| E117 | YF0LXT1QSTGG / F48 / T3 | states.jsonl @8556185986 +47689 | f4309c37200d50753a0862688e951236e1670e0c58d0975110ad8a9ac9822d35 |
| E118 | 1LMBFGSMCWKU / F48 / T3 | states.jsonl @6708994032 +49338 | 1625fb93dc5788497e947fd7ff48687fe46664a021918b7c38b2df64b8d05a87 |
| E119 | 1LMBFGSMCWKU / F48 / T1 | states.jsonl @6708620519 +47366 | b336396d4571a071e64cb2abc40c7c5c8ef82da6065a1785bdfc094d1dd88366 |
| E120 | 25226ZFLNR1J / F48 / T3 | states.jsonl @7375771451 +48451 | b1d8d334b62dc91369b6876a7cac06a0d312dd53ff4596b1c807233a7b670ef8 |
| E121 | 25226ZFLNR1J / F48 / T7 | states.jsonl @7376693656 +46690 | 607aa31389005f53fa98843788f8591877ff18bdc5517c23c193e0431cd6e0b9 |
| E122 | 25226ZFLNR1J / F48 / T5 | states.jsonl @7376159338 +49301 | f10abff252274472f1f2a7b71de1e93164e7a55b00b47367a246b4c9879a7101 |
| E123 | L704TLETMZBM / F48 / T1 | states.jsonl @7859666138 +55542 | 14d9b28a84dc630a06568252ce7126006c6615101735b77a13562a16bb2a31c2 |
| E124 | L704TLETMZBM / F48 / T3 | states.jsonl @7860860721 +58902 | 78b7c862ae71d9086a2ea977129b2c3be448d54a05a1d21257adf24f225ec269 |
| E125 | L704TLETMZBM / F48 / T1 | states.jsonl @7859554275 +56323 | a7a17dd18518329bdabbcfd9b17af832e264b0ad6475f990bc6aea4f6715c1a8 |
| E126 | ZZMYZ5UBCG72 / F2 / T1 | states.jsonl @6547028699 +18145 | 1a2873f691f1b2a456557a3a43e30c286f073fca38c50fafda7dcf7626970110 |
| E127 | ZZMYZ5UBCG72 / F2 / T3 | states.jsonl @6547270764 +22477 | 3120e35d2f7796757d26243f714db5c009cc3ac29bda1e6a14278e80aa901371 |
| E128 | ZZMYZ5UBCG72 / F3 / T1 | states.jsonl @6547394613 +18968 | e8f7e9835bfb982fbcd2b1d82f992f8053f7469110cf554439602b7ef69d8a0d |
| E129 | ZZMYZ5UBCG72 / F3 / T3 | states.jsonl @6547696470 +21866 | 4c43079af39f420d9ea852ff58e02cbfb135605c4c06237f051ecd5ba2da29c7 |
| E130 | ZZMYZ5UBCG72 / F5 / T1 | states.jsonl @6547890446 +19674 | d9b9ce1c939ea34047a42bb111dcd5e8642c1321d084c422d975ea4a4651ffaa |
| E131 | ZZMYZ5UBCG72 / F5 / T3 | states.jsonl @6548227060 +23225 | 515ecc7ab2e20dff3f26241adf7b22c4470e24fc0223c815ccc59790db08c212 |
| E132 | ZZMYZ5UBCG72 / F6 / T1 | states.jsonl @6548358962 +20411 | b3a0761c9d6f9868ed9e18dc6dbf62f139f692ae2f14cd976dda8c18e660e2a9 |
| E133 | ZZMYZ5UBCG72 / F6 / T3 | states.jsonl @6548606861 +25585 | 7f63475978ba28f5dbfd19d2f23453743f378c5632734b5f092cd68c1b54b3db |
| E134 | ZZMYZ5UBCG72 / F9 / T1 | states.jsonl @6549047315 +23692 | c36ce7a5a2beb774a9dc99e9e18834f2e1d59e64b02da74d71c814e905318425 |
| E135 | ZZMYZ5UBCG72 / F9 / T3 | states.jsonl @6549443933 +26997 | ec0e1300c3d60be3b961426aee0c15daba869a86f8e96e1c15de060610bd44ac |
| E136 | ZZMYZ5UBCG72 / F12 / T1 | states.jsonl @6549806531 +26746 | 74f91868c44eec2adf90c8848ec3c18166f6bfb24954ed700cf395496070757d |
| E137 | ZZMYZ5UBCG72 / F12 / T3 | states.jsonl @6550174708 +29578 | b2fa3d0de7cf4ce43c27ece3f4d6efb0fd15f5c757e2d55a7a5953306e7bd22c |
| E138 | ZZMYZ5UBCG72 / F15 / T1 | states.jsonl @6550553104 +29034 | 55298635942e23849ee1db85b12467640ddc10fec27c7e59f1cf8574f0c8c20f |
| E139 | ZZMYZ5UBCG72 / F15 / T6 | states.jsonl @6551613849 +29477 | cd2fa9249c11437d91d6b685c0532e9de5f87538467d5ac9eb6d30370f460254 |
| E140 | ZZMYZ5UBCG72 / F17 / T1 | states.jsonl @6551916676 +28236 | 673323694ff1adbcbbc642727ce12c7a480aef4991dee740b417e1424142673b |
| E141 | ZZMYZ5UBCG72 / F17 / T11 | states.jsonl @6553196482 +33663 | dfa1df618f3f108919c4e53132fbc8245f083cc6f885e3b31fe8046ddf255b6f |
| E142 | ZZMYZ5UBCG72 / F19 / T1 | states.jsonl @6553454052 +29242 | 0b7393c8c24bbb47737968ad2b7fb52b69cc39736726ff5c44e516184f401413 |
| E143 | ZZMYZ5UBCG72 / F19 / T5 | states.jsonl @6554208114 +34030 | db320332f8fad283218f775b906b126b8e84aebfb3ccbbfc2bf98e5c250b727d |
| E144 | ZZMYZ5UBCG72 / F22 / T1 | states.jsonl @6554787349 +33605 | e95cf5869e7c8c74c098a74cadc7106065c43ca35d6ac7eea69fe05019e834b9 |
| E145 | ZZMYZ5UBCG72 / F22 / T4 | states.jsonl @6555579565 +36649 | 9ef67a4e22ffcbb5decb6dd077cd0bed51747b99e259695248c3500112a5492b |
| E146 | ZZMYZ5UBCG72 / F23 / T1 | states.jsonl @6555767666 +33377 | 7562291ebab691a1032224ebcee790e6544875837df3a66d90fa603f1e6fe6ca |
| E147 | ZZMYZ5UBCG72 / F23 / T5 | states.jsonl @6556598407 +40606 | 06b5b45a5f838033fe3ea3c5b472b5eeab258f356c1b7f37669a21ee20764272 |
| E148 | ZZMYZ5UBCG72 / F24 / T1 | states.jsonl @6556793182 +33431 | 9ff6c723fe8d2c0043bc74d35c0008ffe008d6ed9044d94d6c332a1c8a4da6e8 |
| E149 | ZZMYZ5UBCG72 / F24 / T7 | states.jsonl @6557901352 +38489 | 2c7c4937e871d419d54d8b83dae27d578cc5183b7cb1e2b7e8d97253778d3809 |
| E150 | ZZMYZ5UBCG72 / F28 / T1 | states.jsonl @6558481489 +36218 | bddf4a06f9f73f3935a56fa25927ff8e48ebd72d7dc59933ddeaa93002ee3add |
| E151 | ZZMYZ5UBCG72 / F28 / T6 | states.jsonl @6559449183 +41873 | 61cd3836196b6068c5dc26b1aade76ef2d3ea671b43d8bd5a8f2210320070d17 |
| E152 | ZZMYZ5UBCG72 / F29 / T1 | states.jsonl @6559682747 +35498 | ee84a8099f304e51568a6156b909607eabd1e7d92ce3f51431c654d3bd5ce351 |
| E153 | ZZMYZ5UBCG72 / F29 / T8 | states.jsonl @6561182462 +41785 | 913455c1c0fc3ffbc2920452bcf1e60828c3775485edccba4c021e5c72eb9d48 |
| E154 | ZZMYZ5UBCG72 / F30 / T1 | states.jsonl @6561425094 +37986 | 10b5f06146cb655b05bfcdd7cf22ccf092ca2b9b8954965939fce91951a84c33 |
| E155 | ZZMYZ5UBCG72 / F30 / T4 | states.jsonl @6562219855 +40729 | 5d0238539f5b3ab7c2a3bbc2fd5b3a433246d128e6fbab81d2dd761d1f78b0e1 |
| E156 | ZZMYZ5UBCG72 / F31 / T1 | states.jsonl @6562455862 +36026 | 366205b766d7b6f7be44a3e31aedfadea91d8d99ff54cdf8739b125be62771cf |
| E157 | ZZMYZ5UBCG72 / F31 / T6 | states.jsonl @6563503864 +39429 | 48daf2c11757ce8c9b302df164d708b507f55a7903b044620c7998f76bdb6bed |
| E158 | ZZMYZ5UBCG72 / F35 / T1 | states.jsonl @6565094646 +39467 | bac84bdb2e2ba777010382b1c13f7d83f2e7b46bdcdd26cc023e2eb914f82453 |
| E159 | ZZMYZ5UBCG72 / F35 / T4 | states.jsonl @6566043161 +41161 | cacc1ac9069e68e5790d1158c6fc304d7de638ea7c8090651f22f54989455f9c |
| E160 | ZZMYZ5UBCG72 / F37 / T1 | states.jsonl @6566394950 +39908 | b4b3d27dd6d92244a078fb6b3149b1df91f3494484e253b7496e883984597491 |
| E161 | ZZMYZ5UBCG72 / F37 / T4 | states.jsonl @6567110514 +44052 | a9a846c656b245ed15f9d831f5744fda29e33ec11a6532edadff082d1c8f043c |
| E162 | ZZMYZ5UBCG72 / F38 / T1 | states.jsonl @6567363801 +40586 | b974163b05ed0ad891d88af791759fd4713351517ae7d4a3b30f62ad9c210e8c |
| E163 | ZZMYZ5UBCG72 / F38 / T6 | states.jsonl @6568519089 +47653 | 8c4d89d0aa7d8907843b1e5908f6682e386fd4943c9568610ee9e6e2178b7c5d |
| E164 | ZZMYZ5UBCG72 / F39 / T1 | states.jsonl @6568778135 +40449 | 5d960a1d6643b6a39a7145797af4dc452172a7f8056bfd854c0f28197da1fdce |
| E165 | ZZMYZ5UBCG72 / F39 / T8 | states.jsonl @6570484926 +46202 | ae5b4a2def4df58c18dc6fc16326a09bd79b65f466ce5b8b562deeba0ed55613 |
| E166 | ZZMYZ5UBCG72 / F45 / T1 | states.jsonl @6571672821 +42903 | 0f5d68e33180bd69918698297cae53ba7dca50c77e110bbb42aed76bac3369bd |
| E167 | ZZMYZ5UBCG72 / F45 / T5 | states.jsonl @6573022959 +47023 | 6aeef70bfe9d43253bed3b227fdc2c60710af45d3d3ed9073a39abe6d0ac11e7 |
| E168 | ZZMYZ5UBCG72 / F46 / T1 | states.jsonl @6573295301 +43638 | d99a6d23495b463783c6d5de2a3af2e371a3cbf77e50afc1b30d7ed8840855ec |
| E169 | ZZMYZ5UBCG72 / F46 / T6 | states.jsonl @6574719676 +52622 | 85472a2e43530622093523224c3dbfc436ef74e1656af73e6511e44f485944dc |
| E170 | ZZMYZ5UBCG72 / F48 / T1 | states.jsonl @6575079429 +44504 | a60df589959ca69aee2d8c071c45d7cb9d75fbd3dbebc5643ea163fdc7065a05 |
| E171 | ZZMYZ5UBCG72 / F11 / T未知 | states.jsonl @6549729585 +19162 | 2c3216ed348c1925c5bb381d5f25a2f8272a39108dcc0e68b39d0dcadc67ab73 |
| E172 | ZZMYZ5UBCG72 / F11 / T未知 | states.jsonl @6549748747 +18291 | 0f4d46214301e4ea2559347f0f9f8bb2e43aeb8e83c416bd03e6096c01a326a9 |
| E173 | ZZMYZ5UBCG72 / F17 / T未知 | states.jsonl @6553324025 +42392 | e940f7a51618ac085750c81372f69580c3ed4517951895651dc0aa59b03c93e1 |
| E174 | ZZMYZ5UBCG72 / F18 / T未知 | states.jsonl @6553366417 +23238 | dbc2fa9832d9a3011fa4141502ab791e514c12ec190f40bf18d990853bf897d8 |
| E175 | ZZMYZ5UBCG72 / F27 / T未知 | states.jsonl @6558384131 +25823 | d24bb75a0795316f9a7537a220a43ade224faacdfc587ea989bf558b9f5b8b1e |
| E176 | ZZMYZ5UBCG72 / F27 / T未知 | states.jsonl @6558409954 +24952 | 55a925a8306d7e2a063bda2e2ea523804cf4912ec36fb7afce2a1a8ab306093d |
| E177 | ZZMYZ5UBCG72 / F32 / T未知 | states.jsonl @6563709970 +26914 | 37e497f2d50d86a15a9944da611640d081d30c972620b98f0438f69a2e82e807 |
| E178 | ZZMYZ5UBCG72 / F32 / T未知 | states.jsonl @6563736884 +26043 | bc6dd62ea3706bd4bd6fa3c3ca6b5faf7625d6ece8e00a575d7135dbbe591030 |
| E179 | ZZMYZ5UBCG72 / F33 / T未知 | states.jsonl @6564946161 +45236 | ae8434e038d93ed3f8d538ed46145b6dd478e65443334ac4dac879dc1126a97a |
| E180 | ZZMYZ5UBCG72 / F34 / T未知 | states.jsonl @6564991397 +29422 | 557bb0bf333585befd82693b100d15246562715202396d64eb4d61aad9582a3c |
| E181 | ZZMYZ5UBCG72 / F44 / T未知 | states.jsonl @6571560144 +32090 | c1c59c61565a2ff61581c09ab441848625f605aca3a10dae3d0b4e31d9ab2a90 |
| E182 | ZZMYZ5UBCG72 / F44 / T未知 | states.jsonl @6571592234 +31219 | 6e0add6aa1bc1847c6b2d2d75c46f4d8be9dc3f6926fc72c32ff1914243c50f7 |
| E183 | ZZMYZ5UBCG72 / F47 / T未知 | states.jsonl @6574964401 +32927 | d82bd86f248fc822a7f6df74cf510918e6adbfaef02f0c01627655581cfdee3a |
| E184 | ZZMYZ5UBCG72 / F47 / T未知 | states.jsonl @6574997328 +31986 | 787681b9f6f18d26b2cce3fb88f491564cb8baa0c0765eac50cdbd8fc06910c5 |
| E185 | ZZMYZ5UBCG72 / F9 / T1 | decisions.jsonl @487126557 +1612 | 128580f787940175eed4327b58bc50ff92c6cbe3844fb9f26c613621fda4ae18 |
| E186 | ZZMYZ5UBCG72 / F9 / T2 | decisions.jsonl @487129523 +9128 | 71dab61e5e43cb40d3a95f12f8c8ab795908140b6bed1a35cea4db4bb73e0c51 |
| E187 | ZZMYZ5UBCG72 / F12 / T1 | decisions.jsonl @487223318 +1535 | 7dc0bec9db4493e2e1fc8b9031487a88b9dbae6ab755bd46d223fff4ad0a1263 |
| E188 | ZZMYZ5UBCG72 / F15 / T1 | decisions.jsonl @487300029 +8106 | f024b2f7674817aa0bbf230be5c959b791709b4ed2673e9f7a41ea6f66ffba5e |
| E189 | ZZMYZ5UBCG72 / F17 / T3 | decisions.jsonl @487451442 +1583 | a23deab0ba5face3e9f8b3e9ed6d4ba823674e1c772b3641d7d5d39442e555e5 |
| E190 | ZZMYZ5UBCG72 / F19 / T3 | decisions.jsonl @487591877 +1659 | e7ca66746cdbaf324e08ce52d6a10d99b085871aea99cc9020d73008e3172517 |
| E191 | ZZMYZ5UBCG72 / F22 / T1 | decisions.jsonl @487690321 +1682 | de1f03eb370292efe5e1382f0c5bcf62535bb701c98f43be1903e59dd1df40cf |
| E192 | ZZMYZ5UBCG72 / F22 / T1 | decisions.jsonl @487692003 +6858 | b9618d06f4e5c5ded7ca389cedc6dd3e4b07524c6381e1805ca545714720d84b |
| E193 | ZZMYZ5UBCG72 / F23 / T1 | decisions.jsonl @487757506 +1725 | ac69a34515fef27a56ed197a0e85705b4f7339fbe021976b1734cbd3c64b4563 |
| E194 | ZZMYZ5UBCG72 / F24 / T1 | decisions.jsonl @487837618 +1620 | d57ac72094f05c2de66cbe6d9fb4bb7cf944dc5c9ab0f45ba453802cb1df6ede |
| E195 | ZZMYZ5UBCG72 / F28 / T1 | decisions.jsonl @487995601 +1767 | 021ace75886ba58394ebc7b5c0f22c41c7331924f7ce2615ac6704b24bc34afd |
| E196 | ZZMYZ5UBCG72 / F29 / T1 | decisions.jsonl @488112927 +8011 | aaa7fd65f788fc98954adaf38f63b8a53c9d2358ecec015d5ebd502e4183873e |
| E197 | ZZMYZ5UBCG72 / F29 / T1 | decisions.jsonl @488120938 +1667 | adbc579626ec7a351a10c5fb6903fc6b4c641eab1a65bf6f2d7d53e3b599c772 |
| E198 | ZZMYZ5UBCG72 / F30 / T1 | decisions.jsonl @488276179 +19214 | 891f2954d455835f462aeede3a4ac58c32cc5a2745d720f1594ebb9d33c2a0f9 |
| E199 | ZZMYZ5UBCG72 / F30 / T1 | decisions.jsonl @488302485 +1714 | 2b5c59cc99d0912a191a1154ef2e1e0628943fd958ced54d7bdc3c4f7297c9ee |
| E200 | ZZMYZ5UBCG72 / F31 / T1 | decisions.jsonl @488356258 +12751 | 5adbe2d7eee225e74989ae85921b8f28744a47599f3442190cc209defdf68b63 |
| E201 | ZZMYZ5UBCG72 / F31 / T1 | decisions.jsonl @488372535 +1728 | a4936aaae5c23d08b6ac154aa242be7842b5f14c1d440c73d898bb25b407d004 |
| E202 | ZZMYZ5UBCG72 / F33 / T1 | decisions.jsonl @488480032 +1708 | e8d3bca52d2426c925ddf1e97d2fd24e68a54025a40f249206d999c449287db4 |
| E203 | ZZMYZ5UBCG72 / F35 / T1 | decisions.jsonl @488584129 +1735 | c94ee24f8f9cc0de52afd1190a99289cb4496bd28de736628d341b758cebc927 |
| E204 | ZZMYZ5UBCG72 / F37 / T1 | decisions.jsonl @488663916 +1705 | 74d0bcb124208dc3c36594fdd75e24c7d52b037a0f51617ac6af2bfd69a998f4 |
| E205 | ZZMYZ5UBCG72 / F38 / T1 | decisions.jsonl @488767397 +1743 | abbd28961a007498888c5487686853cdaa7f508722e680360d31827e1a97cf87 |
| E206 | ZZMYZ5UBCG72 / F38 / T4 | decisions.jsonl @488810118 +1480 | 6ff95352f0f7efa7b5127e6a3bf33e53e6da7f9fbd18ba28c217066065e94cf8 |
| E207 | ZZMYZ5UBCG72 / F38 / T5 | decisions.jsonl @488836809 +4788 | b3fa464df6086daefbe5258d2b34edfe92b224ab197a67e5cee97e8b4328e94c |
| E208 | ZZMYZ5UBCG72 / F39 / T1 | decisions.jsonl @488874748 +1618 | e9465d50d74eba21dec4a38ea8aed5a24e9380d172863bb2ed50a0a40489c661 |
| E209 | ZZMYZ5UBCG72 / F39 / T1 | decisions.jsonl @488879709 +1705 | d0a6085d07e2df761795d4e4c13b96b5b5f82062c7a5c864dae53401bc0280e9 |
| E210 | ZZMYZ5UBCG72 / F42 / T未知 | decisions.jsonl @489003072 +1369 | 02a0aa32a20c78d69e964f3dd5a9787be6e1f5699e34cd5ed9bcae36ba465879 |
| E211 | ZZMYZ5UBCG72 / F42 / T未知 | decisions.jsonl @489004441 +1361 | 82ebccb2dc7ba85b576e1d616b21c4d4c892ae6df5d2d8051c44b46fbaa75dc2 |
| E212 | ZZMYZ5UBCG72 / F42 / T未知 | decisions.jsonl @489005802 +1352 | 9fa5621f808981472bd37b1056a9ed9cb1bd32115bd3f638ad8781e8f5af99d3 |
| E213 | ZZMYZ5UBCG72 / F45 / T1 | decisions.jsonl @489091300 +1632 | c19064fd0f9dab42bc9a982b56d447cda0f3d1d5cf2add42b0d070271376d429 |
| E214 | ZZMYZ5UBCG72 / F46 / T1 | decisions.jsonl @489207594 +1689 | 8e79e1e3f6e2c9b0168cdcdfc8a384ae6296678ff80452f1eb3f2ace783154bc |
| E215 | ZZMYZ5UBCG72 / F48 / T2 | decisions.jsonl @489399526 +1588 | 0fe3dfe9cd04cac428318aeb09a39dc3033cee7b357397b9a179e8fe917aae13 |
| E216 | 4Y94N8RDPGPM / F2 / T1 | states.jsonl @7219970832 +15784 | d5a6ffbc598b8e7010bebb3ca7d27257003173a3167609d5946a10ae654ca8c5 |
| E217 | 4Y94N8RDPGPM / F2 / T5 | states.jsonl @7220363367 +20058 | bbc057367d44052ddb1d6dbdf45531a70355598e578808b4c3ce006425f8d2e9 |
| E218 | 4Y94N8RDPGPM / F3 / T1 | states.jsonl @7220494635 +17084 | 4354edac20f590d6364b4bb7dd8f0ae1a59d28ceaa2fde3189721a5ee41b98ac |
| E219 | 4Y94N8RDPGPM / F3 / T3 | states.jsonl @7220704836 +22293 | d573d54a1111fe95e903ca39657b148288071c17b439f02e7af8371d584c0370 |
| E220 | 4Y94N8RDPGPM / F5 / T1 | states.jsonl @7220890896 +19496 | 7d71ddb3b58c3183b732333d1987eb2a6e7d57aca3ce874ad3a1add4edfd1a0f |
| E221 | 4Y94N8RDPGPM / F5 / T4 | states.jsonl @7221211079 +23523 | af5a24c1b2fe12825d95147bb35432d79edeeef9d95697f161e208fe43d01c60 |
| E222 | 4Y94N8RDPGPM / F6 / T1 | states.jsonl @7221357067 +19610 | 6e8bc1aba1d8b712898cf187296d39ca905373d533c4967db82ca9fcb4633ca5 |
| E223 | 4Y94N8RDPGPM / F6 / T4 | states.jsonl @7221753917 +22724 | 7685306fc74a1df3479170ea17fa5745a1cdcd2c6f20353e66a6932c906f0f29 |
| E224 | 4Y94N8RDPGPM / F7 / T1 | states.jsonl @7221885327 +20427 | 8c35d67e76cd4e18505c32fa85f50457ff567aa747b55a21503c4fd6398460cd |
| E225 | 4Y94N8RDPGPM / F7 / T7 | states.jsonl @7222677810 +28868 | 8ae9e0334e82321a8cbf1a00dfdd7825f4bf18e05376c7035e122c1cbcb32595 |
| E226 | 4Y94N8RDPGPM / F9 / T1 | states.jsonl @7222931630 +22091 | 2d5f95d5afe5947f743c552a5c66af53e3a9b8398884940c54033cb4cc59e26a |
| E227 | 4Y94N8RDPGPM / F9 / T5 | states.jsonl @7223390609 +26883 | d302c9459b657995789ce41d960440e937abbdbf63933a13d1389c321ce657cb |
| E228 | 4Y94N8RDPGPM / F13 / T1 | states.jsonl @7223767692 +24217 | 178146e2c6e0012b43ec2bffcdb4f1bc9cc5ce1f2a71a5c06cf59336092684d0 |
| E229 | 4Y94N8RDPGPM / F13 / T4 | states.jsonl @7224240486 +26453 | 17a08ecf6b0f5e3c9e331c1496224ad2c19474281c3e9ec10122d68543718989 |
| E230 | 4Y94N8RDPGPM / F15 / T1 | states.jsonl @7224526090 +24548 | 5478a2cfee56997cc80172377fb230698790eefb535f9f4a8372cb88a105dd19 |
| E231 | 4Y94N8RDPGPM / F15 / T5 | states.jsonl @7225124189 +29080 | 4f2b3d318b326efb1214985da030ded0a1cc02284eef4810f1181d3b373ddcf7 |
| E232 | 4Y94N8RDPGPM / F17 / T1 | states.jsonl @7225413438 +25944 | ef1ea7d54f6bbacbe78ddf5002e7143f82438bea3b3f8bb75cc4d48296721163 |
| E233 | 4Y94N8RDPGPM / F17 / T10 | states.jsonl @7226697619 +29575 | 3d515138e6d6ccc2866ca14f8316eaeece7f54a46cd9497e65cec171f69df9d6 |
| E234 | 4Y94N8RDPGPM / F19 / T1 | states.jsonl @7226958018 +28833 | e4e716b87c71a512c64aee9b8524d3f548a36c9250e9eee9eb9a6a0a79f01c42 |
| E235 | 4Y94N8RDPGPM / F19 / T1 | states.jsonl @7227089592 +32704 | 3326de1be956fd57626db3e218761caed1f707a55db91218ad38448aea4ac4aa |
| E236 | 4Y94N8RDPGPM / F23 / T1 | states.jsonl @7227715740 +29590 | 18480bdf15652a334a73f81a0ab602e5105e45c4f36984669e46634a579b72da |
| E237 | 4Y94N8RDPGPM / F23 / T4 | states.jsonl @7228444638 +33269 | 4bcfd22cf7eec777fe9e020861609a4cf9b45da54f0b077c4c0fd6e4264ba28f |
| E238 | 4Y94N8RDPGPM / F30 / T1 | states.jsonl @7229329748 +33412 | 2c2ce836aae723ee139cb71adc36717a0e17c6e3ba2f381414669a41c337c6d5 |
| E239 | 4Y94N8RDPGPM / F30 / T4 | states.jsonl @7229974925 +35891 | 163668dab046cb01ddaae094fefa356317436459bba361a95a6625fec4c46f06 |
| E240 | 4Y94N8RDPGPM / F33 / T1 | states.jsonl @7230442071 +31811 | ac032a4ae9e7ac4655f9fd877a95d6fb95a3b089e7ab908920747b3d82b80b3a |
| E241 | 4Y94N8RDPGPM / F33 / T10 | states.jsonl @7232324666 +37093 | 2eb87466cc99c258cb3b1feebab18c2959041b5ccb9a0a46f1b44ad5bf1dec3e |
| E242 | 4Y94N8RDPGPM / F35 / T1 | states.jsonl @7232636315 +34413 | 554c0a6c32eb2399ca7efc510fe88625d536ea473a57dbd9c7ea809d925c3bdb |
| E243 | 4Y94N8RDPGPM / F35 / T5 | states.jsonl @7233563317 +38430 | 2ebe16199af619f1285a9b0b9cd9920eb57fd7c60972489c6e796edd9e4c8d02 |
| E244 | 4Y94N8RDPGPM / F38 / T1 | states.jsonl @7233933487 +36604 | bba98b5f3ddb3a0702f847b68daf41de30c6ae3987c563f956c1517381555617 |
| E245 | 4Y94N8RDPGPM / F38 / T3 | states.jsonl @7234591025 +40767 | e9d03262f4403b5bc9ba6000e869836efa7be41a2c3824c0c14f3eb8191f87a6 |
| E246 | 4Y94N8RDPGPM / F43 / T1 | states.jsonl @7235371790 +39713 | 2a520d65b0ab585bc49ac7a34793d39fd34aecedc43e3fe16fdf93cc194668f9 |
| E247 | 4Y94N8RDPGPM / F43 / T5 | states.jsonl @7236664706 +42602 | b6d09513b7f4004602fe5180455bf4154dc040c16b16c224d12ea15ab087a845 |
| E248 | 4Y94N8RDPGPM / F45 / T1 | states.jsonl @7237020688 +37596 | 8d6a7a886b0aed739a448ec4f2b2b116c99d53b54cec4842a5c76b50efb0df99 |
| E249 | 4Y94N8RDPGPM / F45 / T7 | states.jsonl @7238958698 +45306 | 34093bebd430fb1fd2ca617c63732f2f601b341b7541c4c5046f83478bbe5bda |
| E250 | 4Y94N8RDPGPM / F4 / T未知 | states.jsonl @7220827852 +14804 | 4899982e579fc05a344f77e0006ccd4a700d2246656543359dcd5d15f76f54ab |
| E251 | 4Y94N8RDPGPM / F4 / T未知 | states.jsonl @7220842656 +13794 | 59cdb8af610f1d25383144de3ca36742e7ec1a690e36cc8f26d7270be2412fdd |
| E252 | 4Y94N8RDPGPM / F10 / T未知 | states.jsonl @7223583249 +38055 | 0ed94acc112f83725326e078944d4faec90b7b8930edc3ca18ae2a17d3032349 |
| E253 | 4Y94N8RDPGPM / F11 / T未知 | states.jsonl @7223621304 +17596 | 1f13a3fce8125296d57d831547a282f3cc34c69dcaa2b066317b45271bd8e867 |
| E254 | 4Y94N8RDPGPM / F11 / T未知 | states.jsonl @7223638900 +16725 | 0c52cceb4e7cf5eeadf65b25a4ff7c73b89723aea1b8bc88eb49e93b301eeced |
| E255 | 4Y94N8RDPGPM / F12 / T未知 | states.jsonl @7223693670 +18479 | a480bc9681d60803d50531e878094822296aa2097ec48f36342ffa2293911661 |
| E256 | 4Y94N8RDPGPM / F12 / T未知 | states.jsonl @7223712149 +17500 | 4d06102134c9a6766d9eb67d55f13c5b21c779a8b5d97589052214334b84cc74 |
| E257 | 4Y94N8RDPGPM / F15 / T5 | states.jsonl @7225260830 +42442 | de88ed29ed572156ca5c6eac9d48a61e88d42631b71858c6dc752d3800cd7984 |
| E258 | 4Y94N8RDPGPM / F16 / T未知 | states.jsonl @7225303272 +19834 | 4434682102d73fbcfeb998df0ed5574675adf85deee53d618258f41a67d41f06 |
| E259 | 4Y94N8RDPGPM / F17 / T未知 | states.jsonl @7226839803 +37409 | 26d14e1626211f02db5483d54aef95677da1494d747395b89880c7e96e08661a |
| E260 | 4Y94N8RDPGPM / F18 / T未知 | states.jsonl @7226877212 +22193 | 6c18464c2424fa04284e87e8351775887120b830824cae5f97342bbb57646a39 |
| E261 | 4Y94N8RDPGPM / F23 / T4 | states.jsonl @7228622144 +41862 | 3a44b1a54f07e85dad3769b834b9b575cf888a9a27c93ec3ebb68ede87fc025d |
| E262 | 4Y94N8RDPGPM / F24 / T未知 | states.jsonl @7228664006 +22788 | d161559f03261b7750e0fcaab8acbcfb837ea8b893b8b0bd790f0276843192d7 |
| E263 | 4Y94N8RDPGPM / F31 / T未知 | states.jsonl @7230277430 +40813 | e04d0ce3fcbdc802f41ada163c8fa80ecf6ea42a0fe6cd56ba984d2b0ae44098 |
| E264 | 4Y94N8RDPGPM / F32 / T未知 | states.jsonl @7230318243 +24280 | a647185b95a8480cfb14fed837e87df556c2875a95bf5ab639347b95cc8243ed |
| E265 | 4Y94N8RDPGPM / F33 / T未知 | states.jsonl @7232493209 +45177 | 37cae81c1ae63e7b92749c8b1e3f8ee16ccb46bc53ecc7c10f3b7736ae34c8fd |
| E266 | 4Y94N8RDPGPM / F34 / T未知 | states.jsonl @7232538386 +26129 | 2962e843c09cf1b3d68e68d19a3870ce863cf4a67104812ed317edaabeafe805 |
| E267 | 4Y94N8RDPGPM / F39 / T未知 | states.jsonl @7234909019 +48153 | 5d888f97f09a15dfc08a8eeef2b4156b40836f1d7954ae0d35ad88cb30cff1d0 |
| E268 | 4Y94N8RDPGPM / F40 / T未知 | states.jsonl @7234957172 +27638 | 5bdf56c815f89d08c400595b80cd67c3a8fadf9884517f24978dc4bbfbcec3ad |
| E269 | 4Y94N8RDPGPM / F43 / T5 | states.jsonl @7236829220 +50858 | 8751cb27265aba15cd1dccb5e9deff6c9128242f7a8a03e7325a4f6a9627c352 |
| E270 | 4Y94N8RDPGPM / F44 / T未知 | states.jsonl @7236880078 +28023 | 7a8a5950f28fb24fd1828767692ef1314831b84b4171c087aa71a2c690532a03 |
| E271 | 4Y94N8RDPGPM / F46 / T未知 | states.jsonl @7239462319 +51235 | 9b353e687940815bc517cd46433a232b57460fba0fab59462c63d109750bf9a0 |
| E272 | 4Y94N8RDPGPM / F47 / T未知 | states.jsonl @7239513554 +30758 | 63a6161d06015654d7bd6438fe6685597e29641d68f18499fdb938b2d35c73e8 |
| E273 | 4Y94N8RDPGPM / F6 / T2 | decisions.jsonl @548011989 +1387 | 8ef7f21af7ec7d8bd0379d511604a64b22ac484382f583b3f732338a6b84d0d4 |
| E274 | 4Y94N8RDPGPM / F7 / T2 | decisions.jsonl @548073725 +8109 | ae1e71295329e26da21d381ffcb73bbc56d64e4e68437b27082e40f1232581b4 |
| E275 | 4Y94N8RDPGPM / F23 / T1 | decisions.jsonl @548606956 +8026 | b22f4642c757fe8d8d735508b12188d28fb35bcb6b62b1b22cf1dbe13bc58d44 |
| E276 | 4Y94N8RDPGPM / F33 / T2 | decisions.jsonl @548951686 +1421 | f6322df2427525dcb4ba31d4060bb926a492500de6ea8bb796f7f8738bde7245 |
| E277 | 4Y94N8RDPGPM / F33 / T4 | decisions.jsonl @548979130 +9383 | 7549196309b2963ee9fb1382ad5a0e4ba2889a74234d3816d0c33bebcd512031 |
| E278 | 4Y94N8RDPGPM / F35 / T3 | decisions.jsonl @549212877 +1467 | 0ad032427e48827c0d8f3956e858078b6eb3221cd8deb9753f4a6a7783508f12 |
| E279 | 4Y94N8RDPGPM / F43 / T1 | decisions.jsonl @549415458 +1736 | dc1d697512a4a136421739d23346c6ecf1e376768a2d9fb967aa8eddb38ea678 |
| E280 | 4Y94N8RDPGPM / F43 / T1 | decisions.jsonl @549417194 +1730 | 9308981d136187943677668f05799766c399bc5d4f45cf1eba0483d1984df676 |
| E281 | 4Y94N8RDPGPM / F48 / T1 | decisions.jsonl @549876414 +1526 | 7c6a25a266dcc8b336b318471e146b932c680ec3f416330857dc5a20dbf51fbd |
| E282 | 4Y94N8RDPGPM / F48 / T1 | decisions.jsonl @549877940 +14439 | 339f7d18ffdb105d3594ff824978afdc04d18cfb0a27cf48a78d990404c6acd7 |
| E283 | 4Y94N8RDPGPM / F48 / T1 | decisions.jsonl @549894769 +11472 | 983cb5e70ca6e2149f624a3352507129d2321ef25a6b6a6aa17ef5c191fee4dd |
| E284 | 4Y94N8RDPGPM / F48 / T1 | decisions.jsonl @549908665 +10253 | c1c5a856210ac23e1e7b5580245ba9b4850682a531cca343c27f1349cf6205d0 |
| E285 | HNX4A2WBC34W / F2 / T1 | states.jsonl @10223982661 +17678 | e91888ad8a0267b2ba7e6738ab47d9e45d541578b1084dd48d70345802887510 |
| E286 | HNX4A2WBC34W / F2 / T6 | states.jsonl @10224534350 +21062 | 1dfeb25e0372af997443fb68cf5d457f8a2c4eefce39319453115fbdbc93b281 |
| E287 | HNX4A2WBC34W / F3 / T1 | states.jsonl @10224652912 +17026 | d26988b373d7c680b6846fae4609f1ae7ce3e98d0f99d2175d4ab8e6d2da90a8 |
| E288 | HNX4A2WBC34W / F3 / T5 | states.jsonl @10225049115 +21705 | 1ffafad92eed91a64818dff14f02d825f1e812b1516906b0b32c53d3e0d390eb |
| E289 | HNX4A2WBC34W / F4 / T1 | states.jsonl @10225187449 +18065 | 49120635896013b81348b01e61074a9ceb41334d39bd9d0b7e9e236dfb90053c |
| E290 | HNX4A2WBC34W / F4 / T3 | states.jsonl @10225513110 +21780 | 4357a13dc0f82dc2289be6d000c22bff2709e23278f2c0cb0231b49e95b588c7 |
| E291 | HNX4A2WBC34W / F5 / T1 | states.jsonl @10225638468 +18798 | 9ddca454d7f12f33266cbd9181de20276e38f1e51a1a219f7185700b194b1e86 |
| E292 | HNX4A2WBC34W / F5 / T8 | states.jsonl @10226406751 +24553 | 91a59e074fb22e86681e866ef9c79183d090ddad504d73b32e7d242b81bb52c3 |
| E293 | HNX4A2WBC34W / F6 / T1 | states.jsonl @10226561391 +20685 | e577b4e3a04711ef9aa2db7e92fd30bb0a43156a5a133e89a5d16191dfb5e387 |
| E294 | HNX4A2WBC34W / F6 / T7 | states.jsonl @10227246771 +24790 | 2500ba1106a8257501835ad4b6a6bc438af22192ed04c22523f5bb8a7cb45d26 |
| E295 | HNX4A2WBC34W / F8 / T1 | states.jsonl @10227480896 +22899 | 7496625cb15d09f86d24e559ad01456e75c6a942cf371a4d8931bb412cfe406f |
| E296 | HNX4A2WBC34W / F8 / T4 | states.jsonl @10227923761 +26279 | 067bb851a949609a7d4d4e999e1126322a3dc1988588e774d2dba6e9d767c191 |
| E297 | HNX4A2WBC34W / F12 / T1 | states.jsonl @10228360868 +22976 | edbc1675402bd28562cc33f5ab22501c1c1e815b2cdf5b42dd0ef54057aed04e |
| E298 | HNX4A2WBC34W / F12 / T4 | states.jsonl @10228877828 +27694 | 5cd14401bb42795534a5e4d225283d166af3102e26b594319f186cbaadcc1cc1 |
| E299 | HNX4A2WBC34W / F14 / T1 | states.jsonl @10229099193 +22840 | 8ef32a6aabf5dba86ea4681d4c58bba46f1e0d18a9354855cd4e3d25c30f4cb2 |
| E300 | HNX4A2WBC34W / F14 / T6 | states.jsonl @10229856762 +25510 | 187f23c3e8725268ae353f03df3acc8464915d06314bcdad98504cca9d7da629 |
| E301 | HNX4A2WBC34W / F17 / T1 | states.jsonl @10230324341 +26450 | 68d4133f56bf235663f15fabf374069b804ae2e90bd1b670b4725662754a3ce3 |
| E302 | HNX4A2WBC34W / F17 / T12 | states.jsonl @10231625168 +31880 | abc8abbfe78674b588eb45255ca96ad24b843ca577fb3602c57bee94447c7ac5 |
| E303 | HNX4A2WBC34W / F19 / T1 | states.jsonl @10231873366 +28925 | b48523ea59aa25453f46365f6d233f4e57b189775c54b119ab5dd485855b7616 |
| E304 | HNX4A2WBC34W / F19 / T4 | states.jsonl @10232387414 +31379 | 38cc0f088152ba8de0e926d73765e65af84efbe5d6f8ff1382b8ff7c67916098 |
| E305 | HNX4A2WBC34W / F20 / T1 | states.jsonl @10232557562 +28473 | 7bfb160cacf339dce1d5685982c8e7e4a19d6f806cd7299b9752b6ef4d4643ff |
| E306 | HNX4A2WBC34W / F20 / T5 | states.jsonl @10233330295 +32757 | 894ea7ecf5a5ceaedaa102737908f897c846aeb786e805688b9a406bf7dde838 |
| E307 | HNX4A2WBC34W / F21 / T1 | states.jsonl @10233527717 +31358 | 122483245546757032f6a8d811da3142b4616dba963f4fee6a7e7925ff64a99e |
| E308 | HNX4A2WBC34W / F21 / T3 | states.jsonl @10233996525 +34041 | 808c28bfbe4b6590ff671e9764f3e77d434a68f4c11040fdc9b7ba0fb05dea6e |
| E309 | HNX4A2WBC34W / F28 / T1 | states.jsonl @10234998626 +32902 | 9391499f9f49cb027d5f1dbc5c185c3c72a22ec1a7b5cea1676153c6f79a3343 |
| E310 | HNX4A2WBC34W / F28 / T7 | states.jsonl @10236167443 +38507 | 32116b1d2315d7c7033b3af94c13dab52e930b1d7eaffcf345cf9c15127a6b3b |
| E311 | HNX4A2WBC34W / F30 / T1 | states.jsonl @10236527732 +34141 | b636d3b8ecb5d9b19371b23f4eb87a02a2052e34311a2f3e64226275460cfd12 |
| E312 | HNX4A2WBC34W / F30 / T5 | states.jsonl @10237530833 +37729 | 034689edc2a5d9eea81e474d90ba625b2d704241a495e656960b56aba504f404 |
| E313 | HNX4A2WBC34W / F33 / T1 | states.jsonl @10238009627 +34255 | 574471903d19d8f4010823855e1c836f8125c0e3568d8fdac0779f22f891630d |
| E314 | HNX4A2WBC34W / F35 / T1 | states.jsonl @10242000072 +35917 | f7be5ce6f5d464120eb9a080b7ac1c8f517a573819e4d4a58a92e8b5ac410d98 |
| E315 | HNX4A2WBC34W / F35 / T2 | states.jsonl @10242416233 +44760 | cd1e3e7efc773436585a6e3705b51d946e52ce6aaa156a82dd9f0e2511b50fba |
| E316 | HNX4A2WBC34W / F36 / T1 | states.jsonl @10242655635 +36519 | 34f2f4b850f4ccd396933956cf9168d63261783313fc32dde7886056aa8765e0 |
| E317 | HNX4A2WBC34W / F36 / T5 | states.jsonl @10243652683 +39725 | 6d4a6c6345c0e59153ac6b48012237f3fd29a849519a3f8dc921b3d335ea1566 |
| E318 | HNX4A2WBC34W / F39 / T1 | states.jsonl @10244209826 +38365 | 062c23204cc333ba47507a824338a542c7e3903af701bb9940fa6af2162477a3 |
| E319 | HNX4A2WBC34W / F39 / T7 | states.jsonl @10245505303 +45183 | 8bd340117ffbc130cc5f4e84ef642f4d603a2c7df506cc4738c98a8d0d5791a3 |
| E320 | HNX4A2WBC34W / F43 / T1 | states.jsonl @10246105819 +41047 | 1e3700b89c91f4fb7c5626a192b71b6045e6655e51bf5707caf9d914a6311e72 |
| E321 | HNX4A2WBC34W / F43 / T3 | states.jsonl @10246818542 +46115 | f1805d200742701a461a30893245aa8a3bd3bccf5ad62582458ba02ca68af772 |
| E322 | HNX4A2WBC34W / F48 / T1 | states.jsonl @10247571554 +42388 | 4bea76f74f048b75d52db2edf4aea3970975a541392ec8d1b36855e39c3b58dd |
| E323 | HNX4A2WBC34W / F48 / T1 | states.jsonl @10249957606 +49014 | 3eccbad37076cff2c911d8841c59a2dbc6205cbe6130f4287bb8f39a18510f4e |
| E324 | HNX4A2WBC34W / F48 / T7 | states.jsonl @10252632460 +45356 | 5ff0aee4e3578746e4c55280a102fd3b8c25627f9e8fa5182f5e6c50f31ee35c |
| E325 | HNX4A2WBC34W / F48 / T8 | states.jsonl @10255359041 +47257 | 51f0bcc33141f240dab08d2c4aaaaed697d9a7697cedea66f0d1da1b64651409 |
| E326 | HNX4A2WBC34W / F7 / T未知 | states.jsonl @10227381335 +15959 | 82aac65da575ec9357a9297d83e62806cf6a1ab6443ad431d29ff8d028db11a0 |
| E327 | HNX4A2WBC34W / F7 / T未知 | states.jsonl @10227397294 +15088 | f5ad518e04d8ec496882c06b1ad45fca0ea00f3afd5d1b1390993c76454031fc |
| E328 | HNX4A2WBC34W / F8 / T未知 | states.jsonl @10227448299 +16830 | 7fcbfb7ce380be2e533ea5c57606a62be0575d32bd969ec1a7bc5df927fc6a2d |
| E329 | HNX4A2WBC34W / F8 / T未知 | states.jsonl @10227465129 +15767 | b3e699978e5ec059949f9be15d017f5955bfc08c789370c28c6097e706240a63 |
| E330 | HNX4A2WBC34W / F11 / T未知 | states.jsonl @10228285994 +18932 | 8330b7745eb9eb5bc311859acf236479ae817f2d8545afdb1e06606cb9fbcef9 |
| E331 | HNX4A2WBC34W / F11 / T未知 | states.jsonl @10228304926 +17953 | 3076bff76eefee2774f5c34506b13a80d41ae5286c914da8bfe387c0d48ec510 |
| E332 | HNX4A2WBC34W / F13 / T未知 | states.jsonl @10229026747 +17852 | 2d467203820930acf054138d70c310f08d3e1d03a0540915e1e7237685a3e3c5 |
| E333 | HNX4A2WBC34W / F13 / T未知 | states.jsonl @10229044599 +16981 | 0ac18c6b00bfe5157c17407630e501075cd03dd523b84a2326ac320754a5505d |
| E334 | HNX4A2WBC34W / F16 / T未知 | states.jsonl @10230243617 +20618 | 438c437e38aa530c15b32623241cf832523434d511711e8963ab6d30a33c301c |
| E335 | HNX4A2WBC34W / F16 / T未知 | states.jsonl @10230264235 +19747 | 051a952f813326ef7ccf9100ed2a5e137f3294115835b55c217d3a346014a7c1 |
| E336 | HNX4A2WBC34W / F17 / T未知 | states.jsonl @10231747816 +40910 | 8337e373829877dc4196c9bc9e9f80fb7a2039341cb2814a25bd6b6057edfa44 |
| E337 | HNX4A2WBC34W / F18 / T未知 | states.jsonl @10231788726 +22302 | 7fd5dc9618eec69db4ee2b53a2bc9fc795ffafd3782fdeb7e0f9d56a72acf1c4 |
| E338 | HNX4A2WBC34W / F27 / T未知 | states.jsonl @10234904078 +25092 | 11a9882726957149bf237759f5d51f345d09cf1f95efb4c40c46921fbfc31b56 |
| E339 | HNX4A2WBC34W / F27 / T未知 | states.jsonl @10234929170 +24221 | 6563d67704ed97cc0213375a78b4a32e312975fbfce77559e83aa808be2ee181 |
| E340 | HNX4A2WBC34W / F32 / T未知 | states.jsonl @10237911416 +26323 | 49af8db89f189524a5ced5478f9904bc6cd028262f2fd60864c285624d481ab4 |
| E341 | HNX4A2WBC34W / F32 / T未知 | states.jsonl @10237937739 +25452 | 9cc1a0a69624f636836ec7befcf4561f6dcdc234a6aef5159e60f8d2880fc1c8 |
| E342 | HNX4A2WBC34W / F33 / T未知 | states.jsonl @10241861143 +41715 | fbf573dc01cdd9d61b350658aa65cd9f5493097cef57174914b43dcdf8a5ab2e |
| E343 | HNX4A2WBC34W / F34 / T未知 | states.jsonl @10241902858 +28218 | 8e3b8b34e3f768576b1cdb4eea8496892db5e54adfdde6e07bdae725b71d306d |
| E344 | HNX4A2WBC34W / F40 / T未知 | states.jsonl @10245757971 +30329 | c23c7cabf18414ae063432b536de70c9e8c7d7f772b265d6c9a8a3b2ee5e7a75 |
| E345 | HNX4A2WBC34W / F40 / T未知 | states.jsonl @10245788300 +29463 | b4da228185dea59ad0229da9870cefb8631fcc95d123824a7117d0c59e47ddba |
| E346 | HNX4A2WBC34W / F44 / T未知 | states.jsonl @10247045442 +31198 | 8a836968802123db1029bcad91eba0975dddbf1089b288a9ce77db3c77d88b11 |
| E347 | HNX4A2WBC34W / F44 / T未知 | states.jsonl @10247076640 +30332 | be2e8eaceaa0541de86da2b12beb2e49b6477ab0a48474a05bb49038566448d4 |
| E348 | HNX4A2WBC34W / F45 / T未知 | states.jsonl @10247153220 +32265 | b9d10e4436a85d3fa0950d16283f981057553814aa6aa275a359baf6bc457e8a |
| E349 | HNX4A2WBC34W / F45 / T未知 | states.jsonl @10247185485 +31506 | 01fe3e1778b86e19289e5bee80dc96ba607b453e7e396d6cbab2018e832bc7ad |
| E350 | HNX4A2WBC34W / F47 / T未知 | states.jsonl @10247462040 +31788 | 4568ce6e6e826b4f47983c2a97c4fa9a563acfe9ab2141946ca69dcac14598bb |
| E351 | HNX4A2WBC34W / F47 / T未知 | states.jsonl @10247493828 +30917 | 638d8d3fcbdeb9fbbff292c53afdefcb2617da3226030b8810b7a27980c3f2f6 |
| E352 | HNX4A2WBC34W / F4 / T1 | decisions.jsonl @860476415 +1414 | 322a59a10f2df6887e11df52c69abf1bdaf8cbc35d40a509885bdad22d230b85 |
| E353 | HNX4A2WBC34W / F6 / T1 | decisions.jsonl @860610661 +9841 | 65bce28df421837a5a1d4a2b0997552df85b604beb075fd1b5629ca4c665cd3b |
| E354 | HNX4A2WBC34W / F12 / T1 | decisions.jsonl @860875716 +1459 | 454189b2c81bbd277b7aea24c264147166fbc20c62c7fde098457512080fa3c5 |
| E355 | HNX4A2WBC34W / F17 / T1 | decisions.jsonl @861139980 +1584 | c5b913b14af666235bab91907c789ab2c3abcfb4273cb8ab8bcb047cadda069c |
| E356 | HNX4A2WBC34W / F17 / T3 | decisions.jsonl @861194559 +1436 | 38ec208eb4a588ba43899d3b16bc5032c378f66bebd92e3b195d33601f5b39fe |
| E357 | HNX4A2WBC34W / F28 / T1 | decisions.jsonl @861686486 +1522 | 7b3272e16ce962785cad67fdb033277721d7dd2e50ffddff1bda559e4f265b6f |
| E358 | HNX4A2WBC34W / F33 / T2 | decisions.jsonl @862025468 +1466 | 186c611ff1648245734d64529e20a3e8b5061aff08ce5a6db7129f2e58f67938 |
| E359 | HNX4A2WBC34W / F33 / T3 | decisions.jsonl @862225625 +21843 | 6b4abb2f38390666f4f497c04c5f18a3ee3885f221cbf941eb017aed717d43ea |
| E360 | HNX4A2WBC34W / F36 / T3 | decisions.jsonl @862556902 +1591 | 4f693f2591603cdc848c50a7ed69538ecaf3bf688113099d3330fe9971b56ad4 |
| E361 | HNX4A2WBC34W / F39 / T1 | decisions.jsonl @862668671 +1539 | 91bccd0671ce2eb095dba81fe81a5fbd13ca47dbd7203539151f71dcd7a066e6 |
| E362 | HNX4A2WBC34W / F43 / T1 | decisions.jsonl @862848246 +18279 | 2d26b7bc0ce9a604ee9f5882c23f4865c5eb0362e5254ec05274ffb0cb707bbd |
| E363 | HNX4A2WBC34W / F48 / T1 | decisions.jsonl @863033983 +8155 | 5ff75689ce1bbda488a00b00352222061a1ac152733237018880e562dfb826f8 |
| E364 | HNX4A2WBC34W / F48 / T3 | decisions.jsonl @863124999 +1601 | e3a25dfddf63eda9c60dd0aadcdf4f2d937bd40dbad61ff119e0a2ee60d00c3f |
| E365 | HNX4A2WBC34W / F48 / T1 | decisions.jsonl @863286683 +1537 | a7f69015d214083c2ff34e549f7276c6ff43856fed4a37140c30c846178638ea |
| E366 | HNX4A2WBC34W / F48 / T2 | decisions.jsonl @863291049 +19471 | 73efd06c766603c1548de13f8ce2f67d4db4b9b6a6a8893392b02d37d3dc7c96 |
| E367 | HNX4A2WBC34W / F48 / T1 | decisions.jsonl @863575637 +10194 | 3a16e0f60037f5393b9fd2d4443cc19c3242cc215a31c3527ac4e1a597f49df7 |
| E368 | HNX4A2WBC34W / F48 / T3 | decisions.jsonl @863725144 +1601 | aed29d3a222dde0c0715041aed4fc2d0e8d75e0385566f330adcd1d592b3ce84 |
| E369 | YF0LXT1QSTGG / F2 / T1 | states.jsonl @8516130535 +17212 | 476a4e8320c25fb1a2edea86c7ba4dfac09885c5475b81bd6f1e03a478264005 |
| E370 | YF0LXT1QSTGG / F2 / T5 | states.jsonl @8516655486 +21566 | 8485ac15a02e6dab1948fe1ec889df3b4e7b4c218928e048b53ca42dba4c4e93 |
| E371 | YF0LXT1QSTGG / F3 / T1 | states.jsonl @8516775211 +17464 | 92e3d7bc21e461aefefe4d31f791c9366d6fb46b2e50567664aa0db6b4f6a1f1 |
| E372 | YF0LXT1QSTGG / F3 / T5 | states.jsonl @8517263854 +25261 | d3d90542091ffe28fdd1bc97ce69d57de334e73548b5a7cd8f5aba03fab0a070 |
| E373 | YF0LXT1QSTGG / F5 / T1 | states.jsonl @8517468322 +19682 | cef6db1c3f12e75e4e2052d22201ad924230289eafcb13802cb08cda5414b64a |
| E374 | YF0LXT1QSTGG / F5 / T4 | states.jsonl @8517993315 +25312 | 81443a94c0f9162c84cd6203f280931cb9a95762bc2231a3d1e66d229ede4727 |
| E375 | YF0LXT1QSTGG / F6 / T1 | states.jsonl @8518124176 +20223 | 266f188c1ea3f4253270f4f8cd3bf7501c794b9a346c25a0deffa4a91dc6fc1f |
| E376 | YF0LXT1QSTGG / F6 / T7 | states.jsonl @8518961137 +23370 | 2df032203aa7ee9748cc47e84e9992d2bef126c9b814dd10fc38ceccfab6b6c8 |
| E377 | YF0LXT1QSTGG / F11 / T1 | states.jsonl @8519504753 +26762 | 06b03d13da0119cad7106544018cea27209caf0d332bd950c7b3d635fff617f0 |
| E378 | YF0LXT1QSTGG / F11 / T7 | states.jsonl @8520601243 +29116 | 3239310c5cf54f757e19a38ed0278742496a996eac31eaf155868926e1707f6e |
| E379 | YF0LXT1QSTGG / F14 / T1 | states.jsonl @8521002881 +26858 | c93766fc9136407a79faba3e90cbcee23b28410ea01df3c7b5f3c0c9b37c35fc |
| E380 | YF0LXT1QSTGG / F14 / T3 | states.jsonl @8521410027 +31893 | c49583be4968477e9fe7fd91c0b2e7f1ad82a7d23366df3190bcc59e3e634e5e |
| E381 | YF0LXT1QSTGG / F15 / T1 | states.jsonl @8521572775 +26361 | e96631d6449fc96cd2ff950e2cb1cbc5b418a7b03c0d57aba6e1419d3889231d |
| E382 | YF0LXT1QSTGG / F15 / T4 | states.jsonl @8522177618 +32068 | 43d94f68a41b714fb35c8e0138a3fa32ecda97fa9a8cf8125d790019bbea9885 |
| E383 | YF0LXT1QSTGG / F17 / T1 | states.jsonl @8522421830 +27209 | a422a6633fce7b2bf70eaa7347c275aa92147eca06a9cf503e986092db2985fa |
| E384 | YF0LXT1QSTGG / F17 / T11 | states.jsonl @8524165222 +30512 | 3853b4ec2deaec9a756ff880e2d64d241bc9cf6efcfc72272892dcf2b3efe00a |
| E385 | YF0LXT1QSTGG / F19 / T1 | states.jsonl @8524438311 +31055 | d165512820b7e8858688071b1feb37ae892f979bceda3e52f6154827ec12145f |
| E386 | YF0LXT1QSTGG / F19 / T2 | states.jsonl @8524807019 +36517 | 5fbf33b4d030914327157e6b78a572faaa2259134f681c3aba8b8d1260870dd0 |
| E387 | YF0LXT1QSTGG / F22 / T1 | states.jsonl @8525352036 +31269 | b447aaa4926ab463c5c6d5c068fea00fc56d219310a079320cf39c30d849b3e6 |
| E388 | YF0LXT1QSTGG / F22 / T4 | states.jsonl @8526172052 +38620 | 6d90e3e81ecd9b65f85ec1a401a5cb519fb8604be1cf68bb121a524b0b57cd1b |
| E389 | YF0LXT1QSTGG / F23 / T1 | states.jsonl @8526357981 +32655 | cd0cd61c156fc226306ef9ee67fce41cb2101aea1754400a2052a17e68705572 |
| E390 | YF0LXT1QSTGG / F23 / T5 | states.jsonl @8527417978 +39062 | 5b481842ff4e58d5dd033fa99cd72844a3fba69d8ded456336ee5c6ce13cbfab |
| E391 | YF0LXT1QSTGG / F24 / T1 | states.jsonl @8527634340 +32848 | 4526e0b22817c0947878e1db32dae14eabbf96b53d899fc96fcb5af5d8a0428a |
| E392 | YF0LXT1QSTGG / F24 / T4 | states.jsonl @8528288063 +37100 | 5c64aa1912956d796dbe10f2fb9ca210694bad52818c56ba1634e6f64394b515 |
| E393 | YF0LXT1QSTGG / F27 / T1 | states.jsonl @8528681371 +34666 | 6014c533c387f1c220fae0fa53ba488143498817839b65c23d40acab2ee5b43e |
| E394 | YF0LXT1QSTGG / F27 / T7 | states.jsonl @8530005612 +36376 | 6e39f80f777a2f1c03e9ececae99ae35417b25f0d076214b4c7fb1e8c99a858b |
| E395 | YF0LXT1QSTGG / F28 / T1 | states.jsonl @8530225292 +35125 | b5fc0df067259305b18aa5a4a68c6866f2d75b89d8ce9b38db8cd33031d7e991 |
| E396 | YF0LXT1QSTGG / F28 / T3 | states.jsonl @8531000880 +42129 | 5d54c9afe612161846cffacee752733c2636f5fa0833a65dfa0889077b804419 |
| E397 | YF0LXT1QSTGG / F31 / T1 | states.jsonl @8531483350 +36242 | 3db02e27c54480a4523d4103ac1998215526c810dc7ef2fefd3ac1ff432f3edb |
| E398 | YF0LXT1QSTGG / F31 / T4 | states.jsonl @8532607287 +40845 | 75c15432b293807c4416e599725187fc47d2b43a2e2380f7209c6d70dabd795c |
| E399 | YF0LXT1QSTGG / F33 / T1 | states.jsonl @8532954938 +36941 | 081c6633e8580eed39f63fb820129ef05691ed9d13641979674468424c4ae494 |
| E400 | YF0LXT1QSTGG / F33 / T11 | states.jsonl @8535417775 +41197 | 986457465a77cae8ff1ae4b5e76000b3f15d35832c5cec567c297bf7e418df50 |
| E401 | YF0LXT1QSTGG / F33 / T1 | states.jsonl @8535458972 +43098 | 11c220980dd37a6fe7ff5c924f1110ff34921b104b21ad1e6d329f27858b5922 |
| E402 | YF0LXT1QSTGG / F33 / T8 | states.jsonl @8537197089 +41133 | 506dd6f5cc13d125e1fd07ae28631f81d596ce929bb0d2f06a3cb13dca4990ac |
| E403 | YF0LXT1QSTGG / F35 / T1 | states.jsonl @8537537818 +38855 | 4adf093dc22e316c16cece4271cb866073e4a4f1dfde037ee6bac2f01748abdc |
| E404 | YF0LXT1QSTGG / F35 / T4 | states.jsonl @8538403051 +42420 | 139e131fe3227d1b7e342169d9e684c8706fd4e361a055ae2288ce5c90013de5 |
| E405 | YF0LXT1QSTGG / F36 / T1 | states.jsonl @8538618656 +38603 | 66310ce15d7fe263f11a04ab9ec5b1a34b4b0ae2f5c325d3df3d9916fab6ebbd |
| E406 | YF0LXT1QSTGG / F36 / T5 | states.jsonl @8539783673 +42342 | bf6378637144a913cd872b4e0669e170b4a31241eb7c6f1db43bbe078844ef57 |
| E407 | YF0LXT1QSTGG / F38 / T1 | states.jsonl @8540138728 +40484 | 3cb0886978e3544bdfeaa6f6678b057f6a1fd383dd247a1b7f19978e34f286c7 |
| E408 | YF0LXT1QSTGG / F38 / T7 | states.jsonl @8541680110 +43608 | 34fba75c246a5e1a28dcb8dd40d2514958c8041fea51cefda5964c635ba07942 |
| E409 | YF0LXT1QSTGG / F45 / T1 | states.jsonl @8542811519 +42157 | 18abaaf54394027e2186270a9a7cf23b57d439b74b0f1122ba21435538cb0162 |
| E410 | YF0LXT1QSTGG / F45 / T6 | states.jsonl @8544725788 +48791 | d834e6facef5ecc15080597024369d4e346b66d58dd38f78381083ff866389f3 |
| E411 | YF0LXT1QSTGG / F46 / T1 | states.jsonl @8545061338 +42080 | e00cb0617d3311516ea7862c00e88e596ad807ebf49a4fef3600d5086c4d8627 |
| E412 | YF0LXT1QSTGG / F46 / T2 | states.jsonl @8545575770 +45832 | 7350f762fb4ab4ca662b87532821e756c0136dc1e182db84cc623b52b088fe29 |
| E413 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8545926702 +42358 | 93a514e47414d8cc334140345b9b4cbf112f496470bf450f81b43d7af5857ada |
| E414 | YF0LXT1QSTGG / F48 / T5 | states.jsonl @8547484794 +43678 | 5805921940fd14f1baf3a06876c4f25b2a6b4a885c0323a08b118f1072f9ffb2 |
| E415 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8547528472 +50456 | 4bed570928243cc2d464cb7244d22faef6b09d11bf8bcaa8199552e56e96491b |
| E416 | YF0LXT1QSTGG / F48 / T6 | states.jsonl @8549319342 +43516 | 6d11259b8eaf2bbf5690dad2a38fec30df7d73656192ee587d30428104c4da25 |
| E417 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8549362858 +50456 | 6ae7cc9a88afd8f25e6cf3f2d9f0816000fbcd923034152d97fc14530ac1354d |
| E418 | YF0LXT1QSTGG / F48 / T7 | states.jsonl @8551531890 +44090 | ec217f7d699bcd468e3d2b804930a693ff1b06ad172314a747149181596d3258 |
| E419 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8551575980 +50456 | e9e70cc24bc4a29af11225417df62d3e835b1f0526179d0325d8c7b533334193 |
| E420 | YF0LXT1QSTGG / F48 / T7 | states.jsonl @8553745012 +44090 | decbfd5ba499b87e93743a0c9918fad4cf46eeb3f702b3060ed09683b0ed8237 |
| E421 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8553789102 +50456 | b265c940b0ebec8ae4cae17dbe721cda9e6eabad2ab4efd0a475dfcc4a420cf2 |
| E422 | YF0LXT1QSTGG / F48 / T6 | states.jsonl @8555344091 +43501 | 4d667f340960e57eacf577ddb3c85e83ccff00e1d81a4b2e9e087986a5ee9dec |
| E423 | YF0LXT1QSTGG / F48 / T5 | states.jsonl @8557046270 +43994 | ff1181dba07de421aac3e14046518deeaef2c3f5ba3c506ee743f2c410b2fed6 |
| E424 | YF0LXT1QSTGG / F8 / T未知 | states.jsonl @8519267125 +18219 | 713eb56234913c12259cbb1a4536b360ce7dbe6e77eb25055f77808dc9ff05e3 |
| E425 | YF0LXT1QSTGG / F8 / T未知 | states.jsonl @8519285344 +17348 | 09d09ea59a90b19d9a14a7c827cf722a9b3cdcff75793e1789e96cf3e5c38d9d |
| E426 | YF0LXT1QSTGG / F11 / T1 | states.jsonl @8519531515 +32986 | dcedd4e471be6b1f5b5cc970ceb67bf4cf9335dfb6f68c4485aa3889226b7644 |
| E427 | YF0LXT1QSTGG / F14 / T1 | states.jsonl @8521029739 +33133 | 45b5d22a7fb2a28aeb7b150d01d912efa310210140821aa1f6fc1297b832e662 |
| E428 | YF0LXT1QSTGG / F15 / T1 | states.jsonl @8521599136 +32752 | 2a907163fd8a9849b2bcfa5b3c2e1113686da1fbb0861309224ce0bdb695f0be |
| E429 | YF0LXT1QSTGG / F16 / T未知 | states.jsonl @8522341851 +20770 | 0422b12bb86d1038bbfb601fa6c142cf20de547cc6810340a5afec94575cf6bf |
| E430 | YF0LXT1QSTGG / F16 / T未知 | states.jsonl @8522362621 +19899 | 11a6d5e04456e9700421c2662392dc474227ce8b375c0fc302a8e2616fde438f |
| E431 | YF0LXT1QSTGG / F17 / T未知 | states.jsonl @8524312963 +39279 | 06b41ba51c97fdb0e253dd7ad07d42f39acd7df54c338f3f054be06d3d0b0a65 |
| E432 | YF0LXT1QSTGG / F18 / T未知 | states.jsonl @8524352242 +23649 | b295ce1c301e6ba905f62c42dfaf9d34d1271da75f894fb08e8bec6a3c5698fa |
| E433 | YF0LXT1QSTGG / F19 / T1 | states.jsonl @8524469366 +37544 | d733b524d95d12cc98568566c434743f06b40959d0175ef1e869d16cee866d4d |
| E434 | YF0LXT1QSTGG / F22 / T1 | states.jsonl @8525383305 +37626 | 5f0def40aa7c9ffed71cad2aa5d3a3a260fc0bed489b778fc55e21953c639879 |
| E435 | YF0LXT1QSTGG / F23 / T1 | states.jsonl @8526390636 +38288 | 5309cdf664a83e582ae7836dd7adfdcfd50c8d5327acacf22c94dff5c026848c |
| E436 | YF0LXT1QSTGG / F24 / T1 | states.jsonl @8527667188 +39528 | 7c94a747769cb1b491e88f592e4025e4ab265fc0131feae45f4a8e834c5dafe3 |
| E437 | YF0LXT1QSTGG / F25 / T未知 | states.jsonl @8528477001 +24498 | aead7fc4ea22fa07fdb225b1ea3c6c07ef2ac89c0d6e9163be914d0660907d87 |
| E438 | YF0LXT1QSTGG / F25 / T未知 | states.jsonl @8528501499 +23627 | ae6fd9d0ace3596d808e6082812b4479de13253981a967291b4dbf38f6a6832a |
| E439 | YF0LXT1QSTGG / F27 / T1 | states.jsonl @8528716037 +41223 | a20df3999b3b1f43f0e06b8df5bc3d732d5c776b8310312027bb9787490d6fd2 |
| E440 | YF0LXT1QSTGG / F28 / T1 | states.jsonl @8530260417 +41595 | fc56ac140c547c303ae48f80897b7eabe8592843be09fe1fae0d2b5971410467 |
| E441 | YF0LXT1QSTGG / F29 / T未知 | states.jsonl @8531229323 +25820 | aab8ba78ba9eb2ae8c2f190bbb1c3b2a41690e67b06eb68e3c383a2d4c0c5aa0 |
| E442 | YF0LXT1QSTGG / F29 / T未知 | states.jsonl @8531255143 +24949 | 4c6e67023cb9c1e3a399a5e5707595c28246584f779eb92629e5a0e377f00875 |
| E443 | YF0LXT1QSTGG / F31 / T1 | states.jsonl @8531519592 +42480 | ab80910165c56bac2f1c1b73eb6fe58f8cf9bfee21c8c099742122cc21fd83b3 |
| E444 | YF0LXT1QSTGG / F33 / T1 | states.jsonl @8532991879 +43098 | 75e34e698d59bac796c7544c1c220a8c0b493b235b5de60bc4e2c3a3becacfd2 |
| E445 | YF0LXT1QSTGG / F33 / T未知 | states.jsonl @8537387486 +45932 | d97e75ea62ce5df1e07ed10bb53b8179f003518f8efcae40b9bd651f2bb9b579 |
| E446 | YF0LXT1QSTGG / F34 / T未知 | states.jsonl @8537433418 +29716 | 63a99baaf2c1abf0d5b5f425a910542f3f081b32d5de0f3d44be08e198719656 |
| E447 | YF0LXT1QSTGG / F35 / T1 | states.jsonl @8537576673 +46087 | 13c59087aedcb1d1cfec011f2f4b0e7ad838115ea8dd92e7260515441981625a |
| E448 | YF0LXT1QSTGG / F36 / T1 | states.jsonl @8538657259 +45955 | f5bfae6cac611923787adf39d34dcbb80047bab64b013bd469accc932e08518d |
| E449 | YF0LXT1QSTGG / F38 / T1 | states.jsonl @8540179212 +47349 | b22b11c7b3d03b7cefd94d3140fcc00bae84ab910d73410b2b213aa04ce87542 |
| E450 | YF0LXT1QSTGG / F40 / T未知 | states.jsonl @8542041621 +30079 | ee3307adc148a2c8f290df0e0e09e2bf6225b747ec1b81b98c20a88bc6ed43d0 |
| E451 | YF0LXT1QSTGG / F40 / T未知 | states.jsonl @8542071700 +29208 | a157a86be6a301d422cd897bc79b213aefa5d08574fb19670f8a3774204a0ed5 |
| E452 | YF0LXT1QSTGG / F42 / T未知 | states.jsonl @8542285579 +30334 | eec382f6e8377d39497aa91c653c8241ae9e1bd36af8cbf4e2570da486862ad3 |
| E453 | YF0LXT1QSTGG / F42 / T未知 | states.jsonl @8542315913 +29463 | c52fa97d30d292a5f0548cd00808882189c31bf729514aca1ddc16a5b6aa8bc1 |
| E454 | YF0LXT1QSTGG / F44 / T未知 | states.jsonl @8542702439 +30428 | e013fbfd4c75e2afcbbec4d36b1bda6e0f1b4d02c3c1a7989afa87d3cec93ed3 |
| E455 | YF0LXT1QSTGG / F44 / T未知 | states.jsonl @8542732867 +29997 | 51a4fa4f8e6562e387d86ae6722afdbc6761d66cb762240c65d80fea58c6b948 |
| E456 | YF0LXT1QSTGG / F46 / T1 | states.jsonl @8545103418 +49675 | c43978be3cdb4adcf26264b2155405e18902e69be3ba2f43451fde95c56027e3 |
| E457 | YF0LXT1QSTGG / F47 / T未知 | states.jsonl @8545734575 +32010 | e4641b26eefcaacc69bc7d1a828a591e62a1530a2d12fcbb8c9d3ac268c6f80d |
| E458 | YF0LXT1QSTGG / F47 / T未知 | states.jsonl @8545766585 +31615 | 0330291de625e771f0e6fb46af2c5f33a5baab372b6ac5e616b574dc911bc37c |
| E459 | YF0LXT1QSTGG / F48 / T1 | states.jsonl @8545969060 +50456 | 16716ca3ccd12a2cf6b8b81e825063ab48cb490a715f6152a649ecd9d55f62fb |
| E460 | YF0LXT1QSTGG / F5 / T2 | decisions.jsonl @683540143 +10338 | 98243d5d3696015a0992523907a9670a6d493500423f44a773c3a229aa53288f |
| E461 | YF0LXT1QSTGG / F11 / T1 | decisions.jsonl @683824393 +9301 | 04910557b8c31a11ce38f8331fa8b7412beec98911130986fe625aa56bdb0347 |
| E462 | YF0LXT1QSTGG / F19 / T1 | decisions.jsonl @684322887 +8584 | 69eb85b42ead14a3c416d8fac7ecba039c82f10e51e6639680d2529c4c7aa1bb |
| E463 | YF0LXT1QSTGG / F22 / T1 | decisions.jsonl @684423277 +9778 | 462255e14950e6e8ed02dacccbf03062204cb4d613b2272ce87fdd214070ab39 |
| E464 | YF0LXT1QSTGG / F24 / T1 | decisions.jsonl @684601908 +7646 | 0248eefef4abcb11d90b1130ee4ab5e47f0bfaf357562eaf07d60c856aacdab5 |
| E465 | YF0LXT1QSTGG / F28 / T1 | decisions.jsonl @684942323 +7561 | 807e4eed395e0f3facb78d8c940f3c66cf511bb62197de7f1e53cebff0b05ed3 |
| E466 | YF0LXT1QSTGG / F31 / T1 | decisions.jsonl @685056686 +14070 | 1038191d6f2d8c0c6e5dc031d73e952020e6e847797d86f2bfcf99e0a5ec220c |
| E467 | YF0LXT1QSTGG / F33 / T7 | decisions.jsonl @685342366 +4631 | a2e7219417b78d5123fe4e5229c1108f089fb403814eea1fb8b605c6d2a33761 |
| E468 | YF0LXT1QSTGG / F33 / T1 | decisions.jsonl @685393693 +5376 | a07675fca17811f0fb697c1ba73425571f114246f9ddac68aaf50da7627a4a0e |
| E469 | YF0LXT1QSTGG / F36 / T4 | decisions.jsonl @685741346 +4427 | 6848b9af04876734e6968242608588e7bcaf812bca15d4d58ebddf0ca045496f |
| E470 | YF0LXT1QSTGG / F38 / T2 | decisions.jsonl @685850566 +1480 | c546ab0fd9a80847580e33f4c11f056de2c0646403671276bc17dde2de14796f |
| E471 | YF0LXT1QSTGG / F45 / T1 | decisions.jsonl @686163086 +1603 | 53a2897e986ed07c30561cdbafd5f5daa5098d47a6ee7b2d2b19db8736e0df3f |
| E472 | YF0LXT1QSTGG / F46 / T1 | decisions.jsonl @686347274 +1537 | eaeeb4839e34161f88db1f75c2fbc79c477e805e95e948a2f469cc552cacde33 |
| E473 | YF0LXT1QSTGG / F48 / T1 | decisions.jsonl @686464879 +1473 | 751a16776dce7d59a251b81654529d5ba968d5e02074a12c6e019508a269e142 |
| E474 | YF0LXT1QSTGG / F48 / T1 | decisions.jsonl @686551602 +1473 | 6eeb43516f99c9316db9d224d211feebada5142c49b3f5e1b787cd34415c693b |
| E475 | YF0LXT1QSTGG / F48 / T1 | decisions.jsonl @686652123 +1549 | e81fbeab119b711bad4d8460dd21240c128dd810f3990634570fe59a9f2a745c |
| E476 | YF0LXT1QSTGG / F48 / T1 | decisions.jsonl @686778956 +1549 | 69cc50967a1fec412e5cba2116b9ff86ea7aa77785e67fc90854227afaf04928 |
| E477 | YF0LXT1QSTGG / F48 / T1 | decisions.jsonl @686906528 +1549 | b5092b74150971d93b20aea14b3e7efa157dee815b65939c0c3833d393cddc90 |
| E478 | YF0LXT1QSTGG / F48 / T1 | decisions.jsonl @687013715 +1549 | 8b81f1d0938ba62b89aa22863750b89f374ecad8df49b380984c2c5b9de602f5 |
| E479 | 1LMBFGSMCWKU / F2 / T1 | states.jsonl @6689671124 +14670 | 6410876547a7d6ff9f7962b3c8a1169f43567e3500e4f72530e1f529637c9b4c |
| E480 | 1LMBFGSMCWKU / F2 / T6 | states.jsonl @6690078415 +19974 | c28d7bb1e16d449e522dfe0383f5c69e3e52ef9764b1f4c853073a3e6144b7c5 |
| E481 | 1LMBFGSMCWKU / F4 / T1 | states.jsonl @6690259254 +16496 | 9f3527bc7e263a289863dbaf64b3c1486ccb4876ad07469b92b04f76057f3971 |
| E482 | 1LMBFGSMCWKU / F4 / T2 | states.jsonl @6690410672 +22752 | 106597a677ed3c53f95d282b4fd092c0da3381b22f34436a543533d1332da058 |
| E483 | 1LMBFGSMCWKU / F5 / T1 | states.jsonl @6690526324 +17027 | c9d9791310ca3b9a08f63a93da40fac1c802293ba6bcd56fa1e3810998fd7136 |
| E484 | 1LMBFGSMCWKU / F5 / T4 | states.jsonl @6690835336 +21025 | dcf34798704362953c0feff0f63efc722b27d477683221ae645b304f7eeb7b4c |
| E485 | 1LMBFGSMCWKU / F7 / T1 | states.jsonl @6691031034 +18300 | 9e1f5971aff591b6caf08a94e469f69acc2ffc472757395aebf3110274fbef89 |
| E486 | 1LMBFGSMCWKU / F7 / T5 | states.jsonl @6691512599 +23052 | 214781dc73e6cd1415ded30242dd4bb94d01e9870c124482e0f1aaf5f71f68e5 |
| E487 | 1LMBFGSMCWKU / F9 / T1 | states.jsonl @6691721030 +18341 | 24597bc7181956be3a36a4e56bc55c1ca7146ef919ed66b46ad4d1a7e1885c9e |
| E488 | 1LMBFGSMCWKU / F9 / T3 | states.jsonl @6691950692 +23683 | b6087a808916789b691cd3d0cdb47c48a120ec16f3a8bfb89653998f200c6e36 |
| E489 | 1LMBFGSMCWKU / F12 / T1 | states.jsonl @6692221685 +19922 | b55e56d1b1bbeabddbb3f07c0f1497ecfa3d7c8c740adb925162cb1f01175f50 |
| E490 | 1LMBFGSMCWKU / F12 / T7 | states.jsonl @6692907176 +24859 | d266ca3d720afcc674690375612e17a57fd4afc7fb2635a33bbaada62081e568 |
| E491 | 1LMBFGSMCWKU / F14 / T1 | states.jsonl @6693175863 +21563 | 09d3bc5b2b17e48a428b94c7847f22d4ad2b6fd45d2d430139b19e4c73e44ae5 |
| E492 | 1LMBFGSMCWKU / F14 / T1 | states.jsonl @6693255676 +29407 | 47ef639de443159862a8bc88944683044e032f0a59199a181d134b871576e61b |
| E493 | 1LMBFGSMCWKU / F15 / T1 | states.jsonl @6693420283 +24895 | da47ac77d94a8661187d4582cf0b8ec6b8b9bddd965c7292599b0d88151b1dcc |
| E494 | 1LMBFGSMCWKU / F15 / T9 | states.jsonl @6694526129 +30241 | 16fd5773b2cc2e4de609f71d1de7366b0909c0f106de7012187de3124a488d1c |
| E495 | 1LMBFGSMCWKU / F17 / T1 | states.jsonl @6694795755 +24498 | 5500adb4baef525c05d705df25093bdec0b96b8c8cb092f5fefb837ddd0448b1 |
| E496 | 1LMBFGSMCWKU / F17 / T10 | states.jsonl @6696140305 +25062 | 92137fa26a17686a8ef7843e2073d255d8cabf8705f0491d434f5230a044e55d |
| E497 | 1LMBFGSMCWKU / F19 / T1 | states.jsonl @6696391536 +26096 | b7d1fb28f6a16baac82e3b5a9feefafec2855c8ff7f0cfc88abac286bf91b55a |
| E498 | 1LMBFGSMCWKU / F19 / T3 | states.jsonl @6696797190 +30193 | acda176c89765ab2f5f979596a9743fe83e4af69f4225f415380ea446798a03f |
| E499 | 1LMBFGSMCWKU / F20 / T1 | states.jsonl @6696957631 +26049 | b91a470a5a356f8448fd3d77c7d004189bd5183b291a32317cb67b655237bdc8 |
| E500 | 1LMBFGSMCWKU / F20 / T4 | states.jsonl @6697466070 +29882 | 540020b2de8d1d093ce734e0d20e8201b2d14e8550637b69c51e5d7d7d566b0e |
| E501 | 1LMBFGSMCWKU / F21 / T1 | states.jsonl @6697672408 +26467 | ff30b91bccbb80417df3432056bfc856d630a59b68660b20b4ea02c1aff63a10 |
| E502 | 1LMBFGSMCWKU / F21 / T3 | states.jsonl @6698262714 +34967 | 61994ff2eae9df92dbd0fdf727df3813477979217945441daa9993b82a06f1f9 |
| E503 | 1LMBFGSMCWKU / F23 / T1 | states.jsonl @6698650636 +28960 | 8a41f33b746d06a67ce8ac30efebf554c7c6e98ed76bbef3a61bb9bf9ae27068 |
| E504 | 1LMBFGSMCWKU / F23 / T2 | states.jsonl @6699022202 +32191 | 695c7e15f67d8d8f437b93864aa1596e98bcd04479f832e33094a58fe368f1a2 |
| E505 | 1LMBFGSMCWKU / F25 / T1 | states.jsonl @6699279490 +30442 | a73bdb96690550404380736711b55f1ee289747921b70e24718cb32a3daef791 |
| E506 | 1LMBFGSMCWKU / F25 / T4 | states.jsonl @6699934777 +34729 | 683fcf6e875d23fbb7d09da7d1894f64a0f767ebba52a5dd818ea58bf99d5073 |
| E507 | 1LMBFGSMCWKU / F30 / T1 | states.jsonl @6700612316 +31553 | 11c1c37b2de394efd66c3b9247e57dc2fea8fc74c74d38feb21ea972534f4f3b |
| E508 | 1LMBFGSMCWKU / F30 / T2 | states.jsonl @6701035874 +32465 | 5acac4360617e722443cb5ba6fded3d8483bac553accff8cb379e39dcf1b7545 |
| E509 | 1LMBFGSMCWKU / F33 / T1 | states.jsonl @6701566816 +32267 | 591837ccc68f65bc8835ccaf0062e2b16a13112a296bc1df777851004dff074c |
| E510 | 1LMBFGSMCWKU / F33 / T10 | states.jsonl @6703057372 +36830 | f6c8d9d556a26e6e1e45bd7b27ed842f6d3fbaacebec417e2607ec12333c2398 |
| E511 | 1LMBFGSMCWKU / F35 / T1 | states.jsonl @6703334536 +33137 | 3e0ea232cc2270e35270120b341b343b12075de97f4c12fb7fca5e333143d88f |
| E512 | 1LMBFGSMCWKU / F35 / T3 | states.jsonl @6703719217 +39925 | ad4a211c291a571b1b6d0400fb86ce3c1fea45b20c7c73085e3b2d9b322eb310 |
| E513 | 1LMBFGSMCWKU / F37 / T1 | states.jsonl @6704037364 +34743 | 5430746327cb169d65ce70dc4355ca6e0c27830c2a8c961eff4afb7ff6cc20c3 |
| E514 | 1LMBFGSMCWKU / F37 / T1 | states.jsonl @6704199106 +42644 | 7a50e25c09c1dbdb5a289e38fbdc371b43168e2d1f72ac6903837484d89ee257 |
| E515 | 1LMBFGSMCWKU / F39 / T1 | states.jsonl @6704527568 +35747 | 879c3b80d9f6d4ac6b387425fa0ef79c723f1152a95f963d6e0a55a880ebb829 |
| E516 | 1LMBFGSMCWKU / F39 / T4 | states.jsonl @6705563817 +42534 | b4a170d3ac5d6b59f4326c9854a2fc425d7626968cca59e4d86a0bbba616ef97 |
| E517 | 1LMBFGSMCWKU / F40 / T1 | states.jsonl @6705770069 +36837 | 6b2bc8680863514088140dcda8d22f1c4cf2ab941266cf04b5f6803d73cd8531 |
| E518 | 1LMBFGSMCWKU / F40 / T1 | states.jsonl @6705940002 +43710 | b369ce1813717ae948fa3322f70232455d6f201bb7285db39a6d790d0835013d |
| E519 | 1LMBFGSMCWKU / F45 / T1 | states.jsonl @6706826526 +39124 | cd4853a14a828f06c872f6d7b3c2ea4aa4f297cd190af8a3ceb6ca338965f2b0 |
| E520 | 1LMBFGSMCWKU / F45 / T4 | states.jsonl @6707827985 +44197 | a5028917cff58915ef73da692848196dba143147b49df0e1d0a81fb22cd66783 |
| E521 | 1LMBFGSMCWKU / F11 / T未知 | states.jsonl @6692157142 +15515 | ff7bcec82c7bcd08cdc9686e2f34f2cd790a32148fd45ff4c60a2a70c924d229 |
| E522 | 1LMBFGSMCWKU / F11 / T未知 | states.jsonl @6692172657 +14644 | 1e660125238e5a60f256c589bbfdcac4d461ec64701573c76a0e8bbc9b0d8e58 |
| E523 | 1LMBFGSMCWKU / F16 / T未知 | states.jsonl @6694719973 +19272 | 8e75117aa8cd7c9534690690a703f842629007d4d9f48856d25e4507f727ab6b |
| E524 | 1LMBFGSMCWKU / F16 / T未知 | states.jsonl @6694739245 +18401 | 71c67dba30f5791531dcf0d8b7a5919ab63d8743fa21b0f97813c2bfcac5003f |
| E525 | 1LMBFGSMCWKU / F17 / T未知 | states.jsonl @6696271145 +39734 | 2a9de375049b96df04a416294988733a7ced21beecbf176f7e9e0af5500a742a |
| E526 | 1LMBFGSMCWKU / F18 / T未知 | states.jsonl @6696310879 +20913 | fc401dbed817127c48c1618f94f0c5584d4bf183587811cfbf3d1a6e374f5ce9 |
| E527 | 1LMBFGSMCWKU / F24 / T未知 | states.jsonl @6699194379 +21865 | 3500ad6c5cb655f8fe046ad6b6b685c8cd4f0ba70083c9ace540351500e7d372 |
| E528 | 1LMBFGSMCWKU / F24 / T未知 | states.jsonl @6699216244 +20994 | 1befab5c99e5a5ac92d8043c8b1697ac3165f96c64504227e7188f214e496f9e |
| E529 | 1LMBFGSMCWKU / F27 / T未知 | states.jsonl @6700258282 +22451 | 84f2812e257a7114bd8b3bde1520da200dae98dfc291e7e8ec0c7d5755ad7148 |
| E530 | 1LMBFGSMCWKU / F27 / T未知 | states.jsonl @6700280733 +21580 | 644842a24f15b97c07c99591bcd627ecaf8b78be679ac1acf7d248c0f3f30d86 |
| E531 | 1LMBFGSMCWKU / F30 / T1 | states.jsonl @6700643869 +37805 | d07dea62acd1fa58c8b1e1e232d855b80ac19cb362eb3c5c64fdc3f381da31dc |
| E532 | 1LMBFGSMCWKU / F33 / T1 | states.jsonl @6701599083 +38358 | 1255eea333b1beb33c974e26b3c08452f11ecdfa19aa20df2a796618bed70af8 |
| E533 | 1LMBFGSMCWKU / F33 / T未知 | states.jsonl @6703202204 +40430 | 2be5212558b49fa50976d4df2e30e12e208e4ff948385abcef9164c8b2ceb415 |
| E534 | 1LMBFGSMCWKU / F34 / T未知 | states.jsonl @6703242634 +26171 | bf4657453efb2e2c2c720462550d3f29fba00b7a9ed9b5c60facb8be350048a7 |
| E535 | 1LMBFGSMCWKU / F35 / T1 | states.jsonl @6703367673 +40387 | e18a013d9503f62f3072cbd11aff7fe1fac4150a3583134127152ffd71de0761 |
| E536 | 1LMBFGSMCWKU / F37 / T1 | states.jsonl @6704072107 +41417 | c7af414dd882414429f7892c15d31ef8568251d7b5f07a57f76a1a6f80f83d9b |
| E537 | 1LMBFGSMCWKU / F39 / T1 | states.jsonl @6704563315 +42841 | 3baf063880d5673f2643cea09cb49f0d82c43bf41dfde3523682e4b8c3668e42 |
| E538 | 1LMBFGSMCWKU / F40 / T1 | states.jsonl @6705806906 +43470 | 15dc282031120bcbef6e7a73dff8bdf3014370d57deaa7004315544a16dc0079 |
| E539 | 1LMBFGSMCWKU / F44 / T未知 | states.jsonl @6706723793 +29372 | a9b2de6dfc524009d3e53f5659dd551a9323a40975210903033ef9a567684eb9 |
| E540 | 1LMBFGSMCWKU / F44 / T未知 | states.jsonl @6706753165 +28501 | 3a3f22c15116347a68c345433c0b8a7ccaae4af8f493ad7f12c641c0329822bb |
| E541 | 1LMBFGSMCWKU / F45 / T1 | states.jsonl @6706865650 +45580 | 1951befd9b0063ec10b13cd43c81b7fac026b908aa172a82c05d14fd1d02f091 |
| E542 | 1LMBFGSMCWKU / F48 / T1 | states.jsonl @6708376630 +47893 | f455a20bc1efd86d80d49180da0e7f411afec6bdaf8640d9696295313e2025d7 |
| E543 | 1LMBFGSMCWKU / F48 / T11 | states.jsonl @6710992631 +32039 | b55b5be660810c29328e009aa9483efcbaecb387a44e111aab3afdb0736f88ba |
| E544 | 1LMBFGSMCWKU / F7 / T1 | decisions.jsonl @500669047 +7812 | d44c07d7c82cbfde487409e456136c2354ea3c32c22fff864b2a5f158f390d4c |
| E545 | 1LMBFGSMCWKU / F14 / T1 | decisions.jsonl @500909681 +6853 | 1a0cc39b4efb6f77603cd5e47999478e3a8c6b4ad03be1c6d3e7ff7dc411bc2f |
| E546 | 1LMBFGSMCWKU / F17 / T1 | decisions.jsonl @501163749 +1566 | 37b2afd35f5d403778148651b5b58d28dc7db0c57ce1e4809cc8c91f7f70cf59 |
| E547 | 1LMBFGSMCWKU / F17 / T1 | decisions.jsonl @501171709 +6112 | cca6470945f8124f60da86a000bd76fb7531917b5b424487ba6287b8fc3a822d |
| E548 | 1LMBFGSMCWKU / F19 / T1 | decisions.jsonl @501321089 +1450 | 2e0b8586d11d8e879c138a11cd8e03469eb43829ffdff89ec65b13059bc11d24 |
| E549 | 1LMBFGSMCWKU / F33 / T1 | decisions.jsonl @501887277 +1550 | 129b8dd7c207bc99a20ba6063f12ccf8575db118caef719b8dd1a701e9b4e515 |
| E550 | 1LMBFGSMCWKU / F39 / T1 | decisions.jsonl @502189582 +7390 | 71ca6f1adccedb4bf8260f3fb8f738200fbc6d5ca1b298eeed733d5ab8d427cb |
| E551 | 1LMBFGSMCWKU / F45 / T1 | decisions.jsonl @502356626 +1527 | 82cab8e31e91d9006dfdb165967c40663446ce1aad92c3de771c15f1d8f6f086 |
| E552 | 1LMBFGSMCWKU / F48 / T6 | decisions.jsonl @502646615 +1697 | 7bfbe550608e714cab3ba6ea9c99d3c25e93d114cedc3e4fd265eb50f34798df |
| E553 | L704TLETMZBM / F2 / T1 | states.jsonl @7827032359 +16859 | f9bea3a2fccf0a9e610c385672d65432acf71c19cc41627a4660440c1935716b |
| E554 | L704TLETMZBM / F2 / T6 | states.jsonl @7827549317 +21621 | 0b5e1005ae9b1044192e858af9aa80d50cd812920356bb4f5ace993eca9f50a5 |
| E555 | L704TLETMZBM / F3 / T1 | states.jsonl @7827669792 +18598 | 2b907097c901198b0610e9239d09500d00ee816304dcc6f097a53bd4b8ebaa2b |
| E556 | L704TLETMZBM / F3 / T5 | states.jsonl @7828139444 +21358 | 9d7730e98d0e3582417abfb6b625ca2414441f444a07b5175ebaa291007940bb |
| E557 | L704TLETMZBM / F8 / T1 | states.jsonl @7828809318 +27316 | 95e2e953ea93d961097c60f447372930a8a587c63fc5adc47ec80b0570776b79 |
| E558 | L704TLETMZBM / F8 / T4 | states.jsonl @7829446262 +31343 | 3393cabfdc44fa75d3ba5d11590d98413448763d8945c85810ef385b1b26fe04 |
| E559 | L704TLETMZBM / F11 / T1 | states.jsonl @7829849357 +27146 | beddf15819e36e437b4ec56dddf404a7ddd50bab64a81f1cf30fcab363da81f6 |
| E560 | L704TLETMZBM / F11 / T3 | states.jsonl @7830195309 +30758 | cda1adf0fc8047d04cc701dd476843bc7bbbeface3b400579eaa223cfe3ba1c8 |
| E561 | L704TLETMZBM / F14 / T1 | states.jsonl @7830602299 +28633 | 034c7bbc2538dc3ca5e72221e497ce2cc4493fd0c94c4ec0160b2c23df7e1faa |
| E562 | L704TLETMZBM / F14 / T4 | states.jsonl @7831156518 +31042 | 80c721d856377f2e3e02de35e8837a508a588080d31b887d98088891fc192f08 |
| E563 | L704TLETMZBM / F17 / T1 | states.jsonl @7831638217 +30106 | 6da63332459845c3ceb380e2d4f23570b24cc6dc2cef2cb9da2608e5fb1ed616 |
| E564 | L704TLETMZBM / F17 / T10 | states.jsonl @7833391676 +31537 | f999ddccbb5b3b293360a136c8f68271aee83f4c89d6f7de93bf427c1e38572d |
| E565 | L704TLETMZBM / F19 / T1 | states.jsonl @7833646615 +31108 | 8e91c90b4bae21f103acaa11bde639a2cf38d5b65b260e1595d8b84ca13f0025 |
| E566 | L704TLETMZBM / F19 / T4 | states.jsonl @7834333021 +34161 | 1a71dc2446e0af626f26f01c9615294ee954320104e25e3c862cafe0a2eab0d4 |
| E567 | L704TLETMZBM / F20 / T1 | states.jsonl @7834536007 +32127 | 604293379670ff65bc97ab4d9726b5a43591fd628dca21f52cb501eeefa82f38 |
| E568 | L704TLETMZBM / F20 / T5 | states.jsonl @7835510964 +34796 | d1a0d266f3d8611dd6c7d2d11697af71a50b2ee217e482167aba95f9d6644b02 |
| E569 | L704TLETMZBM / F25 / T1 | states.jsonl @7836334749 +35268 | 548eb8c1a3986fab4f342d7b9de8960dfbff6d7ae437ba29f547772244dfeec5 |
| E570 | L704TLETMZBM / F25 / T5 | states.jsonl @7837254169 +40461 | b056e815f79b24963371b4f27c7769b4d1736b52ff85b98112fad0030798bc26 |
| E571 | L704TLETMZBM / F28 / T1 | states.jsonl @7837738863 +36751 | 708bd610eac94605e9cbdd7986f173da4da86e91aef5d48120ad13a01166a8e2 |
| E572 | L704TLETMZBM / F28 / T6 | states.jsonl @7838871955 +38737 | 3c631e98bbe97168d528bdab7573b7e60f7fbc71c48ffcd082fb5024b81129f3 |
| E573 | L704TLETMZBM / F31 / T1 | states.jsonl @7839570661 +38587 | b6a744a57d204b5b505fb9613e612579849f89834a6fec5051d19f6ef5f9252c |
| E574 | L704TLETMZBM / F31 / T10 | states.jsonl @7841369756 +42824 | 861b6bdb7d7bd658dd941a7f729f29380bc7e403814884363c6e46680debbae2 |
| E575 | L704TLETMZBM / F33 / T1 | states.jsonl @7841807608 +39904 | 5d540fa77f6cec4357ebd2741d17d49df816a50f1b96226f331ea2a421a04ca8 |
| E576 | L704TLETMZBM / F33 / T9 | states.jsonl @7843883909 +43616 | b296a0fedcb6db2264b6f191851e3240b0500c8963a10dccd33db494f424af1b |
| E577 | L704TLETMZBM / F35 / T1 | states.jsonl @7844241502 +40213 | 484c97e08aa43cb08d9e71eb3e9e3958ad740505242d182995c4c1278f7cbc43 |
| E578 | L704TLETMZBM / F35 / T1 | states.jsonl @7844281715 +47004 | 9589ade96f302537239194191992318e79948a8128067feea024d919c2631f22 |
| E579 | L704TLETMZBM / F42 / T1 | states.jsonl @7845699065 +43709 | dd47c355c8647ede12e125083bcb9baa67d3c56958e31c6bcba6bfb22b6c288b |
| E580 | L704TLETMZBM / F42 / T7 | states.jsonl @7847878518 +46826 | 881bb3b70f7e881679b385ff9b56a9a63ae89594a48393d85a6caab7bfdc1cff |
| E581 | L704TLETMZBM / F44 / T1 | states.jsonl @7848457267 +45415 | f4c947e83d8d6fb60840b62c57998c496160037fc8193bc842ff789e1a6439be |
| E582 | L704TLETMZBM / F44 / T8 | states.jsonl @7850771650 +52105 | 9165e628d69fdfb6249f2878fb7506afdf62bdd693727dcec88516e5a0c5d69a |
| E583 | L704TLETMZBM / F45 / T1 | states.jsonl @7851138647 +47904 | 7f9050a5d6ea47c49e4b40ea675f017703ee1525f4a1776ec84be9d881cdee55 |
| E584 | L704TLETMZBM / F45 / T5 | states.jsonl @7852571770 +53667 | 8d1a175b7aafc754dd819aeff53ba0f89ff5ecab60e39aae2deb2f6aad46fa81 |
| E585 | L704TLETMZBM / F46 / T1 | states.jsonl @7852870971 +48133 | 0e14b550fc81ee3f1fa0c99f1a40e972106238d79b814f454a9737b43a5844e2 |
| E586 | L704TLETMZBM / F46 / T5 | states.jsonl @7854419877 +51921 | faaf1337153ec1bdab4cecbbffaf7333413e9945a0abd9059a6c26be35b31247 |
| E587 | L704TLETMZBM / F48 / T1 | states.jsonl @7854880131 +48513 | 7d5087a1eb7ff045685c127c077adca22eb23543067fd68424aba869cd4f8c30 |
| E588 | L704TLETMZBM / F48 / T6 | states.jsonl @7857006986 +51988 | 544334c42e2e5c477e0f8030d0c85e496907c2ac721ab03ee12ef0f1bad03635 |
| E589 | L704TLETMZBM / F48 / T1 | states.jsonl @7857058974 +57013 | 305c925f1d077f4f87e1bed49df864359e096f0c34fa2b0088403ed650014307 |
| E590 | L704TLETMZBM / F48 / T7 | states.jsonl @7859443019 +54243 | 937cc1c02772412e7b89ac5241ad01bcc332c3125a10f2bef53992d43a8ed9e4 |
| E591 | L704TLETMZBM / F48 / T6 | states.jsonl @7861774995 +50983 | 18a369054334b107c091569a58d7c39f88d6cce610a98005bc9b91cf3b399a65 |
| E592 | L704TLETMZBM / F7 / T未知 | states.jsonl @7828734546 +18954 | 080bc60ec586dc61afb19ae38804ddb6026c8b755402a1aded20204c7562cc83 |
| E593 | L704TLETMZBM / F7 / T未知 | states.jsonl @7828753500 +18083 | 01ab2c244ecb50788122bcd9e7c60d3c40e16398d6b189f4787ac7e472655627 |
| E594 | L704TLETMZBM / F11 / T1 | states.jsonl @7829876503 +33699 | ce6b0a16ebc6f56e80b0929e79e9bf631fca6059800a8af0d5c7ffa66607d228 |
| E595 | L704TLETMZBM / F14 / T1 | states.jsonl @7830630932 +34832 | 53b88e85cbde711e8dc4fbc8c653207821c803bd32bd57608225b2b4f6bf476a |
| E596 | L704TLETMZBM / F16 / T未知 | states.jsonl @7831507551 +22599 | 2e5df7d0326f1af5722cc91d7947af635c2f700d6138267e471d9f76aadafb1e |
| E597 | L704TLETMZBM / F16 / T未知 | states.jsonl @7831530150 +22150 | 69c629406f3ee350921bf879987ec3f1e13065fb6a08df24eb0e7ddc94055ec1 |
| E598 | L704TLETMZBM / F17 / T1 | states.jsonl @7831668323 +36475 | b8cd74b292e8840672247d0c8c718e12f6151f979929511abafe52eb299769cf |
| E599 | L704TLETMZBM / F17 / T未知 | states.jsonl @7833522484 +38078 | 9725c5c3d80828811530fcdb56aef55a7381e7ba6dd1ab59e483117d8d59ba77 |
| E600 | L704TLETMZBM / F18 / T未知 | states.jsonl @7833560562 +24541 | 294db2de87f881172cb3d67e7fa67de1231d72f517702965351f6566d802dd24 |
| E601 | L704TLETMZBM / F19 / T1 | states.jsonl @7833677723 +37211 | 2def6c4aae7c3782dbc10e95f8c7c6b1675470395f52e17cafce8ce42104516b |
| E602 | L704TLETMZBM / F20 / T1 | states.jsonl @7834568134 +38240 | 7c70d654faee41cb5275ca048c132acae6998c2ced75f5cd8f8a53a829d01a90 |
| E603 | L704TLETMZBM / F24 / T未知 | states.jsonl @7836188059 +26396 | e6de0ae21d1dd18bc2dc4db25ea2c352301830185305c50b82e6fcf7bdd811ef |
| E604 | L704TLETMZBM / F24 / T未知 | states.jsonl @7836214455 +26004 | 1f434d8f8309dde376928fbd05886455b24e4426a98a795cad706453d7e197ff |
| E605 | L704TLETMZBM / F25 / T1 | states.jsonl @7836370017 +42321 | d7b684af4f5e5c953123c17c2e4918649fb8298794cb98ac543dbfd21d576138 |
| E606 | L704TLETMZBM / F28 / T1 | states.jsonl @7837775614 +43869 | ed3ea97190b5f42f11dd594cda117a1fb596221fef1ad7c4f79299f1cece180e |
| E607 | L704TLETMZBM / F31 / T1 | states.jsonl @7839609248 +44608 | 1e6b7649b9aedee78e04664711afa91f79e18b0eea28789b9ce2f6422e202576 |
| E608 | L704TLETMZBM / F31 / T10 | states.jsonl @7841569446 +47090 | 9f76fafa4229ab7f4350f3728badd73b8358df74bf54230f20d3aa22bd617bbe |
| E609 | L704TLETMZBM / F32 / T未知 | states.jsonl @7841616536 +29825 | 04d6ba503f46800376b45efc709c5bd0738bf9bdf7512506c4b9c59e30e3b728 |
| E610 | L704TLETMZBM / F32 / T未知 | states.jsonl @7841646361 +29578 | 0dd299261c2393d2e0db52d133390c96503f90cd70db07f63e8ddf054485ea67 |
| E611 | L704TLETMZBM / F32 / T未知 | states.jsonl @7841675939 +29065 | 69d2c1d3d5663c08cbaa72557fd95a9410a282d8d081f403a0cc9b17b2a77160 |
| E612 | L704TLETMZBM / F33 / T未知 | states.jsonl @7844087183 +45940 | fb388fc155cc44b12ad6f7cf596934ba4363f1d0ce7c58faff5d24bc9878aab6 |
| E613 | L704TLETMZBM / F34 / T未知 | states.jsonl @7844133123 +31435 | 89f0abbae79054313d888fd9c11aa241fa3d32107908259b90a1139a9c824896 |
| E614 | L704TLETMZBM / F39 / T未知 | states.jsonl @7845322364 +48625 | 722099433316f2d31a0e081406cf4ab3226b55d256109c5824ffadda6457d395 |
| E615 | L704TLETMZBM / F40 / T未知 | states.jsonl @7845370989 +33090 | c236a99db818c15a13b0e055bda0c59358116a3417a29b088eaa02c1bd85e84c |
| E616 | L704TLETMZBM / F42 / T7 | states.jsonl @7848216288 +52660 | ebe61cd973717d1fd8b9869373df575b5b4ffa95ec585ef589a1d4190a0af65c |
| E617 | L704TLETMZBM / F43 / T未知 | states.jsonl @7848268948 +34803 | abdfe4e3535ef91cd0bc85bf772cde17f7a1a6be9975ea61aa5bcf1704d92e97 |
| E618 | L704TLETMZBM / F43 / T未知 | states.jsonl @7848303751 +34290 | 48c90c044f0c4f618b1b4bf7eff624f90d27260567ef7720cdfb26c61c4f43a6 |
| E619 | L704TLETMZBM / F45 / T1 | states.jsonl @7851186551 +56068 | bbdc2124c2a30531b60fa1eaaa3d966b5bf857eec795dda4f71b3f1ae435ba14 |
| E620 | L704TLETMZBM / F46 / T1 | states.jsonl @7852919104 +56592 | 8c0d7d6da5cdd8cd2430f86342ddf219de91b9273948849c8b2ca28a0ceed9c8 |
| E621 | L704TLETMZBM / F46 / T5 | states.jsonl @7854626609 +54587 | f6bd6a79f519f7cd6eec1833983b0a60b5024bae556d12ae8218c3378f5ad8a8 |
| E622 | L704TLETMZBM / F47 / T未知 | states.jsonl @7854681196 +36920 | a48299a5090771af2f6944d8093dd1f86e9f47cf1e29fff8ddeb8ce4ded0b7b9 |
| E623 | L704TLETMZBM / F47 / T未知 | states.jsonl @7854718116 +36458 | 9a33466638e4590970e62deadae6b7a2d19db1e78f67675db7ffef577ca486bb |
| E624 | L704TLETMZBM / F48 / T1 | states.jsonl @7854928644 +57013 | 041b8a7e09cf6faae69d4dced4de68756476dfaae3392ace7e90cd1611859a04 |
| E625 | L704TLETMZBM / F8 / T1 | decisions.jsonl @611956610 +1653 | 1c92217497bcfbfd9a17d5222fe5a1555eb5b98a19f016eba1f20c6b6b43a431 |
| E626 | L704TLETMZBM / F8 / T1 | decisions.jsonl @611958263 +1666 | f05c3ec8e74ecbff6c8918b3341c15a2522311118e3dca4f940e0a1c04d0ecbf |
| E627 | L704TLETMZBM / F11 / T1 | decisions.jsonl @612080353 +1678 | b6741614ef2834d109d8b68f2e7bde17a3ef60cc88cb8f4906ef438923396c34 |
| E628 | L704TLETMZBM / F17 / T2 | decisions.jsonl @612335125 +1424 | ce7f8932a025becef3946ced26bf13d155604da0fe57c085f36c25b5b7e55cc7 |
| E629 | L704TLETMZBM / F17 / T3 | decisions.jsonl @612337858 +6178 | b888c609c8ba4dad43225ee49e866e353466c4804f6ecd964e72924681aaf018 |
| E630 | L704TLETMZBM / F25 / T1 | decisions.jsonl @612764161 +1531 | 9482742a662164b74a6ea54722436799e80c2019c8e501a53778d1e5538a5771 |
| E631 | L704TLETMZBM / F31 / T2 | decisions.jsonl @613095266 +16384 | b27a760c0c52acf92f9fc4c62e2958b0a4ea157aa939f5baca73571cbca7c3b9 |
| E632 | L704TLETMZBM / F32 / T未知 | decisions.jsonl @613246782 +15063 | 1498dabd681d92a1199cee0de56a8c9283863ee405c2545c7db07e83a347eb35 |
| E633 | L704TLETMZBM / F33 / T1 | decisions.jsonl @613301691 +15512 | 7c67d42b0f5fb9475a4085e3dd7cdf3fb415de62bc997b0f5ef840c6b71c6f98 |
| E634 | L704TLETMZBM / F33 / T2 | decisions.jsonl @613365328 +6557 | 620d94d4f0a8d0a3a8620b005b58f47d829f7949eb1a797ba37dcf2b74cffabc |
| E635 | L704TLETMZBM / F42 / T1 | decisions.jsonl @613675513 +21734 | 1b79cbf681b600c88096e244a3b4377659a42d635ec9801c631dffed00bd0f36 |
| E636 | L704TLETMZBM / F42 / T1 | decisions.jsonl @613793968 +1694 | 8a5c3b86d2a68b99a4182f9f9c8ce963f2c72d3768541937fae7830aad342adf |
| E637 | L704TLETMZBM / F42 / T1 | decisions.jsonl @613798957 +9083 | 5ffe48ec13a4e364fa1ad1c855d84c097517ce174eb7d30149a535ff7ec6af8f |
| E638 | L704TLETMZBM / F44 / T1 | decisions.jsonl @613939652 +13029 | 2e5ab92d405eceb55b76a08641c93cd937b43226d3e6eabf369af88a9948a6a2 |
| E639 | L704TLETMZBM / F44 / T1 | decisions.jsonl @613962680 +10317 | 3d5cf690f7f8e6d5351c9678894b2dfd182b5ad535a8e9d9669abcdd44bf3aa5 |
| E640 | L704TLETMZBM / F44 / T1 | decisions.jsonl @613985213 +9036 | fe3143e5a9b3f2594189bdd4c579b60341c3d7094de773d3699bdb41d59652ce |
| E641 | L704TLETMZBM / F46 / T1 | decisions.jsonl @614309379 +1656 | 5f38b799c67aaa7e9bdc873aa4502a0e48fac6fea0913f21c0eaeaf28f3bf43e |
| E642 | L704TLETMZBM / F48 / T1 | decisions.jsonl @614442077 +1651 | a6a42c2d3177c4af5987e116ee6e3803bcef375bd20d7004c4dee3095610e32a |
| E643 | L704TLETMZBM / F48 / T1 | decisions.jsonl @614447154 +1593 | 4ae819c71d3fae4752ca6435be130675dba67ef49915ca173158459af0d751bc |
| E644 | L704TLETMZBM / F48 / T1 | decisions.jsonl @614601682 +1651 | ed1410a98ef05b13468ebba63099d321d1e442b8a42f228225dce1cb7bfc77c2 |
| E645 | L704TLETMZBM / F48 / T1 | decisions.jsonl @614606759 +1593 | e419179f995652b1dc0e905ac0e7c5fcbf9016105e57debdd47a16c80cf05127 |
| E646 | L704TLETMZBM / F48 / T1 | decisions.jsonl @614846360 +1651 | 226adf5784a2753da73c55f25adb88988fb8ba538bfd681115fcaf6a7e18aef8 |
| E647 | L704TLETMZBM / F48 / T1 | decisions.jsonl @614851437 +1593 | 53a0283022fa2ad5202e6ce57ca0b0077265609c718444576b1b9c29cb00adbb |
