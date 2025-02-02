# Zustand Divisions

Zustand Divisions is a modular state management extension for Zustand, enabling a division-based approach for greater flexibility, especially in large state structures.

## Installation

```bash
npm install zustand-divisions
```

## Usage Example

```javascript
import { create } from 'zustand';
import { createDivision, divide, divisionHook } from 'zustand-divisions';

const division1 = createDivision(() => ({
  prefix: 'division1',
  creator: () => ({ dataInDivision1: 'data' }),
}));

const division2 = createDivision(() => ({
  prefix: 'division2',
  creator: () => ({ dataInDivision2: 'data' }),
}));

const useStore = create(
  divide([division1(), division2()], () => ({ mainData: 'data' }))
);
export const useDivision1 = divisionHook(useStore, division1());
export const useDivision2 = divisionHook(useStore, division2());
```

## TypeScript Support

Zustand Divisions is fully typed for better state safety. See the [examples](https://github.com/mooalot/zustand-divisions/tree/main/examples) for TypeScript implementations.

## Middleware Compatibility

Integrates seamlessly with Zustand middleware. See the [example](https://github.com/mooalot/zustand-divisions/blob/main/examples/divisionsWithOptions.ts) for usage.

## Additional Examples

More examples can be found in the [examples directory](https://github.com/mooalot/zustand-divisions/tree/main/examples), covering various use cases including third-party libraries.

## Key Utilities

- **createDivision**: Creates a new state division.
- **divide**: Combines divisions into a single store.
- **divisionHook**: Generates hooks for accessing division states.
- **divisionHooks**: Creates hooks for multiple divisions.
- **spreadDivisions**: Merges division data into a parent state.
- **stateToDivision**: Extracts a division's state from the parent state.
- **divisionToState**: Converts division state to parent state.
- **partializeDivision**: Creates a partialized version of a division’s state.
- **partializeDivisions**: Partializes multiple divisions at once.

For full documentation, visit the [repository](https://github.com/mooalot/zustand-divisions).
