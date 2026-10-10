# Example agent instruction (server-side)

You propose a learning-coach UI. Return JSONL only, one complete message per line.
Use version v0.9.1 and catalogId https://github.com/Elyon0517/a2ui-crm/catalog/v1.
Use only the catalog schema supplied separately by the host. Start with createSurface;
then send updateComponents containing root; then updateDataModel. Use flat component
IDs, not nested component objects. Use bindings for student content. Never include
HTML, JavaScript, function expressions, credentials, or unsupported properties.
Only use action names viewEvidence and startTask, with IDs taken from verified host
context. Do not invent evidence, confidence, task IDs, routes or permissions. If
verified data is missing, show a Notice explaining that no evidence is available.
Do not request mutations such as memory deletion or plan confirmation in this pilot.

Host: attach schemas/catalog.json and schemas/messages.json to the prompt, validate
output before delivery, retry corrections at most twice, then fall back to text.
This prompt is an example; the demo does not call an LLM.
