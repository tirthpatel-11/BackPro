import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";

// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
// });

async function uploadOnCloudinary(fileLocalPath) {
    try {
        if (!fileLocalPath) {
            return null;
        }
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        // console.log(process.env.CLOUDINARY_API_KEY);
        // console.log("Cloudinary API key:", cloudinary.config().api_key);
        // console.log("Cloudinary API key:", cloudinary.config());
        const response = await cloudinary.uploader.upload(fileLocalPath, {
            resource_type: "auto",
        });
        fs.unlinkSync(fileLocalPath);
        return response;
    } catch (error) {
        console.log(error);
        fs.unlinkSync(fileLocalPath);
        return null;
    }
}

async function deleteOnCloudinary(fileUrl) {
    try {
        if (!fileUrl) {
            return null;
        }
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const publicId = fileUrl.match(/\/v\d+\/(.+?)(?:\.[^./?]+)?$/);
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: "auto",
        });

        return response;
    } catch (error) {
        console.log(error);
        return null;
    }
}

export { uploadOnCloudinary, deleteOnCloudinary };
