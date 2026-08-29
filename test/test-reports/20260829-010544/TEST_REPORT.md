# @canlooks/ajax 5.0.5 全面测试报告

| 项目 | 内容 |
| --- | --- |
| 报告编号 | AJAX-TR-20260829-010544 |
| 测试计划 | <code>test/TEST_PLAN.md</code>，文档版本 1.0 |
| 被测版本 | <code>@canlooks/ajax 5.0.5</code> |
| 被测分支 / HEAD | <code>main</code> / <code>26fa2b82477bf90736f37c4f252fa6cf3e6c9b03</code> |
| 执行时间 | 2026-08-29 01:05:44 ～ 01:13:12（Asia/Shanghai，UTC+08:00） |
| 报告目录 | <code>test/test-reports/20260829-010544</code> |
| 总体结论 | **测试资产验收通过；产品版本发布准出不通过（阻断）** |

## 1. 执行摘要

本轮严格执行了测试计划中的依赖安装、构建、TypeScript 契约检查、普通回归、完整 CI 覆盖率门槛和 expected-fail 核对，并额外执行了随机顺序回归、本地 npm tarball 的 ESM/CommonJS 独立消费冒烟、已登记缺陷的直接复现，以及 Chromium 同源 HTTP P0 冒烟。

核心结果如下：

- 10 个 Vitest 文件全部完成，196/196 条普通用例通过。
- 4/4 条 expected-fail 按预期失败，仅对应 AJX-001～AJX-003；无新增未登记的自动化失败。
- 运行时用例合计 200 条，无 skipped、pending 或 todo。
- TypeScript 测试工程编译通过；AJX-004 仍由 <code>@ts-expect-error</code> 守卫。
- Statements 238/238、Functions 51/51、Lines 229/229，均为 100%；Branches 140/141，为 99.29%，达到 99% 门槛。
- 随机顺序回归（seed <code>20260829</code>）仍为 196 passed + 4 expected fail，未发现顺序依赖。
- npm tarball 成功生成并安装；CommonJS 命名导出和已安装包的基础类型解析通过。
- 原生 Node.js ESM 消费失败，错误为 <code>ERR_MODULE_NOT_FOUND</code>。
- Chromium 151 同源 P0 冒烟共 12 项，10 项通过、2 项失败：<code>ajax.patch</code> 小写方法被本地 HTTP 服务器拒绝，以及 AJX-001 的请求前取消失效。
- 当前共有 3 项按测试计划规则评估为高严重度的未解决问题：AJX-001、NEW-001、NEW-002。因此产品版本不满足“无未解决高严重度缺陷”的准出标准。

### 1.1 验收结论

| 维度 | 结论 | 说明 |
| --- | --- | --- |
| 测试资产验收 | **通过** | 构建、类型检查、普通用例、expected-fail 数量、覆盖率、隔离性及测试资产完整性均满足第 11.1 节 |
| 自动化回归 | **通过** | 196 条普通用例全部通过；4 条失败全部为已登记 expected-fail |
| 产品功能质量 | **不通过** | 已登记高严重度 AJX-001 仍存在，并新增原生 ESM 入口和 PATCH 实际 HTTP 兼容性问题 |
| 产品发布准出 | **阻断** | 不满足第 11.2 节“无高严重度缺陷”“P0 完成”“ESM + CommonJS 安装冒烟均成功” |

## 2. 被测基线与可复现性

### 2.1 Git 基线

| 项目 | 值 |
| --- | --- |
| 分支 | <code>main</code> |
| HEAD | <code>26fa2b82477bf90736f37c4f252fa6cf3e6c9b03</code> |
| 最近提交 | <code>26fa2b8 2026-05-19T19:25:50+08:00 1</code> |
| 工作区状态 | 测试开始前已存在未提交修改和未跟踪测试资产 |

本报告验证的是“上述 HEAD + 测试开始时工作区内的未提交内容”，不是仅靠 HEAD 即可重建的干净提交。测试前已修改的文件包括 <code>package.json</code>、<code>package-lock.json</code>、测试配置及多组测试文件；<code>test/TEST_PLAN.md</code>、新增测试套件、helper 和类型用例为未跟踪内容。测试过程中未回退或覆盖这些用户改动。

