# Zustand Namespaces

Zustand Namespaces is a modular state management extension for Zustand, enabling a namespace-based approach for greater flexibility, especially in large state structures.

## Cool Features

Namespaces can be nested indefintely and use any middleware compatable with zustand.

## Installation

```bash
npm install zustand-namespaces
```

## Usage Example

```javascript
import { create } from 'zustand';
import {
  namespaced,
  createNamespace,
  getNamespaceHooks,
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

export const [useNamespaceA] = getNamespaceHooks(useStore, namespaceA);
export const [useNamespaceB] = getNamespaceHooks(useStore, namespaceB);

useStore((state) => state.namespaceA_dataInNamespaceA);
useStore((state) => state.namespaceB_dataInNamespaceB);
useStore((state) => state.mainData);
useStore.getState;
useStore.setState;

useNamespaceA((state) => state.dataInNamespaceA);
useNamespaceA.getState;
useNamespaceA.setState;
useNamespaceB((state) => state.dataInNamespaceB);
useNamespaceB.getState;
useNamespaceB.setState;
```

## TypeScript Support

Zustand Namespaces is fully typed for better state safety. See the [examples](https://github.com/mooalot/zustand-namespaces/tree/main/examples) for TypeScript implementations.

## Middleware Compatibility

Integrates with any Zustand middleware. See the [example](https://github.com/mooalot/zustand-namespaces/blob/main/examples/namespacesWithMiddleware.ts) for usage.

## Additional Examples

More examples can be found in the [examples directory](https://github.com/mooalot/zustand-namespaces/tree/main/examples), covering various use cases including third-party integrations.

## Key Utilities

- **createNamespace**: Creates a new state namespace.
- **namespaced**: The middleware used to join namespaces.
- **toNamespace**: Extracts a namespace's state from the parent state.
- **fromNamespace**: Converts namespace state to parent state.
- **getNamespaceHooks**: Returns hooks for each namespace.
