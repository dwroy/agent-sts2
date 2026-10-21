# CEN 连战修复精确运输

source `f993d9b1dd88c2b36534d16c3560358e23a89a95`，base `cf4aff4ceebd958ad70b1512cc886c45bd8092aa`，tree `2a3d638fa6f9d52f95de1ba7647e4a46a55773ab`。

仅运输 `checks/minimal-source.patch` 三叶；逐叶前后 SHA/blob、patch SHA 在 `checks/source-manifest.json`。不运整支、验证父、P4、805、知识或配置。生产唯一修改为 rollout 的死亡优先关系，没有新增公开接口或依赖。测试的 gzip 固定数据来自本次 11 封套，需随新增测试一起运输。

ops 锁内与届时 actual live/最新知识组合，保留非重叠漂移；串行一次 tsc/full 后沿已授权局终 STOP 边界发布。W8 定向检查不代实际 live 联合完整绿或自然消费者验收。
