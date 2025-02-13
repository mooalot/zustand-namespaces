# Zustand Namespaces

Zustand Namespaces is a modular state management extension for Zustand, enabling a namespace-based approach for greater flexibility, especially in large state structures.

## Installation

```bash
npm install zustand-namespaces
```

## Usage Example

```javascript
import { create } from 'zustand';
import { createNamespace, namespaced } from 'zustand-namespaces';

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

export const [useNamespaceA, useNamespaceB] = getNamespaceHooks(
  useStore,
  namespaceA,
  namespaceB
);
```

## TypeScript Support

Zustand Namespaces is fully typed for better state safety. See the [examples](https://github.com/mooalot/zustand-namespaces/tree/main/examples) for TypeScript implementations.

## Middleware Compatibility

Integrates with any Zustand middleware. See the [example](https://github.com/mooalot/zustand-namespaces/blob/main/examples/namespacesWithOptions.ts) for usage.

## Additional Examples

More examples can be found in the [examples directory](https://github.com/mooalot/zustand-namespaces/tree/main/examples), covering various use cases including third-party integrations.

## Key Utilities

- **createNamespace**: Creates a new state namespace.
- **namespaced**: Combines namespaces into a single state creation method.
- **spreadNamespaces**: Merges namespace data into a parent state.
- **toNamespace**: Extracts a namespace's state from the parent state.
- **fromNamespace**: Converts namespace state to parent state.
- **partializeNamespaces**: Partializes multiple namespaces at once.
- **getNamespaceHooks**: Returns hooks for each namespace.

For full documentation, visit the [repository](https://github.com/mooalot/zustand-namespaces).
