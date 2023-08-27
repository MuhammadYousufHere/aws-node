import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'

/***
 * Absolute path to the root of the application
 */
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') //src

export function resolvePathFromAppRoot(...args: string[]) {
    return path.resolve(APP_ROOT, ...args)
}

export function countOccurrences<T>(collection: Iterable<T>, item: T): number {
    // _.reduce(collection, (total, value) => value === item ? total + 1 : total, 0) would work, but is probably slower
    let result = 0
    for (const element of collection) {
        if (element === item) {
            result++
        }
    }
    return result
}
export async function dirExists(dir: string): Promise<boolean> {
    try {
        const stat = await fs.stat(dir)
        return stat.isDirectory()
    } catch {
        return false
    }
}
