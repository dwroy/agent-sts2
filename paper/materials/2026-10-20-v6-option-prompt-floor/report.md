
最终变基到 main 09b0340b8，新增提交仅为运维记录/版本登记。逐项核对 2,115 个受测输入及路径集合完全一致，复用本轮联合全检；证明见 rebase-input-proof.json。

固定检查和扫描日志按原始文本保存在 logs.json（以原文件名为键），含原始空行，避免为满足 Git 空白检查改写原件；工作树 .artifacts/option-floor/ 保留原文件。
