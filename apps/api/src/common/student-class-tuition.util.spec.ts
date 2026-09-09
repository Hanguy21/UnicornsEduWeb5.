import {
  hasCustomTuitionOverride,
  normalizeStudentClassCustomTuitionMoney,
  resolveEffectiveTuitionPerSession,
  resolveSessionChargeTuitionFee,
} from './student-class-tuition.util';

describe('student-class-tuition.util', () => {
  it('treats custom tuition 0 as unset for effective per-session resolution', () => {
    expect(
      resolveEffectiveTuitionPerSession({
        customTuitionPerSession: 0,
        classTuitionPerSession: 200000,
        effectivePackageTotal: null,
        effectivePackageSession: null,
      }),
    ).toBe(200000);
  });

  it('keeps positive custom per-session override', () => {
    expect(
      resolveEffectiveTuitionPerSession({
        customTuitionPerSession: 150000,
        classTuitionPerSession: 200000,
        effectivePackageTotal: null,
        effectivePackageSession: null,
      }),
    ).toBe(150000);
  });

  it('derives per-session from custom package before class per-session', () => {
    expect(
      resolveEffectiveTuitionPerSession({
        customTuitionPerSession: null,
        classTuitionPerSession: 124750,
        effectivePackageTotal: 525000,
        effectivePackageSession: 4,
        hasCustomPackageOverride: true,
      }),
    ).toBe(131250);
  });

  it('inherits class per-session when there is no custom package override', () => {
    expect(
      resolveEffectiveTuitionPerSession({
        customTuitionPerSession: null,
        classTuitionPerSession: 124750,
        effectivePackageTotal: 499000,
        effectivePackageSession: 4,
        hasCustomPackageOverride: false,
      }),
    ).toBe(124750);
  });

  it('charges retail students per-block × session blocks, using custom per-block override', () => {
    expect(
      resolveSessionChargeTuitionFee({
        customTuitionPerSession: 180000,
        customTuitionPerBlock: 70000,
        classTuitionPerSession: 180000,
        classTuitionPerBlock: 60000,
        blockCount: 4,
      }),
    ).toBe(280000);
    expect(
      resolveSessionChargeTuitionFee({
        customTuitionPerSession: null,
        customTuitionPerBlock: null,
        classTuitionPerSession: 180000,
        classTuitionPerBlock: 60000,
        blockCount: 4,
      }),
    ).toBe(240000);
  });

  it('keeps package charge per-session (class package and custom package) even when blocks differ', () => {
    expect(
      resolveSessionChargeTuitionFee({
        customTuitionPerSession: null,
        classTuitionPerSession: null,
        classTuitionPerBlock: 60000,
        effectivePackageTotal: 3600000,
        effectivePackageSession: 12,
        hasCustomPackageOverride: false,
        blockCount: 4,
      }),
    ).toBe(300000);
    expect(
      resolveSessionChargeTuitionFee({
        customTuitionPerSession: null,
        classTuitionPerSession: 124750,
        classTuitionPerBlock: 41600,
        effectivePackageTotal: 525000,
        effectivePackageSession: 4,
        hasCustomPackageOverride: true,
        blockCount: 4,
      }),
    ).toBe(131250);
  });

  it('charges class retail per-block even when class also has package fields', () => {
    expect(
      resolveSessionChargeTuitionFee({
        customTuitionPerSession: null,
        classTuitionPerSession: 180000,
        classTuitionPerBlock: 60000,
        effectivePackageTotal: 3600000,
        effectivePackageSession: 12,
        hasCustomPackageOverride: false,
        blockCount: 4,
      }),
    ).toBe(240000);
  });

  it('falls back to per-session retail when per-block or block count is missing', () => {
    expect(
      resolveSessionChargeTuitionFee({
        classTuitionPerSession: 180000,
        classTuitionPerBlock: null,
        blockCount: 4,
      }),
    ).toBe(180000);
    expect(
      resolveSessionChargeTuitionFee({
        classTuitionPerSession: 180000,
        classTuitionPerBlock: 60000,
        blockCount: null,
      }),
    ).toBe(180000);
  });

  it('maps stored custom 0 to null for override detection', () => {
    expect(normalizeStudentClassCustomTuitionMoney(0)).toBeNull();
    expect(
      hasCustomTuitionOverride({
        customTuitionPerSession: 0,
        customTuitionPackageTotal: null,
        customTuitionPackageSession: null,
      }),
    ).toBe(false);
  });
});
