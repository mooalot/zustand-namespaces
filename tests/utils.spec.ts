import { describe, it, expect } from 'vitest';
import {
  getPrefixedObject,
  getUnprefixedObject,
  spreadDivisions,
  stateToDivision,
  divisionToState,
  createDivision,
  divide,
  partializeDivision,
  partializeDivisions,
} from '../src/utils';
import { Divide, Division } from '../src/types';

describe('Utility Functions', () => {
  describe('getPrefixedObject', () => {
    it('should add a prefix to object keys', () => {
      const input = { key1: 'value1', key2: 'value2' };
      const prefix = 'prefix';

      const result = getPrefixedObject(prefix, input);

      expect(result).toEqual({
        prefix_key1: 'value1',
        prefix_key2: 'value2',
      });
    });
  });

  describe('getUnprefixedObject', () => {
    it('should remove a prefix from object keys', () => {
      const input = { prefix_key1: 'value1', prefix_key2: 'value2' };
      const prefix = 'prefix';

      const result = getUnprefixedObject(prefix, input);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should ignore keys without the prefix', () => {
      const input = { prefix_key1: 'value1', other_key: 'value2' };
      const prefix = 'prefix';

      const result = getUnprefixedObject(prefix, input);

      expect(result).toEqual({
        key1: 'value1',
      });
    });
  });

  describe('spreadDivisionsWithCallback', () => {
    it('should combine division results using a callback', () => {
      const divisions: Division[] = [
        { prefix: 'division1', creator: () => {} },
        { prefix: 'division2', creator: () => {} },
      ];
      const callback = (division: Division) => ({
        [`${division.prefix}_foo`]: 'bar',
      });

      const result = spreadDivisions(divisions, callback);

      expect(result).toEqual({
        division1_foo: 'bar',
        division2_foo: 'bar',
      });
    });
  });

  describe('stateToDivision', () => {
    it('should extract unprefixed state for a division', () => {
      const division: Division = {
        prefix: 'division1',
        creator: () => ({ key1: 'value1' }),
      };
      const state = { division1_key1: 'value1', division2_key2: 'value2' };

      const result = stateToDivision(division, state);

      expect(result).toEqual({
        key1: 'value1',
      });
    });
  });

  describe('divisionToState', () => {
    it('should add a prefix to division state', () => {
      const division: Division = {
        prefix: 'division1',
        creator: () => ({ key1: 'value1' }),
      };
      const state = { key1: 'value1' };

      const result = divisionToState(division, state);

      expect(result).toEqual({
        division1_key1: 'value1',
      });
    });
  });

  describe('createDivision', () => {
    it('should create a division definition', () => {
      const createTestDivision = createDivision<{ key: string }>()(() => ({
        prefix: 'test',
        creator: () => ({
          key: 'value',
        }),
      }));

      const result = createTestDivision();

      expect(result).toEqual({
        prefix: 'test',
        creator: expect.any(Function),
      });
    });
  });

  it('do crazy options', () => {
    type SubDivision = {
      one: string;
      two: string;
    };

    type CustomOptions<T> = {
      partialized?: (state: T) => Partial<T>;
    };

    const createSubDivision = createDivision<
      SubDivision,
      CustomOptions<SubDivision>
    >()(() => ({
      prefix: 'subDivision1',
      creator: () => ({
        one: 'one',
        two: 'two',
      }),
      options: {
        partialized: (state) => ({
          one: state.one,
        }),
      },
    }));

    const subDivisions = [createSubDivision()] as const;

    type Division = {
      one: string;
      two: string;
    } & Divide<typeof subDivisions>;

    const createDiv = createDivision<Division, CustomOptions<Division>>()(
      () => ({
        prefix: 'division1',
        creator: divide(
          () => ({
            one: 'one',
            two: 'two',
          }),
          subDivisions
        ),
        options: {
          partialized: (state) => ({
            dataInDivision1: state.two,
            ...spreadDivisions(subDivisions, (subDivision) => {
              const divisiondData = stateToDivision(subDivision, state);
              const partializedData =
                subDivision.options?.partialized?.(divisiondData);
              return divisionToState(subDivision, partializedData ?? {});
            }),
          }),
        },
      })
    );

    const divisions = [createDiv()] as const;

    const state: Divide<typeof divisions> = {
      division1_one: 'one',
      division1_two: 'two',
      division1_subDivision1_one: 'one',
      division1_subDivision1_two: 'two',
    };

    const spread = spreadDivisions(divisions, (division) => {
      const divisionData = stateToDivision(division, state);
      const partializedData = division.options?.partialized?.(divisionData);
      return divisionToState(division, partializedData ?? {});
    });

    expect(spread).toEqual({
      division1_dataInDivision1: 'two',
      division1_subDivision1_one: 'one',
    });

    const partializedDivision = spreadDivisions(
      divisions,
      partializeDivision(state, (division) => division.options?.partialized)
    );
    expect(partializedDivision).toEqual({
      division1_dataInDivision1: 'two',
      division1_subDivision1_one: 'one',
    });

    const partializedDivisions = partializeDivisions(
      state,
      divisions,
      (division) => division.options?.partialized
    );
    expect(partializedDivisions).toEqual({
      division1_dataInDivision1: 'two',
      division1_subDivision1_one: 'one',
    });
  });
});
