/**
 * client.js（浏览器 bundle）保存路径测试：把多个已暂存字段合并为**一次**
 * `settings.mutate` RPC（host 单次排队/写盘/广播），apiKey 走 credentials 域；
 * 失败时回读 scope 恢复真实状态。
 *
 * 加载方式：模拟 window.__ModuleLoader__ 捕获 factory，stub 'react' 后
 * materialize，拿到 controller 类与纯函数。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

let handoff;
globalThis.window = { __ModuleLoader__: { load: (entry) => { handoff = entry; } } };
const bundlePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'client.js');
await import(pathToFileURL(bundlePath).href);
assert.ok(handoff, 'client bundle must register via window.__ModuleLoader__.load');
const mod = handoff.factory((spec) => {
  if (spec === 'react') return {};
  throw new Error(`unexpected require: ${spec}`);
});
const { PrismCardController, buildMutateOps, verifyMutateLanded } = mod;

const NS = 'deepseek-prism-dsh';

/** 最小 scope/api 桩：记录 RPC 调用，响应可控。 */
function harness({ snapshot, mutateResult, credentialConfigured = false } = {}) {
  const calls = { mutate: [], credentialsSet: [], credentialsDescribe: [] };
  const scope = {
    loads: 0,
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    load: async () => { scope.loads += 1; },
  };
  const api = {
    settings: {
      mutate: async (payload) => {
        calls.mutate.push(payload);
        return mutateResult;
      },
    },
    credentials: {
      set: async (payload) => { calls.credentialsSet.push(payload); },
      describe: async ({ refs }) => {
        calls.credentialsDescribe.push(refs);
        const ref = refs[0];
        return {
          result: { ok: true, value: { credentials: { [ref]: { configured: credentialConfigured, writable: true } } } },
        };
      },
    },
  };
  return { scope, api, calls };
}

test('buildMutateOps 只收集 op 项（apiKey/无效项不产生 op）', () => {
  const plan = [
    { field: 'provider', op: { op: 'set', path: ['provider'], value: 'siliconflow' } },
    { field: 'apiKey', run: () => {} },
    { field: 'model', run: undefined },
    { field: 'region', op: { op: 'unset', path: ['region'] } },
  ];
  assert.deepEqual(buildMutateOps(plan), [
    { op: 'set', path: ['provider'], value: 'siliconflow' },
    { op: 'unset', path: ['region'] },
  ]);
});

test('verifyMutateLanded 对照 mutate 响应 user 层逐 op 验证', () => {
  const ops = [
    { op: 'set', path: ['provider'], value: 'siliconflow' },
    { op: 'unset', path: ['region'] },
  ];
  assert.equal(verifyMutateLanded({ user: { provider: 'siliconflow' } }, ops), true);
  assert.equal(verifyMutateLanded({ user: { provider: 'zhipu' } }, ops), false);
  assert.equal(verifyMutateLanded({ user: { provider: 'siliconflow', region: 'cn' } }, ops), false);
  assert.equal(verifyMutateLanded({}, ops), false);
  assert.equal(verifyMutateLanded(undefined, ops), false);
});

test('多字段保存合并为一次 mutate：单次 RPC、带全部 ops 与 expectedRevision', async () => {
  const snapshot = {
    status: 'ready', writable: true, revision: 7, base: {}, user: {}, value: { provider: '', model: '' },
  };
  const { scope, api, calls } = harness({
    snapshot,
    mutateResult: { result: { ok: true, value: { user: { provider: 'siliconflow', model: 'glm-4.5v' }, revision: 8 } } },
  });
  const controller = new PrismCardController(scope, api);
  controller.stage('provider', { text: 'siliconflow', clear: false });
  controller.stage('model', { text: 'glm-4.5v', clear: false });
  await controller.save();
  assert.equal(calls.mutate.length, 1);
  assert.deepEqual(calls.mutate[0], {
    ns: NS,
    ops: [
      { op: 'set', path: ['provider'], value: 'siliconflow' },
      { op: 'set', path: ['model'], value: 'glm-4.5v' },
    ],
    expectedRevision: 7,
  });
  assert.equal(controller.staged.size, 0, '落地后清空暂存');
  assert.equal(controller.failed, false);
  assert.equal(scope.loads, 0, '成功路径不回读');
});

