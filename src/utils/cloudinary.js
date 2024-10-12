import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


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
        if(response) fs.unlinkSync(localFilePath);
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

      const result = await cloudinary.api.delete_resources(publicId);
      return result;
    } catch (error) {
      console.log(`Error while deleting image file ${error}`);
      return null;
    }
};

const deleteVideoFromCloudinary = async (publicUrl) => {
  try {
    const publicId = publicUrl.split(".")[2].split("/").slice(5).join("/");

    const result = await cloudinary.api.delete_resources(publicId, { resource_type: "video" });
    return result;
  } catch (error) {
    console.log(`Error while deleting video file ${error}`)
    return null;
  }
}

export { uploadOnCloudinary, deleteImageFromCloudinary, deleteVideoFromCloudinary }