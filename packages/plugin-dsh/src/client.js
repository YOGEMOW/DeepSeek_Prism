/**
 * @yogemow/deepseek-prism-dsh —— 浏览器半体（手写 bundle，免构建）。
 *
 * 在设置页的「插件」配置页注册一张 DeepSeek Prism 卡片：
 *  - 视觉 Provider / 模型 / 区域 / 密钥环境变量名（凭据引用）：写入设置命名空间
 *    `deepseek-prism-dsh`（settings 域）；
 *  - 视觉 API 密钥：只写不回显（type=password，保存后仅显示「已配置」徽标），
 *    经 credentials 域写入凭据库，明文永不随响应返回。
 *
 * bundle 契约：window.__ModuleLoader__.load({ id, factory(require) })，
 * 平台模块表提供 'react' 等共享模块；其余协作全部走注入服务（slots/locale/
 * connection/settingsScope/remote），无跨插件值导入。
 */
window.__ModuleLoader__.load({ id: '@yogemow/deepseek-prism-dsh', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
const React = require('react');

const PRISM_NS = 'deepseek-prism';
const SETTINGS_NS = 'deepseek-prism-dsh';
const DEFAULT_API_KEY_REF = 'SILICONFLOW_API_KEY';
const PROVIDER_OPTIONS = ['', 'siliconflow', 'zhipu', 'modelscope', 'alibaba', 'openrouter', 'groq', 'custom'];
const REGION_OPTIONS = ['cn', 'global'];
const DEGRADE_OPTIONS = ['pointer', 'vep'];

const zh = {
  cardTitle: 'DeepSeek Prism（识图）',
  cardDescription: '视觉 API 密钥与模型选择；纯文本模型图片降级。密钥保存后不回显明文。',
  apiKey: '视觉 API 密钥',
  apiKeyHint: '必填。写入凭据库，保存后仅显示「已配置」，明文不随任何响应返回。',
  apiKeySet: '已配置',
  apiKeyUnset: '未配置',
  apiKeyEnv: '密钥环境变量名（凭据引用）',
  apiKeyEnvHint: 'vision.mjs 读取的环境变量名，默认 SILICONFLOW_API_KEY。',
  provider: '视觉 Provider',
  providerHint: '留空 = auto（按区域优先级自动降级）。',
  model: '模型',
  modelHint: '留空 = Provider 默认模型。',
  region: '区域',
  regionHint: 'cn / global。',
  degradeMode: '图片降级模式',
  degradeModeHint: '文本指针 = 零补丁默认，模型按技能脚本分析附件；VEP 转换 = 需 harness 最小补丁（见 harness-patch），发图直转证据并保留原图与用量显示；未打补丁时请勿切换。',
  degradePointer: '文本指针（零补丁）',
  degradeVep: 'VEP 转换（需补丁）',
  showUsage: '显示识别消耗 token',
  showUsageHint: '在识别结果后附加本次消耗的 token 数（仅 VEP 模式）。',
  showBalance: '显示余额与消耗额',
  showBalanceHint: '识别时查询账户余额并估算本次消耗金额（仅 VEP 模式；余额需 SiliconFlow 接口支持）。',
  expand: '展开',
  collapse: '收起',
  unsaved: '有未保存的修改',
  readOnly: '当前设置文档只读，无法保存。',
  overridden: '已覆盖',
  reset: '重置',
  save: '保存',
  discard: '放弃',
  saving: '保存中…',
  failed: '保存未生效',
  invalid: '该值不被接受',
};
const en = {
  cardTitle: 'DeepSeek Prism (vision)',
  cardDescription: 'Vision API key, model selection, and image degradation for text-only models; the key is never echoed back.',
  apiKey: 'Vision API key',
  apiKeyHint: 'Required. Written to the credential store; after saving only a "configured" badge is shown.',
  apiKeySet: 'Configured',
  apiKeyUnset: 'Not configured',
  apiKeyEnv: 'Key environment variable (credential ref)',
  apiKeyEnvHint: 'The env var vision.mjs reads; defaults to SILICONFLOW_API_KEY.',
  provider: 'Vision provider',
  providerHint: 'Empty = auto (region-priority fallback).',
  model: 'Model',
  modelHint: 'Empty = provider default model.',
  region: 'Region',
  regionHint: 'cn / global.',
  degradeMode: 'Image degradation mode',
  degradeModeHint: 'Text pointer = zero-patch default, the model runs the skill script on the attachment; VEP conversion = requires the harness minimal patch (see harness-patch), converts at admission and keeps the original image and usage display; keep pointer when unpatchd.',
  degradePointer: 'Text pointer (zero patch)',
  degradeVep: 'VEP conversion (patched)',
  showUsage: 'Show recognition token usage',
  showUsageHint: 'Append the token count spent on the recognition (VEP mode only).',
  showBalance: 'Show balance and cost',
  showBalanceHint: 'Query the account balance and estimate the cost (VEP mode only; balance needs the SiliconFlow endpoint).',
  expand: 'Expand',
  collapse: 'Collapse',
  unsaved: 'Unsaved changes',
  readOnly: 'The settings document is read-only; saving is disabled.',
  overridden: 'Overridden',
  reset: 'Reset',
  save: 'Save',
  discard: 'Discard',
  saving: 'Saving…',
  failed: 'Save did not land',
  invalid: 'Value not accepted',
};

/** 极简快照 store（等价于运行时 createSnapshotStore 的卡片用法）。 */
function createSnapshotStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    getSnapshot: () => value,
    set: (next) => {
      value = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** 文本字段规格：空草稿 = 清除，其余 = 设值。 */
function textSpec(field) {
  return {
    field,
    format: (value) => (typeof value === 'string' ? value : ''),
    parse: (text) => {
      const trimmed = String(text ?? '').trim();
      return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed };
    },
  };
}

/** 布尔字段规格：'true'/'false' 文本 ↔ 布尔值。 */
function boolSpec(field) {
  return {
    field,
    format: (value) => (value === true ? 'true' : 'false'),
    parse: (text) => {
      const v = String(text ?? '').trim();
      if (v === 'true') return { kind: 'set', value: true };
      if (v === 'false') return { kind: 'set', value: false };
      return undefined;
    },
  };
}

/** 凭据引用：设置段声明的环境变量名，缺省用默认引用。 */
function refOf(snapshot) {
  const declared = snapshot?.value?.apiKeyEnv;
  return declared !== undefined && String(declared).length > 0 ? declared : DEFAULT_API_KEY_REF;
}

/** 设置卡片控制器：暂存编辑 → 保存时写设置域与凭据域，Host 是唯一权威。 */
class PrismCardController {
  constructor(scope, api) {
    this.scope = scope;
    this.api = api;
    this.specs = new Map([
      ...['provider', 'model', 'region', 'apiKeyEnv', 'degradeMode'].map((field) => [field, textSpec(field)]),
      ['showUsage', boolSpec('showUsage')],
      ['showBalance', boolSpec('showBalance')],
    ]);
    this.staged = new Map();
    this.credential = { ref: '', configured: false, writable: true };
    this.listeners = new Set();
    this.saving = false;
    this.failed = false;
    this.store = createSnapshotStore(this.projection());
    scope.subscribe(() => { this.publish(); });
    void this.readCredential();
  }

  projection() {
    const snapshot = this.scope.getSnapshot();
    const plan = this.plan();
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some((item) => item.run === undefined),
      saving: this.saving,
      failed: this.failed,
      provider: this.field('provider'),
      model: this.field('model'),
      region: this.field('region'),
      apiKeyEnv: this.field('apiKeyEnv'),
      apiKey: this.field('apiKey'),
      apiKeyConfigured: this.credential.configured,
      apiKeyWritable: this.credential.writable,
      providerOptions: PROVIDER_OPTIONS,
      regionOptions: REGION_OPTIONS,
      degradeMode: this.field('degradeMode'),
      degradeModeOptions: DEGRADE_OPTIONS,
      showUsage: this.field('showUsage'),
      showBalance: this.field('showBalance'),
    };
  }

  field(field) {
    const staged = this.staged.get(field);
    if (field === 'apiKey') {
      return { text: staged?.text ?? '', overridden: false, invalid: false };
    }
    const spec = this.spec(field);
    if (staged === undefined) {
      return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false };
    }
    const write = staged.clear ? { kind: 'clear' } : spec.parse(staged.text);
    return { text: staged.text, overridden: write?.kind === 'set', invalid: write === undefined };
  }

  actions() {
    return {
      edit: (field, text) => { this.stage(field, { text, clear: false }); },
      resetField: (field) => {
        const spec = this.spec(field);
        this.stage(field, { text: spec.format(this.baseValue(field)), clear: true });
      },
      save: () => { void this.save(); },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return;
        this.staged.clear();
        this.failed = false;
        this.publish();
      },
    };
  }

  inject() {
    return { hooks: { prismCard: this.store }, ...this.actions() };
  }

  async save() {
    const plan = this.plan();
    const writes = plan.flatMap((item) => item.run === undefined ? [] : [item.run]);
    if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
    this.saving = true;
    this.failed = false;
    this.publish();
    let landed = true;
    for (const write of writes) {
      landed = (await write()) && landed;
    }
    if (landed) this.staged.clear();
    this.saving = false;
    this.failed = !landed;
    this.publish();
  }

  plan() {
    const plan = [];
    for (const [field, staged] of this.staged) {
      if (field === 'apiKey') {
        const value = String(staged.text ?? '').trim();
        if (value !== '') plan.push({ field, run: () => this.writeKey(value) });
        continue;
      }
      const spec = this.spec(field);
      if (staged.clear) {
        if (this.stored(field)) plan.push({ field, run: () => this.clear(field) });
        continue;
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue;
      const write = spec.parse(staged.text);
      if (write === undefined) plan.push({ field, run: undefined });
      else if (write.kind === 'clear') plan.push({ field, run: () => this.clear(field) });
      else plan.push({ field, run: () => this.store(field, write.value) });
    }
    return plan;
  }

  async clear(field) {
    await this.scope.unset(field);
    return !this.stored(field);
  }

  async store(field, value) {
    await this.scope.set(field, value);
    return this.userLayer()?.[field] === value;
  }

  async writeKey(value) {
    try {
      await this.api.credentials.set({ ref: refOf(this.scope.getSnapshot()), value });
    } catch {
      // Host 是唯一权威；下面回读真实状态。
    }
    await this.readCredential();
    return this.credential.configured;
  }

  async readCredential() {
    const ref = refOf(this.scope.getSnapshot());
    if (ref !== this.credential.ref) {
      this.credential = { ref, configured: false, writable: true };
      this.publish();
    }
    let response;
    try {
      response = await this.api.credentials.describe({ refs: [ref] });
    } catch {
      return;
    }
    if (!response.result.ok || ref !== refOf(this.scope.getSnapshot())) return;
    const view = response.result.value.credentials[ref];
    const next = {
      ref,
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
    };
    if (next.configured === this.credential.configured && next.writable === this.credential.writable) return;
    this.credential = next;
    this.publish();
  }

  refreshCredential(ref) {
    if (ref !== this.credential.ref) return;
    void this.readCredential();
  }

  stage(field, edit) {
    this.staged.set(field, edit);
    this.failed = false;
    this.publish();
  }

  spec(field) {
    const spec = this.specs.get(field);
    if (spec === undefined) throw new Error(`deepseek-prism-dsh card has no field ${field}`);
    return spec;
  }

  sectionValue(field) {
    return this.scope.getSnapshot().value?.[field];
  }

  baseValue(field) {
    return this.scope.getSnapshot().base?.[field];
  }

  userLayer() {
    return this.scope.getSnapshot().user;
  }

  stored(field) {
    const user = this.userLayer();
    return user !== undefined && Object.hasOwn(user, field);
  }

  publish() {
    this.store.set(this.projection());
  }
}

