/**
 * DeepSeek Prism card form controller: staged edits over the
 * `deepseek-prism` settings namespace, plus the write-only API-key state
 * learned from the redacted describe (secrets never ride the wire).
 */

import { createSnapshotStore, type SettingsScope, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { IApiClient, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import type { Context } from '@deepseek-ai/cordis'

export const PRISM_NAMESPACE = 'deepseek-prism'

/** The section fields this card edits. */
export interface PrismSettings {
  apiKey?: string
  model?: string
  baseUrl?: string
  region?: string
  showUsage?: boolean
  showBalance?: boolean
}

/** One text field's control state. */
export interface FieldView {
  /** Draft text the control renders. */
  text: string
  /** Whether saving would leave a user-layer entry for this field. */
  overridden: boolean
}

/** What the card renders. */
export interface PrismCardState {
  /** False while the namespace is not served; the card renders nothing. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether the form holds edits a save would write. */
  dirty: boolean
  /** Whether a save is crossing the wire. */
  saving: boolean
  /** Whether the last save did not land as staged. */
  failed: boolean
  /** Whether the API-key slot currently holds a value (the value itself never rides). */
  apiKeySet: boolean
  /** Blank until typed; a blank draft writes nothing. */
  apiKeyDraft: string
  /** Whether the recognition-token display switch is on (saved immediately). */
  showUsage: boolean
  /** Whether the balance/cost display switch is on (saved immediately). */
  showBalance: boolean
  model: FieldView
  baseUrl: FieldView
  region: FieldView
}

/** The write actions the card's slot entry injects. */
export interface PrismCardActions {
  /** Stage draft text for one field. */
  edit: (field: string, text: string) => void
  /** Stage a clear, so saving lets the field re-inherit defaults. */
  resetField: (field: string) => void
  /** Toggle a boolean display switch and save it immediately. */
  toggle: (field: 'showUsage' | 'showBalance') => void
  /** Write every staged edit, then re-seed from what the Host accepted. */
  save: () => void
  /** Drop every staged edit. */
  discard: () => void
}

/** The registration-side face the card's slot entry injects. */
export interface PrismCardFace extends PrismCardActions {
  hooks: {
    /** Card snapshot bound by the renderer as usePrismCard. */
    prismCard: SnapshotStore<PrismCardState>
  }
}

/** Bridges the `deepseek-prism` scope onto the card's staged form. */
export class PrismCardController {
  private readonly staged = new Map<string, string>()
  private apiKeySet = false
  private saving = false
  private failed = false
  private readonly store: SnapshotStore<PrismCardState>

  /**
   * @param scope - the bound settings scope for the `deepseek-prism` namespace.
   * @param api - the loopback settings wire face.
   * @param ctx - the owning plugin context (secret-state invalidation rides its fiber).
   */
  constructor(
    private readonly scope: SettingsScope<PrismSettings>,
    private readonly api: IApiClient,
    ctx: Context,
  ) {
    this.store = createSnapshotStore(this.project())
    this.scope.subscribe(() => { this.publish() })
    ctx.effect(() => {
      const off = ctx.remote.$on('settings/document-updated', (ns?: string) => {
        if (ns === undefined || ns === PRISM_NAMESPACE) void this.refreshSecretState()
      })
      return off
    }, 'dsh-prism: secret state invalidations')
    void this.refreshSecretState()
  }

  /** Build the face the card's slot registration injects. */
  inject(): PrismCardFace {
    return {
      hooks: { prismCard: this.store },
      edit: (field, text) => { this.stage(field, text) },
      resetField: (field) => { this.stage(field, '') },
      toggle: (field) => { void this.toggle(field) },
      save: () => { void this.save() },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.publish()
      },
    }
  }

  /** Flip one display switch and write it immediately (no staged save needed). */
  private async toggle(field: 'showUsage' | 'showBalance'): Promise<void> {
    if (this.saving) return
    const snapshot = this.scope.getSnapshot()
    const current = snapshot.value?.[field] ?? (field === 'showUsage')
    try {
      await this.scope.set(field, !current)
      this.failed = false
    } catch {
      this.failed = true
    }
    this.publish()
  }

  private stage(field: string, text: string): void {
    this.staged.set(field, text)
    this.failed = false
    this.publish()
  }

  private async save(): Promise<void> {
    if (this.staged.size === 0 || this.saving) return
    this.saving = true
    this.failed = false
    this.publish()
    let landed = true
    for (const [field, text] of this.staged) {
      const trimmed = text.trim()
      try {
        if (field === 'apiKey') {
          if (trimmed !== '') await this.scope.set('apiKey', trimmed)
        } else if (trimmed === '') {
          await this.scope.unset(field)
        } else {
          await this.scope.set(field, trimmed)
        }
      } catch {
        landed = false
      }
    }
    await this.refreshSecretState()
    const secretLanded = !this.staged.has('apiKey') || this.apiKeySet
    if (landed && secretLanded) this.staged.clear()
    this.saving = false
    this.failed = !(landed && secretLanded)
    this.publish()
  }

  /** Learn whether the apiKey slot holds a value from the redacted describe. */
  private async refreshSecretState(): Promise<void> {
    try {
      const response = await this.api.settings.describe({})
      if (!response.result.ok) return
      const view = response.result.value.namespaces.find((ns: SettingsNamespaceView) => ns.ns === PRISM_NAMESPACE)
      const secret = view?.secrets.find(
        (slot: SettingsNamespaceView['secrets'][number]) => slot.path.length === 1 && slot.path[0] === 'apiKey',
      )
      this.apiKeySet = secret?.set === true
      this.publish()
    } catch {
      // Transient transport failure; the next document invalidation retries.
    }
  }

  private project(): PrismCardState {
    const snapshot = this.scope.getSnapshot()
    const user = snapshot.user as Record<string, unknown> | undefined
    const value = snapshot.value as Record<string, unknown> | undefined
    const usage = value?.['showUsage']
    const balance = value?.['showBalance']
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: this.staged.size > 0,
      saving: this.saving,
      failed: this.failed,
      apiKeySet: this.apiKeySet,
      apiKeyDraft: this.staged.get('apiKey') ?? '',
      showUsage: typeof usage === 'boolean' ? usage : true,
      showBalance: typeof balance === 'boolean' ? balance : false,
      model: this.field('model', value, user),
      baseUrl: this.field('baseUrl', value, user),
      region: this.field('region', value, user),
    }
  }

  private field(name: string, value: Record<string, unknown> | undefined, user: Record<string, unknown> | undefined): FieldView {
    const staged = this.staged.get(name)
    const raw = value?.[name]
    return {
      text: staged ?? (typeof raw === 'string' ? raw : ''),
      overridden: user !== undefined && Object.hasOwn(user, name),
    }
  }

  private publish(): void {
    this.store.set(this.project())
  }
}
