# @canlooks/ajax 5.0.6 缺陷修复验证报告

| 项目 | 内容 |
| --- | --- |
| 报告编号 | AJAX-TR-20260829-165804 |
| 被测版本 | `@canlooks/ajax 5.0.6` 工作区候选版本 |
| 基线分支 / HEAD | `main` / `26fa2b82477bf90736f37c4f252fa6cf3e6c9b03` |
| 执行时间 | 2026-08-29 16:49 ～ 16:58（Asia/Shanghai，UTC+08:00） |
| 修复依据 | `test/test-reports/20260829-010544/TEST_REPORT.md` 中的 7 条缺陷 |
| 自动化结论 | **通过** |
| 产品发布结论 | **自动化准出通过；Chrome/Firefox P0 人工矩阵待完成** |

## 1. 执行摘要

本轮完成 AJX-001～AJX-004、NEW-001～NEW-003 的实现、类型、文档、构建和回归测试修复。旧版 5.0.5 报告保持不变，本报告记录修复后候选版本的验证结果。

- 主 Vitest 套件 10/10 文件、208/208 条普通用例通过。
- expected-fail 为 0；AJX-001～AJX-003 的 4 条守卫均已转为普通回归。
- TypeScript 项目检查通过；AJX-004 的类型缺陷守卫已移除。
- Statements 263/263、Functions 54/54、Lines 253/253，均为 100%；Branches 161/162，为 99.38%。
- 原生 Node HTTP 集成 2/2 通过：PATCH 实际到达服务端时为大写；请求前取消未到达服务端。
- 真实 npm tarball 的原生 ESM、CommonJS 和 TypeScript NodeNext 消费全部通过。
- 随机顺序回归使用 seed `20260829`，208/208 通过。

## 2. 命令级结果

| 命令 / 检查 | 结果 | 关键证据 |
| --- | --- | --- |
| `npm run build` | 通过 | 生成 `dist/esm`、`dist/cjs`、`dist/types` 及三处模块类型标记 |
| `npm run test:typecheck` | 通过 | 源码、测试和公开类型契约无诊断 |
| `npm run test:coverage` | 通过 | 208 条普通测试；100 / 99.38 / 100 / 100 |
| `npm run test:integration` | 通过 | 2 条 localhost 原生 HTTP 用例通过 |
| `npm run test:package` | 通过 | 安装真实 tarball 后 ESM/CJS/TypeScript 消费通过 |
| `npm run test:release` | 通过 | 构建、CI、集成和发布包消费组合命令退出码 0 |
| 随机顺序 Vitest | 通过 | seed `20260829`，208/208 通过 |

## 3. 缺陷关闭结果

| 缺陷 | 状态 | 修复结果 | 自动化证据 |
| --- | --- | --- | --- |
| AJX-001 | 已修复 | 已取消 signal 立即传播；保留 reason；Fetch 前短路 | `known-issues.spec.ts`、`timeout-abort.spec.ts`、原生 HTTP 集成 |
| AJX-002 | 已修复 | timer 和外部 signal listener 在完整生命周期的 `finally` 清理 | HTTP/Fetch/解析/进度失败回归 |
| AJX-003 | 已修复 | 无 Content-Length 时 arrayBuffer/blob 回退原生解析，错误统一包装 | `known-issues.spec.ts`、`progress.spec.ts` |
| AJX-004 | 已修复 | Service 泛型方法返回 `AjaxReturn<T>`，声明由源码生成 | 源码类型检查与已安装 tarball 类型消费 |
| NEW-001 | 已修复 | ESM 使用显式 `.js` 引用并具备明确模块边界 | 原生 ESM tarball import 通过 |
| NEW-002 | 已修复 | 所有 alias 与传输边界统一使用大写方法 | localhost 服务端收到 `PATCH` |
| NEW-003 | 已修复 | 明确仅命名导出，运行时、类型和 README 一致 | ESM/CJS 无 default，命名导出均存在 |

## 4. 发布产物验证

发布构建改为串行、可复现流程：

1. 清理 `dist`。
2. 分别生成 ESM 与 CJS JavaScript。
3. 从 `src` 生成 `dist/types` 声明。
4. 为 `dist/esm`、`dist/cjs`、`dist/types` 写入明确的模块类型标记。
5. `npm pack` 前自动重新构建。

消费者测试安装的是实际 tarball，而不是直接引用仓库源码或 `dist`。验证的公共契约为 ESM/CJS 命名导出，以及 TypeScript NodeNext 对 `AjaxReturn<T>` 和 `Service.get<T>` 的解析。

## 5. 尚待人工执行的发布门槛

当前自动化无法替代测试计划中的浏览器矩阵。正式发布前仍需在 Google Chrome 与 Firefox 完成：

- 7 种 method 的真实同源请求；
- timeout、请求中取消和请求前取消；
- ESM 浏览器工程的安装与调用冒烟。

在上述人工 P0 完成前，本报告不将产品最终发布状态标记为“完全通过”。

## 6. 结论

原 7 条缺陷均已落实修复并建立自动化回归。构建、类型、覆盖率、随机顺序、原生 HTTP 和实际 tarball 消费全部达到自动化准出标准；剩余工作仅为测试计划明确要求的 Chrome/Firefox 人工发布矩阵。
