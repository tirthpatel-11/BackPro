class ApiErrors extends Error {
    constructor(
        statusCode,
        messege = "Something went wrong",
        data,
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
        this.message = messege;
        this.errors = errors;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiErrors };
