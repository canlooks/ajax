# @canlooks/ajax 测试计划与测试说明

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 被测项目 | `@canlooks/ajax` |
| 被测版本 | `5.0.6` |
| 文档版本 | `1.3` |
| 编制日期 | 2026-08-31 |
| 测试类型 | 单元测试、组件集成测试、API 契约测试、类型声明测试、构建验证 |
| 自动化框架 | Vitest 4.1.6 + vitest-fetch-mock + V8 Coverage |
| 当前基线 | 主套件 226 条、原生 HTTP 集成 2 条全部通过；expected-fail 为 0 |

## 2. 项目功能与用途

本项目是一个以 Fetch API 为底层、TypeScript 优先的 HTTP 请求库，目标是为浏览器或具备 Fetch/Web Streams API 的 JavaScript 运行时提供统一的请求管理能力。主要功能如下：

- 以函数或 `get/post/put/patch/delete/head/options` 别名发起请求；
- 合并 URL、查询参数、headers、AbortSignal 及其他 `RequestInit` 配置；
- 自动序列化普通对象请求体，并透传标准 `BodyInit`；
- 按 `json/text/blob/arrayBuffer/formData/none` 解析响应；
- 支持实例级和单次请求级的请求/响应拦截器链；
- 通过 `Service`、`@Config`、`@RequestInterceptor` 和 `@ResponseInterceptor` 构建模块化 API 服务；
- 支持超时、外部取消、上传进度和下载进度；
- 将网络、取消、超时和响应处理错误归一为 `AjaxError` 体系；
- 对外提供工具函数与 TypeScript 类型声明。

核心调用链如下：

```mermaid
flowchart LR
    A[实例/服务默认配置] --> B[合并单次请求配置]
    B --> C[请求拦截器链]
    C --> D[URL 与查询参数]
    D --> E[超时/AbortSignal]
    E --> F[fetch]
    F --> G{响应是否成功}
    G -- 否 --> H[NetworkError]
    G -- 是 --> I[上传/下载进度处理]
    I --> J[响应体解析]
    H --> K[响应拦截器链]
    J --> K
    K --> L[返回转换结果或抛出最终错误]
```

## 3. 测试目标

1. 验证 README 所述主要能力及公开 API 在正常、边界和异常条件下行为稳定。
2. 验证配置合并、实例继承和服务继承不会产生非预期共享状态。
3. 验证各类错误的类型、消息和上下文可供调用方可靠判断。
4. 验证超时、主动取消、流式处理和进度回调等异步路径。
5. 验证公开 TypeScript 声明可被消费者编译使用。
6. 以覆盖率阈值防止未测试代码进入交付版本。
7. 将已修复产品缺陷保留为普通回归，并通过真实 HTTP 与 npm tarball 消费测试覆盖传输和发布边界。

## 4. 测试依据

- `README.md`：安装、使用方法、默认值、公开行为和示例；
- `src/*.ts`：当前运行时实现；
- `src/types.ts` 与 `dist/types/*.d.ts`：源码类型契约及生成的 npm 包声明；
- `package.json`：构建入口、运行脚本、依赖及发布入口；
- Fetch API、Streams API、AbortController、URLSearchParams 和 Headers 的标准运行时行为。

当 README、类型声明和实现不一致时，测试遵循以下优先级：

1. 明确且可验证的公开契约；
2. 多处文档与运行时共同体现的行为；
3. 当前实现行为仅作为兼容性基线；
4. 已确认差异登记为缺陷，不通过弱化断言掩盖。

## 5. 测试范围

### 5.1 已覆盖范围

