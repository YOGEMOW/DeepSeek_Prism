/**
 * Runtime resolution of the deepseek-prism skill's `scripts/vision.mjs`.
 *
 * The skill scripts stay the single source of the vision pipeline (prompts,
 * providers, parsing, VEP compilation). This bundle links them by
 * repository-relative path: the profile installs the bundle from its checkout
 * via `dsh plugin add`, so the sibling `deepseek-prism/` directory is present
 * next to this package. The dynamic import keeps `vision.mjs` fully external
 * at runtime (its own `import.meta.url`-based `.env` lookup stays correct).
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** `<repo>/dsh-plugin/lib/vision.js` → `<repo>/deepseek-prism/scripts/vision.mjs`. */
const SKILL_SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'deepseek-prism',
  'scripts',
  'vision.mjs',
)

/** The skill's vision pipeline module (same exports as `scripts/vision.mjs`). */
export type VisionModule = typeof import('../../deepseek-prism/scripts/vision.mjs')

/**
 * Load the skill's vision pipeline module.
 * @returns the module, resolved once per process.
 */
export async function resolveVisionModule(): Promise<VisionModule> {
  if (!existsSync(SKILL_SCRIPT)) {
    throw new Error(
      `DeepSeek Prism 找不到 vision.mjs：${SKILL_SCRIPT}（bundle 必须与 deepseek-prism/ 技能目录相邻安装）`,
    )
  }
  return await import(pathToFileURL(SKILL_SCRIPT).href) as VisionModule
}
