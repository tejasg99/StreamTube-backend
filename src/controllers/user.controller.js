import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend 
    // Validation - not empty
    // Check if user already exists - username, email
    // Check for images and avatar
    // upload them to cloudinary, avatar
    // Create user object - create entry in db
    // Remove password and refresh token fields from response
    // Check for user creation
    // return response properly if not then error

    const {fullname, email, username, password} = req.body
    console.log("email: ", email);

    // Some method returns a boolean value 
    // Here if it returns a true value then will proceed to the if block and throw an error
    if (
        [fullname, email, username, password].some((field)=> field.trim()=== "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // find if user exists using database query
    const existedUser = User.findOne({
        $or: [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // upload cloudinary 
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // object and db entry
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    // remove password and refreshToken from response
    // .select method excludes "-name/element"
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // Check for creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering a user")
    }

    // response 
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export {
    registerUser,
}