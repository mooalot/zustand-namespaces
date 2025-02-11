import { create } from 'zustand';
import { temporal, ZundoOptions } from 'zundo';
import {
  createNamespace,
  getNamespaceHooks,
  namespaced,
  partializeNamespaces,
} from '../src/utils';
import { Namespaced } from '../src/types';

type Namespace2 = {
  dataInNamespace2: string;
  arrayInNamespace2: number[];
};

type SubNamespace1 = {
  dataInSubNamespace1: string;
  arrayInSubNamespace1: number[];
};

type CustomOptions<T> = {
  partialized?: ZundoOptions<T, Partial<T>>['partialize'];
};

const subNamespace1 = createNamespace<
  SubNamespace1,
  CustomOptions<SubNamespace1>
>()(() => ({
  name: 'subNamespace1',
  creator: () => ({
    dataInSubNamespace1: 'data',
    arrayInSubNamespace1: [],
  }),
  options: {
    partialized: (state) => ({
      dataInSubNamespace1: state.dataInSubNamespace1,
    }),
  },
}));

const subNamespaces = [subNamespace1] as const;

type Namespace1 = {
  dataInNamespace1: string;
} & Namespaced<typeof subNamespaces>;

const subNamespace = namespaced(...subNamespaces);

const namespace1 = createNamespace<Namespace1, CustomOptions<Namespace1>>()(
  () => ({
    name: 'namespace1',
    creator: subNamespace(() => ({
      dataInNamespace1: 'data',
    })),
    options: {
      partialized: (state) => ({
        dataInNamespace1: state.dataInNamespace1,
        ...partializeNamespaces(
          state,
          subNamespaces,
          (namespace) => namespace.options?.partialized
        ),
      }),
    },
  })
);

const namespace2 = createNamespace<Namespace2, CustomOptions<Namespace2>>()(
  () => ({
    name: 'namespace2',
    creator: () => ({
      dataInNamespace2: 'data',
      arrayInNamespace2: [],
    }),
  })
);

const namespaces = [namespace1, namespace2] as const;

type AppState = Namespaced<typeof namespaces>;

const namespace = namespaced(...namespaces);

const useStore = create<AppState>()(
  temporal(namespace(), {
    partialize: (state) => {
      return partializeNamespaces(
        state,
        namespaces,
        (namespace) => namespace.options?.partialized
      );
    },
  })
);

export const [useNamespace1, useNamespace2] = getNamespaceHooks(
  useStore,
  ...namespaces
);
// using useNamespace1, we can create a hook for its nested namespaces
export const [useSubNamespace1] = getNamespaceHooks(
  useNamespace1,
  ...subNamespaces
);

// useStore((state) => state.namespace1_dataInNamespace1);
// useStore((state) => state.namespace2_dataInNamespace2);
// useStore((state) => state.namespace1_subNamespace1_dataInSubNamespace1);
// useStore.getState;
// useStore.setState;

// useNamespace1((state) => state.dataInNamespace1);
// useNamespace1.getState;
// useNamespace1.setState;

// useNamespace2((state) => state.dataInNamespace2);
// useNamespace2.getState;
// useNamespace2.setState;

// useSubNamespace1((state) => state.dataInSubNamespace1);
// useSubNamespace1.getState;
// useSubNamespace1.setState;