### 2.2 环境

| 组件 | 版本 / 值 |
| --- | --- |
| 操作系统 | Microsoft Windows 10.0.26200，x64 |
| Node.js | 24.14.1 |
| npm | 11.19.0 |
| TypeScript | 6.0.3 |
| Vitest | 4.1.6 |
| Vite | 8.0.13 |
| 覆盖率 | V8 Coverage |
| 浏览器补充验证 | Codex In-app Browser，Chromium/Chrome UA 151.0.0.0 |
| Firefox | 本机未发现 Firefox 可执行文件，未执行 |

## 3. 测试范围与方法

### 3.1 已执行范围

- 工具函数、核心请求、响应解析和错误体系。
- timeout、外部取消、上传/下载进度。
- 请求/响应拦截器、实例继承与隔离、模块和装饰器。
- 公共运行时 API、TypeScript 类型声明和负向类型约束。
- 项目构建、CI 组合命令、覆盖率阈值和随机执行顺序。
- npm 打包内容、独立 ESM/CommonJS 安装和运行时加载。
- 已安装包的类型解析与 AJX-004 直接编译复现。
- 本地同源 Chromium 的 7 个方法别名、HTTP 500、timeout、请求中取消和请求前取消。

### 3.2 未执行或仅部分执行

| 项目 | 状态 | 原因 / 影响 |
| --- | --- | --- |
| Chrome + Firefox 完整矩阵 | 部分执行 | 完成 Chromium 151；当前浏览器连接未提供 Google Chrome，且本机未安装 Firefox |
| MAN-004 大文件上传 | 未执行 | P1 扩展项，不在当前自动化范围 |
| MAN-005 大文件下载 / 内存峰值 | 未执行 | P1 扩展项 |
| MAN-006 100～1000 并发与压力 | 未执行 | P1 扩展项 |
| MAN-007 CORS / redirect / credentials / cache | 未执行 | P1 扩展项 |
| MAN-008 Safari/WebKit / 较低 Node LTS | 未执行 | P2 兼容性项，当前环境不具备 |
| 真实公网、TLS、代理、DNS、HTTP/2/3 | 未执行 | 测试计划第 5.2 节明确排除 |

自动化用例通过 <code>vitest-fetch-mock</code> 替换全局 Fetch，没有访问真实业务网络。浏览器补充验证只访问 <code>http://127.0.0.1:41735</code> 的临时同源服务。

## 4. 命令级执行结果

| 序号 | 命令 / 检查 | 结果 | 关键证据 |
| ---: | --- | --- | --- |
| 1 | <code>npm ci --no-audit --no-fund</code> | 通过 | 退出码 0；按 lockfile 安装 113 个包 |
| 2 | <code>npm run build</code> | 通过 | 退出码 0；生成 <code>dist/esm</code> 与 <code>dist/cjs</code> 各 6 个 JS 文件 |
| 3 | <code>npm run test:typecheck</code> | 通过 | 退出码 0；包含 AJX-004 类型缺陷守卫 |
| 4 | <code>npm test</code> | 通过 | 10/10 文件；196 passed、4 expected fail，共 200 |
| 5 | <code>npm run test:ci</code> | 通过 | 类型检查和覆盖率运行均为退出码 0 |
| 6 | <code>npm run test:coverage</code>（由 test:ci 调用） | 通过 | 100% statements/functions/lines；99.29% branches |
| 7 | JSON reporter 复跑 | 通过 | 200 assertions；failed/pending/todo 均为 0 |
| 8 | 随机顺序回归 | 通过 | seed 20260829；结果仍为 196 passed + 4 expected fail |
| 9 | <code>npm pack --json</code> | 通过 | tarball 14,194 bytes，解包 66,823 bytes，16 个条目 |
| 10 | 独立 CommonJS 安装/命名导入 | 通过 | <code>ajax</code>、<code>Service</code>、<code>Config</code>、<code>AjaxError</code> 均可用 |
| 11 | 独立原生 ESM 安装/导入 | **失败** | <code>ERR_MODULE_NOT_FOUND</code>，无法解析 <code>dist/esm/ajaxInstance</code> |
| 12 | 已安装包基础类型解析 | 通过 | TypeScript diagnostics = 0 |
| 13 | 已安装包 Service 返回类型契约 | **失败（已登记）** | TS2322：<code>Promise&lt;User&gt;</code> 不能赋给 <code>Promise&lt;AjaxResponse&lt;User&gt;&gt;</code> |
| 14 | Chromium 同源 P0 | **部分失败** | 12 项中 10 通过；PATCH alias 和请求前 abort 失败 |

