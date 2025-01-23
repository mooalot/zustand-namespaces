# Zustand Divisions API Documentation

This API offers a modular state management solution designed to complement Zustand. By introducing a division-based approach, it provides greater flexibility compared to Zustand's traditional slice pattern. This flexibility is especially beneficial for managing partialization and other complexities in large state structures.

At its core, the API enables the creation and use of distinct state divisions, facilitating modular and scalable state management within your application. While the architecture relies on a single store, it organizes the state into multiple divisions, each with its own dedicated state, actions, and hooks, ensuring a streamlined and maintainable structure.

## Installation

To install the Zustand Divisions API, you can use npm:

```bash
npm install zustand-divisions
```

## Example

Here is an example of how you can use the Zustand Divisions API in your application:

```typescript
import { create } from 'zustand';
import { createDivision, divide, divisionHook } from 'zustand-divisions';

const division1 = createDivision(() => ({
  prefix: 'division1',
  creator: () => ({
    dataInDivision1: 'data',
  }),
}));

const division2 = createDivision(() => ({
  prefix: 'division2',
  creator: () => ({
    dataInDivision2: 'data',
  }),
}));

const useStore = create(
  divide([division1(), division2()], () => ({
    mainData: 'data',
  }))
);

export const useDivision1 = divisionHook(useStore, division1());

export const useDivision2 = divisionHook(useStore, division2());

// useStore has all the divisions, but they are prefixed
useStore((state) => state.division1_dataInDivision1);
useStore((state) => state.division2_dataInDivision2);
useStore((state) => state.mainData);
useStore.getState;
useStore.setState;

// useDivision1 and useDivision2 are the hooks for the divisions. They are self-contained and do not require prefixes
useDivision1((state) => state.dataInDivision1);
useDivision1.getState;
useDivision1.setState;
useDivision2((state) => state.dataInDivision2);
useDivision2.getState;
useDivision2.setState;
```

## Typescript

The Zustand Divisions API is written in TypeScript and provides full type support. This ensures that your state is type-safe and that you can easily navigate your state structure. There are examples in the [examples](https://github.com/mooalot/zustand-divisions/tree/main/examples) directory of this repository that demonstrate how to use TypeScript with the Zustand Divisions API.

## More Examples

You can find more examples in the [examples](https://github.com/mooalot/zustand-divisions/tree/main/examples) directory of this repository. Each example demonstrates a different use case for the Zustand Divisions API, such as using divisions with 3rd party libraries or using a mix of divisions and global state.
