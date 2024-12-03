import express from "express"
import connectDB from "./db/index.js";
import dotenv from "dotenv"
import {app} from "./app.js"

// Alternate
// const app  = express()


dotenv.config({
  path:'./env'
})


connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000, ()=>{
    console.log(`Server is running on port: ${process.env.PORT}`);
    
  })
})
.catch((error)=>{
  console.log("MONGO DB connection Failed !! ",error);
  
})

/*
(async ()=>{
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`)
    app.on("error", (error)=>{
      console.log("ERROR: ", eror );
      throw error
      })

      app.listen(process.env.PORT, ()=>{
        console.log(`App is listening on Port ${process.env.PORT}`);
        
      })

  } catch (error) {
    console.error("ERROR: ",error)
    throw err
  }
})()
   */