| 模块 | 覆盖内容 |
| --- | --- |
| 工具函数 | body 转换、Blob 搜索、URL/参数/header/signal/config 合并、通用错误包装 |
| 核心请求 | URL 校验、查询串、RequestInit、7 个方法别名、请求体、响应对象 |
| 响应解析 | JSON、text、Blob、ArrayBuffer、FormData、none、204、无效 JSON |
| 错误体系 | HTTP 错误、fetch 拒绝、解析错误、错误继承、cause、debug 输出 |
| 超时与取消 | 默认超时、禁用超时、自定义超时、外部 signal、竞争顺序 |
| 进度 | 单/多文件上传、嵌套二进制体、下载分块、3 种下载结果、回调及流异常 |
| 拦截器 | 顺序、异步、替换配置、转换响应、恢复错误、删除、去重、快照和隔离 |
| 实例 | 配置快照、多级 URL、请求覆盖、拦截器复制、并发请求隔离 |
| 模块系统 | 7 个静态别名、Config 继承、两种装饰器写法、this 绑定、父子隔离 |
| 公共契约 | `src/index.ts` 导出、公开入口请求、源码类型与 `dist/types` 生成声明的正/反向类型用例 |
| 工程质量 | TypeScript 测试工程编译、项目构建、V8 覆盖率门槛 |

### 5.2 本轮不在自动化范围内

- 真实公网 API 的可用性、TLS、代理、DNS、CORS 和服务端兼容性；
- Chrome、Firefox、Safari 等真实浏览器矩阵；
- 弱网、断网重连、HTTP/2 或 HTTP/3 的端到端行为；
- 大文件压力、长时间稳定性、性能基准和内存峰值；
- npm 发布流程、registry 权限及真实安装后的多打包器兼容矩阵；
- README 文案、示例域名及第三方环境本身的正确性。

这些项目列入第 13 节的人工/扩展测试建议，不应被当前单元覆盖率替代。

## 6. 测试方法

### 6.1 白盒单元测试

对每个工具函数、错误类和分支进行输入等价类、边界值、异常注入及不可变性验证。重点检查空值、重复 key、多级嵌套、标准对象实例和失败回退。

### 6.2 Mock 组件集成测试

使用 `vitest-fetch-mock` 替换全局 `fetch`，从公开 `ajax`/`Service` 入口执行完整调用链，并检查实际传给 fetch 的 URL、method、headers、body、signal，以及最终 result/error。测试不依赖外部网络，结果可重复。

### 6.3 异步与流测试

使用可控 `ReadableStream`、AbortController 和 Vitest fake timers 模拟分块下载、流失败、超时及取消竞争，避免真实等待。

### 6.4 契约与类型测试

- 运行时测试验证公开 barrel export 的名称及对象身份；
- `test/types/public-api.typecheck.ts` 通过 `tsc` 验证泛型、配置、实例、拦截器与非法值；
- `@ts-expect-error` 同时用于验证非法输入必须报错，以及守卫已确认的类型声明缺陷。

### 6.5 覆盖率测试

V8 Coverage 对 `src/**/*.ts` 统计覆盖率。门槛如下：

| 指标 | CI 最低门槛 | 当前结果 |
| --- | ---: | ---: |
| Statements | 100% | 100%（327/327） |
| Branches | 99% | 99.45%（184/185） |
| Functions | 100% | 100%（67/67） |
| Lines | 100% | 100%（314/314） |

唯一未覆盖分支位于 `ajaxInstance.ts` 的防御性回退：正常 `core` 契约总会返回响应对象，现有可达路径无法令该值为 `undefined`。不使用人为 mock 内部模块来换取无业务意义的 100% 分支数字。

## 7. 测试环境与前置条件

当前验证环境：

| 项目 | 当前值 |
| --- | --- |
| 操作系统 | Windows win32-x64 |
| Node.js | 24.14.1 |
| npm | 11.19.0 |
| TypeScript | 6.0.3 |
| Vitest | 4.1.6 |

前置条件：

1. Node.js 运行时应原生提供 Fetch、Response、Blob、FormData、Web Streams 和 AbortController；
2. 在项目根目录执行命令；
3. 使用 lockfile 安装依赖，CI 推荐 `npm ci`；
4. 测试期间不需要真实网络或后端服务；
5. 不应设置会改变断言的全局 fetch mock；测试 setup 会在每条用例后重置 fetch、timer 和环境变量。

## 8. 执行方法

### 8.1 首次安装

