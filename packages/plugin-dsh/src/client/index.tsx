/**
 * DeepSeek Prism settings card plugin, browser half: binds the
 * `deepseek-prism` settings namespace and registers the card into the
 * Plugins → Configurable settings tab (`settings.plugin.item`).
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: ctx.settingsScope merge and the settings.plugin.item slot entry.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: ctx.locale merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { PrismCardController, type PrismCardFace } from './controller.ts'
import { PrismCard } from './PrismCard.tsx'
import { en, zh, type PrismKey } from './locales.ts'

export type { PrismCardFace, PrismCardState } from './controller.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** DeepSeek Prism settings card copy. */
    'dsh-prism': PrismKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'dsh-prism'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/**
 * Register the settings card once its slot declaration is on the ledger.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const api = (ctx.get('connection') as ConnectionHandle).api
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-prism: card dictionaries')
  const controller = new PrismCardController(ctx.settingsScope.bind({ namespace: 'deepseek-prism' }), api, ctx)
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'deepseek-prism',
    order: 30,
    locale: NS,
    inject: (): PrismCardFace => controller.inject(),
  }, PrismCard))
}
