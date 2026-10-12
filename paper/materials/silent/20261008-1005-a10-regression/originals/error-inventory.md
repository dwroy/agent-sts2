# 本批失败与原件位置

- 冻结第一次跨设备硬链接失败：freeze.out / freeze.err；改为复制后freeze-2.out / freeze-2.err。未改变样本切点。
- metrics第一次tsx IPC EPERM：metrics-version.json / metrics-version.err；同一项目strength-sources通过node loader导出后，metrics-version-2及metrics-config-2成功。未改统计源码。
- analyze初稿字段缺失、时间字符串分隔差与REST标签提取：analyze.err以及各次analyze-*.out/.err保留，最终sample-table/statistics使用修正后的analyze.py。没有把分析脚本错误当游戏回归。
- 定向审计第一次错误工作目录：targeted-tests.log；随后targeted-tests-2.log，10文件114例通过。
- 固定来源测试初稿预期红：provenance-initial-red.log；修后provenance-green.log；撤原字节provenance-withdrawn-red.log、恢复provenance-restored-green.log、red-green.json。没有削弱断言。
- source-sandbox.log：原入口tsc通过，历史源码证据片段的相对导入不完整导致check-imports唯一失败；source-sandbox-2.log：证据原字节改扩展名.ts.txt后原入口248文件2608例通过。archive-renames.json保存逐文件SHA，排除名单未改。
- 第一次live合并范围检查失败：merge-live.err、live-merge.log、publication-first-merge.json。基线继承六个未进入live的派发路径，合后净差九文件；恢复这六个路径后为三文件。恢复提交/4711其他路径等价证明见publication.json及net-live-preservation.json。未把第一次错误合并当通过检查的发布。
- 临时交互shell提取中的NameError（未导入collections/re）、按错误frames.jsonl文件名提取的FileNotFoundError、经验版本名S1.exp2.fix1误作整数的ValueError，以及agent工作目录中相对proposal路径的FileNotFoundError发生在工具转录。它们没有生成独立stderr文件，完整原字节不能从本任务文件中恢复；如实列缺失，不伪造原件，也不当代码测试或游戏错误。对应成功结果均另保存；帧原始文件为states.jsonl，所有实际执行闸关键帧最终已冻结。

游戏失败/脑错误/执行闸的原帧、原题、原回答、执行和console日志独立保存；缺历史完整dirty知识树、脑系统prefix正文、18个计划窗口末结局、bullet/sloth二幕触发样本等限制见report.md。