```bash
npm ci
```

### 8.2 日常快速回归

```bash
npm test
```

### 8.3 类型声明检查

```bash
npm run test:typecheck
```

### 8.4 带覆盖率的完整自动化测试

```bash
npm run test:coverage
```

HTML 覆盖率报告生成在 `test/coverage/index.html`，该目录为生成物且已加入 `.gitignore`。

### 8.5 原生 HTTP 与发布包消费测试

```bash
npm run test:integration
npm run test:package
```

`test:integration` 仅访问进程内启动的 `127.0.0.1` 随机端口服务；`test:package` 安装真实 `npm pack` 产物并验证 ESM、CommonJS 与 TypeScript 消费。

### 8.6 CI / 发布候选建议命令

```bash
npm run test:release
```

`test:release` 会执行构建、类型检查、覆盖率测试、原生 HTTP 集成和真实 tarball 消费测试。任一普通用例、类型契约、覆盖率门槛或发布入口失败时，命令均应失败。

## 9. 自动化测试用例矩阵

下面的“用例”是按业务意图归并的逻辑用例；`it.each` 会按方法、状态码或响应类型展开，因此运行时总数高于表中行数。

### 9.1 工具函数

| 编号 | 场景与输入 | 预期结果 | 自动化位置 |
| --- | --- | --- | --- |
| UTL-001 | 普通对象、数组、自定义 `toJSON` | 序列化为 JSON 字符串 | `utility.spec.ts` |
| UTL-002 | string、null、undefined、number、boolean | 原值透传 | `utility.spec.ts` |
| UTL-003 | Blob、FormData、ArrayBuffer、URLSearchParams、ReadableStream | 标准 BodyInit 不序列化 | `utility.spec.ts` |
| UTL-004 | 循环引用或 `toJSON` 抛错 | 捕获序列化错误并返回原对象 | `utility.spec.ts` |
| UTL-005 | 单 Blob、ArrayBuffer、ReadableStream | 找到或转换为内容正确的 Blob | `utility.spec.ts` |
| UTL-006 | 数组、FormData、多级对象、重复引用 | 递归找到全部二进制项 | `utility.spec.ts` |
| UTL-007 | 空值、原始值、纯文本 FormData | 返回空 Blob 数组 | `utility.spec.ts` |
| UTL-008 | base/path、首尾多斜杠、URL 对象 | URL 正确拼接和标准化 | `utility.spec.ts` |
| UTL-009 | http/https/协议相对绝对 URL | 新绝对 URL 替换 base | `utility.spec.ts` |
| UTL-010 | 参数对象、字符串、pair 数组、URLSearchParams | 正确构造 URLSearchParams | `utility.spec.ts` |
| UTL-011 | 参数/header 冲突、重复 key | 后值覆盖，非冲突项保留 | `utility.spec.ts` |
| UTL-012 | 合并参数/header | 不修改 prev；next 标准实例等值复制且不共享引用 | `utility.spec.ts` |
| UTL-013 | 无 signal、单 signal、双 signal | 保留空值/原 signal，任一源中断可传播 | `utility.spec.ts` |
| UTL-014 | 0、1、2、多份 config 及 undefined | 无入参报错；其余正确归一化合并 | `utility.spec.ts` |
| UTL-015 | config 中 URL、参数、header、signal、falsy scalar | 分字段遵循各自合并/覆盖规则 | `utility.spec.ts` |
| UTL-016 | AjaxError、Error、原始拒绝值 | AjaxError 原样返回，其余按消息包装 | `utility.spec.ts` |
| UTL-017 | 缺少 `AbortSignal.any` 的双活跃 signal | 裸 merge 明确报错；scoped merge 传播 reason 并支持幂等 cleanup | `utility.spec.ts` |
| UTL-018 | 重复、预取消、注册竞争和注册异常 | 不产生多余 listener，异常路径清理已注册 listener | `utility.spec.ts` |
| UTL-019 | `mergeConfigScope` 合并多个 signal | 返回完整 config 和可显式释放的 cleanup | `utility.spec.ts` |

