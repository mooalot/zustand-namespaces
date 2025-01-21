import { describe, it, expect } from 'vitest';
import {
  getPrefixedObject,
  getUnprefixedObject,
  spreadDivisions,
  stateToDivision,
  divisionToState,
  createDivision,
} from '../src/utils';
import { Division } from '../src/types';

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
});
