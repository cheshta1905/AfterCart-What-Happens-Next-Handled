/**
 * Small, deterministic intent router for the AfterCart demo.
 * This is deliberately transparent and testable; it is not an LLM.
 */

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'can', 'could', 'for', 'from',
  'have', 'help', 'into', 'item', 'items', 'mine', 'my', 'need', 'please', 'show',
  'some', 'that', 'the', 'this', 'what', 'when', 'where', 'with', 'would', 'your'
]);

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim();
}

/** Match explicit purchase IDs/names first, then use an unambiguous token score. */
export function findPurchase(text, purchases = []) {
  const needle = normalize(text);
  if (!needle) return null;

  for (const purchase of purchases) {
    const candidates = [purchase.id, purchase.orderNumber, purchase.item];
    if (candidates.some((candidate) => candidate && needle.includes(normalize(candidate)))) {
      return purchase;
    }
  }

  const queryTokens = new Set(needle.split(/\s+/).filter((token) => token.length >= 4 && !STOP_WORDS.has(token)));
  if (!queryTokens.size) return null;

  const scored = purchases.map((purchase) => {
    const itemTokens = new Set(normalize(`${purchase.brand || ''} ${purchase.item || ''}`).split(/\s+/));
    const overlap = [...queryTokens].filter((token) => itemTokens.has(token));
    return { purchase, score: overlap.length };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].purchase;
}

/**
 * Resolve a chat message to a read-only query, a draft action, or a clarification.
 * Mutating actions require an explicit prepare request; confirmation remains a separate UI button.
 */
export function resolveIntent(text, purchases = []) {
  const lower = normalize(text);
  const purchase = findPurchase(text, purchases);

  if (!lower) return { type: 'empty' };

  if (/\b(help|what can you do|how do you work|examples)\b/.test(lower)) {
    return { type: 'help' };
  }

  const explicitPrepare = /\b(prepare|create|draft|start|begin|open)\b/.test(lower)
    && /\b(return|warranty|repair|case|claim)\b/.test(lower)
    && !/\b(options?|should i|could i|can i|what if)\b/.test(lower);

  if (explicitPrepare) {
    if (!purchase) return { type: 'choose_purchase', originalText: String(text || '').trim() };
    const caseType = /\bwarranty\b/.test(lower) ? 'warranty'
      : /\b(repair|fix)\b/.test(lower) ? 'repair' : 'return';
    return { type: 'prepare_case', purchase, caseType };
  }

  if (/\b(show|list|view|get|find|check)\b.*\b(cases|claims|drafts)\b|\b(my cases|unresolved cases|pending cases)\b/.test(lower)) {
    return { type: 'list_cases' };
  }

  if (/\b(can i return|can this be returned|eligible|eligibility|return deadline|return window|send it back|return it)\b/.test(lower)) {
    if (purchase) return { type: 'check_return_eligibility', purchase };
    if (/\b(deadline|window|this week|today|soon)\b/.test(lower)) return { type: 'attention_summary' };
    return { type: 'choose_purchase', originalText: String(text || '').trim(), requestedAction: 'check eligibility' };
  }

  const asksForOptions = /\b(options?|what should i do|what can i do|what do i need to do|next steps|what do you recommend|support|service|warranty|repair)\b/.test(lower);
  const reportsIssue = /\b(leak|leaking|broken|fault|issue|damaged|not working|stops|skips|loose|problem)\b/.test(lower);
  if (asksForOptions || (purchase && reportsIssue)) return { type: 'get_purchase_options', purchase: purchase || null };

  if (/\b(attention|this week|coming up|urgent|priorit|what should i tackle|what do i need to do)\b/.test(lower)) {
    return { type: 'attention_summary' };
  }

  if (/\b(show|list|view|get|find|all|my)\b.*\b(purchases|orders|products|items)\b|\b(purchases|orders)\s+(list|overview)\b/.test(lower)) {
    return { type: 'list_purchases', search: purchase?.item || '' };
  }

  if (purchase) return { type: 'list_purchases', search: purchase.item };
  return { type: 'help' };
}
