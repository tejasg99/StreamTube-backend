import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    if(!content){
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: req.user?._id,
    })

    if(!comment){
        throw new ApiError(500, "Failed to add a new comment")
    }

    return res 
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    if(!content){
        throw new ApiError(400, "content is required to update a comment")
    }

    const existingComment = await Comment.findById(commentId)

    if (existingComment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content,
            }
        },
        { new: true }
    )

    if(!updatedComment){
        throw new ApiError(500, "Failed to update the comment")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id")
    }

    const existingComment = await Comment.findById(commentId)

    if (existingComment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can delete their comment");
    }

    const delComment = await Comment.findByIdAndDelete(commentId)

    if(!delComment){
        throw new ApiError(500, "Failed to delete the comment")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, delComment, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}