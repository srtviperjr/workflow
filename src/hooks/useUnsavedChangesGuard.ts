import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

const LEAVE_MESSAGE =
  'You have unsaved changes. Leave without saving? Your changes will be lost.';

/**
 * Block in-app navigation and tab close while `when` is true.
 * On confirmed leave, runs `onDiscard` (e.g. delete an unsaved create/copy draft).
 */
export function useUnsavedChangesGuard(options: {
  when: boolean;
  onDiscard: () => void;
}): { allowNextNavigation: () => void } {
  const { when, onDiscard } = options;
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;
  const whenRef = useRef(when);
  whenRef.current = when;
  const allowRef = useRef(false);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (allowRef.current) return false;
    return when && currentLocation.pathname !== nextLocation.pathname;
  });

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm(LEAVE_MESSAGE);
    if (leave) {
      onDiscardRef.current();
      allowRef.current = true;
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  // Best-effort: discard unsaved drafts when the tab is closed
  useEffect(() => {
    const onPageHide = () => {
      if (whenRef.current) onDiscardRef.current();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  return {
    allowNextNavigation: () => {
      allowRef.current = true;
    },
  };
}

/** Confirm before a programmatic navigate (Back button). Returns true if navigation may proceed. */
export function confirmDiscardUnsaved(
  when: boolean,
  onDiscard: () => void,
): boolean {
  if (!when) return true;
  const leave = window.confirm(LEAVE_MESSAGE);
  if (leave) onDiscard();
  return leave;
}
