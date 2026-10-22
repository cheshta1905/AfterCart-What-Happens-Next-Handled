import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dataDir = path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'aftercart.json');

function day(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function addMonths(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 10);
}

function seedDatabase() {
  return {
    version: 1,
    seededAt: new Date().toISOString(),
    purchases: [
      {
        id: 'p-1001', orderNumber: 'AC-1001', item: 'EchoTone Wireless Headphones', brand: 'Northstar Audio',
        category: 'Electronics', icon: 'headphones', price: 6499, currency: 'INR', orderDate: day(-9),
        returnDeadline: day(2), warrantyUntil: addMonths(11), deliveryStatus: 'Delivered',
        issue: 'The headband feels a little loose.', returnPolicyDays: 30
      },
      {
        id: 'p-1002', orderNumber: 'AC-1002', item: 'BrewMate Mini Coffee Maker', brand: 'BrewMate',
        category: 'Home', icon: 'coffee', price: 4299, currency: 'INR', orderDate: day(-45),
        returnDeadline: day(-15), warrantyUntil: addMonths(9), deliveryStatus: 'Delivered',
        issue: 'The water reservoir seems to leak.', returnPolicyDays: 30
      },
      {
        id: 'p-1003', orderNumber: 'AC-1003', item: 'LumaDesk LED Task Lamp', brand: 'Luma Living',
        category: 'Home', icon: 'lamp', price: 2199, currency: 'INR', orderDate: day(-5),
        returnDeadline: day(25), warrantyUntil: addMonths(12), deliveryStatus: 'Delivered',
        issue: '', returnPolicyDays: 30
      },
      {
        id: 'p-1004', orderNumber: 'AC-1004', item: 'CloudRest Wireless Mouse', brand: 'CloudRest',
        category: 'Accessories', icon: 'mouse', price: 1599, currency: 'INR', orderDate: day(-23),
        returnDeadline: day(6), warrantyUntil: addMonths(6), deliveryStatus: 'Delivered',
        issue: 'The scroll wheel occasionally skips.', returnPolicyDays: 30
      }
    ],
    cases: []
  };
}

function ensureDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(seedDatabase(), null, 2));
  }
}

export function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeDatabase(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
}

export function listPurchases(search = '') {
  const db = readDatabase();
  const needle = search.trim().toLowerCase();
  if (!needle) return db.purchases;
  return db.purchases.filter((p) =>
    [p.id, p.orderNumber, p.item, p.brand, p.category].some((v) => String(v).toLowerCase().includes(needle))
  );
}

export function getPurchase(purchaseId) {
  return readDatabase().purchases.find((p) => p.id === purchaseId);
}

export function listCases() {
  return readDatabase().cases;
}

export function createCase({ purchaseId, caseType, note }) {
  const db = readDatabase();
  const purchase = db.purchases.find((p) => p.id === purchaseId);
  if (!purchase) throw new Error(`Purchase ${purchaseId} was not found.`);
  const newCase = {
    id: `CASE-${randomUUID().slice(0, 8).toUpperCase()}`,
    purchaseId,
    orderNumber: purchase.orderNumber,
    item: purchase.item,
    caseType,
    note: note?.trim() || 'No additional details provided.',
    status: 'Draft — waiting for your confirmation',
    createdAt: new Date().toISOString(),
    simulated: true
  };
  db.cases.unshift(newCase);
  writeDatabase(db);
  return newCase;
}

export function confirmCase(caseId) {
  const db = readDatabase();
  const found = db.cases.find((c) => c.id === caseId);
  if (!found) throw new Error(`Case ${caseId} was not found.`);
  if (!String(found.status || '').startsWith('Draft')) {
    throw new Error(`Case ${caseId} is not awaiting confirmation.`);
  }
  found.status = 'Confirmed in demo';
  found.confirmedAt = new Date().toISOString();
  found.simulated = true;
  writeDatabase(db);
  return found;
}

export function resetDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(seedDatabase(), null, 2));
}
