import { create } from 'zustand';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';
import { Namespaced } from '../src/types';

type Namespace1 = {
  dataInNamespace1: string;
};

type Namespace2 = {
  dataInNamespace2: string;
};

const namespace1 = createNamespace<Namespace1>()(() => ({
  name: 'namespace1',
  creator: () => ({
    dataInNamespace1: 'data',
  }),
  options: {
    partialized: (state) => ({
      dataInNamespace1: state.dataInNamespace1,
    }),
  },
}));

const namespace2 = createNamespace<Namespace2>()(() => ({
  name: 'namespace2',
  creator: () => ({
    dataInNamespace2: 'data',
  }),
  options: {},
}));

const namespaces = [namespace1, namespace2] as const;

type AppState = Namespaced<typeof namespaces>;

const namespace = namespaced(...namespaces);
const useStore = create<AppState>()(namespace(() => ({})));

export const [useNamespace1, useNamespace2] = getNamespaceHooks(
  useStore,
  ...namespaces
);

// useStore((state) => state.division1_dataInNamespace1);
// useStore((state) => state.division2_dataInNamespace2);
// useStore.getState;
// useStore.setState;

// useNamespace1((state) => state.dataInNamespace1);
// useNamespace1.getState;
// useNamespace1.setState;
// useNamespace2((state) => state.dataInNamespace2);
// useNamespace2.getState;
// useNamespace2.setState;