## 5. 运行时测试明细

Vitest JSON reporter 将 <code>it.fails</code> 视为框架层面的“通过”；下表的“普通/expected-fail”以测试声明和计划登记为准。

| 测试文件 | 运行断言数 | 结果 | 覆盖主题 |
| --- | ---: | --- | --- |
| <code>utility.spec.ts</code> | 79 | 79 通过 | body、Blob、URL、params、headers、signal、config、通用错误 |
| <code>core.spec.ts</code> | 30 | 30 通过 | 核心请求、方法别名、响应解析、HTTP/Fetch 错误 |
| <code>module.spec.ts</code> | 21 | 21 通过 | Service、Config、装饰器、继承与隔离 |
| <code>interceptors.spec.ts</code> | 20 | 20 通过 | 请求/响应拦截器顺序、恢复、快照和去重 |
| <code>progress.spec.ts</code> | 16 | 16 通过 | 上传/下载进度、流、异常路径 |
| <code>ajax-instance.spec.ts</code> | 10 | 10 通过 | 实例快照、继承、并发隔离 |
| <code>error.spec.ts</code> | 10 | 10 通过 | 错误继承、type、cause、debug |
| <code>timeout-abort.spec.ts</code> | 7 | 7 通过 | 默认/禁用 timeout、取消竞争 |
| <code>known-issues.spec.ts</code> | 4 | 4 expected-fail | AJX-001 两条、AJX-002 一条、AJX-003 一条 |
| <code>public-api.spec.ts</code> | 3 | 3 通过 | public barrel export、对象身份、公开入口请求 |
| **合计** | **200** | **196 普通通过 + 4 expected-fail** | 10 个文件 |

测试计划共列出 99 个按业务意图归并的逻辑用例；参数化展开后形成上述 200 条运行时用例，另有独立 TypeScript 类型用例。

## 6. 覆盖率

### 6.1 总体覆盖率与门槛

| 指标 | 已覆盖 / 总数 | 实际值 | 门槛 | 结果 |
| --- | ---: | ---: | ---: | --- |
| Statements | 238 / 238 | 100% | 100% | 通过 |
| Branches | 140 / 141 | 99.29% | 99% | 通过 |
| Functions | 51 / 51 | 100% | 100% | 通过 |
| Lines | 229 / 229 | 100% | 100% | 通过 |

### 6.2 文件级覆盖率

| 文件 | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| <code>src/ajaxInstance.ts</code> | 48/48（100%） | 16/17（94.11%） | 9/9（100%） | 45/45（100%） |
| <code>src/core.ts</code> | 75/75（100%） | 44/44（100%） | 11/11（100%） | 71/71（100%） |
| <code>src/error.ts</code> | 16/16（100%） | 8/8（100%） | 4/4（100%） | 16/16（100%） |
| <code>src/index.ts</code> | 0/0（100%） | 0/0（100%） | 0/0（100%） | 0/0（100%） |
| <code>src/module.ts</code> | 33/33（100%） | 19/19（100%） | 15/15（100%） | 33/33（100%） |
| <code>src/utility.ts</code> | 66/66（100%） | 53/53（100%） | 12/12（100%） | 64/64（100%） |

唯一未覆盖分支为 <code>src/ajaxInstance.ts:21</code> 的防御性回退，与测试计划记录一致。HTML 覆盖率报告位于 <code>test/coverage/index.html</code>。

## 7. npm 打包与消费者验证

### 7.1 打包结果

