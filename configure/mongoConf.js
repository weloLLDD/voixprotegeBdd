import mongoose from "mongoose"; 

const connectDatabase = async() =>{
    try {
        const connect = await mongoose.connect(process.env.MONGO_URL);
        console.log("Mongo Connected voix de l'homme");
    } catch (error) {
        console.log(`Error : ${error.Message}`)
        process.exit(1);
    }
};
 

export default connectDatabase;
