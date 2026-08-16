import { asyncHandler } from "../utils/asyncHendler.js";
import { ApiErrors } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

export { registerUser };
