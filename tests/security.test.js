import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedMcpOrigin } from '../server/security.js';

test('allows command-line MCP clients that omit Origin', () => {
  assert.equal(isAllowedMcpOrigin(undefined), true);
  assert.equal(isAllowedMcpOrigin(''), true);
});

test('allows the local Vite origin', () => {
  assert.equal(isAllowedMcpOrigin('http://127.0.0.1:5173', undefined), true);
  assert.equal(isAllowedMcpOrigin('http://localhost:5173', undefined), true);
});

test('rejects a foreign browser origin', () => {
  assert.equal(isAllowedMcpOrigin('https://example.invalid', undefined), false);
});

test('supports an explicit local development allowlist', () => {
  assert.equal(isAllowedMcpOrigin('http://127.0.0.1:4173', 'http://127.0.0.1:4173'), true);
  assert.equal(isAllowedMcpOrigin('http://127.0.0.1:5173', 'http://127.0.0.1:4173'), false);
});