| 项目 | 值 |
| --- | --- |
| tarball | <code>canlooks-ajax-5.0.5.tgz</code> |
| 文件数 | 16 |
| 压缩大小 | 14,194 bytes |
| 解包大小 | 66,823 bytes |
| SHA-1 | <code>26d29aa28729844e8b1f663cd4028f6167dc1eb0</code> |
| 内容 | LICENSE、README、package.json、index.d.ts、6 个 ESM JS、6 个 CJS JS |

### 7.2 消费者矩阵

| 消费方式 | 安装 | 加载 / 编译 | 结论 |
| --- | --- | --- | --- |
| CommonJS <code>require</code> 命名导出 | 通过 | <code>ajax</code>、<code>Service</code>、<code>Config</code>、<code>AjaxError</code> 可用 | 通过 |
| CommonJS <code>default</code> 属性 | 通过 | <code>__esModule === true</code>，但 <code>default</code> 不存在 | 文档契约不一致 |
| Node.js 24 原生 ESM <code>import</code> | 通过 | 解析 <code>dist/esm/index.js</code> 时失败 | **失败** |
| 已安装包基础类型 | 通过 | diagnostics = 0 | 通过 |
| Service 返回值类型 | 通过 | 产生预期 TS2322 | AJX-004 仍存在 |

原生 ESM 的直接错误：

~~~text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
.../node_modules/@canlooks/ajax/dist/esm/ajaxInstance
imported from .../dist/esm/index.js
~~~

<code>dist/esm/index.js</code> 使用 <code>export * from './ajaxInstance'</code> 等无扩展名 specifier，原生 Node ESM 无法解析。该问题不会被直接从 <code>src</code> 运行的 Vitest 用例发现。

## 8. Chromium 同源 P0 结果

测试页和 API 均运行在 <code>http://127.0.0.1:41735</code>，User-Agent 为 Chromium/Chrome 151.0.0.0。临时测试页与服务器配置在测试后已移除，未改动产品实现。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| GET | 通过 | 服务端收到 <code>GET</code> |
| DELETE | 通过 | 服务端收到 <code>DELETE</code> |
| HEAD | 通过 | 响应 header 回显 <code>HEAD</code> |
| OPTIONS | 通过 | 服务端收到 <code>OPTIONS</code> |
| POST | 通过 | 方法、JSON body、header 均正确 |
| PUT | 通过 | 方法、JSON body、header 均正确 |
| PATCH alias | **失败** | 返回 <code>NetworkError</code>，HTTP status 400 |
| 大写 PATCH 对照 | 通过 | 直接配置 <code>method: 'PATCH'</code> 时服务端收到 PATCH，body 正确 |
| HTTP 500 | 通过 | 归一为 <code>NetworkError</code> |
| timeout | 通过 | 归一为 <code>TimeoutError</code> |
| 请求中 abort | 通过 | 归一为 <code>AbortError</code> |
| 请求前 abort | **失败** | Promise fulfilled，且请求到达服务器 |

PATCH 的大写对照通过，证明失败不是服务器不支持 PATCH，而是 <code>ajax.patch</code> 在 <code>src/ajaxInstance.ts:65</code> 注册了小写 <code>patch</code>，Fetch 对 PATCH 不执行与 GET/POST 相同的标准化。Node/Undici 回归运行也持续输出“小写 patch 很可能导致 405，应使用 PATCH”的警告。

此结果是 Chromium 补充证据，不能替代测试计划要求的 Google Chrome + Firefox 完整矩阵。

## 9. 缺陷汇总

“NEW”编号为本报告临时编号，提交缺陷系统时应映射为项目正式编号。严重度依测试计划第 12 节定义评估，新增项仍需开发负责人最终 triage。

