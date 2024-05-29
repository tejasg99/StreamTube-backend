import { v2 as cloudinary } from "cloudinary";
import fs from "fs"


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET, 
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file uploaded successfully
        // console.log("File has been uploaded successfully on cloudinary", response.url)
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation failed
        return null;
    }
}

// To delete a particular file from cloudinary
const deleteImageFromCloudinary = async (publicUrl) => {
    try {
      const publicId = publicUrl.split(".")[2].split("/").slice(5).join("/");
      try {
        const result = await cloudinary.api.delete_resources(publicId);
        return result;
      } catch (error) {
        console.log(`Error 1 while deleting files ${error}`);
        return null;
      }
    } catch (error) {
      console.log(`Error 2 while deleting files ${error}`);
      return null;
    }
  };

export { uploadOnCloudinary, deleteImageFromCloudinary }