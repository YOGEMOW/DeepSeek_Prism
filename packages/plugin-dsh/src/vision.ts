/**
 * Runtime resolution of the deepseek-prism skill's `scripts/vision.mjs`.
 *
 * The skill scripts stay the single source of the vision pipeline (prompts,
 * providers, parsing, VEP compilation). This bundle links them either from
 * the packed `skill/` directory (materialized by prepack for npm pack/publish)
 * or, in checkout installs, from the sibling `deepseek-prism/` directory
 * beside the repo. The dynamic import keeps `vision.mjs` fully external at
 * runtime (its own `import.meta.url`-based `.env` lookup stays correct).
 */

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** `<repo>/packages/plugin-dsh/lib/vision.js` → `<repo>/packages/plugin-dsh`. */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Packed form: `skill/` is materialized by prepack from the repo skill directory. */
const BUNDLED_SCRIPT = resolve(PACKAGE_ROOT, 'skill', 'scripts', 'vision.mjs')

/** Checkout form: `<repo>/packages/plugin-dsh` → `<repo>/deepseek-prism/scripts/vision.mjs`. */
const REPO_SCRIPT = resolve(PACKAGE_ROOT, '..', '..', 'deepseek-prism', 'scripts', 'vision.mjs')

/** The skill's vision pipeline module (same exports as `scripts/vision.mjs`). */
export type VisionModule = typeof import('../../../deepseek-prism/scripts/vision.mjs')

/**
 * Load the skill's vision pipeline module, preferring the packed `skill/`
 * copy when present (npm pack / publish) and falling back to the checkout
 * sibling directory (source install via `dsh plugin add <路径>`).
 * @returns the module, resolved once per process.
 */
export async function resolveVisionModule(): Promise<VisionModule> {
  const script = existsSync(BUNDLED_SCRIPT) ? BUNDLED_SCRIPT : REPO_SCRIPT
  if (!existsSync(script)) {
    throw new Error(
      `DeepSeek Prism 找不到 vision.mjs：${REPO_SCRIPT}（bundle 必须与 deepseek-prism/ 技能目录相邻安装，或经 prepack 内置 skill/ 素材）`,
    )
  }
  return await import(pathToFileURL(script).href) as VisionModule
}
