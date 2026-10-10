# v0.1.0 Validation

2026-10-10 本地验收，Node 24.7.0。

- `npm run check` 通过：strict TypeScript、16 tests、package build、Vite demo build。
- Runtime tests：生命周期、原子拒绝、prototype 防护、readonly snapshot、pointer escape、array deletion、surface limit。
- Transport tests：CRLF/逐字符分片、multiline SSE、comments、DONE、EOF、JSONL、frame limit、逐字节中文 UTF-8、HTTP 401、abort。
- React tests：required 提示、双向绑定、resolved action context、sendDataModel metadata、action denylist、cycle 与 HTML escaping、模板相对路径、missing component placeholder、unsafe pointer rejection。
- 独立消费验证：tarball 安装到临时空项目，React 18.3.1 + TypeScript 5.5.3，编译 `examples/CRMCoach.tsx` 通过。
- 浏览器：Codex in-app browser 打开 localhost demo，确认 coach、evidence、学习计划表单和 playground 布局。
- `npm audit --omit=dev`：0 vulnerabilities；升级开发工具后完整 install audit 同样 0。

未验证：实际 CRM 修改后 build、真实 CRM 后端 API、生产授权与 tenant isolation、LLM 输出质量、移动设备/读屏器、完整官方协议一致性。CRM 源码仅用于 read-only discovery，本次没有修改 CRM 项目。
