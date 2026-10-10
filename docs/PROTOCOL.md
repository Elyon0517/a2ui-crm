# Protocol / catalog contract

版本：`v0.9` / `v0.9.1`。catalog：`https://github.com/Elyon0517/a2ui-crm/catalog/v1`。每条消息只能包含 version 和一个操作键；未知字段拒绝。`root` 是每个 surface 的渲染入口。组件更新按 ID 完整替换该定义，其他组件保留；没有单组件 delete 操作。

| Component           | 必填字段                                       | 可选字段                              |
| ------------------- | ---------------------------------------------- | ------------------------------------- |
| Text                | text                                           | variant: h2/body/caption              |
| Row / Column / List | children: ID[] 或 {componentId,path}           | —                                     |
| Card                | child                                          | —                                     |
| Divider             | —                                              | —                                     |
| Button              | child, action                                  | disabled                              |
| TextField           | label, value: {path}                           | required, variant: shortText/longText |
| CheckBox            | label, value: {path}                           | —                                     |
| ChoicePicker        | label, value: {path}, options: {label,value}[] | —                                     |
| Metric              | label, value                                   | —                                     |
| EvidenceCard        | label, excerpt                                 | action                                |
| Notice              | text                                           | tone: info/success/warning            |

字符串显示字段可以使用字符串或 `{path}`；disabled 可以是 boolean 或 `{path}`。没有 function calls。ChoicePicker 的值为一个字符串，是此 catalog 的选择，与 Basic Catalog 的多值选择约定不同。文本总是 React escaped plain text，不解析 Markdown/HTML。

JSON Pointer：绝对 `/goal`；模板内相对 `name`；`~0` 为 `~`，`~1` 为 `/`。此实现沿用 A2UI 的 `/` 表示整个 data model。updateDataModel 在 path 处替换 value；省略 value 删除字段；省略 path 替换整个 model。数组支持现存索引写入、在 length 处追加和 splice 删除；不支持 `-` append。不会对 scalar 自动转换成 object。

```json
{"version":"v0.9.1","createSurface":{"surfaceId":"coach","catalogId":"https://github.com/Elyon0517/a2ui-crm/catalog/v1"}}
{"version":"v0.9.1","updateComponents":{"surfaceId":"coach","components":[{"id":"root","component":"Text","text":{"path":"/message"}}]}}
{"version":"v0.9.1","updateDataModel":{"surfaceId":"coach","value":{"message":"Ready to practice?"}}}
```

服务器 action 形式为 `{event:{name,context}}`，context 只接受 literal primitive 或 path binding。回调收到 `{action:{name,surfaceId,sourceComponentId,timestamp,context}}`，另一个参数是 transport metadata。只有 sendDataModel=true 才发送当前 surface 的 model，结构为 `a2uiClientDataModel.surfaces[surfaceId]`。宿主需确认接收端确实是该 surface owner。pending 状态在当前 surface 禁用 buttons；回调 Promise 完成后解锁。宿主仍需做服务端幂等处理。

Schemas 用 `npm run schemas` 从 Zod 生成；runtime Zod 与 schema 是同一字段契约。生成的 schema 是本项目契约，并未复用官方 catalog 的 `$defs/ComponentId` / `ChildList` 引用，因此不能用它声称通过官方结构图 validator。runtime 在渲染时检查循环、missing refs 和深度。
