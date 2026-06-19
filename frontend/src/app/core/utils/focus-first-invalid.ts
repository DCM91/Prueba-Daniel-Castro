import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';

/**
 * Finds the first invalid FormControl inside a FormGroup/FormArray (or the
 * group itself) and focuses the corresponding DOM input/textarea/select.
 *
 * The lookup order is the order the controls appear in the group, which gives
 * a deterministic, top-down focus experience for users.
 */
export const focusFirstInvalid = (control: AbstractControl, root: HTMLElement): void => {
  setTimeout(() => {
    const name = findFirstInvalid(control);
    if (!name) return;
    const el = root.querySelector(`[formcontrolname="${name}"]`) as HTMLElement | null;
    el?.focus();
  }, 0);
};

const findFirstInvalid = (control: AbstractControl): string | null => {
  if (control.valid) return null;
  if (control instanceof FormControl) {
    // Returning the name of a nested control requires its parent context.
    // The caller passes the root group; we just bubble up null here and let
    // the recursive descent find the first leaf.
    return null;
  }
  if (control instanceof FormArray) {
    for (let i = 0; i < control.length; i++) {
      const child = control.at(i);
      const found = findFirstInvalid(child);
      if (found) return found;
    }
    return null;
  }
  if (control instanceof FormGroup) {
    for (const key of Object.keys(control.controls)) {
      const child = control.get(key);
      if (!child) continue;
      if (child.invalid) {
        if (child instanceof FormControl) {
          return key;
        }
        const found = findFirstInvalid(child);
        if (found) return found;
      }
    }
  }
  return null;
};
