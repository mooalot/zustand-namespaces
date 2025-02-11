import { StateCreator } from 'zustand';

export type Namespaced<T extends readonly Namespace[]> = UnionToIntersection<
  ExtractNamespaceType<T[number]>
>;

export type Namespace<
  // eslint-disable-next-line
  T = any,
  Name extends string = string,
  Options = unknown
> = {
  name: Name;
  creator: StateCreator<T>;
  options?: Options;
};

export type PrefixObject<Name extends string, U> = {
  [K in keyof U as `${Name}_${K & string}`]: U[K];
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

type ExtractNamespaceType<T> = T extends Namespace<infer N, infer U>
  ? PrefixObject<U, N>
  : never;

export type UnionToIntersection<U> = // eslint-disable-next-line
  (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
    ? I
    : never;
