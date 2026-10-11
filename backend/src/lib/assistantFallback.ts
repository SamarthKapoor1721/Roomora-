import type { AssistantRequest, AssistantResponse } from './aiClient';

/** Report retrieved figures when the remote service cannot respond. */
export function assistantFallback(payload: AssistantRequest): AssistantResponse {
  const revenue = payload.context.revenueSummary as {
    totalBilled: number; totalCollected: number; outstanding: number; collectedThisMonth: number;
  } | undefined;
  const money = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const answer = revenue && /revenue|income|earnings|collected|money|financ|outstanding|profit/i.test(payload.question)
    ? 'The AI service could not respond. Here are your portfolio figures from the database:\n\n'
      + `Total rent collected: ${money(revenue.totalCollected)}\n`
      + `Collected this month: ${money(revenue.collectedThisMonth)}\n`
      + `Total billed: ${money(revenue.totalBilled)}\n`
      + `Outstanding: ${money(revenue.outstanding)}`
    : 'The AI service could not respond. Please try again shortly. You can still view your figures in the dashboard.';
  return { source: 'RULE_BASED_FALLBACK', answer };
}
