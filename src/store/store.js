// store/store.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { tutorialCreationMiddleware } from '@/components/shared/tutorialSteps';

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(tutorialCreationMiddleware),
  devTools: import.meta.env.DEV,
});

export default store;
