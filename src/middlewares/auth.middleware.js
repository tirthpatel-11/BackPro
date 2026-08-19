import { User } from "../models/user.model.js";
import { ApiErrors } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHendler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.acessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiErrors(
                401,
                "Unauthorised request error by middleware"
            );
        }

        const userFromToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        const user = await User.findById(userFromToken._id).select(
            "-password -refreshToken"
        );
        if (!user) {
            throw new ApiErrors(401, "invalid acess token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiErrors(401, error.message || "invalid acess token");
    }
});
