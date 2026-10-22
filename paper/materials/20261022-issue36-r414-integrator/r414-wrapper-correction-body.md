[watcher] #40精确交付补正：R414的Vitest包装器只追加新进程入口一项，不能整叶覆盖main包装器；生产两叶不变。

#36实际R414组装定向检查发现，main版agent/tests/legacy-refresh-incremental.test.ts已有四项R414未上线的旧回归文件，照main整叶复制会报文件缺失（首败原件保留，非热修生产入口失败）。live该文件原本只有test_refresh_pipeline.py/12；在其原字节条目后仅追加["python3", "knowledge/builders/test_refresh_entrypoints.py", 2]即可，保留live其余内容。不要引入缺失旧测试或把这些失败当已通过。

生产build-fight-value.py及新test_refresh_entrypoints.py仍取3ae67358原叶。main完整6219过2跳回执有效于已声明main树；实际live测试包装器适配由当前#36 R414组合定向及唯一full验证，稍后交精确SHA/补丁；原ops若先发40，按本单行增量沿原门核新入口。此前delivery.json测试包装器new blob仅适用于main，R414按本补正，不整包覆盖。#36仍占下一唯一full窗口，未起第二个full。
