# Integration README · 接入 crm-frontend

本指南以研究时的 React 18 / Vite / shadcn / React Router / panelChatService 架构为基准。`examples/CRMCoach.tsx` 可复制使用。无需修改 CRM 的 React、Vite、Zustand 版本。此处 SSE/action endpoint 是建议契约，当前 CRM 后端尚未提供，不能假设已经可用。

## 1. 安装已构建的包

本包未发布 npm registry。先在此仓库打包：

```bash
npm ci
npm run build
npm pack
# 输出 elyon-a2ui-crm-0.1.0.tgz
cd /path/to/crm-frontend
npm install /path/to/a2ui-crm/elyon-a2ui-crm-0.1.0.tgz
```

也可下载 GitHub v0.1.0 Release 的 tgz 后安装。不要直接安装未经 build 的 git checkout；dist 被 gitignore 排除。tarball 包含 JS、声明、CSS、schemas、示例和文档。使用 lockfile 固定版本。

## 2. 零后端改动的 snapshot pilot

复制 `examples/CRMCoach.tsx` 到 `src/components/AICoachPanel/CRMCoach.tsx`。把已有 PanelV2Snapshot 传入，不需要拷贝 CRM interface 到包内。

```tsx
const navigate = useNavigate();
// snapshot 为既有 fetchSnapshotV2 / aiCoachStore 得到的 PanelV2Snapshot
return enabled && snapshot ? (
  <CRMCoach snapshot={snapshot} navigate={navigate} />
) : (
  <PiaTypedCards snapshot={snapshot} />
);
```

上面是宿主渲染位置示意；请放在 snapshot 已存在的分支，不要给 PiaTypedCards 传 null。保持 memory controls 与现有学习计划确认区域；MVP 仅适配证据、pattern、行动展示。使用已有 feature flag 系统控制 enabled，默认先对内部用户开启。

Wrapper 的路由白名单来自已观察的 CRM routes，实际 deep_link 如果包含新路由需要宿主审核后加入。Route allowlist 只控制导航，AuthRoute 和后端 ownership 仍要保持。不要放开全部 `/` 前缀。

Snapshot 改变会 clear/recreate，适合只读卡片。需要保留输入的 agent 表单应采用增量 updateDataModel，不要每次 snapshot 重建。组件卸载时 clear。切换用户/session 时应更换 store 或清理旧状态。

## 3. 接入真实 A2UI stream

建议现有 `/chat/sessions/{id}` 支持下述事件，与 legacy answer/thought 共存：

```text
event: a2ui
data: {"version":"v0.9.1","createSurface":{"surfaceId":"coach","catalogId":"https://github.com/Elyon0517/a2ui-crm/catalog/v1"}}

```

一个 SSE event 承载一个 message，或 JSONL mode 每行一个 message。不是把 JSON 混到 `text` 字符串里。HTTP stream 使用 `Content-Type: text/event-stream`；`application/a2ui+json` 用于协议 payload 的 MIME 协商，而不是替代 SSE 的 HTTP content type。

```ts
import { consumeResponse } from "@elyon/a2ui-crm";
const controller = new AbortController();
const response = await fetch(
  `${baseURL}/chat/sessions/${encodeURIComponent(sessionId)}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      message,
      context: { page },
      metadata: store.capabilities(),
    }),
  },
);
await consumeResponse(
  response,
  (payload, event) => {
    if (event === "a2ui") store.apply(payload);
    else handleExistingChatEvent(payload); // 宿主已有 answer/thought/final 逻辑
  },
  { signal: controller.signal },
);
// effect cleanup / session switch: controller.abort(); store.clear();
```

handleExistingChatEvent 由宿主实现，不能删掉现有 session_id、agent_name、is_final、error 分支。SDK 对 malformed JSON 抛错，应 catch 后显示 legacy fallback 与错误状态。旧 panelChatService 当前按单行 `data:` 解析并且没有 `event` dispatch；需要把整个 reader loop 换成 consumeResponse，或让后端采用明确 `{type:'a2ui',payload:...}` 的应用层包装，再分发到 store.apply。不能在原 reader 上再并行读 body。

JSONL 可传 `{mode:'jsonl'}`；支持最后一行没有换行。SSE 支持 data 多行，忽略 heartbeat 和 DONE。没有自动 reconnect；重连须让后端发完整 snapshot，或提供可验证 event sequence。不要盲目重放 POST 请求。

## 4. Action → 宿主业务

onAction 收到解析后的 primitive context 与 metadata。allowedActions 必须列出宿主确实实现的命令；默认空数组。

```tsx
<A2UISurface
  store={store}
  surfaceId="coach"
  allowedActions={["viewEvidence", "startTask"]}
  onAction={async ({ action }, metadata) => {
    switch (action.name) {
      case "viewEvidence":
      case "startTask":
        navigate(
          safeCRMPath(action.context.deepLink, [
            "/ielts-writing",
            "/speaking",
            "/practice/vocabulary",
            "/plan",
          ]),
        );
        return;
      default:
        throw new Error("Unsupported action");
    }
  }}
