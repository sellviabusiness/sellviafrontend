import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after the client has hydrated. Used to defer theme-dependent rendering until we
 * know the real (non-SSR-guessed) value, without the "setState inside an effect" anti-pattern
 * (react-hooks/set-state-in-effect) that the naive `useEffect(() => setMounted(true), [])`
 * version trips.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
