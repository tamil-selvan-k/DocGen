import { Response, Request, NextFunction } from 'express'
import { ApiResponse } from './ApiResponse'

/**
 * A wrapper for async controller methods to:
 * 1. Eliminate try/catch boilerplate.
 * 2. Automatically catch errors and pass them to the global error handler.
 * 3. Handle 'return new ApiResponse()' syntax by automatically sending the response.
 */

type AsyncController = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<ApiResponse | unknown>;

const asyncHandler = (fn: AsyncController) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await fn(req, res, next);

            // If the controller returns an ApiResponse object, automatically send it
            if (result instanceof ApiResponse) {
                return res.status(result.statusCode).json(result);
            }

            // If result is already sent (e.g., via res.download or res.redirect), do nothing
            if (res.headersSent) return;

            // Handle any other return value as a 200 success if not already sent
            if (result !== undefined) {
                return res.status(200).json(new ApiResponse(200, result));
            }

        } catch (error) {
            next(error);
        }
    };
};

export default asyncHandler;