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

## Utilities Provided

1. [Functions](#functions)
   - [createDivision](#createdivision)
   - [divide](#divide)
   - [divisionHook](#divisionhook)
   - [divisionHooks](#divisionhooks)
   - [spreadDivisions](#spreaddivisions)
   - [stateToDivision](#statetodivision)
   - [divisionToState](#divisiontostate)
   - [partializeDivision](#partializedivision)
   - [partializeDivisions](#partializedivisions)
2. [Types Used](#types-used)

## Functions

### `createDivision`

**Description:**
Creates a new division with a prefixed state.

**Usage:**

```typescript
const createTypedDivision = createDivision<
  Division1,
  CustomOptions<Division1>
>()(() => ({
  prefix: 'division1',
  creator: () => ({
    dataInDivision1: 'data',
  }),
}));

const createTypeInferredDivision = createDivision(() => ({
  prefix: 'division1',
  creator: () => ({
    dataInDivision1: 'data',
  }),
}));
```

**Overloads:**

- Accepts a callback function that returns a `Division`.

---

### `divide`

**Description:**
Combines divisions into a new state creator function for Zustand.

**Usage:**

```typescript
const createStore = divide([division1, division2], (set) => ({
  someAdditionalState: true,
}));
```

**Parameters:**

- `divisions`: An array of divisions to include.
- `creator`: Optional additional state creator.

**Returns:**
A new state creator function.

---

### `divisionHook`

**Description:**
Creates a hook for accessing a division's state from the parent store.

**Usage:**

```typescript
const useDivision = divisionHook(useStore, division);
```

**Returns:**
A custom hook for the division.

---

### `divisionHooks`

**Description:**
Creates hooks for multiple divisions from a parent store.

**Usage:**

```typescript
const divisions = [division1, division2] as const; //Important!!
const [useDivision1, useDivision2] = divisionHooks(useStore, ...divisions);
```

**Important:** In order to properly use this function, divisions must be cast as `const` or passed in one by one. This is due to TypeScript's inability to infer the order of the divisions when passed as an array.

**Returns:**
An array of hooks, each corresponding to a division.

---

### `spreadDivisions`

**Description:**
Merges division data into a parent state.

**Usage:**

```typescript
const combinedState = spreadDivisions(divisions, (division) => division.data);
```

**Parameters:**

- `divisions`: The divisions to merge.
- `callback`: A function to extract data from each division.

**Returns:**
The combined state of all callback results.

---

### `stateToDivision`

**Description:**
Extracts a division's state from the parent state.

**Usage:**

```typescript
const divisionState = stateToDivision(division, parentState);
```

**Parameters:**

- `division`: The division to extract.
- `state`: The parent state.

**Returns:**
The division's state.

---

### `divisionToState`

**Description:**
Converts division state into a format suitable for the parent state.

**Usage:**

```typescript
const parentState = divisionToState(division, divisionState);
```

**Parameters:**

- `division`: The division to use.
- `state`: The division's state.

**Returns:**
The updated parent state.

---

### `partializeDivision`

**Description:**
Creates a partialized version of a division's state.

**Usage:**

```typescript
const partialDivision = partializeDivision(state, (division) => {
  return (partialState) => ({ key: partialState.key });
});
```

**Parameters:**

- `state`: The parent state.
- `getPartializeFn`: A function to determine the partialized state.

**Returns:**
The partialized division state from the callback.

**Note:** See the `divisionsWithOptions` example in the [examples](https://github.com/mooalot/zustand-divisions/tree/main/examples) directory for a more detailed example.

---

### `partializeDivisions`

**Description:**
Partializes multiple divisions at once.

**Usage:**

```typescript
const partialDivisions = partializeDivisions(state, divisions, (division) => {
  return (partialState) => ({ key: partialState.key });
});
```

**Parameters:**

- `state`: The parent state.
- `divisions`: The divisions to partialize.
- `getPartializeFn`: A function to determine the partialized state.

**Returns:**
The partialized divisions state accumulated from the callback.

**Note:** See the `subdivisionsWithOptions` example in the [examples](https://github.com/mooalot/zustand-divisions/tree/main/examples) directory for a more detailed example.

---

## Types Used

- **`Division`**: Represents a slice of prefixed state in the store.
- **`Divide`**: A function that creates a state from an array of divisions.

---
