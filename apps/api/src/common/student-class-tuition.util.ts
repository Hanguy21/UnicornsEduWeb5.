/**
 * Shared helpers for student↔class tuition: class defaults vs optional overrides on `student_classes`.
 *
 * Custom override columns (`custom_*`) treat `0` as **unset** (inherit class tuition), matching
 * operator expectations when clearing fields; only positive amounts are real overrides.
 */

export function normalizeNullableMoney(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.floor(value);
}

/** Custom override on `student_classes`: `0` means inherit from class (same as `null`). */
export function normalizeStudentClassCustomTuitionMoney(
  value: number | null | undefined,
): number | null {
  const n = normalizeNullableMoney(value);
  return n === 0 ? null : n;
}

export function resolveDerivedTuitionPerSession(
  packageTotal: number | null | undefined,
  packageSession: number | null | undefined,
): number | null {
  if (
    typeof packageTotal !== 'number' ||
    !Number.isFinite(packageTotal) ||
    typeof packageSession !== 'number' ||
    !Number.isFinite(packageSession) ||
    packageSession <= 0
  ) {
    return null;
  }

  return Math.round(packageTotal / packageSession);
}

export function resolveEffectivePackageFields(options: {
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
  classTuitionPackageTotal?: number | null;
  classTuitionPackageSession?: number | null;
}): {
  effectivePackageTotal: number | null;
  effectivePackageSession: number | null;
  hasCustomPackageOverride: boolean;
} {
  const customTuitionPackageTotal = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPackageTotal,
  );
  const customTuitionPackageSession = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPackageSession,
  );
  const hasCustomPackageOverride =
    customTuitionPackageTotal != null || customTuitionPackageSession != null;

  return {
    effectivePackageTotal:
      customTuitionPackageTotal ??
      normalizeNullableMoney(options.classTuitionPackageTotal),
    effectivePackageSession:
      customTuitionPackageSession ??
      normalizeNullableMoney(options.classTuitionPackageSession),
    hasCustomPackageOverride,
  };
}

export function hasCustomPackageOverride(options: {
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}): boolean {
  return (
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageTotal,
    ) != null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageSession,
    ) != null
  );
}

export function resolveEffectiveTuitionPerSession(options: {
  customTuitionPerSession?: number | null;
  classTuitionPerSession?: number | null;
  effectivePackageTotal?: number | null;
  effectivePackageSession?: number | null;
  hasCustomPackageOverride?: boolean;
}): number | null {
  const customTuitionPerSession = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPerSession,
  );
  if (customTuitionPerSession != null) {
    return customTuitionPerSession;
  }

  const derivedFromEffectivePackage = resolveDerivedTuitionPerSession(
    options.effectivePackageTotal,
    options.effectivePackageSession,
  );

  if (options.hasCustomPackageOverride && derivedFromEffectivePackage != null) {
    return derivedFromEffectivePackage;
  }

  const classTuitionPerSession = normalizeNullableMoney(
    options.classTuitionPerSession,
  );
  if (classTuitionPerSession != null) {
    return classTuitionPerSession;
  }

  return derivedFromEffectivePackage;
}

function normalizePositiveBlockCount(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

/**
 * Retail (non-package) charge for one session: per-block rate × snapshot block
 * count. Falls back to the stored per-session amount when per-block or block
 * count is missing (class without a standard 30-minute duration).
 */
export function resolveRetailSessionTuitionFee(options: {
  tuitionPerBlock?: number | null;
  tuitionPerSession?: number | null;
  blockCount?: number | null;
}): number | null {
  const perBlock = normalizeNullableMoney(options.tuitionPerBlock);
  const blocks = normalizePositiveBlockCount(options.blockCount);
  if (perBlock != null && blocks != null) {
    return perBlock * blocks;
  }
  return normalizeNullableMoney(options.tuitionPerSession);
}

/**
 * Charge used when creating/updating attendance without an explicit override.
 * Package students keep per-session derivation; retail students use
 * `đơn_giá_block × snapshot_block_count` (same block count as teacher allowance).
 */
export function resolveSessionChargeTuitionFee(options: {
  customTuitionPerSession?: number | null;
  customTuitionPerBlock?: number | null;
  classTuitionPerSession?: number | null;
  classTuitionPerBlock?: number | null;
  effectivePackageTotal?: number | null;
  effectivePackageSession?: number | null;
  hasCustomPackageOverride?: boolean;
  blockCount?: number | null;
}): number | null {
  const customTuitionPerSession = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPerSession,
  );
  const customTuitionPerBlock = normalizeStudentClassCustomTuitionMoney(
    options.customTuitionPerBlock,
  );
  if (customTuitionPerSession != null || customTuitionPerBlock != null) {
    return resolveRetailSessionTuitionFee({
      tuitionPerBlock: customTuitionPerBlock,
      tuitionPerSession: customTuitionPerSession,
      blockCount: options.blockCount,
    });
  }

  const derivedFromEffectivePackage = resolveDerivedTuitionPerSession(
    options.effectivePackageTotal,
    options.effectivePackageSession,
  );

  if (options.hasCustomPackageOverride && derivedFromEffectivePackage != null) {
    return derivedFromEffectivePackage;
  }

  const classTuitionPerSession = normalizeNullableMoney(
    options.classTuitionPerSession,
  );
  const classTuitionPerBlock = normalizeNullableMoney(
    options.classTuitionPerBlock,
  );
  const useClassRetailRate =
    classTuitionPerSession != null ||
    (classTuitionPerBlock != null && derivedFromEffectivePackage == null);
  if (useClassRetailRate) {
    return resolveRetailSessionTuitionFee({
      tuitionPerBlock: classTuitionPerBlock,
      tuitionPerSession: classTuitionPerSession,
      blockCount: options.blockCount,
    });
  }

  return derivedFromEffectivePackage;
}

export function hasCustomTuitionOverride(options: {
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}): boolean {
  return (
    normalizeStudentClassCustomTuitionMoney(options.customTuitionPerSession) !=
      null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageTotal,
    ) != null ||
    normalizeStudentClassCustomTuitionMoney(
      options.customTuitionPackageSession,
    ) != null
  );
}
