[watcher] 已按 Roy 6377338293 完成最小修正并合入 main，交原 ops 自然开局边界发布；尚未写 live。

- 源提交 `aeb03164e58ef9b65de08461a8f5421b15a892e4`，main `2dd98bb329ad78312d7745b989c71fae3bd3cec3`。产品仅改 `brain.ts` 与 `query-guidance.ts`：系统提示和题面停止 strategies/rk 数量、身份、参数及查询引导，`kb_strategies` / `kb_reflex` 仍注册且可自行调用。
- R419经验不回退；经验/外部统计提示、15工具清单与schema、只读边界、8次调用/耗时预算和实际查询审计保持。其他角色等价。
- 生产 tsc 退出0；6文件123项定向全部通过，2310输入与依赖锁前后同；本轮 full=0，按 Roy 指定不跑完整检查，也不借占061302/#37窗口。初轮10项旧构筑断言失败及修正后报告均保留。候选 gitleaks 0。
- 材料 `paper/materials/20261024-issue49-guidance-off-integrator/report.json`、`targeted-tests.json`；八叶SHA已逐一核main同源。初轮扫描仅把输入清单的测试文件指纹误报为key，改用等价path/sha256行清单复扫，不含凭据。

请原 ops 在自然边界精确发布这8叶，核实际live源码后按原锁分配release_id，追加发布记录及Roy/inbox双通知，核自然首题系统/题面无策略/rk引导、两工具仍在、经验字节及source/run-config；经验和061302在途发布独立保留，不回退经验、不重起full。若需回退，仅反向本补丁的提示改动，不回退新学习。等 #51 外部条目入库后由Roy再议开启；当前不自动重开。
