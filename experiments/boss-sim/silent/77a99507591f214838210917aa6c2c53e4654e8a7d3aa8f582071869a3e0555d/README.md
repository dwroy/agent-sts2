# 静默定期校准 77a99507591f214838210917aa6c2c53e4654e8a7d3aa8f582071869a3e0555d

本批是Roy授权新功能的定期刷新，20次新实际boss结局触发，固定切点/调参keys，新样本只扩验证。入口 refresh-silent.py；模拟模型与输入SHA256见 provenance.json，运行采用200样本、seed=1、t1/pre、既有默认策略。角色样本严格为已结束SILENT，完整排除/SL口径在 extraction.json 与 sources.jsonl。

report.md 为入口原件，published-report.md 附本批输入审计；实时知识是 boss-trust.json。completed.json 核验原件，audit-manifest.json 核验补充审计。旧590b6447目录逐字节保留。frozen-input-audit.json 证明旧实际样本和切分不动；opening-source-integrity.json 核验180个原帧及完整我方资源；opening-audit.json / model-input-audit.json / input-audit-summary.json 记录进阶数值，censor-hp-audit.json 证明SL截断未被当实际败局。

拟合复现使用 trust.py --character silent --results 本目录/results.jsonl --fights 本目录/fights.jsonl --split 本目录/split.json --turns 本目录/turns.jsonl --provenance 本目录/provenance.json --out <scratch>/trust.json。仅refresh元信息不由trust.py复现；切分、overall、selection、残差、准入表应一致。缓存幂等和不足20次跳过的原始回执在本批scratch；全部测试/live/提交回执交完成事件由运维确认，不在学习台账冒标shipped。
