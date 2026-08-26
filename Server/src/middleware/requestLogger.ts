import {Request,Response,NextFunction} from "express"

import {randomUUID} from "crypto"

import {log} from "../lib/logger.js"

export function requestLogger(req:Request,res:Response,next:NextFunction){

    const requestId = randomUUID()
    req.requestId = requestId

    const start = Date.now()

     res.setHeader("X-Request-Id", requestId);

    log("info", "http.request.started", {
        requestId,
        method: req.method,
        path: req.originalUrl,
    });

    res.on("finish", () => {
        const durationMs = Date.now() - start;

        log("info", "http.request.completed", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
        });
    });

    next()

}

