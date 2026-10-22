import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

let clientPromise;

export async function getMcpClient() {
  if (!clientPromise) {
    const client = new Client({ name: 'aftercart-browser', version: '0.4.0' });
    const transport = new StreamableHTTPClientTransport(new URL('/mcp', window.location.origin));
    clientPromise = client.connect(transport)
      .then(() => client)
      .catch((error) => {
        clientPromise = undefined;
        throw error;
      });
  }
  return clientPromise;
}

export async function callMcpTool(name, args = {}) {
  const client = await getMcpClient();
  const response = await client.callTool({ name, arguments: args });
  if (response.isError) {
    const text = response.content?.find((part) => part.type === 'text')?.text;
    throw new Error(text || `MCP tool ${name} failed.`);
  }
  if (response.structuredContent) return response.structuredContent;
  const text = response.content?.find((part) => part.type === 'text')?.text;
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
