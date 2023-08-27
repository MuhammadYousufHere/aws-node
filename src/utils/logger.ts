import * as path from 'path'
import { createLogger, transports, format } from 'winston'
import { NextFunction, Request, Response } from 'express'
import { resolvePathFromAppRoot } from './utils'

const { combine, timestamp, printf, errors } = format

// expect the log dir be relative to the projects root

export const logger = createLogger({
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json(),
        printf(({ level, message, timestamp, stack }) => {
            const text = `${timestamp} [${level.toUpperCase()}]: ${message}`
            return stack ? text + '\n' + stack : text
        }),
        errors({ stack: true })
    ),
    defaultMeta: {
        package: 'server'
    },
    transports: [
        new transports.Console(),
        new transports.File({
            filename: path.join(resolvePathFromAppRoot('..'), 'server.log'),
            level: process.env.LOG_LEVEL ?? 'info'
        }),
        new transports.File({
            filename: path.join(resolvePathFromAppRoot('..'), 'server-error.log'),
            level: 'error' // Log only errors to this file
        })
    ],
    exceptionHandlers: [
        new transports.File({
            filename: path.join(resolvePathFromAppRoot('..'), 'server-error.log')
        })
    ],
    rejectionHandlers: [
        new transports.File({
            filename: path.join(resolvePathFromAppRoot('..'), 'server-error.log')
        })
    ]
})

/**
 * This function is used by express as a middleware.
 * @example
 *   const app = express()
 *   app.use(expressRequestLogger)
 */
export function expressRequestLogger(req: Request, _res: Response, next: NextFunction): void {
    if (req.url.includes('/api/v1/')) {
        const fileLogger = createLogger({
            format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), format.json(), errors({ stack: true })),
            defaultMeta: {
                package: 'server',
                request: {
                    method: req.method,
                    url: req.url,
                    body: req.body,
                    query: req.query,
                    params: req.params,
                    headers: req.headers
                }
            },
            transports: [
                new transports.File({
                    filename: path.join(
                        resolvePathFromAppRoot('..'),
                        process.env.LOGGERE_EXPRESS_FILE ?? 'server-requests.log.jsonl'
                    ),
                    level: process.env.LOG_EXPRESS_LEVEL ?? 'debug'
                })
            ]
        })

        const getRequestEmoji = (method: string) => {
            const requetsEmojis: Record<string, string> = {
                GET: '⬇️',
                POST: '⬆️',
                PUT: '🖊',
                DELETE: '❌',
                OPTION: '🔗'
            }

            return requetsEmojis[method] || '?'
        }

        if (req.method !== 'GET') {
            fileLogger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
            logger.info(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
        } else {
            fileLogger.http(`${getRequestEmoji(req.method)} ${req.method} ${req.url}`)
        }
    }

    next()
}
export default logger