### 9.2 核心请求、响应与错误

| 编号 | 场景与输入 | 预期结果 | 自动化位置 |
| --- | --- | --- | --- |
| CORE-001 | 未提供 URL | 抛 TypeError，fetch 不执行 | `core.spec.ts` |
| CORE-002 | 直接调用 ajax，使用 URL 对象及完整 config | fetch 参数和返回 config 均正确 | `core.spec.ts` |
| CORE-003 | 原 URL 已有 query，再传编码参数 | 使用 `&` 追加且正确编码 | `core.spec.ts` |
| CORE-004 | credentials/cache/redirect/custom headers | 原生 RequestInit 正确透传 | `core.spec.ts` |
| CORE-005 | GET/DELETE/HEAD/OPTIONS | method 正确且无 body | `core.spec.ts` |
| CORE-006 | POST/PUT/PATCH + 普通对象 | method 正确且 body 为 JSON 字符串 | `core.spec.ts` |
| CORE-007 | POST + FormData | body 对象按引用透传 | `core.spec.ts` |
| CORE-008 | 普通 JSON body 未显式设置 Content-Type | 库不自动添加该 header | `core.spec.ts` |
| RESP-001 | 默认 JSON 响应 | result 解析正确，保留 native Response/status | `core.spec.ts` |
| RESP-002 | text/blob/arrayBuffer/formData | 按 responseType 返回对应类型和内容 | `core.spec.ts` |
| RESP-003 | responseType=none | 不消费响应，result 为 undefined | `core.spec.ts` |
| RESP-004 | 204 + none | 成功返回 undefined result | `core.spec.ts` |
| RESP-005 | 204 + 默认 JSON | 解析失败并包装为 AjaxError | `core.spec.ts` |
| ERR-001 | HTTP 400/401/404/500/503 | NetworkError，包含 status、Response 和 config | `core.spec.ts` |
| ERR-002 | fetch 拒绝 Error | NetworkError 保留原消息 | `core.spec.ts` |
| ERR-003 | fetch 拒绝字符串等非 Error | NetworkError 使用字符串化消息 | `core.spec.ts` |
| ERR-004 | fetch 已拒绝 AjaxError 子类 | 不重复包装，保持对象身份 | `core.spec.ts` |
| ERR-005 | 无效 JSON | AjaxError，包含 response/config 上下文 | `core.spec.ts` |
| ERR-006 | AjaxError 及三个子类 | 继承、type、默认/自定义消息、cause 正确 | `error.spec.ts` |
| ERR-007 | `CANLOOKS_AJAX_DEBUG=on/off` | 仅值为 on 时输出完整 config | `error.spec.ts` |

### 9.3 超时、取消与进度

