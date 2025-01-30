import { StateCreator } from 'zustand';

type ExtractPrefixedDivisionType<T> = T extends Division<infer P, infer U>
  ? PrefixObject<U, P>
  : never;

export type UnionToIntersection<U> = // eslint-disable-next-line
  (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
    ? I
    : never;

export type Divide<T extends readonly Division[]> = UnionToIntersection<
  ExtractPrefixedDivisionType<T[number]>
>;

export type PrefixObject<Prefix extends string, U> = {
  [K in keyof U as `${Prefix}_${K & string}`]: U[K];
};

export type Division<
  // eslint-disable-next-line
  T = any,
  Prefix extends string = string,
  Options = unknown
> = {
  prefix: Prefix;
  creator: StateCreator<T>;
  options?: Options;
};

/**
 * Extracts all types that match the prefix, not altering the key names.
 */
export type IncludeByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${string}` ? K : never]: T[K];
};

/**
 * Extracts all types that match the prefix, removing the prefix from the key names.
 */
export type FilterByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${infer V}` ? V : never]: T[K];
};

/**
 * Excludes all types that match the prefix, not altering the key names.
 */
export type ExcludeByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${string}` ? never : K]: T[K];
};
