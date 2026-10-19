import {Request,Response,NextFunction} from "express"

import {randomUUID} from "crypto"

import {log} from "../lib/logger.js"
import {metrics} from "../lib/metrics.js"
import {runWithTrace} from "../lib/tracing.js"

export function requestLogger(req:Request,res:Response,next:NextFunction){

    const requestId = randomUUID()
    req.requestId = requestId

    const start = Date.now()

    res.setHeader("X-Request-Id", requestId);

    metrics.http.requestsTotal.increment();

    log.info( "http.request.started", {
        requestId,
        method: req.method,
        path: req.originalUrl,
    });

    res.on("finish", () => {
        const durationMs = Date.now() - start;

        metrics.http.requestDurationMs.observe(durationMs);

        if (res.statusCode >= 400) {
            metrics.http.errorsTotal.increment();
        }

        log.info("http.request.completed", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
        });
    });

    //Phase 9: everything that runs for this request from here on (routes, controllers,
    //services, Prisma, error handler) sees requestId as its traceId, so their log lines
    //carry it automatically — no need to pass requestId into every function by hand
    runWithTrace(requestId, () => next())

}