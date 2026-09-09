import {
  computeDefaultSessionAllowanceAmountVnd,
  hasSessionAllowanceSnapshots,
  resolveSnapshotPerStudentAllowanceVnd,
  resolveSnapshotScaleAmountVnd,
} from './session-allowance.util';
import { presentCustomAllowanceAsPerSession } from '../common/block-pricing.util';

describe('session-allowance.util', () => {
  it('resolves per-student allowance from custom then class default', () => {
    expect(
      resolveSnapshotPerStudentAllowanceVnd({
        customAllowance: 60_000,
        classDefaultPerStudent: 50_000,
      }),
    ).toBe(60_000);
    expect(
      resolveSnapshotPerStudentAllowanceVnd({
        customAllowance: null,
        classDefaultPerStudent: 50_000,
      }),
    ).toBe(50_000);
  });

  it('computes allowance from stored snapshots and chargeable count', () => {
    expect(
      computeDefaultSessionAllowanceAmountVnd({
        perStudentAllowance: 50_000,
        classDefaultPerStudent: null,
        scaleAmount: 100_000,
        chargeableStudentCount: 3,
      }),
    ).toBe(250_000);
    expect(
      computeDefaultSessionAllowanceAmountVnd({
        perStudentAllowance: 50_000,
        classDefaultPerStudent: null,
        scaleAmount: 100_000,
        chargeableStudentCount: 0,
      }),
    ).toBe(100_000);
  });

  it('detects whether session allowance snapshots exist', () => {
    expect(
      hasSessionAllowanceSnapshots({
        snapshotPerStudentAllowance: 0,
        snapshotScaleAmount: null,
      }),
    ).toBe(true);
    expect(
      hasSessionAllowanceSnapshots({
        snapshotPerStudentAllowance: null,
        snapshotScaleAmount: null,
      }),
    ).toBe(false);
  });

  it('normalizes snapshot scale amount', () => {
    expect(resolveSnapshotScaleAmountVnd(120_000)).toBe(120_000);
    expect(resolveSnapshotScaleAmountVnd(null)).toBe(0);
  });

  it('regression: per-session mode reconstructs custom allowance then uses the old formula', () => {
    const reconstructed = presentCustomAllowanceAsPerSession(30_000, 3, true);
    expect(reconstructed).toBe(90_000);
    expect(
      computeDefaultSessionAllowanceAmountVnd({
        perStudentAllowance: reconstructed,
        classDefaultPerStudent: 90_000,
        scaleAmount: 0,
        chargeableStudentCount: 2,
      }),
    ).toBe(180_000);
  });
});
