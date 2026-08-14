import dotenv from "dotenv";
dotenv.config({
    path: "./.env",
});
import DBConnect from "./db/dbConnect.js";
import { app } from "./app.js";

DBConnect()
    .then(() => {
        app.on("error", () =>
            console.log(
                "there is error in runing app after db connection from index.js"
            )
        );
        app.listen(process.env.PORT, () => {
            console.log("app is listning");
        });
    })
    .catch((error) => {
        console.log("error in DB connection from /index.js : ", error);
    });
