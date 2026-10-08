import { describe, expect, it } from 'vitest';
import { occupancyAnswer } from './assistant.occupancy';

const maple = {
  property: 'Maple Residency', rooms: 2, occupiedRooms: 1, vacantRooms: 1, fullRooms: 0,
  capacity: 5, occupants: 1, occupancyRate: 20,
  roomDetails: [{ room: 'Room 101', occupants: 1, capacity: 2 }, { room: 'Room 102', occupants: 0, capacity: 3 }],
};
const tools = ['occupancyOverview', 'vacantRooms'] as const;

describe('occupancy answers', () => {
  it('distinguishes occupied rooms, empty rooms, full rooms and beds for the reported case', () => {
    const response = occupancyAnswer('HOW MANY ROOMS ARE VACANT AND FILLED IN MAPLE RESIDENCY', [...tools], { occupancyOverview: [maple] });
    expect(response?.answer).toContain('1 occupied room(s), 1 empty room(s), 0 room(s) at full capacity');
    expect(response?.answer).toContain('1/5 beds occupied; 4 bed(s) free');
    expect(response?.answer).toContain('Room 101: occupied, 1/2');
  });
  it('restricts the answer to the named property', () => {
    const response = occupancyAnswer('Vacant rooms in Maple Residency', [...tools], { occupancyOverview: [maple, { ...maple, property: 'Other Property' }] });
    expect(response?.answer).not.toContain('Other Property');
  });
  it('does not substitute another property or ignore a mixed financial question', () => {
    expect(occupancyAnswer('Vacant rooms in Unknown House', [...tools], { occupancyOverview: [maple] })).toBeNull();
    expect(occupancyAnswer('Occupancy and revenue', ['occupancyOverview', 'revenueSummary'], { occupancyOverview: [maple] })).toBeNull();
  });
});
