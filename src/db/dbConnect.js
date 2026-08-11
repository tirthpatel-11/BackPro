import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const DBConnect = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );
        console.log(
            "databse is always in the other continent still it is connected!! \n",
            connectionInstance
        );
    } catch (error) {
        console.log("Error in connecting db from db/dbConnect \n", error);
        process.exit(1);
    }
};

export default DBConnect;
