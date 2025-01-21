# Zustand Slicer API Documentation

This API provides a modular state management solution using Zustand, offering a structure for managing slices of state. The API revolves around creating and using different slices of state, allowing for modular and scalable state management in your application.
There need only be one store, but it is divided into slices, each with its own state, actions, and hooks.

## Example

Here is an example of how you can use the Zustand Slicer API in your application:

```typescript
import { create } from 'zustand';
import { Slices, createSlice, sliceHooks, slicer } from 'zustand-slicer';

type Slice1 = {
  dataInSlice1: string;
};

type Slice2 = {
  dataInSlice2: string;
};

const createSlice1 = createSlice<Slice1>()(() => ({
  prefix: 'slice1',
  creator: () => ({
    dataInSlice1: 'data',
  }),
}));

const createSlice2 = createSlice<Slice2>()(() => ({
  prefix: 'slice2',
  creator: () => ({
    dataInSlice2: 'data',
  }),
}));

const slices = [createSlice1(), createSlice2()] as const;

type AppState = Slices<typeof slices>;

const useStore = create<AppState>(slicer((set, get) => ({}), slices));

export const [useSlice1, useSlice2] = sliceHooks(useStore, ...slices);

// useStore has all the slices, but they are prefixed
useStore((state) => state.slice1_dataInSlice1);
useStore((state) => state.slice2_dataInSlice2);
useStore.getState;
useStore.setState;

// useSlice1 and useSlice2 are the hooks for the slices. They are not prefixed and self contained
useSlice1((state) => state.dataInSlice1);
useSlice1.getState;
useSlice1.setState;
useSlice2((state) => state.dataInSlice2);
useSlice2.getState;
useSlice2.setState;
```

## More Examples

You can find more examples in the `examples` directory of this repository. Each example demonstrates a different use case for the Zustand Slicer API, such as using slices with 3rd party libraries or using a mix of slices and global state.
