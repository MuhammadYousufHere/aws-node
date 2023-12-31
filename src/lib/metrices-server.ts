import express, {Request, Response} from 'express';
import PromClient from 'prom-client';

/**
 * Will launch the Prometheus metrics server
 *
 * @param serverPort - The listening port to bind into this metrics server.
 * @param hostname - The TCP host to attach the listener.
 * @returns void
 */

export function setupMetricsServer(serverPort: number, hostname: string): void {
    PromClient.collectDefaultMetrics();
    const metricsServer = express();

    metricsServer.get('/metrics', (_req: Request, res: Response) => {
        PromClient.register
            .metrics()
            .then(metrics => {
                res.header('Content-Type', PromClient.register.contentType).send(metrics);
            })
            .catch(err => res.status(500).send(err));
    });

    if (hostname) {
        metricsServer.listen(serverPort, hostname);
    } else {
        metricsServer.listen(serverPort);
    }
}
