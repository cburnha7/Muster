/**
 * Age calculation and validation utilities for dependent accounts.
 *
 * Used by create, edit, and transfer flows to enforce age constraints:
 * - Dependents must be under 18 to create or edit
 * - Dependents must be 18 or older to transfer
 *
 * Age is calculated by comparing year/month/day — not just subtracting years.
 * On the exact 18th birthday, calculateAge returns 18 and isUnder18 returns false.
 */

/**
 * Calculate a person's age in whole years from their date of birth.
 *
 * Compares year, month, and day to determine whether the birthday
 * has occurred yet in the current year. Handles leap year birthdays
 * correctly — a Feb 29 birthday is not considered to have occurred
 * until Feb 29 (or Mar 1 in non-leap years, since the birthday
 * simply hasn't arrived yet).
 *
 * @param dateOfBirth - The person's date of birth
 * @returns Age in whole years (floored)
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthYear = dateOfBirth.getFullYear();
  const birthMonth = dateOfBirth.getMonth();
  const birthDay = dateOfBirth.getDate();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  let age = currentYear - birthYear;

  // If the birthday hasn't occurred yet this year, subtract one
  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age--;
  }

  return age;
}

/**
 * Check whether a person is under 18 based on their date of birth.
 *
 * On the exact 18th birthday, this returns false (the person IS 18).
 *
 * @param dateOfBirth - The person's date of birth
 * @returns true if the person is under 18, false if 18 or older
 */
export function isUnder18(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) < 18;
}

/**
 * Validate a dependent's age for create/edit or transfer flows.
 *
 * - For create/edit (`mode = 'create-edit'`): throws if the dependent is 18 or older
 * - For transfer (`mode = 'transfer'`): throws if the dependent is under 18
 *
 * @param dateOfBirth - The dependent's date of birth
 * @param mode - The validation context: 'create-edit' or 'transfer'
 * @throws {Error} If the age constraint is violated
 */
export function validateDependentAge(
  dateOfBirth: Date,
  mode: 'create-edit' | 'transfer',
): void {
  const under18 = isUnder18(dateOfBirth);

  if (mode === 'create-edit' && !under18) {
    throw new Error('Dependent must be under 18');
  }

  if (mode === 'transfer' && under18) {
    throw new Error('Dependent must be 18 or older to transfer');
  }
}
