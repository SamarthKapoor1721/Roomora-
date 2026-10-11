import { describe, expect, it } from 'vitest';
import { assistantFallback } from './assistantFallback';

describe('assistant fallback', () => {
  it('reports retrieved revenue accurately during an AI outage', () => {
    const response = assistantFallback({ question: 'What is my total revenue?', context: {
      revenueSummary: { totalBilled: 18000, totalCollected: 12000, outstanding: 6000, collectedThisMonth: 4000 },
    } });
    expect(response.source).toBe('RULE_BASED_FALLBACK');
    expect(response.answer).toContain('Total rent collected: ₹12,000');
    expect(response.answer).toContain('Collected this month: ₹4,000');
    expect(response.answer).toContain('Outstanding: ₹6,000');
  });
  it('does not invent figures when no revenue context is available', () => {
    expect(assistantFallback({ question: 'What is my revenue?', context: {} }).answer).not.toContain('₹');
  });
  it('does not answer an unrelated question with revenue figures', () => {
    expect(assistantFallback({ question: 'Why is AI offline?', context: {
      revenueSummary: { totalBilled: 0, totalCollected: 0, outstanding: 0, collectedThisMonth: 0 },
    } }).answer).not.toContain('₹');
  });
});
