import { ExtractState, StateCreator, StoreApi } from 'zustand';

export type ExtractNamespace<T> = ExtractNamespaceType<T>;
export type ExtractNamespaces<T extends readonly Namespace[]> =
  UnionToIntersection<ExtractNamespaceType<T[number]>>;

export type Namespace<
  T = any,
  Name extends string = string,
  Options = unknown
> = {
  name: Name;
  // child creator does not care about Mutators
  creator: StateCreator<T, any, any>;
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

export type UnionToIntersection<U> = (
  U extends any ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;

type Readonly<T extends object> = {
  readonly [K in keyof T]: T[K];
};

type PrefixNamespaces<
  K extends string,
  Namespaces extends readonly [...Namespace[]]
> = Namespaces extends [
  infer First extends Namespace,
  ...infer Rest extends Namespace[]
]
  ? `${First['name']}_${PrefixNamespaces<K, Rest>}`
  : K;

type RawState<T, Namespaces extends readonly [...Namespace[]]> = {
  [K in keyof T as PrefixNamespaces<K & string, Namespaces>]: T[K];
};

export type UseBoundNamespace<
  S extends Readonly<StoreApi<unknown>>,
  Namespaces extends readonly [...Namespace[]]
> = {
  <U>(selector: (state: ExtractState<S>) => U): U;
} & S & {
    getRawState: () => RawState<ExtractState<S>, Namespaces>;
    namespaces: Namespaces;
  };
