# 静默boss校准固定批次

任务20261009-033011-silent-boss-calibration，Roy授权新功能定期刷新；153完局/705尝试/281可用，107调参/174验证；20新实际结局触发，旧目录不覆盖。

provenance.json保存源码及数据指纹，result-reuse-audit.json记载历史复用边界。report.md保留原生成报告，published-report.md含审计与统计口径勘误；previous-published-report.md保留上批。completed.json封存原生成文件，audit-manifest.json封存本批审计材料。仅SILENT完局，SL截断不是实败。

首轮 gitleaks 将标为 new-keys.json 的 SHA256 误认凭据；已逐字核实该值等于标识文件散列，改用 validation-identifiers.json 文件名，扫描规则保持。原扫描、失败提交4b821454和核验原件保留。归档日志需显式强制纳入，以使审计清单可在固定git树完整核验。
