import { asyncHandler } from "../utils/asyncHendler.js";
import { ApiErrors } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const genAcessAndRefreshToken = async (user) => {
    try {
        const acessToken = user.generateAcessTokens();
        const refreshToken = user.generateRefreshTokens();
        // console.log(acessToken, refreshToken);

        user.refreshTokens = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { acessToken, refreshToken };
    } catch (error) {
        throw new ApiErrors(
            500,
            "something went wrong while generating tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "OK",
    // });
    // steps for writing th9s controller; we ar ebreaking down this problem into small problem and then solving it
    // step 1: get user data from frontend
    // step 2: validation - not empty
    // step 3: check if user already exist; use email and username
    // step 4: check for images and avatar
    // step 5: upload them to clouinary, avatar check
    // step 6: create user object; create entry in db
    // step 7: remove pass and refreshtoken from response
    // step 8: check for user creation
    // step 9: return res

    const { username, fullName, email, password } = req.body;

    if (
        [username, fullName, email, password].some(
            (field) => field?.trim() == ""
        )
    ) {
        throw new ApiErrors(400, "all fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (existedUser) {
        throw new ApiErrors(
            409,
            "user with username and email is already exist"
        );
    }

    let coverImageLocalPath;
    let avatarLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (
        req.files &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
    ) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiErrors(400, "Avatar image is required");
    }
    console.log(avatarLocalPath, coverImageLocalPath);

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiErrors(500, "not able to store avatar on clouinary");
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const newUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!newUser) {
        throw new ApiErrors(
            500,
            "not able to register user in db. please try again"
        );
    }

    res.status(200).json(
        new ApiResponse(200, newUser, "user Registered sucessfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    // take data from req
    // check user exist or not
    // validate password
    // generate acesstoken and refreshtoken
    // send res with cookie

    const { username, email, password } = req.body;
    if (!password) {
        throw new ApiErrors(400, "password is required");
    }

    if (!username && !email) {
        throw new ApiErrors(400, "please enter email or username");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiErrors(
            404,
            "user not found please register before you login"
        );
    }
    // console.log(user.email, user.password);

    const isPassValid = await user.isPassCorrect(password);
    if (!isPassValid) {
        throw new ApiErrors(401, "invalid password");
    }

    const { acessToken, refreshToken } = await genAcessAndRefreshToken(user);

    const options = {
        httpOnly: true,
        secure: true,
    };

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshTokens"
    );
    // console.log(acessToken, refreshToken);

    res.status(200)
        .cookie("acessToken", acessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, loggedInUser, "user loggedin sucessfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshTokens: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("acessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user loggedout"));
});

const refreshAcessTokens = asyncHandler(async (req, res) => {
    const refreshTokenByUser =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshTokenByUser) {
        throw new ApiErrors(401, "unauthorised request");
    }

    try {
        const userToken = jwt.verify(
            refreshTokenByUser,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(userToken._id);

        if (!user) {
            throw new ApiErrors(
                401,
                "invalid refresh token, user does not exist"
            );
        }

        if (refreshTokenByUser !== user.refreshTokens) {
            throw new ApiErrors(401, "invalid refresh token");
        }

        const { acessToken, refreshToken } =
            await genAcessAndRefreshToken(user);

        const options = {
            httpOnly: true,
            secure: true,
        };

        res.status(200)
            .cookie("acessToken", acessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { acessToken, refreshToken },
                    "Acess Token refreshed"
                )
            );
    } catch (error) {
        throw new ApiErrors(401, error.message || "something went wrong");
    }
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPass, newPass } = req.body;

    if (!(oldPass && newPass)) {
        throw new ApiErrors(
            400,
            "current password and new password both required"
        );
    }

    const user = await User.findById(req.user._id);

    const isPassValid = await user.isPassCorrect(oldPass);

    if (!isPassValid) {
        throw new ApiErrors(400, "invalid current password");
    }

    user.password = newPass;

    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, {}, "Password changed sucessfully")
    );
});

const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select(
        "-password refreshTokens"
    );

    if (!user) {
        throw new ApiErrors(404, "user not found");
    }

    res.status(200).json(new ApiResponse(200, user, "user got sucessfully"));
});

const updateUser = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    if (!(email && fullName)) {
        throw new ApiErrors(400, "email and fullName is required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { email, fullName },
        },
        { new: true }
    ).select("-password -refreshTokens");
});

const updateAvatarImage = asyncHandler(async (req, res) => {
    // acess files
    // check them
    // upload
    // update user
    // delete from local
    // delete from cloudinary

    const avatarImageLocalPath = req.file.path;
    if (!avatarImageLocalPath) {
        throw new ApiErrors(400, "avatar image is required");
    }

    const user = await User.findById(req.user._id).select(
        "-password -refreshTokens"
    );

    if (!user) {
        throw new ApiErrors(401, "unauthorised request");
    }
    const oldAvatar = user.avatar;

    const avatar = await uploadOnCloudinary(avatarImageLocalPath);

    if (!avatar) {
        throw new ApiErrors(
            500,
            "something went wrong while uploading into cloudinary"
        );
    }

    user.avatar = avatar.url;
    await user.save({ validateBeforeSave: false });

    const deleteImageResponse = await deleteOnCloudinary(oldAvatar);
    if (!deleteImageResponse) {
        throw new ApiErrors(500, "unable to delete old image");
    }

    res.status(200).json(
        new ApiResponse(200, user, "user avatar updated sucessfully")
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
    // acess files
    // check them
    // upload
    // update user
    // delete from local
    // delete from cloudinary

    const coverImageLocalPath = req.file.path;
    if (!coverImageLocalPath) {
        throw new ApiErrors(400, "cover image is required");
    }

    const user = await User.findById(req.user._id).select(
        "-password -refreshTokens"
    );

    if (!user) {
        throw new ApiErrors(401, "unauthorised request");
    }
    const oldCover = user.coverImage;

    const cover = await uploadOnCloudinary(coverImageLocalPath);

    if (!cover) {
        throw new ApiErrors(
            500,
            "something went wrong while uploading into cloudinary"
        );
    }

    user.coverImage = cover.url;
    await user.save({ validateBeforeSave: false });

    const deleteImageResponse = await deleteOnCloudinary(oldcover);
    if (!deleteImageResponse) {
        throw new ApiErrors(500, "unable to delete old image");
    }

    res.status(200).json(
        new ApiResponse(200, user, "user avatar updated sucessfully")
    );
});

const getChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiErrors(400, "username is required");
    }

    const profileDetails = User.aggregate([
        {
            $match: {
                username,
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribing",
            },
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers",
                },
                subscribingCount: {
                    $size: "$subscribing",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user._id, "$subscribers.subscriber"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribingCount: 1,
                isSubscribed: 1,
            },
        },
    ]);
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessTokens,
    changePassword,
    getUser,
    updateAvatarImage,
    updateCoverImage,
    getChannelProfile,
};
