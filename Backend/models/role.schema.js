import mongoose from "mongoose";


const roleSchema =  new mongoose.Schema({
    name:{
        type: String,
        required: true,
        enum: ['admin','staff','guest'],
    },
});


export const Role =  mongoose.model("Role", roleSchema);

