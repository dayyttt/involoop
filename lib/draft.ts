// The sentence a visitor tried in the landing-page demo, handed to the invoice
// creator after signup. Lives in its own module so importing the key does not
// drag the demo component into the creator's bundle.
export const DRAFT_KEY = "involoop_draft";

export function saveDraft(text: string) {
  try {
    localStorage.setItem(DRAFT_KEY, text);
  } catch {
    // Private mode or storage disabled: the worst case is retyping.
  }
}

export function takeDraft(): string | null {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) localStorage.removeItem(DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}
