# 静默校准 96b9fda6cff406e564bc312401fa29c267a779b508a75eb76e9d00a1db2cf887

Roy 已授权新功能的定期刷新；20 新结局触发，20 新可用开场只扩验证。固定调参 keys/UTC 切点，200 样本，完整来源见 sources.jsonl，数据/模型 SHA256 见 provenance.json。旧 b07024e8d3061b66f691bee4d779ccea96501b7376eee370ee231e6c54f8da58 保留。report.md 与 completed.json 保存入口原件，published-report.md 与 audit-manifest.json 保存独立审计。

固定复现：trust.py --character silent --results results.jsonl --fights fights.jsonl --split split.json --turns turns.jsonl --provenance provenance.json --out <scratch>/trust.json。refresh 元信息由刷新入口添加，拟合/残差/名单可精确重现。B2/B3 与 A10/F49 范围见报告，不冒称联合通关率已验证。
