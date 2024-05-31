import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    // get file path
    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0].path
    // console.log("Video Path: ",videoLocalPath," Thumbnail Path: ", thumbnailLocalPath)
    if(!title || !description || !videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "Title, Description, VideoFile and Thumbnail are required")
    }

    // Upload to cloudinary
    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    // Create video object to save in db
    const newVideo = await Video.create({
        title,
        description,
        thumbnail: thumbnail.url,
        videoFile: video.url,
        owner: req.user._id,
        duration: video.duration, //Get duration from cloudinary
    })

    return res
    .status(201)
    .json(new ApiResponse(201, newVideo, "Video uploaded successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }
    // Need to incorporate aggregation pipeline to fetch likes, comments, etc
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false,
                    }
                },
            },
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
    ])

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    // Increment views 
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    })

    // Add video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId,
        }
    })

    return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title, description, thumbnail} = req.body

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}