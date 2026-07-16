export interface IApiResponse {
    success: boolean;
    data: unknown;
    error: unknown | null;
    meta?: unknown;
}

export class ApiResponse implements IApiResponse {
    public success: boolean;
    public data: unknown;
    public error: unknown | null;
    public meta?: unknown;
    
    // Express status code (not serialized directly in the JSON response, but used for HTTP response code)
    public statusCode: number;

    constructor(statusCode: number, data: unknown, message: string = "Success", meta?: unknown) {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.data = data;
        this.error = null;
        this.meta = meta || { message };
    }

    // Helper to format as JSON response object
    toJSON() {
        return {
            success: this.success,
            data: this.data,
            error: this.error,
            meta: this.meta
        };
    }
}