| 编号 | 场景与输入 | 预期结果 | 自动化位置 |
| --- | --- | --- | --- |
| TIME-001 | 普通请求未传 timeout | 创建 60 秒 signal，请求完成后清理 timer | `timeout-abort.spec.ts` |
| TIME-002 | timeout=0 | 不创建内部 timeout signal/timer | `timeout-abort.spec.ts` |
| TIME-003 | pending fetch 达到自定义期限 | 抛 TimeoutError，cause 含 timeout | `timeout-abort.spec.ts` |
| TIME-004 | 请求进行中外部 controller.abort | 抛 AbortError，内部 signal 使用该原因 | `timeout-abort.spec.ts` |
| TIME-005 | 外部取消先于 timeout | 最终错误为 AbortError | `timeout-abort.spec.ts` |
| TIME-006 | timeout 先于外部取消 | 最终错误为 TimeoutError | `timeout-abort.spec.ts` |
| TIME-007 | fetch 自身抛 DOMException AbortError | 归为 NetworkError，而非伪造用户取消 | `timeout-abort.spec.ts` |
| TIME-008 | fallback 组合 signal 后 fetch 拒绝或 timeout | 源 signal listener 在最终拒绝前后全部清理 | `timeout-abort.spec.ts` |
| UPL-001 | FormData 含多个 Blob | 回调累计 loaded、total、chunk 正确 | `progress.spec.ts` |
| UPL-002 | 对象中嵌套 ArrayBuffer | 发现并报告完整字节数 | `progress.spec.ts` |
| UPL-003 | body 无二进制项 | 不调用上传进度回调 | `progress.spec.ts` |
| UPL-004 | 设置上传进度但未显式 timeout | 默认禁用 timeout | `progress.spec.ts` |
| UPL-005 | 上传进度回调抛错 | 包装为 AjaxError | `progress.spec.ts` |
| DNL-001 | Content-Length + 多个 chunk | Uint8Array 累积、loaded/total/chunk 正确 | `progress.spec.ts` |
| DNL-002 | 下载 responseType=arrayBuffer/blob/none | 返回对应累计结果 | `progress.spec.ts` |
| DNL-003 | 无 Content-Length + 默认 none | 不回调、不消费 stream、result undefined | `progress.spec.ts` |
| DNL-004 | 响应无 body | 不回调并安全返回 | `progress.spec.ts` |
| DNL-005 | 设置下载进度但未显式 timeout | 默认禁用 timeout | `progress.spec.ts` |
| DNL-006 | 下载进度 + json/text/formData | 抛明确的 unsupported AjaxError | `progress.spec.ts` |
| DNL-007 | 下载回调或响应流抛错 | 包装为 AjaxError | `progress.spec.ts` |

### 9.4 拦截器

| 编号 | 场景与输入 | 预期结果 | 自动化位置 |
| --- | --- | --- | --- |
| INT-001 | 请求拦截器修改 URL/params/header | fetch 使用修改后的配置 | `interceptors.spec.ts` |
| INT-002 | 同步和异步请求拦截器混合 | 严格按注册顺序串行执行 | `interceptors.spec.ts` |
| INT-003 | 请求拦截器返回新 config 对象 | 后续流程使用替换对象 | `interceptors.spec.ts` |
| INT-004 | 请求拦截器返回非对象 | 保留当前 config | `interceptors.spec.ts` |
| INT-005 | 删除请求拦截器 | 当前和后续请求均不再执行它 | `interceptors.spec.ts` |
| INT-006 | 执行过程中新增请求拦截器 | 当前请求使用快照，下次才运行新增项 | `interceptors.spec.ts` |
| INT-007 | 实例级 + onRequest | 实例级先执行，单次级后执行 | `interceptors.spec.ts` |
| INT-008 | 两级使用同一请求函数 | Set 去重，仅执行一次 | `interceptors.spec.ts` |
| INT-009 | 请求拦截器抛错 | 不调用 fetch，也不进入响应拦截器 | `interceptors.spec.ts` |
| INT-010 | 响应拦截器解包结果 | 返回转换后的任意值 | `interceptors.spec.ts` |
| INT-011 | 多个响应拦截器 | 前一转换值作为后一输入，顺序正确 | `interceptors.spec.ts` |
| INT-012 | 异步响应拦截器 | 等待 Promise 后返回转换值 | `interceptors.spec.ts` |
| INT-013 | 成功路径返回 undefined/null | undefined 保持原响应，null 为显式结果 | `interceptors.spec.ts` |
| INT-014 | HTTP 失败进入响应拦截器 | 可检查 NetworkError/config 并返回 fallback | `interceptors.spec.ts` |
| INT-015 | 响应拦截器重新抛错 | 最终 Promise 拒绝 | `interceptors.spec.ts` |
| INT-016 | 前一响应拦截器失败，后一恢复 | 返回后一恢复值 | `interceptors.spec.ts` |
| INT-017 | 错误路径拦截器返回 undefined | 按当前兼容行为视为已处理并返回 null | `interceptors.spec.ts` |
| INT-018 | 实例级 + onResponse/相同函数 | 顺序正确且重复函数只执行一次 | `interceptors.spec.ts` |

### 9.5 实例、模块与公开契约

