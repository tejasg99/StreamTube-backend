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

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}