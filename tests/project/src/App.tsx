import { create } from 'zustand';
import {
  createNamespace,
  getNamespaceHooks,
  namespaced,
} from 'zustand-namespaces';

const namespaceA = createNamespace('namespaceA', () => ({
  dataInNamespaceA: 'data',
}));

const namespaceB = createNamespace('namespaceB', () => ({
  dataInNamespaceB: 'data',
}));

const useStore = create(
  namespaced(
    () => ({
      mainData: 'data',
    }),
    {
      namespaces: [namespaceA, namespaceB],
    }
  )
);

useStore((state) => state.namespaceA_dataInNamespaceA);

export const [useNamespaceA, useNamespaceB] = getNamespaceHooks(
  useStore,
  namespaceA,
  namespaceB
);
function App() {
  const localCount = useStore((state) => state.localCount);
  const sessionCount = useStore((state) => state.sessionCount);

  return (
    <div>
      <h1>Local Count: {localCount}</h1>
      <h1>Session Count: {sessionCount}</h1>
      <button onClick={() => useStore.setState({ localCount: localCount + 1 })}>
        Increment Local Count
      </button>
      <button
        onClick={() => useStore.setState({ sessionCount: sessionCount + 1 })}
      >
        Increment Session Count
      </button>

      <button onClick={() => useStore.persistMap.local.clearStorage()}>
        Clear Local Storage
      </button>
      <button onClick={() => useStore.persistMap.session.clearStorage()}>
        Clear Session Storage
      </button>
    </div>
  );
}

export default App;