test('响应 user 层与期望不符 → 失败并回读真实状态，暂存保留', async () => {
  const snapshot = {
    status: 'ready', writable: true, revision: 3, base: {}, user: {}, value: { provider: '' },
  };
  const { scope, api, calls } = harness({
    snapshot,
    mutateResult: { result: { ok: true, value: { user: { provider: 'zhipu' }, revision: 4 } } },
  });
  const controller = new PrismCardController(scope, api);
  controller.stage('provider', { text: 'siliconflow', clear: false });
  await controller.save();
  assert.equal(calls.mutate.length, 1);
  assert.equal(controller.failed, true);
  assert.equal(controller.staged.size, 1);
  assert.equal(scope.loads, 1, '失败后回读 scope');
});

test('mutate 被拒绝（conflict/rejected）→ 失败并回读', async () => {
  const snapshot = { status: 'ready', writable: true, revision: 1, base: {}, user: {}, value: {} };
  const { scope, api } = harness({ snapshot, mutateResult: { result: { ok: false } } });
  const controller = new PrismCardController(scope, api);
  controller.stage('degradeMode', { text: 'vep', clear: false });
  await controller.save();
  assert.equal(controller.failed, true);
  assert.equal(scope.loads, 1);
});

test('仅 apiKey 保存：不调 settings.mutate，走 credentials 域一次', async () => {
  const snapshot = { status: 'ready', writable: true, revision: 5, base: {}, user: {}, value: {} };
  const { scope, api, calls } = harness({ snapshot, credentialConfigured: true });
  const controller = new PrismCardController(scope, api);
  controller.stage('apiKey', { text: 'sk-test-123', clear: false });
  await controller.save();
  assert.equal(calls.mutate.length, 0);
  assert.equal(calls.credentialsSet.length, 1);
  assert.equal(calls.credentialsSet[0].ref, 'SILICONFLOW_API_KEY');
  assert.equal(calls.credentialsDescribe.length, 2, '构造时一次 + writeKey 回读一次');
  assert.equal(controller.staged.size, 0);
  assert.equal(controller.failed, false);
});

test('apiKey 与设置字段混合：mutate 一次 + credentials 一次', async () => {
  const snapshot = {
    status: 'ready', writable: true, revision: 2, base: {}, user: {}, value: { provider: '' },
  };
  const { scope, api, calls } = harness({
    snapshot,
    mutateResult: { result: { ok: true, value: { user: { provider: 'siliconflow' }, revision: 3 } } },
    credentialConfigured: true,
  });
  const controller = new PrismCardController(scope, api);
  controller.stage('provider', { text: 'siliconflow', clear: false });
  controller.stage('apiKey', { text: 'sk-test-456', clear: false });
  await controller.save();
  assert.equal(calls.mutate.length, 1);
  assert.deepEqual(calls.mutate[0].ops, [{ op: 'set', path: ['provider'], value: 'siliconflow' }]);
  assert.equal(calls.credentialsSet.length, 1);
  assert.equal(controller.staged.size, 0);
  assert.equal(controller.failed, false);
});

test('无效草稿（bool 字段非 true/false）→ save 不发起任何 RPC', async () => {
  const snapshot = { status: 'ready', writable: true, revision: 1, base: {}, user: {}, value: {} };
  const { scope, api, calls } = harness({ snapshot });
  const controller = new PrismCardController(scope, api);
  controller.stage('showUsage', { text: 'yes', clear: false });
  await controller.save();
  assert.equal(calls.mutate.length, 0);
  assert.equal(calls.credentialsSet.length, 0);
  assert.equal(controller.staged.size, 1);
  assert.equal(controller.failed, false);
});

test('清空字段（reset）→ unset op；与已存在值相同的草稿不产生写', async () => {
  const snapshot = {
    status: 'ready', writable: true, revision: 9, base: {}, user: { region: 'cn' },
    value: { region: 'cn', model: '' },
  };
  const { scope, api, calls } = harness({
    snapshot,
    mutateResult: { result: { ok: true, value: { user: {}, revision: 10 } } },
  });
  const controller = new PrismCardController(scope, api);
  controller.stage('region', { text: '', clear: true });
  controller.stage('model', { text: '', clear: false });
  await controller.save();
  assert.equal(calls.mutate.length, 1);
  assert.deepEqual(calls.mutate[0].ops, [{ op: 'unset', path: ['region'] }]);
  assert.equal(controller.staged.size, 0);
  assert.equal(controller.failed, false);
});
