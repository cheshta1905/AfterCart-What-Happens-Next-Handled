import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createAfterCartMcpServer } from './tools.js';
import { isAllowedMcpOrigin } from './security.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
app.use(express.json({ limit: '1mb' }));

function enforceMcpOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!isAllowedMcpOrigin(origin)) {
    return res.status(403).json({ error: 'Origin not allowed by the local AfterCart MCP server.' });
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'AfterCart', transport: 'Streamable HTTP', mode: 'demo-data' });
});

app.post('/mcp', enforceMcpOrigin, async (req, res) => {
  const server = createAfterCartMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  // Attach cleanup before handling the request, because a JSON response can close quickly.
  res.on('close', () => {
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'AfterCart could not process the MCP request.' },
        id: req.body?.id ?? null
      });
    }
  }
});

app.get('/mcp', enforceMcpOrigin, (_req, res) => {
  res.status(405).json({ error: 'This stateless demo endpoint accepts MCP POST requests.' });
});
app.delete('/mcp', enforceMcpOrigin, (_req, res) => {
  res.status(405).json({ error: 'This stateless demo endpoint does not use sessions.' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`AfterCart MCP server listening at http://127.0.0.1:${PORT}/mcp`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