| 编号 | 场景与输入 | 预期结果 | 自动化位置 |
| --- | --- | --- | --- |
| INS-001 | 默认 singleton 结构 | 可调用，暴露用于查看的配置快照、factory、sets 和 7 个别名 | `ajax-instance.spec.ts` |
| INS-002 | parent.create(child config) | 得到独立、完整归一化的配置快照 | `ajax-instance.spec.ts` |
| INS-003 | 多级 create URL | URL 范围逐级拼接 | `ajax-instance.spec.ts` |
| INS-004 | 实例默认值 + 单次 config | 参数/header/URL 按优先级合并 | `ajax-instance.spec.ts` |
| INS-005 | 单次绝对 URL | 替换全部继承 URL | `ajax-instance.spec.ts` |
| INS-006 | 创建子实例时已有拦截器 | 子实例复制 Set 内容而非共享 Set | `ajax-instance.spec.ts` |
| INS-007 | 创建后父子分别增删拦截器 | 双向隔离 | `ajax-instance.spec.ts` |
| INS-008 | 从 singleton 创建后修改原始 config、Headers、URLSearchParams | 实例仍使用创建时的值，且标准对象不共享引用 | `ajax-instance.spec.ts` |
| INS-009 | 从 child 创建后修改输入 Headers、URLSearchParams | 子实例仍使用创建时快照 | `ajax-instance.spec.ts` |
| INS-010 | create() 空配置 | 生成可用的归一化配置 | `ajax-instance.spec.ts` |
| INS-011 | 同实例并发读取配置快照 | resolved config 及其 params/headers 相互独立 | `ajax-instance.spec.ts` |
| INS-012 | 缺少 `AbortSignal.any` 时创建 25 个父子实例 | 创建阶段不注册 listener；25 次正常请求 add/remove 平衡 | `ajax-instance.spec.ts` |
| INS-013 | 请求拦截器抛错、前一请求已完成后再次请求 | finally 清理 listener，后续请求创建全新且可取消的 scope | `ajax-instance.spec.ts` |
| MOD-001 | Service 结构与 7 个静态别名 | 方法、URL 和 body 委托正确 | `module.spec.ts` |
| MOD-002 | @Config 本地配置 | 保存 config，创建独立 ajax，resolvedConfig 正确 | `module.spec.ts` |
| MOD-003 | 多级 Service 继承 | URL、params、headers、scalar 正确合并 | `module.spec.ts` |
| MOD-004 | 两种 RequestInterceptor 写法 | 均注册、执行并支持静态 this | `module.spec.ts` |
| MOD-005 | 两种 ResponseInterceptor 写法 | 均注册并可转换结果 | `module.spec.ts` |
| MOD-006 | 父/子模块拦截器 | 子继承父并追加自己的，父不受影响 | `module.spec.ts` |
| MOD-007 | 装饰器 + 单次拦截器 | 模块拦截器先执行 | `module.spec.ts` |
| MOD-008 | 无效非函数 descriptor | 防御性忽略，不注册拦截器 | `module.spec.ts` |
| MOD-009 | 服务默认参数/header + endpoint 覆盖 | 按优先级合并 | `module.spec.ts` |
| MOD-010 | endpoint 使用绝对 URL | 替换服务 URL | `module.spec.ts` |
| MOD-011 | Service 多级配置继承 signal | 装饰/创建阶段不监听，请求完成后释放继承 signal listener | `module.spec.ts` |
| API-001 | `src/index.ts` 导出集合 | 所有文档化运行时成员均存在 | `public-api.spec.ts` |
| API-002 | barrel export 对象身份 | singleton、class、utility 不被重复创建 | `public-api.spec.ts` |
| API-003 | 仅从公开入口发请求 | 泛型结果与运行时行为正确 | `public-api.spec.ts` |
| API-004 | scoped signal/config 工具公开导出 | 函数、signal/config 与 cleanup 均可从 barrel 使用 | `public-api.spec.ts` |
| TYP-001 | AjaxConfig、AjaxReturn、泛型别名、create | 正确代码通过 tsc | `public-api.typecheck.ts` |
| TYP-002 | request/response interceptor 类型 | 可加入对应 Set | `public-api.typecheck.ts` |
| TYP-003 | 非法 responseType 和 method | 必须产生 TypeScript 错误 | `public-api.typecheck.ts` |
| TYP-004 | `AbortSignalScope`、`ConfigScope` | 公开函数返回类型可被消费者直接声明和使用 | `public-api.typecheck.ts` |
| INT-001 | 原生 HTTP server 接收 `ajax.patch` | 服务端收到大写 PATCH 与正确 body | `integration/http-method.spec.ts` |
| INT-002 | 已取消 signal 调用原生 HTTP endpoint | Promise 返回 AbortError，服务端请求计数不增加 | `integration/http-method.spec.ts` |
| PKG-001 | 安装真实 npm tarball | ESM、CommonJS 命名导出及 TypeScript 类型均可消费 | `package-consumers.mjs` |

