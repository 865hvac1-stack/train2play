"use client";

import { startTransition, useCallback, type FormEvent } from "react";

/**
 * React resets an uncontrolled `<form action={…}>` once the action finishes,
 * which wipes a half-written drill — including the chosen video — every time a
 * save is refused. Dispatching from a transition instead keeps the typed values
 * and the selected file in place so the coach can fix one field and save again.
 *
 * Native validation still runs first, because it happens before `submit` fires.
 */
export function usePreservingSubmit(dispatch: (formData: FormData) => void) {
  return useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => dispatch(formData));
    },
    [dispatch],
  );
}
