import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createCase, confirmCase, getPurchase, listCases, listPurchases } from './store.js';

function result(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data
  };
}

function daysUntil(dateString) {
  const target = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function createAfterCartMcpServer() {
  const server = new McpServer({
    name: 'aftercart-post-purchase-agent',
    version: '0.4.0'
  });

  server.registerTool(
    'list_purchases',
    {
      title: 'List purchases',
      description: 'List seeded demo purchases. Optionally filter by item name, brand, order number, category, or purchase ID.',
      inputSchema: { search: z.string().optional().describe('Optional text to filter purchases.') }
    },
    async ({ search = '' }) => result({ purchases: listPurchases(search) })
  );

  server.registerTool(
    'get_purchase_options',
    {
      title: 'Get purchase support options',
      description: 'Read-only overview of possible return, warranty, and repair next steps for one seeded purchase or all demo purchases. This is not a retailer eligibility or warranty coverage decision.',
      inputSchema: { purchaseId: z.string().optional().describe('Optional purchase ID, for example p-1001. Omit to review all sample purchases.') }
    },
    async ({ purchaseId }) => {
      const found = purchaseId ? getPurchase(purchaseId) : null;
      if (purchaseId && !found) return result({ error: `Purchase ${purchaseId} was not found.`, purchaseId });
      const purchases = purchaseId ? [found] : listPurchases();
      const options = purchases.map((purchase) => {
        const returnDays = daysUntil(purchase.returnDeadline);
        const warrantyDays = purchase.warrantyUntil ? daysUntil(purchase.warrantyUntil) : null;
        const nextSteps = [];

        if (returnDays >= 0) {
          nextSteps.push({
            caseType: 'return',
            label: 'Prepare return draft',
            reason: `The sample record lists a return deadline of ${purchase.returnDeadline}. Verify the actual retailer policy before acting.`
          });
        }

        nextSteps.push({
          caseType: 'warranty',
          label: 'Prepare warranty draft',
          reason: warrantyDays !== null && warrantyDays >= 0
            ? `The sample record lists a warranty end date of ${purchase.warrantyUntil}; this does not establish actual coverage.`
            : 'The sample warranty date is not current; ask the manufacturer about any applicable coverage or support options.'
        });

        nextSteps.push({
          caseType: 'repair',
          label: 'Prepare repair draft',
          reason: purchase.issue
            ? `Reported issue in sample data: ${purchase.issue}`
            : 'No issue is recorded in this sample purchase; add details before using a repair draft.'
        });

        return {
          purchaseId: purchase.id,
          item: purchase.item,
          brand: purchase.brand,
          orderNumber: purchase.orderNumber,
          issue: purchase.issue,
          returnDeadline: purchase.returnDeadline,
          returnDaysRemaining: returnDays,
          returnWindowListedOpen: returnDays >= 0,
          warrantyUntil: purchase.warrantyUntil || null,
          warrantyDaysRemaining: warrantyDays,
          warrantyWindowListedActive: warrantyDays === null ? null : warrantyDays >= 0,
          nextSteps
        };
      });

      return result({
        count: options.length,
        options,
        limitation: 'Options are derived from seeded local sample records. Dates do not guarantee retailer eligibility or warranty coverage, and preparing a case only creates a local draft.'
      });
    }
  );

  server.registerTool(
    'get_attention_summary',
    {
      title: 'Get attention summary',
      description: 'Find purchases with return deadlines in the next seven days, recently passed return windows, and draft cases awaiting confirmation.',
      inputSchema: {}
    },
    async () => {
      const purchases = listPurchases();
      const cases = listCases();
      const dueSoon = purchases
        .map((p) => ({ ...p, daysUntilReturnDeadline: daysUntil(p.returnDeadline) }))
        .filter((p) => p.daysUntilReturnDeadline >= 0 && p.daysUntilReturnDeadline <= 7)
        .sort((a, b) => a.daysUntilReturnDeadline - b.daysUntilReturnDeadline);
      const returnWindowPassed = purchases
        .map((p) => ({ ...p, daysSinceReturnDeadline: Math.abs(daysUntil(p.returnDeadline)) }))
        .filter((p) => daysUntil(p.returnDeadline) < 0);
      const waitingForConfirmation = cases.filter((c) => c.status.startsWith('Draft'));
      return result({
        generatedAt: new Date().toISOString(),
        dueSoon,
        returnWindowPassed,
        waitingForConfirmation,
        headline: dueSoon.length
          ? `${dueSoon.length} purchase${dueSoon.length === 1 ? '' : 's'} need attention within seven days.`
          : 'No return deadlines are coming up in the next seven days.',
        note: 'This summary is calculated from local demo data, not a connected retailer account.'
      });
    }
  );

  server.registerTool(
    'check_return_eligibility',
    {
      title: 'Check return eligibility',
      description: 'Check the demo return deadline for one purchase. This is a local estimate based on the seeded record, not a retailer decision.',
      inputSchema: { purchaseId: z.string().describe('Purchase ID, for example p-1001.') }
    },
    async ({ purchaseId }) => {
      const purchase = getPurchase(purchaseId);
      if (!purchase) return result({ error: `Purchase ${purchaseId} was not found.`, purchaseId });
      const daysLeft = daysUntil(purchase.returnDeadline);
      const eligible = daysLeft >= 0;
      return result({
        purchaseId,
        item: purchase.item,
        orderNumber: purchase.orderNumber,
        returnDeadline: purchase.returnDeadline,
        daysLeft,
        eligible,
        explanation: eligible
          ? `The seeded record is within its listed return window, with ${daysLeft} day${daysLeft === 1 ? '' : 's'} until the deadline.`
          : `The seeded return deadline passed ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago. A warranty or repair option may still be worth checking.`,
        limitation: 'Demo-only eligibility check; confirm actual terms with the retailer.'
      });
    }
  );

  server.registerTool(
    'prepare_case',
    {
      title: 'Prepare a return, warranty, or repair case',
      description: 'Create a local draft case for a purchase. It does not contact a retailer and requires a separate confirmation tool call.',
      inputSchema: {
        purchaseId: z.string().describe('Purchase ID, for example p-1001.'),
        caseType: z.enum(['return', 'warranty', 'repair']).describe('Type of case to prepare.'),
        note: z.string().optional().describe('Brief explanation or issue details.')
      }
    },
    async ({ purchaseId, caseType, note = '' }) => {
      try {
        const purchase = getPurchase(purchaseId);
        if (!purchase) return result({ error: `Purchase ${purchaseId} was not found.` });
        const newCase = createCase({ purchaseId, caseType, note: note || purchase.issue });
        return result({
          case: newCase,
          nextStep: 'Review this draft. Confirming it only updates the local demo record; it does not contact a retailer.'
        });
      } catch (error) {
        return result({ error: error instanceof Error ? error.message : 'Could not prepare the case.' });
      }
    }
  );

  server.registerTool(
    'list_cases',
    {
      title: 'List cases',
      description: 'List all locally saved demo return, warranty, and repair cases, including their status.',
      inputSchema: {}
    },
    async () => result({ cases: listCases() })
  );

  server.registerTool(
    'confirm_case_action',
    {
      title: 'Confirm a demo case',
      description: 'Mark a draft case as confirmed in the local demo after the user explicitly approves it. This does not contact a retailer or submit an actual return.',
      inputSchema: { caseId: z.string().describe('Case ID to confirm, for example CASE-12AB34CD.') }
    },
    async ({ caseId }) => {
      try {
        const updatedCase = confirmCase(caseId);
        return result({
          case: updatedCase,
          message: 'Confirmed in the AfterCart demo. No retailer was contacted and no real-world return, repair, or warranty request was submitted.'
        });
      } catch (error) {
        return result({ error: error instanceof Error ? error.message : 'Could not confirm the case.' });
      }
    }
  );

  return server;
}
