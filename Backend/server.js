import express from 'express';

const app = express();

const PORT  =  3000;


app.get("/",(req,res)=> {
    res.send(`Welcome to Hotel Booking and Order Management System`);
})
app.get("/home",(req,res)=> {
    res.send(`Welcome Back to Hotel Booking and Order Management System`);
})

app.listen(PORT,()=> {
    console.log(`Server is running on localhost: ${PORT}`);
})