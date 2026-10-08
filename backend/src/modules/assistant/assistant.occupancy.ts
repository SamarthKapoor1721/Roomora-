import type { AssistantResponse } from '../../lib/aiClient';
import type { assistantTools, AssistantToolName } from './assistant.tools';

type Overview = Awaited<ReturnType<typeof assistantTools.occupancyOverview>>;

/** Count rooms directly; a spare bed never makes an occupied room empty. */
export function occupancyAnswer(question: string, tools: AssistantToolName[], context: Record<string, unknown>): AssistantResponse | null {
  if (!tools.includes('occupancyOverview') || tools.some((t) => t !== 'occupancyOverview' && t !== 'vacantRooms')) return null;
  const q = question.toLowerCase();
  if (!/(room|bed|occupancy|how full)/.test(q)) return null;
  const rows = context.occupancyOverview as Overview;
  const named = rows.filter((r) => q.includes(r.property.toLowerCase()));
  // Do not answer a specific, unmatched property with another property's figures.
  if (named.length === 0 && /\b(in|at|for)\s+\S/.test(q)) return null;
  const selected = named.length ? named : rows;
  const answer = selected.length ? selected.map((r) => {
    const beds = r.capacity - r.occupants;
    return `${r.property}: ${r.occupiedRooms} occupied room(s), ${r.vacantRooms} empty room(s), ${r.fullRooms} room(s) at full capacity (${r.rooms} rooms total).\n`
      + `${r.occupants}/${r.capacity} beds occupied; ${beds} bed(s) free.\n`
      + r.roomDetails.map((room) => `- ${room.room}: ${room.occupants === 0 ? 'empty' : 'occupied'}, ${room.occupants}/${room.capacity} beds occupied.`).join('\n');
  }).join('\n\n') : 'You have no active properties.';
  return { source: 'RULE_BASED_FALLBACK', answer };
}
