export type GetResult = {
    hit: boolean;
    data?: Buffer;
};

export type CacheableValue =
    | string
    | number
    | boolean
    | undefined
    | {[x: string]: CacheableValue}
    | Array<CacheableValue>;
