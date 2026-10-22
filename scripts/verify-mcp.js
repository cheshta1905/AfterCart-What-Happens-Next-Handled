import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.env.MCP_URL || 'http://127.0.0.1:3001/mcp';
const requiredTools = [
  'list_purchases',
  'get_purchase_options',
  'get_attention_summary',
  'check_return_eligibility',
  'prepare_case',
  'list_cases',
  'confirm_case_action'
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function extractData(result, label) {
  if (result?.isError) {
    const message = result.content?.find((part) => part.type === 'text')?.text;
    throw new Error(`${label} returned an MCP tool error: ${message || 'unknown tool error'}`);
  }
  if (result?.structuredContent && typeof result.structuredContent === 'object') {
    return result.structuredContent;
  }
  const text = result?.content?.find((part) => part.type === 'text')?.text;
  if (!text) throw new Error(`${label} returned no readable content.`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned text that was not JSON.`);
  }
}

let client;
try {
  client = new Client({ name: 'aftercart-mcp-verifier', version: '0.3.0' });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  await client.connect(transport);
  console.log(`PASS: MCP initialize handshake completed via Streamable HTTP (${endpoint}).`);

  const { tools = [] } = await client.listTools();
  const names = tools.map((tool) => tool.name);
  const missing = requiredTools.filter((name) => !names.includes(name));
  if (missing.length) {
    fail(`tools/list is missing: ${missing.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: tools/list returned all ${requiredTools.length} required tools.`);
    for (const name of requiredTools) console.log(`  • ${name}`);
  }

  const purchaseData = extractData(
    await client.callTool({ name: 'list_purchases', arguments: {} }),
    'list_purchases'
  );
  if (!Array.isArray(purchaseData.purchases) || purchaseData.purchases.length < 1) {
    fail('list_purchases did not return at least one seeded purchase.');
  } else {
    console.log(`PASS: tools/call list_purchases returned ${purchaseData.purchases.length} seeded purchases.`);
  }

  const optionData = extractData(
    await client.callTool({ name: 'get_purchase_options', arguments: { purchaseId: 'p-1001' } }),
    'get_purchase_options'
  );
  if (!Array.isArray(optionData.options) || optionData.options.length !== 1 || !Array.isArray(optionData.options[0].nextSteps)) {
    fail('get_purchase_options did not return options and next steps for p-1001.');
  } else {
    console.log(`PASS: tools/call get_purchase_options returned ${optionData.options[0].nextSteps.length} next steps for p-1001.`);
  }

  const summaryData = extractData(
    await client.callTool({ name: 'get_attention_summary', arguments: {} }),
    'get_attention_summary'
  );
  if (typeof summaryData.headline !== 'string' || !Array.isArray(summaryData.dueSoon)) {
    fail('get_attention_summary did not return the expected summary fields.');
  } else {
    console.log(`PASS: tools/call get_attention_summary returned a usable summary: ${summaryData.headline}`);
  }

  const eligibilityData = extractData(
    await client.callTool({ name: 'check_return_eligibility', arguments: { purchaseId: 'p-1001' } }),
    'check_return_eligibility'
  );
  if (eligibilityData.purchaseId !== 'p-1001' || typeof eligibilityData.eligible !== 'boolean') {
    fail('check_return_eligibility did not return the expected demo eligibility fields.');
  } else {
    console.log('PASS: tools/call check_return_eligibility returned a purchase-specific result.');
  }

  if (process.exitCode !== 1) {
    console.log('\nMCP SMOKE TEST PASSED. No case was created or confirmed by this check.');
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  console.error('Make sure npm run dev is running in another terminal and the server is reachable.');
} finally {
  if (client) {
    try { await client.close(); } catch { /* preserve the original verification result */ }
  }
}
