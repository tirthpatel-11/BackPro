import dotenv from "dotenv";
import DBConnect from "./db/dbConnect.js";
dotenv.config({
    path: "./.env",
});

DBConnect();
