import { describe, expect, it } from 'vitest';
import { patientNumber } from './clinicText';

describe('patientNumber', () => {
  it('names seeded patients like the video, and the demo patient in words (D94)', () => {
    expect(patientNumber('P-0187')).toBe('Patient 0187');
    expect(patientNumber('P-DEMO')).toBe('Demo patient');
    expect(patientNumber('X-1')).toBe('X-1');
  });
});
