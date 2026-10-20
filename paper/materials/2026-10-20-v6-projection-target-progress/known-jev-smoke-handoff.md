# 已知构筑评估烟测接续

2026-10-20 watcher 收到原 v6-w4w6 烟测事件：独立树 v6-known-jev-smoke-20261020，生产 agent/ cwd；MWMR F8/F13、T12 F12 的 coverage=0/4，触发 v6_unknown_to_brain，未盲发 Jev。模拟已完成 20 种子，4–5/780 行有值，冷准备约7.3s、热5.7s；商店/F16 后续结果仍在途。该事件不能认定已知构筑评估 Jev 烟测通过。

原可复现产物：本目录 f8-lookup-pool-profile-agent-cwd.{ts,json}，同一 engine/pool 按 cold_pick、hot_pick、act_start、after_act_pick、四段 idle、after_idle_pick 执行。原件在 agent/ cwd 使用 BuildSimPool(2)；四段空闲后连战43/96、本幕仍0/16。早期冻结 R2/R400 + W8 appearance 注入输入与生产 canonical 读回分开记录，不能声称原输出覆盖当前新包。formation-complete-audit.json 显示 F8 本幕可识别 P 全部低于5%或有前提/重复卡联合概率未知，预热不能解除。single-lookup-unit-profile.json 越过低P门槛仅为耗时诊断，不可作为生产烟测已知题或缓存注入。

当前没有经验证可满足门控的已知题；请原烟测 owner 保留实际失败/未知，不改sim、不补值、不降低安全网门槛。W3源303bbb1ac、byte源f5c075924已main，live继续按Roy10:26烟测门槛处理。


2026-10-20 10:40:18 CST 原 v6-w4w6 烟测 owner 已给本轮终局：**不通过已知构筑评估→Jev验收**。3拿牌、4商店、2休息共9局面均已知选项0，正式门控转大脑；准备5447–7957ms。隔离9次Nova HTTP200仅协议通过，数值选择质量未验成；本轮未预热，不能外推热缓存。6个商店/休息未返回有效table的原因仍需结合限时/provider核查。完整原消息见 `known-jev-smoke-final-relay.md`；owner正式报告/提交号待补。不据此放行W3 live；已转ops并补短清单，遵循Roy10:26安排，保留STOP及原现场，不新派烟测。