## 10. 已修复缺陷与回归用例

`test/suites/known-issues.spec.ts` 已全部改为普通回归。当前没有 `it.fails`；以下缺陷均由自动化测试持续守卫。

| 缺陷编号 | 修复后行为 | 自动化守卫 |
| --- | --- | --- |
| AJX-001 | 已取消 signal 立即传播 reason；请求前取消不调用 Fetch | `known-issues.spec.ts`、`timeout-abort.spec.ts` |
| AJX-002 | 成功、HTTP/Fetch/解析/进度失败均在 finally 清理 timer 与 listener | `known-issues.spec.ts`、`timeout-abort.spec.ts`、`progress.spec.ts` |
| AJX-003 | 无 Content-Length 的 arrayBuffer/blob 回退到原生解析，不泄漏 TypeError | `known-issues.spec.ts`、`progress.spec.ts` |
| AJX-004 | Service 泛型方法返回 `AjaxReturn<T>`，声明由源码生成 | `public-api.typecheck.ts`、`package-consumers.mjs` |
| AJX-108 | fallback signal 只在请求生命周期注册 listener；所有正常、失败、取消、超时和拦截器错误路径均显式 cleanup | `utility.spec.ts`、`ajax-instance.spec.ts`、`timeout-abort.spec.ts`、`module.spec.ts` |
| NEW-001 | ESM 内部引用带 `.js` 且有明确模块边界 | `package-consumers.mjs` |
| NEW-002 | alias 和传输边界均规范化大写方法 | `core.spec.ts`、`integration/http-method.spec.ts` |
| NEW-003 | ajax 明确为仅命名导出，运行时、类型和文档一致 | `public-api.spec.ts`、`package-consumers.mjs` |

上述 8 项缺陷均已修复；历史测试报告作为原始证据保留，不回写结论。

## 11. 验收标准

### 11.1 测试资产验收

- `npm run build` 成功；
- `npm run test:typecheck` 成功；
- `npm test` 中所有普通用例通过；
- expected-fail 数量必须为 0；
- 覆盖率不低于第 6.5 节门槛；
- 主测试套件不得访问真实网络；独立集成测试只允许访问进程内 `127.0.0.1` 随机端口，不得依赖外部服务；
- 测试计划、辅助代码、配置、类型用例和用例源码齐全。

### 11.2 产品版本准出标准

- 满足全部测试资产标准；
- 无未解决的高严重度缺陷；
- 中严重度缺陷已修复，或有明确风险接受记录和后续版本计划；
- 已修复缺陷全部由普通回归守卫，不得恢复为 `it.fails`；
- Service 返回类型和命名导出契约必须通过已安装 tarball 的消费者类型检查；
- 至少完成第 13 节 P0 人工测试；
- 发布产物在一个 ESM 和一个 CommonJS 消费项目中完成安装冒烟。

## 12. 缺陷分级与处理规则

| 级别 | 定义 | 处理要求 |
| --- | --- | --- |
| 高 | 错误请求、有副作用操作无法取消、核心功能不可用、数据/安全风险 | 阻断发布，必须修复或负责人书面豁免 |
| 中 | 资源泄漏、错误类型不一致、重要边界行为异常、类型声明妨碍使用 | 原则上发布前修复；若延期需登记风险 |
| 低 | 非核心兼容性、文案、可诊断性或小概率体验问题 | 可排期修复，不阻断既定发布 |