| 编号 | 严重度 | 状态 | 摘要 | 发布影响 |
| --- | --- | --- | --- | --- |
| AJX-001 | 高 | 已登记，仍可复现 | 已 aborted signal 不传播；请求前取消仍实际发送 | 阻断 |
| AJX-002 | 中 | 已登记，仍可复现 | HTTP 失败路径未清理 timeout timer | 原则上发布前修复 |
| AJX-003 | 中 | 已登记，仍可复现 | 无 Content-Length + arrayBuffer 泄漏原生 TypeError | 原则上发布前修复 |
| AJX-004 | 中 | 已登记，仍可复现 | Service 类型声明返回 <code>Promise&lt;T&gt;</code>，与运行时不一致 | 原则上发布前修复 |
| NEW-001 | 高（待 triage） | 新发现 | npm 包原生 ESM 入口无法加载 | 阻断 ESM/Node 消费者 |
| NEW-002 | 高（待 triage） | 新发现 | <code>ajax.patch</code> 发送小写方法，严格 HTTP 服务器返回 400 | 阻断 PATCH 核心别名 |
| NEW-003 | 中（待 triage） | 新发现 | README 声称 ajax 为 default export，源码/CJS/声明未提供一致 default | API 契约与消费方式不一致 |

### 9.1 AJX-001：请求前取消失效

直接复现：

~~~json
{"aborted":false,"reason":null}
{"outcome":"fulfilled","fetchCalls":1,"result":{"sent":true}}
~~~

Chromium 同源复现也显示 <code>outcome = fulfilled</code> 且 <code>requestReachedServer = true</code>。该缺陷可能让调用方认为已取消的有副作用请求仍被服务器执行。

建议：

1. 合并 signal 时先检查每个输入的 <code>aborted</code>，立即用原始 reason 中断。
2. 可评估使用 <code>AbortSignal.any()</code>，并保留 reason。
3. 在进入 Fetch 前再次检查最终 signal。
4. 修复后将两条 <code>it.fails</code> 改为普通 <code>it</code>。

### 9.2 AJX-002：失败路径 timer 泄漏

直接复现结果：

~~~json
{"outcome":"rejected","type":"networkError","isNetworkError":true,"activeTimers":1}
~~~

建议将 timer 清理放入覆盖 Fetch、HTTP status、进度和解析全过程的 <code>finally</code>，避免仅在成功路径调用 <code>clearTimeout</code>。

### 9.3 AJX-003：下载进度缺少 Content-Length 时泄漏 TypeError

直接复现结果：

~~~json
{
  "outcome":"rejected",
  "constructor":"TypeError",
  "message":"Cannot read properties of undefined (reading 'buffer')",
  "isAjaxError":false
}
~~~

建议在没有 Content-Length 时回退到标准 <code>response.arrayBuffer()</code>/<code>blob()</code>，或将结果转换阶段也纳入 AjaxError 包装。

### 9.4 AJX-004：Service 返回类型不一致

已安装包编译复现：

~~~text
TS2322: Type 'Promise<User>' is not assignable to
type 'Promise<AjaxResponse<User>>'.
~~~

建议统一 <code>index.d.ts</code>、README 与运行时，并在修复后移除对应 <code>@ts-expect-error</code>。

### 9.5 NEW-001：原生 ESM 入口不可加载

复现步骤：

1. 执行 <code>npm run build</code> 和 <code>npm pack</code>。
2. 在空目录安装 tarball。
3. 运行 <code>node --input-type=module -e "import * as pkg from '@canlooks/ajax'"</code>。
4. Node.js 24 报 <code>ERR_MODULE_NOT_FOUND</code>。

建议使用可被原生 ESM 解析的显式 <code>.js</code> specifier，并通过 <code>.mjs</code>、子目录 <code>package.json</code> 或明确的构建布局区分 ESM 与 CJS。CI 应保留真实 tarball 的原生 ESM 消费测试。

### 9.6 NEW-002：PATCH alias 使用小写方法

证据：

- <code>src/ajaxInstance.ts:65</code> 使用 <code>aliasWithBody('patch')</code>。
- Chromium 真实同源请求得到 HTTP 400。
- 直接传 <code>method: 'PATCH'</code> 的同端点对照请求成功。
- Node/Undici 在每轮回归中输出小写 <code>patch</code> 警告。

建议在调用 Fetch 前将标准方法规范为大写，或让所有别名注册大写方法；增加至少一个真实 HTTP server 集成用例，避免 Fetch mock 只比较小写配置而漏检传输层行为。

### 9.7 NEW-003：default export 文档契约不一致

证据：

