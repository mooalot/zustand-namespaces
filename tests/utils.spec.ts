import { describe, it, expect } from 'vitest';
import {
  getPrefixedObject,
  getUnprefixedObject,
  spreadSlices,
  stateToSlice,
  sliceToState,
  createSlice,
} from '../src/utils';
import { Slice } from '../src/types';

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

  describe('spreadSlicesWithCallback', () => {
    it('should combine slice results using a callback', () => {
      const slices: Slice[] = [
        { prefix: 'slice1', creator: () => {} },
        { prefix: 'slice2', creator: () => {} },
      ];
      const callback = (slice: Slice) => ({
        [`${slice.prefix}_foo`]: 'bar',
      });

      const result = spreadSlices(slices, callback);

      expect(result).toEqual({
        slice1_foo: 'bar',
        slice2_foo: 'bar',
      });
    });
  });

  describe('stateToSlice', () => {
    it('should extract unprefixed state for a slice', () => {
      const slice: Slice = {
        prefix: 'slice1',
        creator: () => ({ key1: 'value1' }),
      };
      const state = { slice1_key1: 'value1', slice2_key2: 'value2' };

      const result = stateToSlice(slice, state);

      expect(result).toEqual({
        key1: 'value1',
      });
    });
  });

  describe('sliceToState', () => {
    it('should add a prefix to slice state', () => {
      const slice: Slice = {
        prefix: 'slice1',
        creator: () => ({ key1: 'value1' }),
      };
      const state = { key1: 'value1' };

      const result = sliceToState(slice, state);

      expect(result).toEqual({
        slice1_key1: 'value1',
      });
    });
  });

  describe('createSlice', () => {
    it('should create a slice definition', () => {
      const createTestSlice = createSlice<{ key: string }>()(() => ({
        prefix: 'test',
        creator: () => ({
          key: 'value',
        }),
      }));

      const result = createTestSlice();

      expect(result).toEqual({
        prefix: 'test',
        creator: expect.any(Function),
      });
    });
  });
});
