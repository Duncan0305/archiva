"use client";

import { useState } from "react";
import type { OrganizedPage } from "@/types/organize-pdf";

interface HistoryState {
  original: OrganizedPage[];
  past: OrganizedPage[][];
  present: OrganizedPage[];
  future: OrganizedPage[][];
}

const limit = 50;
const copy = (pages: readonly OrganizedPage[]) =>
  pages.map((page) => ({ ...page }));

export function useOrganizeHistory() {
  const [state, setState] = useState<HistoryState>({
    original: [],
    past: [],
    present: [],
    future: [],
  });

  function initialize(pages: OrganizedPage[]) {
    const initial = copy(pages);
    setState({
      original: initial,
      past: [],
      present: copy(initial),
      future: [],
    });
  }

  function commit(
    update: OrganizedPage[] | ((pages: OrganizedPage[]) => OrganizedPage[]),
  ) {
    setState((previous) => {
      const next =
        typeof update === "function"
          ? update(copy(previous.present))
          : copy(update);
      if (JSON.stringify(next) === JSON.stringify(previous.present))
        return previous;
      return {
        ...previous,
        past: [...previous.past.slice(-(limit - 1)), copy(previous.present)],
        present: next,
        future: [],
      };
    });
  }

  function undo() {
    setState((previous) => {
      const prior = previous.past.at(-1);
      if (!prior) return previous;
      return {
        ...previous,
        past: previous.past.slice(0, -1),
        present: copy(prior),
        future: [copy(previous.present), ...previous.future].slice(0, limit),
      };
    });
  }

  function redo() {
    setState((previous) => {
      const next = previous.future[0];
      if (!next) return previous;
      return {
        ...previous,
        past: [...previous.past.slice(-(limit - 1)), copy(previous.present)],
        present: copy(next),
        future: previous.future.slice(1),
      };
    });
  }

  function restore() {
    commit(copy(state.original));
  }

  return {
    pages: state.present,
    initialize,
    commit,
    undo,
    redo,
    restore,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    changed: JSON.stringify(state.present) !== JSON.stringify(state.original),
  };
}
