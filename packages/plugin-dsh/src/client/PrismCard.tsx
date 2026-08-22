/**
 * DeepSeek Prism settings card: staged form over the `deepseek-prism`
 * namespace, registered into the Plugins → Configurable settings tab.
 *
 * Card chrome and field rows are modelled on ui-settings-plugins' PluginCard
 * / ValueField / SecretField design (collapsible header, override badge,
 * reset, hint, and save/discard footer) so this card reads like the sibling
 * plugin cards; the shared components themselves stay package-private there,
 * so this bundle re-implements the same layout against the same theme tokens.
 */

import { useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { PrismCardFace, PrismCardState } from './controller.ts'
import type { PrismKey } from './locales.ts'
import css from './PrismCard.module.css'

/** Props the renderer binds for the DeepSeek Prism card. */
export type PrismCardProps = PropsLocale<'dsh-prism'> & InjectFace<PrismCardFace>

/** Collapsible card chrome shared with the sibling plugin cards. */
function PrismCardShell({ t, title, description, state, onSave, onDiscard, children }: {
  t: (key: PrismKey) => string
  title: string
  description: string
  state: PrismCardState
  onSave: () => void
  onDiscard: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!state.available) return null
  const blocked = !state.dirty || state.saving
  return (
    <li className={css.card}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        aria-label={`${t(open ? 'collapse' : 'expand')}: ${title}`}
        onClick={() => { setOpen(current => !current) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{title}</span>
          <span className={css.description}>{description}</span>
        </span>
        {state.dirty ? <span className={css.pending}>{t('unsaved')}</span> : null}
        <span className={css.chevron} aria-hidden />
      </button>
      {open
        ? (
          <div className={css.body}>
            {!state.writable ? <p className={css.readOnly} role="status">{t('readOnly')}</p> : null}
            {children}
            <div className={css.footer}>
              {state.failed ? <p className={css.failed} role="status">{t('saveFailed')}</p> : null}
              <button
                type="button"
                className={css.discard}
                disabled={!state.dirty || state.saving}
                onClick={onDiscard}
              >
                {t('discard')}
              </button>
              <button
                type="button"
                className={css.save}
                disabled={blocked}
                onClick={onSave}
              >
                {t(state.saving ? 'saving' : 'save')}
              </button>
            </div>
          </div>
        )
        : null}
    </li>
  )
}

/** One field row: label, override badge with reset, control, and hint. */
function PrismFieldRow({ id, label, hint, overridden, overriddenLabel, resetLabel, disabled, onReset, control }: {
  id: string
  label: string
  hint: string
  overridden: boolean
  overriddenLabel: string
  resetLabel: string
  disabled: boolean
  onReset: () => void
  control: ReactNode
}) {
  return (
    <div className={css.field}>
      <div className={css.head}>
        <label className={css.label} htmlFor={id}>{label}</label>
        {overridden
          ? (
            <span className={css.badges}>
              <span className={css.badge}>{overriddenLabel}</span>
              <button
                type="button"
                className={css.reset}
                disabled={disabled}
                onClick={onReset}
              >
                {resetLabel}
              </button>
            </span>
          )
          : null}
      </div>
      {control}
      <p className={css.hint}>{hint}</p>
    </div>
  )
}

/**
 * Render the DeepSeek Prism card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the form card, a guidance card when the namespace is not exposed
 *   to this Web client, or nothing while the first answer is pending.
 */
export function PrismCard(props: PrismCardProps) {
  const { t } = props
  const state = props.usePrismCard((snapshot: PrismCardState) => snapshot)
  if (state.status === 'unavailable') {
    // The deployment's api-proxy allowlist does not serve the namespace, so
    // the form could never read or write; explain the channels that do work.
    return (
      <li className={css.card}>
        <div className={css.guidance} role="status">
          <span className={css.name}>{t('cardTitle')}</span>
          <span className={css.description}>{t('cardUnavailable')}</span>
          <p className={css.hint}>{t('cardUnavailableEnv')}</p>
          <p className={css.hint}>{t('cardUnavailableRow')}</p>
        </div>
      </li>
    )
  }
  const disabled = !state.writable
  return (
    <PrismCardShell
      t={t}
      title={t('cardTitle')}
      description={t('cardDescription')}
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      {/* API key: write-only credential row (configured badge; blank keeps the stored value). */}
      <div className={css.field}>
        <div className={css.head}>
          <label className={css.label} htmlFor="prism-settings-api-key">{t('apiKeyLabel')}</label>
          <span className={css.badges}>
            <span className={state.apiKeySet ? css.badge : css.badgeMuted}>
              {state.apiKeySet ? t('apiKeySet') : t('apiKeyUnset')}
            </span>
          </span>
        </div>
        <input
          id="prism-settings-api-key"
          className={css.input}
          type="password"
          autoComplete="off"
          value={state.apiKeyDraft}
          disabled={disabled}
          placeholder="sk-…"
          onChange={(event) => { props.edit('apiKey', event.target.value) }}
        />
        <p className={css.hint}>{t('apiKeyHint')}</p>
      </div>
      <PrismFieldRow
        id="prism-settings-model"
        label={t('modelLabel')}
        hint={t('modelHint')}
        overridden={state.model.overridden}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        disabled={disabled}
        onReset={() => { props.resetField('model') }}
        control={(
          <input
            id="prism-settings-model"
            className={css.input}
            type="text"
            value={state.model.text}
            disabled={disabled}
            onChange={(event) => { props.edit('model', event.target.value) }}
          />
        )}
      />
      <PrismFieldRow
        id="prism-settings-base-url"
        label={t('baseUrlLabel')}
        hint={t('baseUrlHint')}
        overridden={state.baseUrl.overridden}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        disabled={disabled}
        onReset={() => { props.resetField('baseUrl') }}
        control={(
          <input
            id="prism-settings-base-url"
            className={css.input}
            type="text"
            value={state.baseUrl.text}
            disabled={disabled}
            onChange={(event) => { props.edit('baseUrl', event.target.value) }}
          />
        )}
      />
      <PrismFieldRow
        id="prism-settings-region"
        label={t('regionLabel')}
        hint={t('regionHint')}
        overridden={state.region.overridden}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        disabled={disabled}
        onReset={() => { props.resetField('region') }}
        control={(
          <select
            id="prism-settings-region"
            className={css.input}
            value={state.region.text}
            disabled={disabled}
            onChange={(event) => { props.edit('region', event.target.value) }}
          >
            <option value="cn">{t('regionCn')}</option>
            <option value="global">{t('regionGlobal')}</option>
          </select>
        )}
      />
      <PrismFieldRow
        id="prism-settings-provider"
        label={t('providerLabel')}
        hint={t('providerHint')}
        overridden={state.provider.overridden}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        disabled={disabled}
        onReset={() => { props.resetField('provider') }}
        control={(
          <select
            id="prism-settings-provider"
            className={css.input}
            value={state.provider.text}
            disabled={disabled}
            onChange={(event) => { props.edit('provider', event.target.value) }}
          >
            <option value="siliconflow">siliconflow</option>
            <option value="zhipu">zhipu</option>
            <option value="modelscope">modelscope</option>
            <option value="alibaba">alibaba</option>
            <option value="openrouter">openrouter</option>
            <option value="groq">groq</option>
            <option value="deepseek">deepseek</option>
            <option value="custom">custom</option>
          </select>
        )}
      />
      <PrismFieldRow
        id="prism-settings-vision-handling"
        label={t('visionHandlingLabel')}
        hint={t('visionHandlingHint')}
        overridden={state.visionModelHandling.overridden}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        disabled={disabled}
        onReset={() => { props.resetField('visionModelHandling') }}
        control={(
          <select
            id="prism-settings-vision-handling"
            className={css.input}
            value={state.visionModelHandling.text}
            disabled={disabled}
            onChange={(event) => { props.edit('visionModelHandling', event.target.value) }}
          >
            <option value="native">{t('visionHandlingNative')}</option>
            <option value="prism">{t('visionHandlingPrism')}</option>
          </select>
        )}
      />
      <PrismFieldRow
        id="prism-settings-deploy-mode"
        label={t('deployModeLabel')}
        hint={t('deployModeHint')}
        overridden={state.deployMode.overridden}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        disabled={disabled}
        onReset={() => { props.resetField('deployMode') }}
        control={(
          <select
            id="prism-settings-deploy-mode"
            className={css.input}
            value={state.deployMode.text}
            disabled={disabled}
            onChange={(event) => { props.edit('deployMode', event.target.value) }}
          >
            <option value="zero-patch">{t('deployModeZero')}</option>
            <option value="patch">{t('deployModePatch')}</option>
          </select>
        )}
      />
      <div className={css.field}>
        <div className={css.head}>
          <label className={css.label} htmlFor="prism-settings-show-usage">{t('showUsageLabel')}</label>
          <input
            id="prism-settings-show-usage"
            className={css.checkbox}
            type="checkbox"
            checked={state.showUsage}
            disabled={disabled}
            onChange={() => { props.toggle('showUsage') }}
          />
        </div>
        <p className={css.hint}>{t('showUsageHint')}</p>
      </div>
      <div className={css.field}>
        <div className={css.head}>
          <label className={css.label} htmlFor="prism-settings-show-balance">{t('showBalanceLabel')}</label>
          <input
            id="prism-settings-show-balance"
            className={css.checkbox}
            type="checkbox"
            checked={state.showBalance}
            disabled={disabled}
            onChange={() => { props.toggle('showBalance') }}
          />
        </div>
        <p className={css.hint}>{t('showBalanceHint')}</p>
      </div>
    </PrismCardShell>
  )
}