/>
```

真正的 startTask mutation 要进一步检查 taskId、当前用户与 entitlement，调用已有 mutation hook，按原行为 invalidate React Query。若要回传 agent，建议新增 `POST /chat/sessions/{id}/a2ui-actions`，body 为 `{message: actionEnvelope, metadata}`。这只是建议 endpoint；服务器需实现 session ownership、catalog/action/context validation、权限、幂等键和响应流。SDK 不会自动调用它。

sendDataModel=true 时 metadata 包含当前 surface 完整 model。默认不要开启；仅在需要表单提交且已确认接收方时开启。不能把 metadata 发给任意模型提供商。字段 validation 是 UI 提示，不能替代后端校验。

## 5. 使用 shadcn 替换默认组件

Registry 只接受受信宿主 React 组件。可以替换单个类型，而不重写 protocol runtime：

```tsx
import { Button } from "@/components/ui/button";
import type { Registry, RenderContext } from "@elyon/a2ui-crm";
function CRMButton({
  component,
  render,
  dispatch,
  resolve,
  pending,
}: RenderContext) {
  if (component.component !== "Button") return null;
  return (
    <Button
      disabled={pending || Boolean(resolve(component.disabled))}
      onClick={dispatch}
    >
      {render(component.child)}
    </Button>
  );
}
const registry: Registry = { Button: CRMButton };
```

Custom registry 应使用 context.pending 保留默认防重复提交行为。推荐先替换 Text/Card/Metric 等只读类型。不要直接把 agent 属性 spread 到 DOM。输入组件必须使用 context.setValue 写入；只读 React local state 会失去 data model 同步。

主题：导入包 CSS，然后设置宿主容器变量：

```css
.crm-coach {
  --a2ui-primary: #0e4af7;
  --a2ui-text: #18243c;
}
```

默认样式 scope 为 `.a2ui-surface`，和 Tailwind 可共存。复杂 spacing / dark mode 可使用 registry；MVP createSurface 不接受任意 theme 或 CSS。

## 6. 后端 Agent 生成流程

1. Capability handshake 携带 supportedCatalogIds。
2. 服务端按 catalog ID 选择固定 schema；不要自动下载 catalog URL。
3. 构建 system prompt + `schemas/catalog.json` / `schemas/messages.json` + 已验证业务 context。
4. 生成 JSONL；使用 Zod 契约或对应 JSON Schema 在服务端验证。
5. 检查 action allowlist、证据来源、对象 ownership 和数据最小化。
6. 最多两次 correction；仍失败则返回文本与已有 snapshot。
7. 逐消息传输；前端再次验证。

本包没有 LLM provider，避免强制绑定 Gemini / ADK。使用 Google agent 时同样只需输出上述协议，无需浏览器调用模型 API。

## 7. 上线检查与回滚

- 安装 tarball，CRM typecheck/build 通过。
- Snapshot 空数据、证据、多行动、任务无 deep_link 时正确显示。
- session/user/page 切换取消旧流，不展示其他用户卡片。
- malformed payload、超限、401、断流可降级，legacy 文本保持可读。
- 校验 route、权限、entitlement；对重复 action 服务端幂等。
- 表单中文输入、键盘 focus、窄屏、错误提示、提交 pending 检查。
- analytics 只记录 action 名称和耗时，不记录学生全文。

关闭 feature flag 即恢复 PiaTypedCards。初期不要让 A2UI 成为 session / plan 的唯一 source of truth。Release 升级前检查 catalog ID 与字段变化；breaking catalog 需要新 ID，而不是静默改变 v1。
