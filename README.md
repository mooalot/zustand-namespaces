# Zustand Namespaces

Zustand Namespaces is a modular state management extension for Zustand, enabling a namespace-based approach for greater flexibility, especially in large state structures.

## Installation

```bash
npm install zustand-namespaces
```

## Usage Example

```javascript
import { create } from 'zustand';
import {
  createNamespace,
  namespaced,
  getNamespaceHook,
} from 'zustand-namespaces';

const namespace1 = createNamespace(() => ({
  prefix: 'namespace1',
  creator: () => ({ dataInNamespace1: 'data' }),
}));

const namespace2 = createNamespace(() => ({
  prefix: 'namespace2',
  creator: () => ({ dataInNamespace2: 'data' }),
}));

const namespace = namespaced(namespace1, namespace2);

const useStore = create(namespace(() => ({ moreData: 'hi' })));
export const useNamespace1 = getNamespaceHook(useStore, namespace1);
export const useNamespace2 = getNamespaceHook(useStore, namespace2);
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
- **getNamespaceHook**: Generates hooks for accessing namespace states.
- **getNamespaceHooks**: Creates hooks for multiple namespaces.
- **spreadNamespaces**: Merges namespace data into a parent state.
- **toNamespace**: Extracts a namespace's state from the parent state.
- **fromNamespace**: Converts namespace state to parent state.
- **partializeNamespace**: Creates a partialized version of a namespace’s state.
- **partializeNamespaces**: Partializes multiple namespaces at once.

For full documentation, visit the [repository](https://github.com/mooalot/zustand-namespaces).
