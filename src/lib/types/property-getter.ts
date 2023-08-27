export type PropertyValue = string | boolean | number | undefined;
// names don't matter
export type TypeMap = {a: string; b: boolean; c: number; d: undefined};
export type Widen<T> = T extends T
    ? {
          [P in keyof TypeMap]: T extends TypeMap[P] ? TypeMap[P] : never;
      }[keyof TypeMap]
    : T;
function superficialGetter(property: string, defaultValue?: undefined): PropertyValue;
function superficialGetter<T extends PropertyValue>(property: string, defaultValue: Widen<T>): typeof defaultValue;
function superficialGetter<T extends PropertyValue>(property: string, defaultValue?: unknown): T;
function superficialGetter(_property: string, _defaultValue?: unknown): unknown {
    return;
}
export type PropertyGetter = typeof superficialGetter;
