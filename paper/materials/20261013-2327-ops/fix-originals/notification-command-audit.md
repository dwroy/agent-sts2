# 原生通知命令只读核对

仅调用 herdr notification show --help，没有发送通知。当前帮助声明 TITLE 位置参数，支持 --body TEXT 与 --sound none/done/request，与已有 core_build_jobs.py 调用一致。此前 222802 的 rc2 无 stderr，旧送达状态和当时 CLI 环境仍未知；5c92f2aaf 已实现新失败诊断及幂等保护，本批不重发或改写旧回执。
