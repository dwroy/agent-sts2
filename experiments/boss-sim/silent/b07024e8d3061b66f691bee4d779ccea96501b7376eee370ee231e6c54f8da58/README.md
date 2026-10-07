# 静默定期校准 b07024e8d3061b66f691bee4d779ccea96501b7376eee370ee231e6c54f8da58

Roy授权的新功能定期刷新，21次新增实际boss结局触发，20场可用开场新增验证。旧107调参keys/UTC切点固定，验证73→93。角色严格为已结束SILENT；完整来源/排除/SL口径见extraction.json与sources.jsonl。旧77a99507591f214838210917aa6c2c53e4654e8a7d3aa8f582071869a3e0555d目录保留。

固定模拟模型及全部输入SHA256见provenance.json，200样本、seed=1、t1/pre、既有策略。report.md是入口原件，published-report.md另附独立审计；completed.json与audit-manifest.json分别核验原件和补充。frozen-input-audit.json核旧样本/切分/种子不动，opening-source-integrity.json核200个完整开场原帧，opening-audit.json/model-input-audit.json核进阶来源，new-outcome-events.json包含21个新事件及缺帧排除项。

固定复现：trust.py --character silent --results 本目录/results.jsonl --fights 本目录/fights.jsonl --split 本目录/split.json --turns 本目录/turns.jsonl --provenance 本目录/provenance.json --out <scratch>/trust.json。refresh元信息由刷新入口添加；其余拟合/残差/名单可精确重现。B2/B3及A10/F49适用范围见报告，不冒称后续模型或两场联合通关率已验证。
