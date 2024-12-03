import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"


    // Cloudinary Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });


    const uploadOnCloudinary = async (localFilePath)=>{

      try {
        if(!localFilePath) return null
        // Upload File on Clodunary 
         const response =  await cloudinary.uploader.upload(localFilePath, {
          resource_type:"auto"
        })

        // file has been uploaded successfully
        console.log("File is Uploaded on Cloudinary", response.url);
        return response;
        
      } catch (error) {
        // REmove the locally saved temporary file as the upload operation got failed
        fs.unlinkSync(localFilePath)

        return null;
      }
    }

export {uploadOnCloudinary}