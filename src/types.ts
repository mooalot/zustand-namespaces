import { StateCreator, StoreApi } from 'zustand';

type ExtractPrefixedDivisionType<T> = T extends Division<infer P, infer U>
  ? PrefixObject<P, U>
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

export type DivisionHook<T> = <Q>(selector: (state: T) => Q) => Q;
export type GetState<T> = StoreApi<T>['getState'];
export type SetState<T> = StoreApi<T>['setState'];

export type UseBoundDivision<T> = DivisionHook<T> & {
  getState: GetState<T>;
  setState: SetState<T>;
};

export type Division<
  Prefix extends string = string,
  // eslint-disable-next-line
  T = any,
  Options = unknown
> = {
  prefix: Prefix;
  creator: StateCreator<T>;
  options?: Options;
};

export type IncludeByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${string}` ? K : never]: T[K];
};

export type FilterByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${infer V}` ? V : never]: T[K];
};

export type ExcludeByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${string}` ? never : K]: T[K];
};
