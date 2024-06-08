import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }

    // if the user has already liked the video 
    const alreadyLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    })

    // unlike
    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id);
        return res 
        .status(200)
        .json(new ApiResponse(200, { isliked: false }, "Video unliked successfully"))
    }

    // like
    const like = await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    })

    if(!like){
        throw new ApiError(500, "Unable to like a video")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { isliked: true }, "Video liked successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id")
    }

    // if the user has already liked the comment 
    const alreadyLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    })

    // unlike
    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id);
        return res 
        .status(200)
        .json(new ApiResponse(200, { isliked: false }, "comment unliked successfully"))
    }

    // like
    const like = await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    })

    if(!like){
        throw new ApiError(500, "Unable to like a comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { isliked: true }, "comment liked successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid tweet Id")
    }

    // if the user has already liked the tweet 
    const alreadyLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    })

    // unlike
    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id);
        return res 
        .status(200)
        .json(new ApiResponse(200, { isliked: false }, "tweet unliked successfully"))
    }

    // like
    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    })

    if(!like){
        throw new ApiError(500, "Unable to like a tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { isliked: true }, "tweet liked successfully"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    // aggregation pipeline to get all the liked videos and data
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
            } 
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    }
                ],
            }
        },
        {
            $unwind: "$likedVideos", //deconstruct and output a document for each liked video
        },
        {
            $sort: {
                createdAt: -1, //descending order
            },
        },
        {
            $project: {
                _id: 0,
                likedVideos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullname: 1,
                        "avatar.url": 1,
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "All the videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}