缺陷修复流程：复现 → 添加/确认 expected-fail → 修复实现 → 用例意外通过 → 移除 `.fails`/`@ts-expect-error` → 完整回归与覆盖率检查 → 更新本表。

## 13. 人工与扩展测试建议

| 编号 | 优先级 | 场景 | 验证点 |
| --- | --- | --- | --- |
| MAN-001 | P0 | 在 Chrome 与 Firefox 对真实同源测试服务执行 7 种 method | URL、headers、body、response 与错误一致 |
| MAN-002 | P0 | 对慢接口执行 timeout、请求中 abort 和请求前 abort | 服务端是否收到请求；错误类型和时机正确 |
| MAN-003 | P0 | ESM 与 CommonJS 最小消费项目安装本地打包产物 | import/require、命名导出和类型解析正常 |
| MAN-004 | P1 | 上传多个大 Blob/FormData 并观察进度 | 进度是否代表真实上传阶段、单调递增、total 正确 |
| MAN-005 | P1 | 下载有/无 Content-Length 的大文件 | 结果正确、回调行为明确、内存峰值可接受 |
| MAN-006 | P1 | 100～1000 个并发请求和多级实例 | 配置/拦截器无串扰，无明显 listener/timer 泄漏 |
| MAN-007 | P1 | CORS、302 redirect、credentials 和 cache | 原生 RequestInit 行为未被库破坏 |
| MAN-008 | P2 | Safari/WebKit 与较低 Node LTS | Blob.stream、WritableStream、Abort reason 兼容性 |

## 14. 当前执行结果

2026-08-31 在第 7 节环境执行：

| 检查项 | 结果 |
| --- | --- |
| `npm run build` | 通过 |
| `npm run test:typecheck` | 通过（AJX-004 类型缺陷守卫已移除） |
| `npm test` / coverage run | 10 个测试文件通过 |
| 主套件普通用例 | 226/226 通过 |
| 原生 HTTP 集成 | 2/2 通过 |
| 已登记 expected-fail | 0 |
| 总自动化运行时用例 | 228 |
| Statements / Functions / Lines | 100% / 100% / 100% |
| Branches | 99.45% |
| ESM / CommonJS / TypeScript tarball 消费 | 全部通过 |
| 非预期失败 | 0 |

## 15. 交付物

| 交付物 | 路径/说明 |
| --- | --- |
| 测试计划与说明 | `test/TEST_PLAN.md` |
| Vitest 配置与覆盖率门槛 | `test/vitest.config.ts` |
| TypeScript 测试配置 | `test/tsconfig.json` |
| 全局测试隔离设置 | `test/setup.ts` |
| fetch/stream/signal 测试辅助函数 | `test/helpers/fetch.ts`、`test/helpers/abort.ts` |
| 自动化运行时用例 | `test/suites/*.spec.ts`，共 10 个文件 |
| 公共类型契约用例 | `test/types/public-api.typecheck.ts` |
| HTML 覆盖率报告 | 执行后生成于 `test/coverage/index.html`（不提交） |
| npm 执行入口 | `test`、`test:typecheck`、`test:coverage`、`test:ci` |

## 16. 维护要求

- 新增公开功能时，至少补充正常、边界、错误和类型用例，并更新用例矩阵；
- 修改 README、运行时或 `src/types.ts` 时，应重新生成声明并检查三者契约一致性；
- 不得以降低覆盖率门槛替代测试补充；确需调整时必须记录原因；
- 不得把真实密钥、账号、生产 URL 或用户数据写入测试；
- 每条测试保持独立，禁止依赖其他用例产生的 fetch queue、timer、环境变量或拦截器状态；
- 当前发布基线不允许 expected-fail；未来如需临时引入，必须先修订测试计划并登记负责人和退出条件。
