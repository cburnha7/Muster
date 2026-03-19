/**
 * Unit tests for suggested dues calculator
 */

import { calculateSuggestedDues } from '../suggested-dues';

describe('calculateSuggestedDues', () => {
  it('should return ceiled result for the formula (gamesPerTeam × avgCourtCost) / rosterCount', () => {
    // 10 games × $75 avg cost / 5 rosters = $150
    expect(calculateSuggestedDues(10, 75, 5)).toBe(150);
  });

  it('should ceil fractional results', () => {
    // 10 games × $100 avg cost / 3 rosters = 333.33... → 334
    expect(calculateSuggestedDues(10, 100, 3)).toBe(334);
  });

  it('should return 0 when rosterCount is 0', () => {
    expect(calculateSuggestedDues(10, 75, 0)).toBe(0);
  });

  it('should return 0 when gamesPerTeam is 0', () => {
    expect(calculateSuggestedDues(0, 75, 5)).toBe(0);
  });

  it('should return 0 when avgCourtCost is 0', () => {
    expect(calculateSuggestedDues(10, 0, 5)).toBe(0);
  });

  it('should return 0 when rosterCount is negative', () => {
    expect(calculateSuggestedDues(10, 75, -1)).toBe(0);
  });

  it('should return 0 when gamesPerTeam is negative', () => {
    expect(calculateSuggestedDues(-5, 75, 5)).toBe(0);
  });

  it('should handle single roster correctly', () => {
    // 10 games × $50 / 1 roster = $500
    expect(calculateSuggestedDues(10, 50, 1)).toBe(500);
  });

  it('should handle single game correctly', () => {
    // 1 game × $120 / 4 rosters = $30
    expect(calculateSuggestedDues(1, 120, 4)).toBe(30);
  });

  it('should handle large values', () => {
    // 20 games × $200 / 8 rosters = $500
    expect(calculateSuggestedDues(20, 200, 8)).toBe(500);
  });
});
