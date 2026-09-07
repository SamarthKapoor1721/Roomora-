import { describe, expect, it } from 'vitest';
import { effectiveFood } from './rooms.service';

describe('effectiveFood', () => {
  it('is enabled when the property enables food, using the room charge if set', () => {
    const r = effectiveFood(
      { foodEnabled: false, foodCharge: 2500 },
      { foodEnabled: true, foodCharge: 3000 },
    );
    expect(r).toEqual({ foodEnabled: true, foodCharge: 2500 });
  });

  it('falls back to the property charge when the room has none', () => {
    const r = effectiveFood(
      { foodEnabled: false, foodCharge: 0 },
      { foodEnabled: true, foodCharge: 3000 },
    );
    expect(r).toEqual({ foodEnabled: true, foodCharge: 3000 });
  });

  it('is enabled by a room-level override even if the property disables it', () => {
    const r = effectiveFood(
      { foodEnabled: true, foodCharge: 1800 },
      { foodEnabled: false, foodCharge: 0 },
    );
    expect(r).toEqual({ foodEnabled: true, foodCharge: 1800 });
  });

  it('reports no charge when food is disabled everywhere', () => {
    const r = effectiveFood(
      { foodEnabled: false, foodCharge: 2500 },
      { foodEnabled: false, foodCharge: 3000 },
    );
    expect(r).toEqual({ foodEnabled: false, foodCharge: 0 });
  });
});
