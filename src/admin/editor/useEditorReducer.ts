import { useReducer } from 'react';
import { UNDO_HISTORY_LIMIT } from '@/config/editor';
import type { PageElement, TextProps, BackgroundImageProps } from '@/types/elements';

export interface GeometryChanges {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EditorState {
  elements: PageElement[];
  past: PageElement[][];
  future: PageElement[][];
  // Flips true once SET_ELEMENTS has seeded the reducer from the initial
  // Supabase load. Derived here (not a separate useState in the component)
  // so PageElementEditor can gate useAutosave's `enabled` purely from
  // dispatch-driven state, never a raw setState call inside an effect.
  loaded: boolean;
}

export type EditorAction =
  | { type: 'SET_ELEMENTS'; elements: PageElement[] }
  | { type: 'ADD_ELEMENT'; element: PageElement }
  | { type: 'DELETE_ELEMENT'; id: string }
  | { type: 'UPDATE_ELEMENT'; id: string; changes: GeometryChanges }
  | { type: 'UPDATE_TEXT_PROPS'; id: string; changes: Partial<TextProps> }
  | { type: 'UPDATE_BACKGROUND_IMAGE_PROPS'; id: string; changes: Partial<BackgroundImageProps> }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialState: EditorState = { elements: [], past: [], future: [], loaded: false };

// Caps the undo stack so a long editing session can't grow memory
// unboundedly (CLAUDE.md "Autosave & undo/redo": capped snapshot stack).
function pushHistory(past: PageElement[][], snapshot: PageElement[]): PageElement[][] {
  const next = [...past, snapshot];
  return next.length > UNDO_HISTORY_LIMIT ? next.slice(next.length - UNDO_HISTORY_LIMIT) : next;
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_ELEMENTS':
      // Initial load from Supabase — not a user edit, so it must not be
      // undoable and must not carry over history from a previously loaded page.
      return { elements: action.elements, past: [], future: [], loaded: true };

    case 'ADD_ELEMENT':
      return {
        ...state,
        elements: [...state.elements, action.element],
        past: pushHistory(state.past, state.elements),
        future: [],
      };

    case 'DELETE_ELEMENT':
      return {
        ...state,
        elements: state.elements.filter((element) => element.id !== action.id),
        past: pushHistory(state.past, state.elements),
        future: [],
      };

    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map((element) =>
          element.id === action.id ? ({ ...element, ...action.changes } as PageElement) : element,
        ),
        past: pushHistory(state.past, state.elements),
        future: [],
      };

    case 'UPDATE_TEXT_PROPS':
      return {
        ...state,
        elements: state.elements.map((element) =>
          element.id === action.id && element.type === 'text'
            ? { ...element, props: { ...element.props, ...action.changes } }
            : element,
        ),
        past: pushHistory(state.past, state.elements),
        future: [],
      };

    case 'UPDATE_BACKGROUND_IMAGE_PROPS':
      return {
        ...state,
        elements: state.elements.map((element) =>
          element.id === action.id && element.type === 'background_image'
            ? { ...element, props: { ...element.props, ...action.changes } }
            : element,
        ),
        past: pushHistory(state.past, state.elements),
        future: [],
      };

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        elements: previous,
        past: state.past.slice(0, -1),
        future: [state.elements, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        elements: next,
        past: pushHistory(state.past, state.elements),
        future: rest,
      };
    }

    default:
      return state;
  }
}

// Owns the page's element array for the editor. Selection is deliberately
// NOT part of this state — it lives as separate useState in the component
// that owns this reducer, so selecting/deselecting never creates an undo step.
export function useEditorReducer() {
  return useReducer(reducer, initialState);
}
