const express=require('express');
const app=express();
const dotenv=require('dotenv');
const mongoose=require('mongoose');
dotenv.config()
console.log(process.env.PORT)

app.get('/',(req,res)=>{
    res.send("hello world")
})


app.listen(process.env.PORT,()=>{console.log("server is running on the port " + process.env.PORT)})