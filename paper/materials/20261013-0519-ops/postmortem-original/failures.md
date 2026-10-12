# 本任务保留的失败记录

- 首轮README读取在沙箱构建时因并行工作树.codex路径消失而失败；同权限只读重试成功，未扩大权限。
- summarize.py初稿遇无chosen的map/route-change记录而KeyError，原脚本及summary.txt保留；audit.py/facts.py用可缺字段处理后成功。
- 资源表初次内联脚本对combat=null执行get而失败；未写入任何表行，改用combat or {}，draft-table.py成功，复盘追加发生在这些抽取完成之后。
- 最终核对初次内联脚本将or 0误写为or0，Python语法检查拒绝，未写回执；保存final-verify.py更正后成功，未改已追加复盘。
