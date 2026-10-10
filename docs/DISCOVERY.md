# Discovery · A2UI 在 crm-frontend 的应用

研究日期：2026-10-10。目标：交付独立、可复用、可发布的 React MVP，为 crm-frontend 日后接入提供实现与契约。本次没有修改 CRM 工作树，也没有连接生产业务数据。

## 结论与选择

建议从 **AI Coach 的证据和行动展示区** 开始，而不是替换整个 CRM 页面。CRM 已有稳定的路由、权限、学习计划 mutation、memory controls 和订阅逻辑；A2UI 最有价值的是让 agent 选择展示组件与绑定内容。业务副作用依然交给宿主已经验证的 hooks。

A2UI 描述 UI，A2A 协调 agent，AG-UI 可承载交互事件，MCP 提供工具与资源；它们可组合，不需要同时引入。此 MVP 采用现有技术栈能直接使用的 React renderer 和 HTTP stream adapter，不新增 agent framework。

## 已核实的官方状态

官方站点当前标记 v0.9.1 Current、v0.9 Previous Stable、v1.0 Candidate。官方 upstream 的 v0.9.1 evolution guide 说明该版本接受 v0.9/v0.9.1 payload，并规范 MIME 为 `application/a2ui+json`，surface ID 只需在活动集合中唯一。本项目支持这两个版本的受限 catalog。不要将新项目建立在 legacy v0.8 消息格式上。

官方 upstream 快照：`ce03d005c0575ff6708da583d9e7658a34df2d5d`，2026-10-10 获取。研究读取了该快照的 `specification/v0_9`、`v0_9_1` 文档及 schema，避免把会变化的官网状态当作永久承诺。

参考资料：

- [Google 发布文章](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)
- [官方 A2UI 项目](https://github.com/a2ui-project/a2ui)
- [v0.9.1 规范目录（固定快照）](https://github.com/a2ui-project/a2ui/tree/ce03d005c0575ff6708da583d9e7658a34df2d5d/specification/v0_9_1)
- [v0.9.1 evolution guide](https://github.com/a2ui-project/a2ui/blob/ce03d005c0575ff6708da583d9e7658a34df2d5d/specification/v0_9_1/docs/evolution_guide.md)
- [官方协议说明](https://a2ui.org/specification/v0.9-a2ui/)

## CRM 实际架构观察

仅记录接入所需架构，public 仓库不包含 CRM 源码、环境变量、真实学生数据或 tokens。

| 现有位置                                 | 观察                                                                      | 推荐接入方式                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| package.json                             | React 18.3、Vite 5、TypeScript、Zod 3、shadcn/Radix、React Query、Zustand | 本包 React peer 与 Zod 3 可兼容；demo 使用独立现代 Vite          |
| services/panelChatService.ts             | `/panel/v2` typed snapshot；POST `/chat/sessions/{id}` SSE；Bearer auth   | 首先适配 snapshot，再新增 `event: a2ui` 分支                     |
| hooks/useAICoachPanel.ts                 | session 建立、历史、streamChat、snapshot 更新                             | 宿主管生命周期；每个 session/page 分配独立 store                 |
| components/AICoachPanel/index.tsx        | 已有 coach 容器                                                           | 挂载 A2UISurface，保留 legacy fallback                           |
| components/pia-upgrade/PiaTypedCards.tsx | 证据、任务、学习计划、memory 操作与 entitlement                           | 保留业务 hooks；通过 action 白名单桥接                           |
| stores/aiCoachStore.ts                   | 持有 panel 状态                                                           | 无需把 runtime 数据复制进 Zustand，useSyncExternalStore 订阅即可 |
| lib/axios.ts / stores/authStore          | 现有 auth 管理                                                            | 客户端注入 fetch headers，runtime 不管理 token                   |
| router/index.tsx                         | `/ielts-writing`、`/speaking`、`/practice/vocabulary`、`/plan`            | navigation 校验 route 和角色后交给 react-router                  |

PanelV2Snapshot 已提供 pattern_cards、evidence_cards、action_cards、memory_controls。MVP adapter 支持前三类；memory correction、forget、plan confirmation 继续使用现有 UI。证据 excerpt 缺失时应展示“暂无证据”，不能由模型编造来源。

## 优先级与价值

1. P0：snapshot adapter，以 feature flag 在 Coach 小区域试运行，完全无需修改 agent 后端。
2. P1：后端输出结构化 A2UI SSE，组合文本回答与交互卡；添加 evidence source 验证。
3. P2：学习计划预览、确认、撤销；重用 React Query mutation、entitlements、审批 UI。
4. P3：学校匹配与 CRM follow-up 表单；新增 catalog domain component，避免自由布局膨胀。

MVP 实现确定性 snapshot 转换和协议 runtime；LLM 生成 UI 是下一阶段。Demo 记录操作，不会创建真实计划或修改 memory。

## 决策记录

**ADR 1 · 自定义受限 catalog。** 使用标准四种 envelope 与 flat component IDs，但不声称实现官方 Basic Catalog。这样可以固定字段、关闭未知属性并将 CRM 的视觉与操作留在可信代码中。catalog ID 需要双方明确协商。

**ADR 2 · 独立 npm 可打包库。** 独立于私有 CRM 发布，ESM 与 declaration 输出，React peer，CSS 单独导入。安装 tarball 后不依赖本机绝对路径。后续可以拆分 core/react exports。

**ADR 3 · 宿主负责 action。** Renderer 只发出结构化事件。它不解释任意 URL、不执行 JS、不携带 token，也不自动调用 CRM endpoint。后端必须重新验证用户、对象归属与权限。

**ADR 4 · stream 不自动 retry。** 重放 createSurface 与业务 POST 可能产生重复行为。MVP 对 malformed frame 抛错，宿主降级；生产重连需要序号、session ownership、snapshot 或幂等设计。

**ADR 5 · 限制图与数据。** 每消息 256KB、默认 16 surfaces、500 components/surface、32 渲染深度与每次最多 1000 个节点。超过时拒绝或停止渲染。逐消息原子提交；整条流不保证事务。

## 实施与验收路线

- 本仓库：runtime、renderer、transport、adapter、demo、schemas、tests、integration example、CI。
- CRM pilot：在 AI Coach 挂载 wrapper，保留旧版 fallback；只开放 viewEvidence/startTask 导航操作。
- Backend pilot：新增 `event: a2ui`；发送能力 metadata；用相同 schema 做 server-side validation；错误时回退文本。
- 生产门槛：跨 tenant/session 测试、entitlement 拒绝、对象 ownership、PII 日志策略、长流/中断、键盘与读屏、移动端、feature flag 回滚。

建议指标：UI 首次可交互耗时、payload/schema 错误率、action 拒绝率、用户任务完成率、fallback 比例。不要记录学生原文与完整 data model 到 analytics。

## 已知限制

没有完整标准一致性认证、SSR 流集成、reconnect replay、函数表达式、复杂表单 schema、富媒体、MCP/A2A/AG-UI transport binding 或真实模型服务。required 校验是 catalog 扩展，适合普通表单；列表模板里的 required 字段当前不提供逐行提交校验。所有能力边界见 PROTOCOL。下一步应按业务优先级扩展，而不是一次实现所有官方组件。
