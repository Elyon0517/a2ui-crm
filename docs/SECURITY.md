# Security and ownership

Agent 提供数据与受限描述；所有渲染代码都在客户端 catalog 内。未知 component、catalog、version、额外字段拒绝。没有 eval、dangerouslySetInnerHTML、远程组件加载或模型驱动的自动 fetch。原型危险键在 object、pointer 和 ID 层拒绝。缺失组件显示占位；循环与巨大渲染树停止递归。

这并不自动解决业务授权。宿主必须验证 action name、context schema、session ownership、tenant、role、entitlement、对象 ID 和 navigation route。按钮传来的 taskId 只是输入，不能证明用户拥有该任务。修改计划、遗忘 memory、付款必须调用既有确认和 mutation 流程；后端重新校验。

Store 是内存态。切换用户、session 或 page 时取消旧流并清空 store，避免迟到消息更新新会话。不要将 token、密码、非必要学生信息放入 model。sendDataModel 默认 false；开启时必须明确接收方与数据最小化。事件日志应只记录名称、耗时、错误代码，不记录全文 context/model。

输入长度与消息体有预算限制，但当前每 surface model 的累计体积没有专门限制。生产需限制 session 流长度、累计 data size、发送频率和总会话时长。支持同名 surface 删除后重建；自动 retry 未实现，避免未经设计的重复重放。SSE 的 id/retry 字段不会用于重连。

Custom registry 是受信宿主代码，必须保持 React hook 规则、字段验证、可访问性和 action ownership；它能绕过默认 UI 行为，需自行审查。CSS 默认主题不能防止恶意 agent 文案；身份标签与证据来源仍应由服务器验证。
