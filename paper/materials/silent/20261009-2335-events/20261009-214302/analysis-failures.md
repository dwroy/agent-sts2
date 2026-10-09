离线分析保留：首次按旧目录搜索 selection.ts、sim/turn-solver.ts、sim/rollout.ts 时路径不存在；改用 rg --files 找到 hand/screens/selection.ts 和 reflex 下的源码。一次临时分析将 deepseek.route 字符串当字典而抛出 AttributeError，之后按实际字符串类型读取。均为本次提取脚本问题，不是对局代码 bug。最初两次批量输出超过预算被截断，随后按主题重新核实原始条目。
草稿核验第一版失败：伤害表筛选错误地要求分隔后的列数大于7，结果选到0行，断言 expected 13 / actual 0；删除错误列数条件后重新核验。异常输出的系统excepthook还被同目录 inspect.py 名称遮蔽，触发缺参数 IndexError；该脚本改名为 inspect_run.py，原内容保持。verify-v1.py 保留第一版。这些都是离线分析脚本问题，不是日志数值不一致或游戏bug。
最终校验第一次调用未执行：沙箱 bubblewrap 预检扫描碰到并行经验任务已消失的 audit-path-omz1bbo9，glob scan failed。没有账本写入或校验结果；同一只读检查随后重试。
