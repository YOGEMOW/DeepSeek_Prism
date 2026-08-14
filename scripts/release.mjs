/**
 * release —— DeepSeek_Prism 双包发布编排。
 *
 * 用法:
 *   node scripts/release.mjs <version>            # 测试 → 同步版本 → pack → publish（GitHub Packages）
 *   node scripts/release.mjs <version> --pack     # 只做测试、同步版本与 npm pack，不发布
 *   node scripts/release.mjs <version> --skip-test
 *
 * 发布 registry 默认 GitHub Packages（https://npm.pkg.github.com），
 * 认证 token 来自环境变量 NODE_AUTH_TOKEN，缺省时尝试 `gh auth token`。
 * git 提交、tag 与 GitHub Release 由调用方（人工或 CI）在发布后执行。
 */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { cp, mkdir, rm } from "node:fs/promises";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = "https://npm.pkg.github.com";

const PACKAGES = [
  { dir: "packages/plugin-dsh", name: "@yogemow/deepseek-prism-dsh" },
  { dir: "packages/skill", name: "@yogemow/deepseek-prism-skill" },
];

function run(command, options = {}) {
  execSync(command, { cwd: repoRoot, stdio: "inherit", ...options });
}

function writeVersion(packageJsonPath, version) {
  const manifest = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  manifest.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function authToken() {
  if (process.env.NODE_AUTH_TOKEN) return process.env.NODE_AUTH_TOKEN;
  try {
    return String(execSync("gh auth token", { encoding: "utf8" })).trim();
  } catch {
    return undefined;
  }
}

function runNpm(args, options = {}) {
  // Windows 上 npm 是 .cmd shim，execFile 直接 spawn 会被拒绝（CVE-2024-27980 硬化）。
  // 默认捕获 stdout（pack 需解析产物名）；需要直通时由调用方传 stdio: 'inherit'。
  return execFileSync("npm", args, {
    shell: process.platform === "win32",
    ...options,
  });
}

async function main() {
  const [versionArg, ...flags] = process.argv.slice(2);
  if (!versionArg || !/^\d+\.\d+\.\d+$/.test(versionArg)) {
    console.error("用法: node scripts/release.mjs <version> [--pack] [--skip-test]");
    process.exit(1);
  }
  const packOnly = flags.includes("--pack");
  const skipTest = flags.includes("--skip-test");

  if (!skipTest) {
    console.log("==> 运行测试");
    run(`node --test deepseek-prism/tests/vision.test.mjs packages/plugin-dsh/tests/plugin.test.mjs`);
  }

  console.log(`==> 同步版本 ${versionArg}`);
  writeVersion(path.join(repoRoot, "package.json"), versionArg);
  for (const pkg of PACKAGES) writeVersion(path.join(repoRoot, pkg.dir, "package.json"), versionArg);

  console.log("==> npm pack（prepack 自动物化技能素材）");
  const artifacts = path.join(repoRoot, "dist");
  await rm(artifacts, { recursive: true, force: true });
  await mkdir(artifacts, { recursive: true });
  const tarballs = [];
  for (const pkg of PACKAGES) {
    const name = pkg.name.slice("@yogemow/".length);
    const tarball = path.join(artifacts, `${name}-${versionArg}.tgz`);
    const out = runNpm(["pack", "--pack-destination", artifacts], {
      cwd: path.join(repoRoot, pkg.dir),
      encoding: "utf8",
    }).trim();
    const produced = out.split(/\r?\n/).pop().trim();
    const producedPath = path.join(artifacts, produced);
    if (path.resolve(producedPath) !== path.resolve(tarball)) {
      await cp(producedPath, tarball);
      await rm(producedPath, { force: true });
    }
    tarballs.push({ pkg: pkg.name, tarball });
    console.log(`  -> ${tarball}`);
  }

  if (packOnly) {
    console.log("==> 完成（--pack，未发布）");
    return;
  }

  const token = authToken();
  if (!token) {
    console.warn("==> 未找到 NODE_AUTH_TOKEN / gh PAT，跳过 registry 发布。");
    console.warn("    （GitHub Packages 的 npm 发布需要 classic PAT：write:packages + read:packages + repo）");
    console.warn("    请把 dist/*.tgz 作为 GitHub Release 资产发布，或设置 NODE_AUTH_TOKEN 后重跑本脚本。");
    return;
  }
  console.log(`==> 发布到 ${REGISTRY}`);
  for (const { pkg, tarball } of tarballs) {
    runNpm(["publish", tarball, "--registry", REGISTRY, "--access", "public"], {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, NODE_AUTH_TOKEN: token },
    });
    console.log(`  -> ${pkg}@${versionArg} published`);
  }
  console.log("==> 发布完成。请随后执行 git 提交、tag v" + versionArg + " 与 gh release（附 dist/*.tgz）。");
}

await main();
