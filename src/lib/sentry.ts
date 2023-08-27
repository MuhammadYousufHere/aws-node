import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'

import * as Sentry from '@sentry/node'
import { PropertyGetter } from './types/property-getter'
import logger from '../utils/logger'
import { parse } from './stackTrace'

function shouldRedactRequestData(data: string) {
    try {
        const parsed = JSON.parse(data)
        return !parsed['allowStoreCodeDebug']
    } catch (e) {
        return true
    }
}
interface SentrySetup {
    sentryDsn: string
    ceProps?: PropertyGetter
    releaseBuildNumber: string | undefined
    gitReleaseName: string | undefined
    defArgs?: any
    app: express.Express
}
export function SetupSentry({ gitReleaseName, releaseBuildNumber, sentryDsn, app }: SentrySetup) {
    const sentryEnv = process.env.NODE_ENV
    if (!sentryDsn) {
        logger.info('Not configuring sentry')
        return
    }
    Sentry.init({
        dsn: sentryDsn,
        release: releaseBuildNumber || gitReleaseName,
        environment: sentryEnv,
        integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({
                tracing: true
            }), // enable Express.js middleware tracing
            new Sentry.Integrations.Express({
                app
            })
        ],
        beforeSend(evt) {
            if (evt.request && evt.request.data) {
                evt.request.data = JSON.stringify({ redacted: true })
                console.log(evt)
            }
            return evt
        },
        tracesSampleRate: 1.0
    })
    logger.info(`Configured with Sentry endpoint ${sentryDsn}`)
}

export function SentryCapture(value: unknown, context?: string) {
    if (value instanceof Error) {
        if (context) {
            value.message += `\nSentryCapture Context: ${context}`
        }
        Sentry.captureException(value)
    } else {
        // const e = new Error() // eslint-disable-line unicorn/error-message
        const e = new Error()
        const trace = parse(e)
        Sentry.captureMessage(
            `Non-Error capture:\n` +
                (context ? `Context: ${context}\n` : '') +
                `Data:\n${JSON.stringify(value)}\n` +
                `Trace:\n` +
                trace
                    .map(frame => `${frame.functionName} ${frame.fileName}:${frame.lineNumber}:${frame.columnNumber}`)
                    .join('\n')
        )
    }
}
