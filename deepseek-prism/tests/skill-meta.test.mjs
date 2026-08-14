import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 本测试锁定 DSH 侧的发现契约与路径适配，防止 SKILL.md 回归为
// 纯 Codex 写法（例如 <技能路径> 占位符或只写 .codex 安装路径），
// 否则 DSH 的 skill-filesystem / tool-skill 无法正确发现和指引脚本。

const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  assert.equal(lines[0], "---", "SKILL.md 第一行必须是 ---");
  const closing = lines.indexOf("---", 1);
  assert.ok(closing > 1, "SKILL.md 必须包含闭合的 ---");
  const data = {};
  for (const line of lines.slice(1, closing)) {
    const eq = line.indexOf(":");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key.length > 0 && value.length > 0) data[key] = value;
  }
  return { data, body: lines.slice(closing + 1).join("\n") };
}

test("SKILL.md 存在且 frontmatter 满足 DSH 发现契约", async () => {
  const raw = await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf8");
  const { data, body } = parseFrontmatter(raw);

  assert.equal(data.name, "deepseek-prism");
  assert.match(data.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "name 必须是 DSH kebab-case 技能名");
  assert.ok(data.description.length > 0, "description 不能为空");
  assert.ok(body.trim().length > 0, "技能正文不能为空");
});

test("脚本路径指引使用 resourceBase 且无不可解析占位符", async () => {
  const raw = await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf8");
  const { body } = parseFrontmatter(raw);

  assert.match(body, /resourceBase/, "必须说明 DSH 的 resourceBase.path 定位方式");
  assert.match(body, /<资源目录>/, "命令示例必须使用 <资源目录> 占位符");
  assert.doesNotMatch(body, /<技能路径>|<skill路径>/, "不得残留不可解析的旧占位符");
});

test("命令引用的 scripts/vision.mjs 存在", async () => {
  await assert.doesNotReject(
    access(path.join(SKILL_ROOT, "scripts", "vision.mjs")),
    "scripts/vision.mjs 必须存在"
  );
});
