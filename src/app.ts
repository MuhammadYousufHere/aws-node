import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import responseTime from 'response-time'
import urlJoin from 'url-join'
import compression from 'compression'
import PromClient from 'prom-client' // monitoring tool
import * as Sentry from '@sentry/node'
import logger from './utils/logger'
import { APP_ROOT, resolvePathFromAppRoot } from './utils/utils'
import { SetupSentry } from './lib/sentry'
import { propsFor } from './lib/properties'

const webServer = express(),
    router = express.Router()
const httpRoot = urlJoin('/api/v1')
console.log(httpRoot)
const buildPath = resolvePathFromAppRoot('..', 'build') // build
const awsProps = propsFor('aws')
const defArgs = {
    port: process.env.PORT || 4001,
    hostname: '0.0.0.0'
}
// function measureEventLoopLag(delayMs: number) {
//     return new Promise<number>(resolve => {
//         const start = process.hrtime.bigint()
//         setTimeout(() => {
//             const elapsed = process.hrtime.bigint() - start
//             const delta = elapsed - BigInt(delayMs * 1000000)
//             return resolve(Number(delta) / 1000000)
//         }, delayMs)
//     })
// }
// async function setupStaticMiddleware(router: express.Router) {
//     const staticManifest = await fs.readJson(path.join(distPath, 'manifest.json'));

//     if (staticUrl) {
//         logger.info(`  using static files from '${staticUrl}'`);
//     } else {
//         logger.info(`  serving static files from '${staticPath}'`);
//         router.use(
//             '/static',
//             express.static(staticPath, {
//                 maxAge: staticMaxAgeSecs * 1000,
//             }),
//         );
//     }

function startListening(server: express.Express) {
    const startupGauge = new PromClient.Gauge({
        name: 'my_startup_seconds',
        help: 'Time taken from process start to serving requests'
    })
    startupGauge.set(process.uptime())
    const startupDurationMs = Math.floor(process.uptime() * 1000)

    logger.info(`⚡️[Server]: Server is listening on http://${'localhost'}:${defArgs.port}/`)
    console.log(` Startup duration: ${startupDurationMs}ms/`)
    server.listen(defArgs.port)
}
async function main() {
    // init the db
    SetupSentry({
        sentryDsn: process.env.SENTRY_DSN!,
        gitReleaseName: 'v1.0.0',
        releaseBuildNumber: '1.0.0',
        app: webServer
    })

    // Indicates the app is behind a front-facing proxy, and to use the X-Forwarded-* headers to determine the connection and the IP address of the client.
    webServer
        .set('trust proxy', true)
        .on('error', err => console.error('Caught error in web handler; continuing:', err))
        .use(
            // sentry request handler must be the first middleware on the app
            Sentry.Handlers.requestHandler({
                ip: true
            })
        )
        .use(
            responseTime((_req: Request, _res: Response, time: number) => {
                console.log(`Request time:${time}`)
                if (time >= 2) {
                    Sentry.withScope(scope => {
                        scope.setExtra('duration_ms', time)
                        Sentry.captureMessage('SlowRequest', 'warning')
                    })
                }
            })
        )
        // Handle healthchecks at the root,
        .use('/healthcheck', (_req, res) => {
            const startupDurationMs = Math.floor(process.uptime() * 1000)
            res.status(200).json({
                data: {
                    uptime: `${startupDurationMs} ms`,
                    appStartTime: '',
                    currTime: new Date()
                },
                message: 'Api service is up',
                statusCode: 200
            })
        })
        .use(httpRoot, router)
        .use((req, _res, next) => {
            next({ status: 404, message: `Sorry, "${req.path}" could not be found` })
        })
        .use(Sentry.Handlers.errorHandler())
        .use((err: any, _req: Request, res: Response, _next: NextFunction) => {
            const status =
                err.status || err.statusCode || err.status_code || (err.output && err.output.statusCode) || 500
            const message = err.message || 'Internal Server Error'
            res.status(status).json({ status, message })
            // res.render('error', renderConfig({error: {code: status, message: message}}));
            if (status >= 500) {
                console.error('Internal server error:', err)
            }
        })
        .use(compression({}))

    startListening(webServer)
}
process.on('uncaughtException', uncaughtHandler)
process.on('SIGINT', signalHandler('SIGINT'))
process.on('SIGTERM', signalHandler('SIGTERM'))
process.on('SIGQUIT', signalHandler('SIGQUIT'))

function signalHandler(name: string) {
    return () => {
        logger.info(`stopping process: ${name}`)
        process.exit(0)
    }
}
function uncaughtHandler(err: Error, origin: NodeJS.UncaughtExceptionOrigin) {
    logger.info(`stopping process: Uncaught exception: ${err}\nException origin: ${origin}`)
    // The app will exit naturally from here, but if we call `process.exit()` we may lose log lines.
    process.exitCode = 1
}
main().catch(err => {
    logger.info('Top-level error (shutting down):', err)
    // Shut down after a second to hopefully let logs flush.
    setTimeout(() => process.exit(1), 1000)
})
