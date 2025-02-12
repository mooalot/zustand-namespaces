import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import { create } from 'zustand';
import {
  namespaced,
  createNamespace,
  getNamespaceHook,
} from 'zustand-namespaces';

const namespaceA = createNamespace(() => ({
  name: 'namespaceA',
  creator: () => ({
    dataInNamespaceA: 'data',
  }),
}));

const namespaceB = createNamespace(() => ({
  name: 'namespaceB',
  creator: () => ({
    dataInNamespaceB: 'data',
  }),
}));

const namespace = namespaced(namespaceA, namespaceB);

const useStore = create(
  namespace(() => ({
    mainData: 'data',
  }))
);

export const useNamespaceA = getNamespaceHook(useStore, namespaceA);
export const useNamespaceB = getNamespaceHook(useStore, namespaceB);

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
