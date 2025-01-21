# Zustand Divisions API Documentation

This API provides a modular state management solution using Zustand, offering a structure for managing divisions of state. The API revolves around creating and using different divisions of state, allowing for modular and scalable state management in your application.
There need only be one store, but it is divided into divisions, each with its own state, actions, and hooks.

## Installation

To install the Zustand Divisions API, you can use npm or yarn:

```bash
npm install zustand-divisions
```

## Example

Here is an example of how you can use the Zustand Divisions API in your application:

```typescript
import { create } from 'zustand';
import {
  Divide,
  createDivision,
  divisionHooks,
  divide,
} from 'zustand-divisions';

type Division1 = {
  dataInDivision1: string;
};

type Division2 = {
  dataInDivision2: string;
};

const createDivision1 = createDivision<Division1>()(() => ({
  prefix: 'division1',
  creator: () => ({
    dataInDivision1: 'data',
  }),
}));

const createDivision2 = createDivision<Division2>()(() => ({
  prefix: 'division2',
  creator: () => ({
    dataInDivision2: 'data',
  }),
}));

const divisions = [createDivision1(), createDivision2()] as const;

type AppState = Divide<typeof divisions>;

const useStore = create<AppState>(divide((set, get) => ({}), divisions));

export const [useDivision1, useDivision2] = divisionHooks(
  useStore,
  ...divisions
);

// useStore has all the divisions, but they are prefixed
useStore((state) => state.division1_dataInDivision1);
useStore((state) => state.division2_dataInDivision2);
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

## More Examples

You can find more examples in the [examples](https://github.com/mooalot/zustand-divisions/tree/main/examples) directory of this repository. Each example demonstrates a different use case for the Zustand Divisions API, such as using divisions with 3rd party libraries or using a mix of divisions and global state.
