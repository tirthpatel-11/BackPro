const asyncHandler = (fn) => (req, res, next) => {
    try {
        fn(req, res, next);
    } catch (error) {
        // res.status(error.code || 500).json({
        //     sucess: false,
        //     message: error.message,
        // });
        next(error);
    }
};

export { asyncHandler };
