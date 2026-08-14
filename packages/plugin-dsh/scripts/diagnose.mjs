/**
 * Diagnostic: replicate the Loader's plugin load against the REAL settings
 * service, to isolate whether apply() fails or the boot path is the issue.
 * Run from packages/plugin-dsh: node scripts/diagnose.mjs
 */
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, settingsNamespace } from '@deepseek-ai/dsh-settings'

class MemoryProvider extends SettingsProvider {
  get writable() {
    return true
  }

  async load() {
    return {}
  }

  async persist() {}
}

const ctx = new Context()
const fiber = ctx.plugin(MemoryProvider)
await fiber
ctx.provide('tools', { register() {} })

console.log('loading @yogemow/deepseek-prism-dsh via self-reference (loader path)...')
const mod = await import('@yogemow/deepseek-prism-dsh')
console.log('module loaded:', mod.name, JSON.stringify(mod.inject))

console.log('calling apply...')
try {
  mod.apply(ctx, {})
  console.log('apply OK')
} catch (error) {
  console.error('APPLY THREW:', error)
  process.exit(1)
}

const ns = settingsNamespace('deepseek-prism')
const value = ctx.settings.get(ns)
console.log('settings.get(deepseek-prism):', JSON.stringify(value))
const desc = await ctx.settings.describe({ redactSecrets: true })
console.log('namespaces:', desc.map(n => n.ns).join(', '))
const own = desc.find(n => n.ns === 'deepseek-prism')
console.log('own namespace:', JSON.stringify({ ns: own?.ns, secrets: own?.secrets }))
await fiber[Symbol.asyncDispose]?.()
process.exit(0)
