const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:3001',
  'http://localhost:3001'
];

/**
 * Local-demo Origin check. Requests without an Origin header (for example a CLI
 * MCP verifier) are allowed; browser origins must match the explicit allowlist.
 * Override with ALLOWED_MCP_ORIGINS as a comma-separated list when hosting locally
 * on different ports. Keep the server bound to loopback for this demo.
 */
export function isAllowedMcpOrigin(origin, configuredOrigins = process.env.ALLOWED_MCP_ORIGINS) {
  if (!origin) return true;
  const allowed = (configuredOrigins || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}
