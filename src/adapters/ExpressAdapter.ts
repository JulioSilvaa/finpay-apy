import type { NextFunction, Request, Response } from 'express'

export default class ExpressAdapter {
  static create(controller: (req: Request, res: Response, next: NextFunction) => Promise<Response>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        return await controller(req, res, next)
      } catch (error) {
        next(error)
      }
    }
  }
}
