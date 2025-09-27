import express from "express" 
import User from "./models/userModels.js";
import users from "./data/User.js"; 
import asynchandler from "express-async-handler"; 
const ImportData = express.Router();


ImportData.post("/user",asynchandler(async(req,res) =>{
   
    await User.deleteOne({});
    const importUser = await User.insertMany(users);
    res.send({importUser});
})

);
 



export default ImportData;