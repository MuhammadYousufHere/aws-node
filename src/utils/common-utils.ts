export function isString(x: any): x is string {
    return typeof x === 'string' || x instanceof String;
}

// Object.keys is typed as returning :string[] for some reason
// This util is for cases where the key is a union of a few possible keys and we
// want the resulting array properly typed.
export function keys<K extends string | number | symbol>(o: Partial<Record<K, any>>): K[] {
    return Object.keys(o) as K[];
}

export function unique<V>(arr: V[]): V[] {
    return [...new Set(arr)];
}

export function intersection<V>(a: V[], b: V[]): V[] {
    const B = new Set(b);
    return [...a].filter(item => B.has(item));
}

// arr.filter(x => x !== null) returns a (T | null)[] even though it is a T[]
// Apparently the idiomatic solution is arr.filter((x): x is T => x !== null), but this is shorter (and the type
// predicate also isn't type checked so it doesn't seem safe to me)
export function remove<U, V extends U>(arr: U[], v: V) {
    return arr.filter(item => item !== v) as Exclude<U, V extends null | undefined ? V : never>[];
}

// For Array.prototype.sort
export function basic_comparator<T>(a: T, b: T) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
}

export type ElementType<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer T)[] ? T : never;
const EscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
};
const EscapeRE = new RegExp(`(?:${Object.keys(EscapeMap).join('|')})`, 'g');
export function escapeHTML(text: string) {
    //@ts-ignore
    return text.replace(EscapeRE, str => EscapeMap[str]);
}
export const isDevMode = () => process.env.NODE_ENV !== 'production';
export const BASE32_ALPHABET = '13456789EGKMPTWYabcdefhjnoqrsvxz';
