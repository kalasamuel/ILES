// Simple global store using React Context
// You can replace this with Redux, Zustand, or any state management library

import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  user: null,
  notifications: [],
  loading: false,
  error: null,
};

// Actions
const actions = {
  SET_USER: 'SET_USER',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
function reducer(state, action) {
  switch (action.type) {
    case actions.SET_USER:
      return { ...state, user: action.payload };
    case actions.SET_NOTIFICATIONS:
      return { ...state, notifications: action.payload };
    case actions.SET_LOADING:
      return { ...state, loading: action.payload };
    case actions.SET_ERROR:
      return { ...state, error: action.payload };
    case actions.CLEAR_ERROR:
      return { ...state, error: null };
    default:
      return state;
  }
}

// Context
const StoreContext = createContext();

// Provider
export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = {
    state,
    dispatch,
    actions,
  };

  return (
    <StoreContext.Provider value={value}>
      { children }
    </StoreContext.Provider>
  );
}

// Hook to use store
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}