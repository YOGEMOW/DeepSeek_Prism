/** DeepSeek Prism settings card copy keys. */
export type PrismKey =
  | 'cardTitle'
  | 'cardDescription'
  | 'apiKeyLabel'
  | 'apiKeyHint'
  | 'apiKeySet'
  | 'apiKeyUnset'
  | 'modelLabel'
  | 'modelHint'
  | 'baseUrlLabel'
  | 'baseUrlHint'
  | 'regionLabel'
  | 'regionHint'
  | 'regionCn'
  | 'regionGlobal'
  | 'showUsageLabel'
  | 'showUsageHint'
  | 'showBalanceLabel'
  | 'showBalanceHint'
  | 'overridden'
  | 'reset'
  | 'save'
  | 'discard'
  | 'saving'
  | 'saveFailed'
  | 'readOnly'
  | 'expand'
  | 'collapse'
  | 'unsaved'
  | 'cardUnavailable'
  | 'cardUnavailableEnv'
  | 'cardUnavailableRow'

export const zh: Record<PrismKey, string> = {
  cardTitle: 'DeepSeek Prism（识图）',
  cardDescription: '配置外部视觉 API 密钥与模型：让无法读图的纯文本模型通过 prism_see 工具提取图片事实。',
  apiKeyLabel: '视觉 API 密钥',
  apiKeyHint: '写后即掩，界面不回显；留空保存表示不修改。也可用环境变量 SILICONFLOW_API_KEY。',
  apiKeySet: '已设置',
  apiKeyUnset: '未设置',
  modelLabel: '视觉模型',
  modelHint: 'OpenAI 兼容视觉模型 ID，默认 zai-org/GLM-4.5V。',
  baseUrlLabel: 'API Base URL',
  baseUrlHint: 'OpenAI 兼容接口根地址，默认 https://api.siliconflow.cn/v1。',
  regionLabel: '区域',
  regionHint: 'cn 优先国内 Provider；global 优先国际 Provider。',
  regionCn: 'cn（国内）',
  regionGlobal: 'global（国际）',
  showUsageLabel: '显示识别消耗 token',
  showUsageHint: '在识别结果链接上显示本次消耗的 token 数。',
  showBalanceLabel: '显示余额与消耗额',
  showBalanceHint: '在识别结果展开区显示账户余额与本次消耗金额。',
  overridden: '已覆盖',
  reset: '重置',
  save: '保存',
  discard: '放弃',
  saving: '保存中…',
  saveFailed: '保存失败，请重试',
  readOnly: '当前设置文档只读，无法保存。',
  expand: '展开',
  collapse: '收起',
  unsaved: '有未保存的修改',
  cardUnavailable: '当前 harness 未把 deepseek-prism 设置命名空间加入 Web 设置白名单（api-proxy），此卡片不可编辑；DeepSeek Prism 照常工作，改由下列方式配置。',
  cardUnavailableEnv: '环境变量：SILICONFLOW_API_KEY（或 VISION_API_KEY）、VISION_BASE_URL、VISION_MODEL、VISION_REGION。',
  cardUnavailableRow: '行配置：在 profile 的 cordis.patch.yml 中按 id 为 prism 行提供 config（apiKey / model / baseUrl / region），保存后重启。',
}

export const en: Record<PrismKey, string> = {
  cardTitle: 'DeepSeek Prism (vision)',
  cardDescription: 'Configure the external vision API key and model: lets text-only models extract image facts through the prism_see tool.',
  apiKeyLabel: 'Vision API key',
  apiKeyHint: 'Write-only; never echoed back. Leave blank on save to keep the stored value. SILICONFLOW_API_KEY env is the fallback.',
  apiKeySet: 'Configured',
  apiKeyUnset: 'Not configured',
  modelLabel: 'Vision model',
  modelHint: 'OpenAI-compatible vision model ID. Default zai-org/GLM-4.5V.',
  baseUrlLabel: 'API base URL',
  baseUrlHint: 'OpenAI-compatible endpoint root. Default https://api.siliconflow.cn/v1.',
  regionLabel: 'Region',
  regionHint: 'cn prefers domestic providers; global prefers international ones.',
  regionCn: 'cn (domestic)',
  regionGlobal: 'global (international)',
  showUsageLabel: 'Show recognition token usage',
  showUsageHint: 'Show the token count spent on the recognition link.',
  showBalanceLabel: 'Show balance and cost',
  showBalanceHint: 'Show the account balance and per-recognition cost when expanded.',
  overridden: 'Overridden',
  reset: 'Reset',
  save: 'Save',
  discard: 'Discard',
  saving: 'Saving…',
  saveFailed: 'Save failed, try again',
  readOnly: 'The settings document is read-only; saving is disabled.',
  expand: 'Expand',
  collapse: 'Collapse',
  unsaved: 'Unsaved changes',
  cardUnavailable: 'This harness does not include the deepseek-prism settings namespace in the Web settings allowlist (api-proxy), so this card is read-only guidance. DeepSeek Prism keeps working; configure it through either channel below.',
  cardUnavailableEnv: 'Environment variables: SILICONFLOW_API_KEY (or VISION_API_KEY), VISION_BASE_URL, VISION_MODEL, VISION_REGION.',
  cardUnavailableRow: 'Row config: in your profile\'s cordis.patch.yml, patch the prism row by id with a config (apiKey / model / baseUrl / region), then restart.',
}
