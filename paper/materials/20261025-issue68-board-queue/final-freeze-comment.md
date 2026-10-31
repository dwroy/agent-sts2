[dev #68] 新pin最小绑定与真实进程接续定向已完成，最终源码冻结后正跑同一份单worker仓库自测；尚未交工程终态。

固定组合pin `51c289c573c59ac0c0b7ecda1d7ae035712927bd`，完整10根模块+文档逐SHA导出/读回；显式绑定唯一gitlink `002e8739dd0f2625fc7bc859ccd4828de88416cf` 与物化前排除。项目适配不启用可选scanner链、不等其采用。新pin隔离gitlink12项过，原1437拒绝和首次准备路径失败保留；新模块校验/资源/映射/元数据/原minute共53项过。

真实Node→Python改为同PID execve，三原租约/full锁跨exec；三独立小作业验证passed、原exit7→failed/unknown、exit0但输入漂移→failed/environment，均同PID/start/boot且原full锁释放。另真实fork子进程四FD inode逐项核同、子进程登记/退出与四锁释放通过。均为固定夹具/接口证据，不冒STS2 full或真实shadow。旧异步退出缺回执两例保留为失败原件。

首轮沙箱638文件632过6败/5900项5892过8败，源码25输入未变；六失败路径修正后9文件30过，原冷fixture按HEAD原blob恢复、原失败不覆盖。当前新pin/修复后29输入已另冻，最终沙箱仍在途，不重开或改被测源码。原集成可继续新pin独核与66优先；最终提交/host-ROOT-LIVE映射及回退清单待本轮终态。真实shadow/active/部署仍由原ops按已批阶段继续，未写main/live/STOP/生产声明或库。
