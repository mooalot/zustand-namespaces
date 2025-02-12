import { create } from 'zustand';
import { temporal, ZundoOptions } from 'zundo';
import {
  createNamespace,
  namespaced,
  partializeNamespaces,
} from '../src/utils';
import { ExtractNamespaces } from '../src/types';

type CustomOptions<T> = {
  partialized?: ZundoOptions<T, Partial<T>>['partialize'];
};

type Namespace1 = {
  dataInNamespace1: string;
  data: string;
};

type Namespace2 = {
  dataInNamespace2: string;
  data: number;
};

const namespace1 = createNamespace<Namespace1, CustomOptions<Namespace1>>()(
  () => ({
    name: 'namespace1',
    creator: () => ({
      dataInNamespace1: 'data',
      data: 'data',
    }),
    options: {
      partialized: (state) => ({
        dataInNamespace1: state.dataInNamespace1,
      }),
    },
  })
);

const namespace2 = createNamespace<Namespace2, CustomOptions<Namespace2>>()(
  () => ({
    name: 'namespace2',
    creator: () => ({
      dataInNamespace2: 'data',
      data: 1,
    }),
    options: {},
  })
);

const namespaces = [namespace1, namespace2] as const;

type AppState = ExtractNamespaces<typeof namespaces>;
const namespace = namespaced(...namespaces);

const useStore = create<AppState>()(
  temporal(
    namespace(() => ({})),
    {
      partialize: (state) => {
        return partializeNamespaces(
          state,
          namespaces,
          (namespace) => namespace.options?.partialized
        );
      },
    }
  )
);

export const [useNamespace1, useNamespace2] = useStore.getNamespaceHook(
  ...namespaces
);

// useStore((state) => state.namespace1_dataInNamespace1);
// useStore((state) => state.namespace2_dataInNamespace2);
// useStore.getState;
// useStore.setState;

// useNamespace1((state) => state.dataInNamespace1);
// useNamespace1.getState;
// useNamespace1.setState;
// useNamespace2((state) => state.dataInNamespace2);
// useNamespace2.getState;
// useNamespace2.setState;
