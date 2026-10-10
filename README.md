# A2UI CRM · Agent insights, native React actions

一个面向 React CRM / AI Coach 的 **Google A2UI v0.9 / v0.9.1 受限实现**。把 agent 输出的声明式 JSON 渲染成可信组件，而不是执行生成的 HTML 或 JavaScript。

**喜欢就 Star ⭐！** [给项目一个 Star](https://github.com/Elyon0517/a2ui-crm)，帮助更多开发者发现它。

## Quick start

需要 Node.js 22.12+（推荐 Node 24）。无需 Gemini key，也无需 CRM 后端。

```bash
git clone https://github.com/Elyon0517/a2ui-crm.git
cd a2ui-crm
npm ci
npm run dev
# 打开终端显示的 http://127.0.0.1:5173
npm run check
```

Demo 包含 AI Coach 证据与行动卡、学习计划表单双向绑定、action inspector、JSON 消息 playground。全部使用合成数据；点击按钮记录本地事件，不会调用业务 API。

## 已实现

- TypeScript runtime：createSurface / updateComponents / updateDataModel / deleteSurface，独立 surface 生命周期、原子消息验证、订阅和只读快照。
- React 18/19 renderer：13 个受信组件、渐进占位、相对/绝对 JSON Pointer、列表模板、循环与深度限制。
- TextField / CheckBox / ChoicePicker 双向绑定、required 字段检查、pending 状态、action 名称白名单、错误回调。
- 增量 SSE / JSONL decoder：UTF-8 分片、CRLF、multiline data、heartbeat、EOF、AbortSignal 与 reader 清理。
- CRM PanelV2Snapshot adapter、内部路由白名单、组件 registry 替换、独立 CSS variables。
- 可生成的 JSON Schema、单元和交互测试、CI、可打包的 ESM + 类型声明。

## 最小使用

```tsx
import { A2UIStore, A2UISurface, CATALOG_ID } from "@elyon/a2ui-crm";
import "@elyon/a2ui-crm/styles.css";

const store = new A2UIStore();
store.apply({
  version: "v0.9.1",
  createSurface: {
    surfaceId: "coach",
    catalogId: CATALOG_ID,
  },
});
store.apply({
  version: "v0.9.1",
  updateComponents: {
    surfaceId: "coach",
    components: [
      { id: "root", component: "Text", text: "Ready for your next practice?" },
    ],
  },
});
export function Coach() {
  return (
    <A2UISurface
      store={store}
      surfaceId="coach"
      allowedActions={[]}
      onAction={async (event) => console.log(event)}
    />
  );
}
```

此包尚未发布 npm registry。使用 `npm pack` 或 GitHub Release tarball 安装，见集成指南。

## 文档

- [Discovery：协议研究、CRM 架构、应用路线、ADR](docs/DISCOVERY.md)
- [详细 Integration README：安装、snapshot、SSE、shadcn、后端契约、上线验收](docs/INTEGRATION_README.md)
- [协议能力与组件字段](docs/PROTOCOL.md)
- [安全边界与生产注意事项](docs/SECURITY.md)
- [Agent prompt](examples/agent-system-prompt.md)
- [可复制 CRM wrapper](examples/CRMCoach.tsx)
- [JSON Schema](schemas/catalog.json)

## Compatibility

接受 `version: "v0.9"` 和 `"v0.9.1"`，只支持本项目 `CATALOG_ID`。这是独立社区 MVP，非 Google 官方 SDK，非完整 Basic Catalog renderer。自定义 `required`、`disabled`、Metric、EvidenceCard、Notice 都属于本 catalog。ChoicePicker 使用单个字符串；Text 是纯文本。没有 v0.8、v1.0、函数表达式、Markdown、Image、Tabs、Modal、自动重连或生产后端。

React 是 peer dependency；CRM 自己持有 auth、路由、权限、mutation 和业务确认流程。不要把 access token 放入 agent data model。

## Development

```bash
npm run typecheck
npm test
npm run build         # dist: npm package
npm run demo:build    # demo-dist: static demo
npm run schemas      # build + regenerate catalog and envelope schema
npm run format
```

MIT license。A2UI 来源与规范链接记录在 Discovery；未复制 Google SDK 实现。欢迎 Issue / PR，喜欢就 Star ⭐。
