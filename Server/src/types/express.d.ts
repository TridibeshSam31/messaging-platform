import "express"

declare global {
  namespace Express {
    interface Request {
      requestId: string
    }
  }
}

export {}

//why this file is needed : This file is needed to extend the Request interface of Express to include a custom property called requestId. 
// By default, the Request interface in Express does not have a requestId property.