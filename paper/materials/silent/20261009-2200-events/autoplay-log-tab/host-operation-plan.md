用户已明确授权关闭闲置 auto play tab，再开 tab 显示 auto play 日志。当前运维 broker 没有 tab 管理动作，herdr-autoplay-log exit 2；没有执行关闭/新建，不冒报完成。不新增权限审批，不停止循环或对局。

请既有宿主开发在宿主上完成以下已有工具操作，并留回执：

1. `bash ops/herdr-host.sh status --json`，重新核实 label=autoplay、pane=wJ:p2、alive=true、busy=false、foreground_pids=[]；若身份或忙闲变化，不关闭活任务。核实后台 ops/autoplay.sh 及当前 play 仍活。
2. `bash ops/herdr-host.sh close autoplay --pane wJ:p2`，仅关闭该空 pane。
3. `bash ops/herdr-host.sh run autoplay-log --pidfile /home/dw/Projects/agent-sts2/ops/codex-ops/autoplay-log.pid -- nice -n 19 tail -n 80 -F /home/dw/Projects/agent-sts2/ops/autoplay.log`，创建唯一 autoplay-log tab。它只跟随日志，PID 文件属于日志 tail，不覆盖 autoplay.pid；关闭日志 tab 只结束该 tail。若已有同名日志 tab，则核实正在展示同一文件，避免重复创建。
4. 复核 autoplay-log pane 正在展示日志，原后台循环和 play 继续运行，保存 pane/PID/命令/退出码。日志只在循环事件时有新行；逐步出牌见 logs/console/ 当前对局日志。

不要调用 autoplay-stop、play-stop、kill，也不要关闭 ops、learner、watcher tab；不改 hosting、env、运维 prompt 或源码。没有宿主成功回执前，本请求保持 pending。
