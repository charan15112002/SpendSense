import {updateParserHealth, getParserHealth, getAllParserHealth} from '../services/ParserHealth';

describe('ParserHealth', () => {
  it('starts with 100% success rate and 0 count', () => {
    const health = getParserHealth('NewBank');
    expect(health.successRate).toBe(1.0);
    expect(health.totalCount).toBe(0);
    expect(health.needsAttention).toBe(false);
  });

  it('tracks successful parses', () => {
    updateParserHealth('TestBank1', true);
    updateParserHealth('TestBank1', true);
    updateParserHealth('TestBank1', true);
    const health = getParserHealth('TestBank1');
    expect(health.successRate).toBe(1.0);
    expect(health.totalCount).toBe(3);
  });

  it('tracks failed parses', () => {
    updateParserHealth('TestBank2', false);
    updateParserHealth('TestBank2', false);
    updateParserHealth('TestBank2', true);
    const health = getParserHealth('TestBank2');
    expect(health.totalCount).toBe(3);
    expect(health.successRate).toBeCloseTo(1 / 3);
  });

  it('flags needsAttention when below 50% over 20+ entries (Section 7 C2)', () => {
    const bankName = 'FailingBank';
    // Add 21 entries: 5 success, 16 fail
    for (let i = 0; i < 5; i++) updateParserHealth(bankName, true);
    for (let i = 0; i < 16; i++) updateParserHealth(bankName, false);

    const health = getParserHealth(bankName);
    expect(health.totalCount).toBe(21);
    expect(health.successRate).toBeLessThan(0.5);
    expect(health.needsAttention).toBe(true);
  });

  it('does NOT flag needsAttention when below 50% but under 20 entries', () => {
    const bankName = 'SmallSampleBank';
    for (let i = 0; i < 3; i++) updateParserHealth(bankName, false);

    const health = getParserHealth(bankName);
    expect(health.successRate).toBe(0);
    expect(health.needsAttention).toBe(false); // Too few entries to flag
  });

  it('returns all tracked banks', () => {
    const all = getAllParserHealth();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some(h => h.bankOrPackage === 'TestBank1')).toBe(true);
  });
});
