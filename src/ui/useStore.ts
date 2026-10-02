import { useSyncExternalStore } from 'react';
import type { Store } from '../store/store';

export const useStore = (store: Store) => useSyncExternalStore(store.subscribe, store.getState);
