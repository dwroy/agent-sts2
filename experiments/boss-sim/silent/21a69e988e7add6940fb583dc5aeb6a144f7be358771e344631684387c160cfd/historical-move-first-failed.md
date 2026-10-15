首次跨挂载 rename 返回 errno 18 (Invalid cross-device link)，原目录未改动；首次导入预检仍失败。改为本工作树内同目录隐藏名字的临时重命名，逐SHA保留，检查后恢复。不删历史、不改检查器或排除名单。
