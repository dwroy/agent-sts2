# #49 + #26 组合准入

main 产品树 a70c1cbc 唯一完整检查原结果：672 文件，6490 过、1 败、2 跳过，tsc 0。首败是 check-imports：稀疏工作树未实体化已跟踪 paper/materials/issue29-brain-speed/results.jsonl；三个相关源码与基线一致，Git 中原文件存在。恢复原 Git 字节 SHA 8d83deb7c85a8b7ceb92da9ffb195f13edf4fa2876f9be5692ec8d2ded1c23ef 后单项 check-imports 1 过。原 full 的 rc1/原日志/JSON 保留，不改称 full 原始全绿、不重跑 full。2632 原输入不变。主管在本轮明确裁定环境缺件补验可复用，条件逐项记录于 supervisor-live-net-verdict.json。

actual live 2faa7ead 上只应用49/26净补丁，精确19叶，产品树 f1e17844、anchor4569d11f；18叶与main候选同，brain.ts唯一差异见 main-vs-live-brain.patch：删未发布35的 construction-log import 及对应六行理由schema分支，保持live原行为，不带35。264模块/1496字面相对导入缺失0；全树导入工具亦补验0，非字面动态路径不作穷尽声称。净live导入补验显式借用main已跟踪29夹具的同一原始Git字节（live基线未跟踪该历史材料），只用于隔离测试环境，未改产品/输入清单；见live-net-final-readback.json。

净产品树叠最新实际469知识只供测试，隔离tree 8294ab04a4ecaa574b016909d1fad03e91c34804；与main full的较早快照分账，不合回旧数据。tsc0，扩展原17文件至93个brain/router/agent-knowledge/kb-tools/external-stats/live-view及实际消费者文件，1263过/0跳/0败；前后输入SHA同。真实rk只读消费者9命中ID/来源SHA/可信度核同，经验仍独立kb_experience，不启用V6_COMBAT_ENTRIES，不改Jev、知识正文或排名。schema产品格式变更为唯一明确例外。

组合自查：发布脚本及模块本地传递依赖在实际组合内；稀疏树已实体化测试引用的夹具，核Git原字节；最新live及知识/发布叶保留。ops只按本目录19叶净产品清单发布，brain.ts从net anchor取，其他18叶与main同，不能整叶抄main brain或合私有anchor整树。实际live变化时按原锁核组合漂移、保新知识并补必要定向；release_id由ops核实际提交分配。未修改live/STOP/TUI/模型或发新任务。

47自然、46原24h、36旧失败、27正式ACK CLI与各科学父要求保留；原18局/首批自然采用对照未完成，不以离线准入代自然收益。48宿主启用已由ops登记，自然采用另核。下一40周期日志四叶full在本窗口之后，原issue40关闭状态不变；后42余→35→50→28→37→20父。
