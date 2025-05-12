# Zustand Namespaces

Zustand Namespaces is a modular state management extension for Zustand, enabling a namespace-based approach for greater flexibility, especially in large state structures.

## Why Zustand Namespaces?

- **Nested Middleware**: Allows for nested middleware, making it easier to manage complex state structures.
- **Single Store**: All state is stored in a single store, making it easier to manage and debug.

## Installation

```bash
npm install zustand-namespaces
```

## Usage Example

```javascript
import { create } from 'zustand';
import { namespaced, createNamespace } from 'zustand-namespaces';

const namespaceA = createNamespace('namespaceA', () => ({
  dataInNamespaceA: 'data',
}));

const namespaceB = createNamespace('namespaceB', () => ({
  dataInNamespaceB: 'data',
}));

const useStore = create(
  namespaced(
    // Namespaced state is passed as an argument for you to use in your store
    (namespacedState) => () => ({
      mainData: 'data',
      ...namespacedState,
    }),
    {
      namespaces: [namespaceA, namespaceB],
    }
  )
);
```

## Generating Namespaced Hooks

To generate global hooks for each namespace, you can create a hook factory function that takes the namespace API
as an argument. This allows you to use each namespace's state in a more modular way.

```javascript
const hookFactory = <S extends StoreApi<any>>(api: S) => {
  const hook: <T>(selector: (state: ExtractState<S>) => T) => T = (selector) =>
    useTrackedStoreWithEqualityFn(api, selector, isEqual);
  return Object.assign(hook, api);
};

const useNamespaceA = hookFactory(useStore.namespaces.namespaceA);

const useNamespaceB = hookFactory(useStore.namespaces.namespaceB);
```

## State Structure

There are two state structure approaches that can be taken when using Zustand Namespaces: nested and flattened.
You can choose which approach to use by setting the `flatten` option to `true` when creating a namespace.

```javascript
const namespaceA = createNamespace(
  'namespaceA',
  () => ({
    dataInNamespaceA: 'data',
  }),
  {
    flatten: true,
    // Add a custom separator for flattened namespaces
    separator: '_',
  }
);
```

### Nested (default)

This is the default approach, where each namespace is nested within sub-objects.

```javascript
{
  namespaceA: {
    dataInNamespaceA: 'data',
  },
  namespaceB: {
    dataInNamespaceB: 'data',
  },
  mainData: 'data',
}
```

This approach is a good choice when you want to keep your state structure clean and organized. However, it can be more difficult to access and update state values. This method also inhibits the use of parent middleware to access child state (e.g., you can't partialize a subnamespaces state).

### Flattened

This approach flattens your namespace into the parent object.

```javascript
{
  namespaceA_dataInNamespaceA: 'data',
  namespaceB_dataInNamespaceB: 'data',
  mainData: 'data',
}
```

This approach is a good choice when you want to easily access and update state values. However, it can make your state structure harder to read. This method also allows for parent middleware to access child state (e.g., you can partialize a subnamespaces state).

## TypeScript Support

Zustand Namespaces is fully typed for better state safety. See the [examples](https://github.com/mooalot/zustand-namespaces/tree/main/examples) for TypeScript implementations.

## Middleware Compatibility

Integrates with any Zustand middleware. See the [example](https://github.com/mooalot/zustand-namespaces/blob/main/examples/namespacesWithMiddleware.ts) for usage.

### Gotchas

Due to the way some middleware was written, it may not work as expected with Zustand Namespaces. When in doubt, try the middleware in parallel rather than in series.
The flexibility of Zustand Namespaces allows for middleware to be written in parallel with no drawbacks.

Here is an example of the `persist` middleware that works in parallel and not in series:

✅`persist` in parallel✅

```javascript
const subNamespace = createNamespace(
  'subNamespace',
  persist(() => ({ foo: 'bar' }), { name: 'subNamespace' })
);

const subNamespace2 = createNamespace(
  'subNamespace2',
  persist(() => ({ data: 'hi' }), { name: 'subNamespace2' })
);
const namespace = createNamespace(
  'namespace',
  namespaced(
    (namespacedState) => () => ({
      ...namespacedState,
    }),
    {
      namespaces: [subNamespace, subNamespace2],
    }
  )
);

const useStore = create(namespaced({ namespaces: [namespace] }));
```

🛑`persist` in series🛑

```javascript
const subNamespace = createNamespace(
  'subNamespace',
  persist(() => ({ foo: 'bar' }), { name: 'subNamespace' })
);
const namespace = createNamespace(
  'namespace',
  namespaced(
    (namespacedState) =>
      persist(
        () => ({
          data: 'hi',
          ...namespacedState,
        }),
        {
          name: 'namespace',
          partialize: (state) => ({ data: state.data }),
        }
      ),
    {
      namespaces: [subNamespace],
    }
  )
);

const useStore = create(namespaced({ namespaces: [namespace] }));
```

Not all middleware will have this issue, but it is something to be aware of when using Zustand Namespaces.

## Additional Examples

More examples can be found in the [examples directory](https://github.com/mooalot/zustand-namespaces/tree/main/examples), covering various use cases including third-party integrations.

## Key Utilities

- **createNamespace**: Creates a new state namespace.
- **namespaced**: The middleware used to join namespaces.
- **toNamespace**: Extracts a namespace's state from some parent state.
- **fromNamespace**: Converts namespace state to some parent state.
- **getNamespaceHooks (DEPRECATED)**: Returns hooks for each namespace.

## Key Types

- **ExtractNamespace**: Extracts a namespace type from a namespace.
- **ExtractNamespaces**: Extracts all namespace types from a list of namespaces.
