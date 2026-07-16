export interface IApiError extends Error {
    statusCode: number;
    isOperational: boolean;
    success: boolean;
    errors: unknown[];
}

export class ApiError extends Error implements IApiError {
    public statusCode: number;
    public isOperational: boolean;
    public success: boolean;
    public errors: unknown[];

    constructor(message: string, statusCode: number, errors: unknown[] = [], stack: string = "") {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    // Helper to format as JSON response object
    toJSON() {
        return {
            success: false,
            data: null,
            error: {
                message: this.message,
                errors: this.errors.length > 0 ? this.errors : undefined
            },
            meta: null
        };
    }
}
