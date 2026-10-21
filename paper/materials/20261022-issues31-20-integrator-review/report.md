# #20 持久控制补交核验；#31 组合准入取消

核验时间：2026-10-22T04:01:27+08:00；集成员 [watcher]。本轮实际模型调用 0，无 live/生产开关/STOP/宿主配置修改。

## #20：466e54561 技术核验通过；新增需求与运行验收保留

来源 `466e54561dc23e09321826d55af39c5abedd4aef`，仅接其 9 个非 decision-log 叶；保留原交付历史及开发原记录。代码实读确认：项目受控记录绑定 repo/root，缺文件 off，显式环境 on/off 优先；设置只原子持久化，不调用 kit；损坏/异根记录或无效环境保留会话动作，不误入兼容回收。只有原 stall 消费，learn/snapshot 不重复，没有新增 cron/daemon、依赖或 prompt 修改。

独立生产 tsc、完整单 fork Vitest 647 文件/6090 通过/2 跳过，失败 0；53 项生命周期/真实 shell 固定入口测试与 bash 语法通过，2037 份所列输入 SHA 前后一致。检查及命令见 `20-checks.json`，逐项输入见 `20-identity.json`，原日志压缩件及双 SHA 见 `archive-manifest.json`。测试用假 kit/临时根，不作真实派单或回收。开发日志 SHA/源码 blob 与原件另核同；稀疏 #29 材料缺失的开发预检失败保留，集成员开始前精确补齐基线 Git blob。

kit README 补交 `68c1689adc849765499557a53076f17207274e78` 与已安装引擎 `d15456158f0d7d4ad3b48537b034013fa20cb9f1` 仅 README 差异；本次不要求重装相同引擎。配置格式检查不代其他项目 owner 授权。主管协调各 owner 确认本批根/角色/会话/权限，指定有权限的宿主协调者汇总，各 owner 核自己的条目及无重复入口，再由原 ops dry-run→持久 on→原 stall 首 tick。未获准项目 pending，不由 STS2 ops 越仓认领。

实际持久开关、宿主登记、首 tick、实际命名/锁忙重试和回收分项仍待原角色验收；uncertain 不补发，回退 off 保留原账本。本集成员没有设置生产控制文件或代填他人确认。

Roy 新增的 done 送达、停滞检测/升级与暂时性错误快速重试，见 [主管原需求](https://github.com/dwroy/agent-sts2/issues/20#issuecomment-6324894427)，不在 466e54561 中；按原安排作为后续提交另核。故本次只是该补交的局部技术通过，#20 保持 in-progress，不整体转 waiting-release，不把容量错误恢复当已实现。

## #31：Roy 取消，停止准入

依 [主管转 Roy 决定](https://github.com/dwroy/agent-sts2/issues/31#issuecomment-6325196850)，#31 已关闭，不发布 R411+#31、不启用交替试验。此前 main 已有的通用开关保留，供 #33 复用，不在本次回退。

本会话只终止自身等待中的 #31 知识准备与串行排队进程，未强解锁或停止其他角色进程。停止时尚未冻结最新知识，未运行该组合完整检查，未给组合准入，未修改 live；没有将已做的逐叶核对写成组合全检通过。原计划作废原件保留，本地候选、等待/失败日志与停止回执保留在 `.artifacts/integrator-31-live-admission-20261021/`，概要见 `31-cancellation.json`。回收仍由原流程判断，不清理本会话材料。
