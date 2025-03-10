import { isEqual } from 'lodash-es';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { createBigComputer, createComputer } from './store.utils';
import {
  createNamespace,
  ExtractNamespaces,
  getNamespaceHooks,
  namespaced,
} from 'zustand-namespaces';

const hashStorage: StateStorage = {
  getItem: (key): string => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    const storedValue = searchParams.get(key) ?? '';
    return JSON.parse(storedValue);
  },
  setItem: (key, newValue): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.set(key, JSON.stringify(newValue));
    location.hash = searchParams.toString();
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.delete(key);
    location.hash = searchParams.toString();
  },
};

const subNamespace = createNamespace(
  'subNamespace',
  () => ({
    count: 0,
    square: 0,
  }),
  {
    flatten: true,
  }
);

const namespace = createNamespace(
  'namespace',
  namespaced(
    (state) =>
      persist(
        () => ({
          ...state,
          count: 0,
        }),
        {
          name: 'namespace',
          storage: createJSONStorage(() => hashStorage),
          partialize: (state) => ({
            subNamespace_count: state.subNamespace_count,
          }),
        }
      ),
    {
      namespaces: [subNamespace],
    }
  ),
  {
    flatten: true,
  }
);

type AppState = ExtractNamespaces<typeof namespaces>;

const computer = createComputer<AppState, 'namespace_subNamespace_square'>(
  (state) => ({
    namespace_subNamespace_square: state.namespace_subNamespace_count ** 2,
  })
);

const namespaces = [namespace];

const bigComputer = createBigComputer(computer);

const useStore = createWithEqualityFn<AppState>()(
  namespaced((state) => bigComputer(() => state), { namespaces: namespaces }),
  isEqual
);

let { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
let { subNamespace: useSubNamespace } = getNamespaceHooks(
  useNamespace,
  subNamespace
);

function App() {
  const count = useSubNamespace((state) => state.count);
  const square = useSubNamespace((state) => state.square);

  return (
    <>
      <div className="card">
        <button
          onClick={() => {
            //   useSubNamespace.setState((state) => ({
            //     ...state,
            //     count: state.count + 1,
            //   }));
            // }
            useStore.setState((state) => {
              return {
                namespace_subNamespace_count:
                  state.namespace_subNamespace_count + 1,
              };
            });
          }}
        >
          count is {count}
        </button>
        <p>square is {square}</p>
      </div>
    </>
  );
}

export default App;
