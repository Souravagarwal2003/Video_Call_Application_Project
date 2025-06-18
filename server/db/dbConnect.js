import mongoose from "mongoose"

const dbConnect=async()=>{
try {
    await mongoose.connect(process.env.MONGOOSE_CONNECTION),
    console.log("✅Connected to DataBase");
} catch (error) {
    console.log(error);
}
}

export default dbConnect