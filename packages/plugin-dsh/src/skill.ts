/**
 * Runtime skill registration for the deepseek-prism skill.
 *
 * The skill's SKILL.md and resources ship inside this package (the packed
 * `skill/` directory, materialized by prepack) with the sibling repo skill
 * directory as the checkout fallback. Registration goes through
 * `ctx.skills.register`, so no copy is written to `$DSH_HOME/skills` and
 * removing the bundle removes the skill.
 *
 * @module @yogemow/deepseek-prism-dsh/skill
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

/** `<repo>/packages/plugin-dsh/lib/skill.js` → `<repo>/packages/plugin-dsh`. */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Skill assets source directory: the packed `skill/` directory (published
 * form) or, in checkout installs, the sibling `deepseek-prism/` directory
 * beside the repo.
 * @returns the directory holding SKILL.md and the skill resources.
 */
export function resolveSkillSource(): string {
  const bundled = resolve(PACKAGE_ROOT, 'skill')
  if (existsSync(bundled)) return bundled
  return resolve(PACKAGE_ROOT, '..', '..', 'deepseek-prism')
}

/**
 * Minimal parse of SKILL.md YAML frontmatter (single-line name/description/
 * whenToUse values only).
 * @param raw - raw SKILL.md text.
 * @returns the frontmatter data and the body, or undefined without frontmatter.
 */
export function parseSkillFrontmatter(raw: string): { data: Record<string, string>; body: string } | undefined {
  const lines = raw.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return undefined
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end < 0) return undefined
  const data: Record<string, string> = {}
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line)
    if (match) data[match[1]] = match[2]
  }
  return { data, body: lines.slice(end + 1).join('\n').trim() }
}

/** A parsed deepseek-prism skill definition. */
export interface PrismSkillDefinition {
  name: string
  description: string
  whenToUse?: string
  content: string
  resourceBase: { kind: 'directory'; path: string }
  path: string
}

/**
 * Load the skill definition from the packaged assets (frontmatter-stripped
 * body plus the directory resource base).
 * @returns the definition; the SKILL.md description is mandatory.
 */
export function loadSkillDefinition(): PrismSkillDefinition {
  const dir = resolveSkillSource()
  const skillPath = resolve(dir, 'SKILL.md')
  const parsed = parseSkillFrontmatter(readFileSync(skillPath, 'utf8'))
  if (parsed === undefined) {
    throw new Error(`invalid SKILL.md frontmatter at ${skillPath}`)
  }
  const description = parsed.data.description
  if (description === undefined || description === '') {
    throw new Error(`SKILL.md description missing at ${skillPath}`)
  }
  return {
    name: parsed.data.name ?? 'deepseek-prism',
    description,
    ...(parsed.data.whenToUse === undefined ? {} : { whenToUse: parsed.data.whenToUse }),
    content: parsed.body,
    resourceBase: { kind: 'directory', path: dir },
    path: skillPath,
  }
}

/** Minimal face of the skill registry (`ctx.get('skills')`). */
interface SkillsFace {
  register(registration: {
    name: string
    description: string
    whenToUse?: string
    content: string
    resourceBase?: { kind: 'directory'; path: string }
    path?: string
    invocation?: { modelInvocable: boolean; userInvocable: boolean }
    source?: string
  }): () => void
}

/**
 * Register the packaged skill into `ctx.skills` (runtime provider: the model
 * can load it through the skill tool, users through the /deepseek-prism
 * gesture). Failure only warns — the tool and the admission conversion keep
 * working without the skill.
 * @param ctx - context carrying the `skills` service.
 * @returns the registration disposer, or undefined when not registered.
 */
export function installSkillRegistration(ctx: Context): (() => void) | undefined {
  try {
    const skills = ctx.get('skills') as SkillsFace | undefined
    if (skills === undefined) return undefined
    const skill = loadSkillDefinition()
    const disposer = skills.register({
      name: skill.name,
      description: skill.description,
      ...(skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse }),
      content: skill.content,
      resourceBase: skill.resourceBase,
      path: skill.path,
      invocation: { modelInvocable: true, userInvocable: true },
      source: 'custom',
    })
    ctx.logger.info('deepseek-prism: skill "%s" registered from %s', skill.name, skill.resourceBase.path)
    return disposer
  } catch (error) {
    ctx.logger.warn('deepseek-prism: skill registration failed: %s',
      error instanceof Error ? error.message : String(error))
    return undefined
  }
}
