import logger from '../utils/logger'
import { PropertyGetter, PropertyValue, Widen } from './types/property-getter'

let properties: Record<string, Record<string, PropertyValue>> = {}
let hierarchy: string[] = []
let propDebug = false

function findProps(base: string, elem: string): Record<string, PropertyValue> {
    return properties[`${base}.${elem}`]
}

function debug(str: string) {
    if (propDebug) logger.info(`prop: ${str}`)
}

export function get(base: string, property: string, defaultValue: undefined): PropertyValue
export function get<T extends PropertyValue>(
    base: string,
    property: string,
    defaultValue: Widen<T>
): typeof defaultValue
export function get<T extends PropertyValue>(base: string, property: string, defaultValue?: unknown): T
export function get(base: string, property: string, defaultValue?: unknown): unknown {
    let result = defaultValue
    let source = 'default'
    for (const elem of hierarchy) {
        const propertyMap = findProps(base, elem)
        if (propertyMap && property in propertyMap) {
            debug(`${base}.${property}: overriding ${source} value (${result}) with ${propertyMap[property]}`)
            result = propertyMap[property]
            source = elem
        }
    }
    debug(`${base}.${property}: returning ${result} (from ${source})`)
    return result
}

export function propsFor(base: string): PropertyGetter {
    return function (property: string, defaultValue: unknown) {
        return get(base, property, defaultValue)
    }
}
