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

const zh = {
  cardTitle: 'DeepSeek Prism（识图）',
  cardDescription: '视觉 API 密钥与模型选择；密钥保存后不回显明文。',
  apiKey: '视觉 API 密钥',
  apiKeyHint: '写入凭据库，保存后仅显示「已配置」，明文不随任何响应返回。',
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
  cardDescription: 'Vision API key and model selection; the key is never echoed back.',
  apiKey: 'Vision API key',
  apiKeyHint: 'Written to the credential store; after saving only a "configured" badge is shown.',
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
    this.specs = new Map(['provider', 'model', 'region', 'apiKeyEnv'].map((field) => [field, textSpec(field)]));
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

/* ---------- 卡片渲染（React.createElement，无 JSX） ---------- */

const cardStyle = { border: '1px solid #e2e4e8', borderRadius: 8, padding: 14, margin: '10px 0' };
const rowStyle = { display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10, flexWrap: 'wrap' };
const labelStyle = { width: 190, fontSize: 13, color: '#333' };
const inputStyle = { padding: '5px 8px', border: '1px solid #c9ccd1', borderRadius: 4, fontSize: 13, minWidth: 240 };
const hintStyle = { fontSize: 12, color: '#888', marginTop: 2, flexBasis: '100%' };
const badgeStyle = { fontSize: 11, padding: '1px 7px', borderRadius: 9, background: '#d9f2e0', color: '#1a7f37' };
const badgeMutedStyle = { fontSize: 11, padding: '1px 7px', borderRadius: 9, background: '#eee', color: '#777' };
const buttonStyle = { padding: '5px 14px', borderRadius: 5, border: '1px solid #c9ccd1', background: '#fff', cursor: 'pointer', fontSize: 13 };
const primaryButtonStyle = { ...buttonStyle, background: '#1f6feb', borderColor: '#1f6feb', color: '#fff' };
const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' };

function TextField({ id, label, hint, state, disabled, onEdit }) {
  return React.createElement('div', { style: rowStyle },
    React.createElement('label', { htmlFor: id, style: labelStyle }, label),
    React.createElement('input', {
      id,
      style: state.invalid ? { ...inputStyle, borderColor: '#d1242f' } : inputStyle,
      type: 'text',
      value: state.text,
      disabled,
      placeholder: '',
      onChange: (event) => { onEdit(event.target.value); },
    }),
    React.createElement('span', { style: hintStyle }, hint),
  );
}

function SelectField({ id, label, hint, state, options, disabled, onEdit }) {
  return React.createElement('div', { style: rowStyle },
    React.createElement('label', { htmlFor: id, style: labelStyle }, label),
    React.createElement('select', {
      id,
      style: inputStyle,
      value: state.text,
      disabled,
      onChange: (event) => { onEdit(event.target.value); },
    }, options.map((option) => React.createElement('option', { key: option, value: option }, option === '' ? '(auto)' : option))),
    React.createElement('span', { style: hintStyle }, hint),
  );
}

function SecretField({ id, label, hint, state, configured, stateLabel, disabled, onEdit }) {
  return React.createElement('div', { style: rowStyle },
    React.createElement('label', { htmlFor: id, style: labelStyle }, label),
    React.createElement('span', { style: configured ? badgeStyle : badgeMutedStyle }, stateLabel),
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
    React.createElement('span', { style: hintStyle }, hint),
  );
}

function PrismCard(props) {
  const state = props.usePrismCard((snapshot) => snapshot);
  const t = props.t;
  const disabled = !state.writable;
  return React.createElement('div', { style: cardStyle },
    React.createElement('div', { style: { fontWeight: 600, fontSize: 14 } }, t('cardTitle')),
    React.createElement('div', { style: { fontSize: 12, color: '#666', marginTop: 2 } }, t('cardDescription')),
    SecretField({
      id: 'prism-vision-api-key',
      label: t('apiKey'),
      hint: t('apiKeyHint'),
      state: state.apiKey,
      configured: state.apiKeyConfigured,
      stateLabel: state.apiKeyConfigured ? t('apiKeySet') : t('apiKeyUnset'),
      disabled: !state.apiKeyWritable,
      onEdit: (text) => { props.edit('apiKey', text); },
    }),
    SelectField({
      id: 'prism-vision-provider',
      label: t('provider'),
      hint: t('providerHint'),
      state: state.provider,
      options: state.providerOptions,
      disabled,
      onEdit: (text) => { props.edit('provider', text); },
    }),
    TextField({
      id: 'prism-vision-model',
      label: t('model'),
      hint: t('modelHint'),
      state: state.model,
      disabled,
      onEdit: (text) => { props.edit('model', text); },
    }),
    SelectField({
      id: 'prism-vision-region',
      label: t('region'),
      hint: t('regionHint'),
      state: state.region,
      options: state.regionOptions,
      disabled,
      onEdit: (text) => { props.edit('region', text); },
    }),
    TextField({
      id: 'prism-vision-api-key-env',
      label: t('apiKeyEnv'),
      hint: t('apiKeyEnvHint'),
      state: state.apiKeyEnv,
      disabled,
      onEdit: (text) => { props.edit('apiKeyEnv', text); },
    }),
    React.createElement('div', { style: { ...rowStyle, marginTop: 14 } },
      React.createElement('button', {
        type: 'button',
        style: primaryButtonStyle,
        disabled: disabled || !state.dirty || state.invalid || state.saving,
        onClick: props.save,
      }, state.saving ? t('saving') : t('save')),
      React.createElement('button', {
        type: 'button',
        style: buttonStyle,
        disabled: disabled || (!state.dirty && !state.failed),
        onClick: props.discard,
      }, t('discard')),
      state.failed
        ? React.createElement('span', { style: { color: '#d1242f', fontSize: 12 } }, t('failed'))
        : null,
    ),
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
