import test from 'node:test';
import assert from 'node:assert/strict';
import { findPurchase, resolveIntent } from '../client/src/lib/intentRouter.js';

const purchases = [
  { id: 'p-1001', orderNumber: 'AC-1001', item: 'EchoTone Wireless Headphones', brand: 'Northstar Audio' },
  { id: 'p-1002', orderNumber: 'AC-1002', item: 'BrewMate Mini Coffee Maker', brand: 'BrewMate' },
  { id: 'p-1003', orderNumber: 'AC-1003', item: 'LumaDesk LED Task Lamp', brand: 'Luma Living' },
  { id: 'p-1004', orderNumber: 'AC-1004', item: 'CloudRest Wireless Mouse', brand: 'CloudRest' }
];

test('matches a full product name', () => {
  assert.equal(findPurchase('Can I return EchoTone Wireless Headphones?', purchases)?.id, 'p-1001');
});

test('does not guess when a product keyword is ambiguous', () => {
  assert.equal(findPurchase('What about wireless?', purchases), null);
});

test('routes deadline question to eligibility check', () => {
  assert.equal(resolveIntent('Can I return EchoTone Wireless Headphones?', purchases).type, 'check_return_eligibility');
});

test('routes general warranty and repair options to a read-only options tool', () => {
  assert.equal(resolveIntent('Show my warranties and repair options', purchases).type, 'get_purchase_options');
});

test('routes item-specific options to a read-only options tool', () => {
  const result = resolveIntent('What are the warranty options for BrewMate Mini Coffee Maker?', purchases);
  assert.equal(result.type, 'get_purchase_options');
  assert.equal(result.purchase.id, 'p-1002');
});

test('a reported product issue shows options instead of creating a draft', () => {
  const result = resolveIntent('BrewMate Mini Coffee Maker is leaking', purchases);
  assert.equal(result.type, 'get_purchase_options');
  assert.equal(result.purchase.id, 'p-1002');
});

test('requires a named product before creating a draft', () => {
  assert.equal(resolveIntent('Prepare a warranty case', purchases).type, 'choose_purchase');
});

test('only prepares a draft after explicit preparation language', () => {
  const result = resolveIntent('Prepare a warranty case for BrewMate Mini Coffee Maker', purchases);
  assert.equal(result.type, 'prepare_case');
  assert.equal(result.caseType, 'warranty');
  assert.equal(result.purchase.id, 'p-1002');
});

test('routes case status questions to list cases', () => {
  assert.equal(resolveIntent('Show my cases', purchases).type, 'list_cases');
});

test('does not turn an unknown message into an arbitrary action', () => {
  assert.equal(resolveIntent('hello there', purchases).type, 'help');
});
