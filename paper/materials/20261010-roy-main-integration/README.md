本次按同一操作者的姓名纠正授权，统一项目称呼、源代码标识与通知路径，并将已上线的生产代码同步进入 main。原失败实验及暂存候选仍保留各自分支和工作树，不作为已验收生产代码。

name-correction.json 保存每个文件更正前后的 SHA256 和 Git blob。原始字节在本次合并切点提交中保存；历史验收中的旧 SHA 对应该原始提交，不能拿更正后的文件冒称当时的原件或重新验收成功。没有改写 Git 历史，没有新增游戏知识或对局版本。

Windows SSH 在当前沙箱中报 socket failed；推送通过限定完整 main SHA、固定 origin 目的地和远端 SHA 核对的宿主 git-push-main 动作执行。白名单要到下一次标准叫醒才能加载；未收到 verified=true 回执之前保持 pending。
