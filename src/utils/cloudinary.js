import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadOnCloudinary(fileLocalPath) {
    try {
        if (!fileLocalPath) {
            return null;
        }
        const response = await cloudinary.uploader.upload(fileLocalPath, {
            resource_type: "auto",
        });
        fs.unlink(fileLocalPath);
        return response;
    } catch (error) {
        fs.unlink(fileLocalPath);
        return null;
    }
}

export { uploadOnCloudinary };
