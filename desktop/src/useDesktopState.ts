import { useCallback, useEffect, useState } from 'react';
import type { DesktopState } from './domain';
import { stateRepository, type StateRepository } from './stateRepository';

export function useDesktopState(initial: () => DesktopState, repository: StateRepository = stateRepository) {
  const [state, setState] = useState(initial);
  const [saveFailed, setSaveFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    // Forward each snapshot immediately. Native persistence owns write ordering
    // and must see pending writes before the desktop window starts closing.
    void repository.save(state).then(
      () => { if (!disposed) setSaveFailed(false); },
      () => { if (!disposed) setSaveFailed(true); },
    );
    return () => { disposed = true; };
  }, [state, attempt, repository]);
  const update = useCallback((mutate: (draft: DesktopState) => void) => {
    setState(previous => { const next = structuredClone(previous); mutate(next); return next; });
  }, []);
  const retrySave = useCallback(() => setAttempt(value => value + 1), []);
  return { state, setState, update, saveFailed, retrySave };
}
