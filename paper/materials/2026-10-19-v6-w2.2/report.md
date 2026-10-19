# V6-W2.2：组合实战指标生成器

本轮交付离线生成器 `knowledge/builders/build-combo-metrics.py`、标准库计算模块、使用说明及固定数据测试。输入给定组合和冻结原始日志，输出兼容 W1.1 `build-core-v1` 的完整 metrics；没有挂入对局运行时，也不写正式知识。

## 范围与口径

第6节全部27个 observed 字段、每Boss到达/胜利/比例、逐牌逐幕供给和 simulation 槽齐全；按角色、进阶、原版本复合标签、首试/含SL分层。持有和实际生效分开；生效条件/贡献解释由学习者提供。逐局先汇总，不用回合、同局SL或多敌扩充独立局分母；给出样本数、分位数、误差、small_sample和未知原因。

生成器使用实际 ended runs、状态、决策和 SL summary，不回填最终牌组。原始字节截止、读取区间SHA、保留行的字节位置与SHA可追溯；学习者见证须重读原行核身份、持有、时序、逐牌费用。缺少激活定义或明确组合×局覆盖时不把缺失当作未成型。首试在第一条已记录判死、实死、重载或重试起点截尾，后续通关不能回填首试。F48赢而F49缺失保持未知，进阶无F49结构时不推定连战失败。

按学习者方法，只统计生效回合之后有完整下一回合就绪边界的HP推进，终结回合、缺帧、回血、变身或敌身份歧义被排除并留原因。可见格挡是正增量下界，掉血包含自损；多敌推进不能解释为群伤。启动能量仅为现场所需贡献施放费用，缺累计抽牌计数时抽牌量未知。规模斜率按同局同战斗类型OLS计算，仅观察相关；药水/SL/遗物依赖没有可比反事实时未知。完整用法和每个字段口径见 [combo-metrics.md](../../../knowledge/builders/combo-metrics.md)。

## 固定数据与真实只读对照

固定数据只用虚构ID，覆盖升级/副本/替代匹配、生效条件、执行动作身份、原始字节核验、首试截尾、SL去重、战斗窗口、终结回合、未知不补零、独立局统计与误差、实际字符串act_id、商店库存、规模观察相关。Python 31项通过；另有2项 Vitest 调用真实 CLI，验证输出能通过公开 `validateBuildCore`。

学习者 `v6-build-cores` 的 report 和计算产物出现后，按其操作定义读取快照，选独立局 `KAY522KT5NXR`、组合 `P-toxin-footwork` 的唯一原始复合版本层，重读原始875条状态（范围与SHA见输出），没有以开发者知识补牌或补机制。两种尝试层的54个observed、18个Boss统计及24个供给统计共 **96项**，`n/value/p25/p75/se/distribution/small_sample/unit` 与学习者更新后的快照均一致。这里只验收这一个独立局，不声称全部372局×全部组合数值逐项一致。

- [来源SHA](comparison-provenance.json)、[原字节重算输出](comparison-generated.json)、[最终对照](comparison-diff.final.v2.json)、[可复核比较脚本](verify-comparison.py)。
- 初次连战结构差异、第二次字符串act_id读取差异原件保留于 `comparison-diff.initial.json` 和 `comparison-diff.availability-failed.json`，修正后重新核对，没有覆盖失败原件。
- 学习者执行过程中更新了规模斜率口径；两个方法快照及变化核验均保留，生成器同步新统计口径并补虚构固定数据测试。更新后的 metrics 单独保留为 `comparison-metrics.v2.json`，96项统计数值与此前快照相同，规模斜率单位变更另记于 `comparison-metrics-refresh.json`。学习者的报告/结果状态只代表只读快照时刻，不能据此宣称正式入库、上线或学习父要求关闭。

复算命令（在仓库根目录，替换日志绝对位置即可）：

```bash
nice -n 10 python3 knowledge/builders/build-combo-metrics.py \
  --logs /home/dw/Projects/agent-sts2/logs --character silent \
  --spec paper/materials/2026-10-19-v6-w2.2/comparison-spec.json \
  --manifest paper/materials/2026-10-19-v6-w2.2/comparison-manifest.json \
  --run-inventory paper/materials/2026-10-19-v6-w2.2/comparison-inventory.json \
  --coverage paper/materials/2026-10-19-v6-w2.2/comparison-coverage.json \
  --witnesses paper/materials/2026-10-19-v6-w2.2/comparison-witnesses.json \
  --run KAY522KT5NXR --output /tmp/v6-comparison-reproduced.json
python3 paper/materials/2026-10-19-v6-w2.2/verify-comparison.py \
  --generated /tmp/v6-comparison-reproduced.json
```

## 验证、隔离与后续

最终检查回执见 [verification.json](verification.json)。tsc退出0；最终全量Vitest **569文件全部通过，5507通过、2跳过**，退出0，477.55秒。首轮同样通过（466.54秒），原始日志分别保存；最终代码包含新增的规模相关与首截尾层定位固定数据检查。gitleaks源码、测试及完整材料扫描通过，staged扫描回执另存。所有检查使用 `~/.local/node/bin`、nice；Vitest最多3 workers。与main相比 `agent/src` 完全无改动，运行时加载、触发、药水路由、战斗投影模拟均未改变；现有开关关闭字节等价测试继续由完整测试覆盖。没有新增行为发布，未分配release_id。

本次新增Jev/DeepSeek请求为0。此前W8唯一冻结题请求已核实为项目 `JevClient` → `novaJevFetch` → 公司Nova **POST https://llm-proxy.tapsvc.com/api/alpha/decisions**，**typesafe/jev-1.14**、Decisions协议，HTTP200；只请求、未执行动作、无自费Key回退。详见已有 `paper/materials/2026-10-19-v6-w8/request-receipt.json` 和 [第二轮派发报告](../2026-10-19-v6-reflex-distill-r2/report.md)，本轮未重发或读取密钥内容。

第二轮模板提交509fa7940，派发与原生档位回执提交4c3595f12已在main；单次学习run `20261019-191321-36f2fdf6-0f25-4cf0-a330-b92cbd315341-v6-reflex-distill-r2` 继续由原调度者验收。13个正式Silent知识文件仍与派发前SHA相同。未开局、移除STOP、恢复Regent、改共用配置或派其他批次。

后续由原调度者核学习草稿、异议及实际消费者读回；需要完整库存数值复算时，以最终冻结的组合/见证/版本清单运行本生成器。原日志中的坏JSON会明确报错，不能以未声明的跳过或开发者修补冒充完整覆盖。当前只有main集成，没有live发布回执；保留工作树，回收由原调度器按真实main/live验收处理。没有新增需Roy决定的事项。
