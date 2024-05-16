import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import  jwt  from "jsonwebtoken"

// AT and RT separate method
const generateAccessAndRefreshTokens = async(userId) => {
    try {
       const user =  await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken =  user.generateRefreshToken()

      // adding refreshToken to database    
       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave: false })

       return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

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
    // console.log("email: ", email);

    // Some method returns a boolean value 
    // Here if it returns a true value then will proceed to the if block and throw an error
    if (
        [fullname, email, username, password].some((field)=> field.trim()=== "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // find if user exists using database query
    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // console.log(req.files);

    // images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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
    // .select method excludes "-name/element" and it only takes one argument like "-password refreshToken" no comma in between two args
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

const loginUser = asyncHandler( async (req, res) => {
    // Todos
    // req.body - take data 
    // Authentication using username or email
    // find the user and check password if user exists
    // access and refresh Token generation and 
    // send to user in cookies
    // Response - login successful

    const {email, username, password} = req.body;

    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    //Alternative
    // if(!(username || email)){
    //     throw new ApiError(400, "username or email is required")
    // }

    // find user in db
    const user = await User.findOne({
        // mongoDB operator 
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Incorrect Password")
    }

    // AT and RT
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    // Check if one more db query is expensive if yes then just update the user from previous query
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, //statusCode
            {
                user: loggedInUser, accessToken, refreshToken
            }, //data
            "User logged in successfully" //message
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    // auth middleware to get user access from req
    // find user and reset refeshToken
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )
    
    // clear cookies
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async(req,res) => {
    // Access using cookies
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}