/* ---------- 卡片渲染（PluginCard 风格，--dsw 主题 token；React.createElement，无 JSX） ---------- */

const cardBase = {
  listStyle: 'none',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-3)',
  transition: 'border-color .16s, background .16s',
};
const cardOpen = {
  ...cardBase,
  background: 'var(--dsw-alias-bg-layer-2)',
  borderColor: 'var(--dsw-alias-label-dimmed)',
};
const headerStyle = {
  width: '100%', appearance: 'none', border: 0, background: 'none', font: 'inherit', color: 'inherit',
  textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 16px', borderRadius: 12,
};
const headTextStyle = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 };
const nameStyle = { fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'var(--dsw-alias-label-primary)' };
const descriptionStyle = { fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' };
const pendingStyle = {
  flex: 'none', borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px',
  fontWeight: 500, whiteSpace: 'nowrap', background: 'var(--dsw-alias-bg-module-platform)',
  color: 'var(--dsw-alias-label-secondary)',
};
const chevronStyle = {
  flex: 'none', width: 8, height: 8, borderRight: '1.5px solid var(--dsw-alias-label-tertiary)',
  borderBottom: '1.5px solid var(--dsw-alias-label-tertiary)', transform: 'rotate(45deg)',
  transition: 'transform .16s',
};
const chevronOpenStyle = { ...chevronStyle, transform: 'rotate(-135deg)' };
const bodyStyle = {
  borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '0 16px', paddingBottom: 8,
};
const readOnlyStyle = { margin: '12px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' };
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0' };
const fieldFirstStyle = { ...fieldStyle, paddingTop: 12 };
const fieldSepStyle = { borderTop: '1px solid var(--dsw-alias-border-l2)' };
const fieldHeadStyle = { display: 'flex', alignItems: 'center', gap: 8 };
const labelStyle = { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)' };
const badgesStyle = { display: 'inline-flex', alignItems: 'center', gap: 8 };
const badgeStyle = {
  borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px', whiteSpace: 'nowrap',
  fontWeight: 500, background: 'var(--dsw-alias-bg-module-platform)', color: 'var(--dsw-alias-label-secondary)',
};
const badgeMutedStyle = {
  borderRadius: 999, padding: '1px 8px', fontSize: 11, lineHeight: '17px', whiteSpace: 'nowrap',
  color: 'var(--dsw-alias-label-tertiary)',
};
const resetStyle = {
  border: 'none', background: 'none', padding: 0, font: 'inherit', fontSize: 12, lineHeight: 1.5,
  color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer',
};
const inputStyle = {
  height: 34, padding: '0 12px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-3)', font: 'inherit', fontSize: 13, lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
};
const hintStyle = { margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' };
const footerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
  padding: '12px 0 4px', borderTop: '1px solid var(--dsw-alias-border-l2)',
};
const failedStyle = { flex: 1, minWidth: 0, margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-error)' };
const buttonBase = {
  appearance: 'none', border: '1px solid transparent', borderRadius: 8, padding: '5px 14px',
  font: 'inherit', fontSize: 13, lineHeight: 1.5, cursor: 'pointer',
};
const discardStyle = { ...buttonBase, borderColor: 'var(--dsw-alias-border-l2)', background: 'none', color: 'var(--dsw-alias-label-secondary)' };
const saveStyle = { ...buttonBase, background: 'var(--dsw-alias-label-primary)', color: 'var(--dsw-alias-bg-layer-3)' };
const disabledStyle = { opacity: 0.4, cursor: 'default' };

/** 字段行：label（+ 覆盖徽章/重置）→ 控件 → hint；非首个字段带分隔线。 */
function FieldRow({ id, label, hint, overridden, overriddenLabel, resetLabel, disabled, onReset, control, first }) {
  return React.createElement('div', {
    style: first ? fieldFirstStyle : { ...fieldStyle, ...fieldSepStyle },
  },
    React.createElement('div', { style: fieldHeadStyle },
      React.createElement('label', { htmlFor: id, style: labelStyle }, label),
      overridden
        ? React.createElement('span', { style: badgesStyle },
            React.createElement('span', { style: badgeStyle }, overriddenLabel),
            React.createElement('button', { type: 'button', style: resetStyle, disabled, onClick: onReset }, resetLabel))
        : null,
    ),
    control,
    React.createElement('p', { style: hintStyle }, hint),
  );
}

function TextField({ id, label, hint, state, overridden, overriddenLabel, resetLabel, disabled, onEdit, onReset, first }) {
  return FieldRow({
    id, label, hint, overridden, overriddenLabel, resetLabel, disabled, onReset, first,
    control: React.createElement('input', {
      id,
      style: state.invalid ? { ...inputStyle, borderColor: 'var(--dsw-alias-label-error)' } : inputStyle,
      type: 'text',
      value: state.text,
      disabled,
      onChange: (event) => { onEdit(event.target.value); },
    }),
  });
}

function SelectField({ id, label, hint, state, overridden, overriddenLabel, resetLabel, options, disabled, onEdit, onReset, labelOf, first }) {
  const labelFor = labelOf ?? ((option) => (option === '' ? '(auto)' : option));
  return FieldRow({
    id, label, hint, overridden, overriddenLabel, resetLabel, disabled, onReset, first,
    control: React.createElement('select', {
      id,
      style: inputStyle,
      value: state.text,
      disabled,
      onChange: (event) => { onEdit(event.target.value); },
    }, options.map((option) => React.createElement('option', { key: option, value: option }, labelFor(option)))),
  });
}

function SecretField({ id, label, hint, state, configured, stateLabel, disabled, onEdit, first }) {
  return React.createElement('div', {
    style: first ? fieldFirstStyle : { ...fieldStyle, ...fieldSepStyle },
  },
    React.createElement('div', { style: fieldHeadStyle },
      React.createElement('label', { htmlFor: id, style: labelStyle }, label),
      React.createElement('span', { style: badgesStyle },
        React.createElement('span', { style: configured ? badgeStyle : badgeMutedStyle }, stateLabel)),
    ),
    React.createElement('input', {
      id,
      style: inputStyle,
      type: 'password',
      autoComplete: 'off',
      value: state.text,
      disabled,
      placeholder: '••••••••••••••••',
      onChange: (event) => { onEdit(event.target.value); },
    }),
    React.createElement('p', { style: hintStyle }, hint),
  );
}

function CheckboxField({ id, label, hint, checked, disabled, onToggle, first }) {
  return React.createElement('div', {
    style: first ? fieldFirstStyle : { ...fieldStyle, ...fieldSepStyle },
  },
    React.createElement('div', { style: fieldHeadStyle },
      React.createElement('label', { htmlFor: id, style: labelStyle }, label),
      React.createElement('input', {
        id,
        type: 'checkbox',
        checked,
        disabled,
        onChange: () => { onToggle(); },
      }),
    ),
    React.createElement('p', { style: hintStyle }, hint),
  );
}

function PrismCard(props) {
  const state = props.usePrismCard((snapshot) => snapshot);
  const t = props.t;
  const disabled = !state.writable;
  const [open, setOpen] = React.useState(false);
  if (!state.available) return null;
  const title = t('cardTitle');
  return React.createElement('li', { style: open ? cardOpen : cardBase },
    React.createElement('button', {
      type: 'button',
      style: headerStyle,
      'aria-expanded': open,
      'aria-label': `${t(open ? 'collapse' : 'expand')}: ${title}`,
      onClick: () => { setOpen(!open); },
    },
      React.createElement('span', { style: headTextStyle },
        React.createElement('span', { style: nameStyle }, title),
        React.createElement('span', { style: descriptionStyle }, t('cardDescription'))),
      state.dirty ? React.createElement('span', { style: pendingStyle }, t('unsaved')) : null,
      React.createElement('span', { style: open ? chevronOpenStyle : chevronStyle, 'aria-hidden': true })),
    open
      ? React.createElement('div', { style: bodyStyle },
          !state.writable
            ? React.createElement('p', { style: readOnlyStyle, role: 'status' }, t('readOnly'))
            : null,
          SecretField({
            id: 'prism-vision-api-key',
            label: t('apiKey'),
            hint: t('apiKeyHint'),
            state: state.apiKey,
            configured: state.apiKeyConfigured,
            stateLabel: state.apiKeyConfigured ? t('apiKeySet') : t('apiKeyUnset'),
            disabled: !state.apiKeyWritable,
            onEdit: (text) => { props.edit('apiKey', text); },
            first: true,
          }),
          SelectField({
            id: 'prism-vision-provider',
            label: t('provider'),
            hint: t('providerHint'),
            state: state.provider,
            overridden: state.provider.overridden,
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            options: state.providerOptions,
            disabled,
            onEdit: (text) => { props.edit('provider', text); },
            onReset: () => { props.resetField('provider'); },
          }),
          TextField({
            id: 'prism-vision-model',
            label: t('model'),
            hint: t('modelHint'),
            state: state.model,
            overridden: state.model.overridden,
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            disabled,
            onEdit: (text) => { props.edit('model', text); },
            onReset: () => { props.resetField('model'); },
          }),
          SelectField({
            id: 'prism-vision-region',
            label: t('region'),
            hint: t('regionHint'),
            state: state.region,
            overridden: state.region.overridden,
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            options: state.regionOptions,
            disabled,
            onEdit: (text) => { props.edit('region', text); },
            onReset: () => { props.resetField('region'); },
          }),
          TextField({
            id: 'prism-vision-api-key-env',
            label: t('apiKeyEnv'),
            hint: t('apiKeyEnvHint'),
            state: state.apiKeyEnv,
            overridden: state.apiKeyEnv.overridden,
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            disabled,
            onEdit: (text) => { props.edit('apiKeyEnv', text); },
            onReset: () => { props.resetField('apiKeyEnv'); },
          }),
          SelectField({
            id: 'prism-degrade-mode',
            label: t('degradeMode'),
            hint: t('degradeModeHint'),
            state: state.degradeMode,
            overridden: state.degradeMode.overridden,
            overriddenLabel: t('overridden'),
            resetLabel: t('reset'),
            options: state.degradeModeOptions,
            disabled,
            onEdit: (text) => { props.edit('degradeMode', text); },
            onReset: () => { props.resetField('degradeMode'); },
            labelOf: (option) => (option === 'pointer' ? t('degradePointer') : option === 'vep' ? t('degradeVep') : option),
          }),
          CheckboxField({
            id: 'prism-show-usage',
            label: t('showUsage'),
            hint: t('showUsageHint'),
            checked: state.showUsage.text === 'true',
            disabled,
            onToggle: () => { props.edit('showUsage', state.showUsage.text === 'true' ? 'false' : 'true'); },
          }),
          CheckboxField({
            id: 'prism-show-balance',
            label: t('showBalance'),
            hint: t('showBalanceHint'),
            checked: state.showBalance.text === 'true',
            disabled,
            onToggle: () => { props.edit('showBalance', state.showBalance.text === 'true' ? 'false' : 'true'); },
          }),
          React.createElement('div', { style: footerStyle },
            state.failed
              ? React.createElement('p', { style: failedStyle, role: 'status' }, t('failed'))
              : null,
            React.createElement('button', {
              type: 'button',
              style: disabled || (!state.dirty && !state.failed) ? { ...discardStyle, ...disabledStyle } : discardStyle,
              disabled: disabled || (!state.dirty && !state.failed),
              onClick: props.discard,
            }, t('discard')),
            React.createElement('button', {
              type: 'button',
              style: disabled || !state.dirty || state.invalid || state.saving ? { ...saveStyle, ...disabledStyle } : saveStyle,
              disabled: disabled || !state.dirty || state.invalid || state.saving,
              onClick: props.save,
            }, state.saving ? t('saving') : t('save')),
          ),
        )
      : null,
  );
}

/* ---------- 客户端插件入口 ---------- */

const inject = ['slots', 'locale', 'connection', 'settingsScope', 'remote'];

function apply(ctx) {
  const { api } = ctx.get('connection');
  ctx.effect(
    () => ctx.locale.register(PRISM_NS, { zh, en }),
    'deepseek-prism-dsh: card dictionaries',
  );
  const controller = new PrismCardController(ctx.settingsScope.bind({ namespace: SETTINGS_NS }), api);
  ctx.effect(
    () => ctx.remote.$on('credentials/updated', (ref) => { controller.refreshCredential(ref); }),
    'deepseek-prism-dsh: credential invalidations',
  );
  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      id: 'deepseek-prism',
      order: 30,
      locale: PRISM_NS,
      inject: () => controller.inject(),
    }, PrismCard);
  });
}

module.exports = { inject, apply };
return module.exports;
} });