- README 第 677 行写明 <code>ajax (default export)</code>。
- <code>src/index.ts</code> 只有 <code>export *</code>，没有 default export。
- CommonJS 包 <code>__esModule === true</code>，但 <code>default</code> 为 <code>undefined</code>。
- <code>index.d.ts</code> 末尾使用 <code>export = Ajax</code>。

建议明确选择“仅命名导出”或“同时支持 default”，并同步源码、构建产物、声明、README 和 public API 测试。

## 10. 验收标准逐项判定

### 10.1 测试资产验收

| 标准 | 结果 | 说明 |
| --- | --- | --- |
| <code>npm run build</code> 成功 | 通过 | 退出码 0，ESM/CJS 文件均生成 |
| <code>npm run test:typecheck</code> 成功 | 通过 | AJX-004 由预期类型守卫保留 |
| 所有普通用例通过 | 通过 | 196/196 |
| expected-fail 仅 AJX-001～AJX-003 且固定 4 条 | 通过 | 2 + 1 + 1，共 4 |
| 覆盖率达到门槛 | 通过 | 100 / 99.29 / 100 / 100 |
| 自动化不访问真实网络、不依赖顺序 | 通过 | Fetch 全局 mock；随机 seed 复跑通过 |
| 测试资产齐全 | 通过 | 计划、配置、setup、helper、10 个 suite、类型用例均存在 |

**测试资产验收结论：通过。**

### 10.2 产品版本准出

| 标准 | 结果 | 说明 |
| --- | --- | --- |
| 满足全部测试资产标准 | 通过 | 见上表 |
| 无未解决高严重度缺陷 | **不通过** | AJX-001；另有 NEW-001、NEW-002 待 triage |
| 中严重度缺陷已修复或有风险接受记录 | **不通过** | AJX-002～004、NEW-003 未见风险接受记录 |
| AJX-001 已修复并转普通用例 | **不通过** | 仍为 2 条 expected-fail |
| AJX-004 已修复并移除类型守卫 | **不通过** | TS2322 仍可复现 |
| 至少完成 P0 人工测试 | **部分完成** | Chromium 已执行；Chrome/Firefox 矩阵不完整，且发现失败 |
| ESM 与 CommonJS 安装冒烟均成功 | **不通过** | CJS 命名导入通过，原生 ESM 加载失败 |

**产品版本准出结论：不通过，建议阻断发布。**

## 11. 修复优先级建议

1. **P0：修复 AJX-001。** 这是请求取消语义失效，可能产生真实副作用。
2. **P0：修复 NEW-001 和 NEW-002。** 恢复原生 ESM 入口，并确保 PATCH alias 使用标准大写方法。
3. **P1：修复 AJX-002、AJX-003、AJX-004。** 分别处理资源清理、错误归一化和消费者类型契约。
4. **P1：决定并统一 default export 契约。**
5. 将本轮 tarball ESM/CJS 消费冒烟和本地 HTTP server 方法测试纳入 CI。
6. 修复后执行完整 <code>npm ci</code>、build、typecheck、普通回归、coverage、随机顺序、pack consumer 和浏览器 P0 回归。
7. 发布前补齐 Google Chrome 与 Firefox，至少验证 MAN-001～MAN-003。

## 12. 交付物与证据位置

| 交付物 | 路径 |
| --- | --- |
| Markdown 测试报告 | <code>test/test-reports/20260829-010544/TEST_REPORT.md</code> |
| HTML 测试报告 | <code>test/test-reports/20260829-010544/TEST_REPORT.html</code> |
| 测试计划 | <code>test/TEST_PLAN.md</code> |
| 覆盖率 HTML | <code>test/coverage/index.html</code> |
| 覆盖率 JSON 摘要 | <code>test/coverage/coverage-summary.json</code> |
| 已登记缺陷守卫 | <code>test/suites/known-issues.spec.ts</code> |
| 类型缺陷守卫 | <code>test/types/public-api.typecheck.ts</code> |

---

报告结论基于 2026-08-29 执行时的工作区快照。若产品实现、声明、构建脚本、依赖或测试资产发生变化，应重新执行完整测试并生成新时间戳报告。
