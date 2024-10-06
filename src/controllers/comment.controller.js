import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const isGuest = req.query.guest === "true";

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    const videoComments = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails", //to flatten the ownerDetails array and fix the response
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        }
                    }
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                isLiked: {
                    $cond: {
                        if: isGuest,
                        then: false,
                        else: {
                            $cond: {
                                if: {
                                    $in: [req.user?._id, "$likeDetails.likedBy"],  
                                },
                                then: true,
                                else: false,
                            },
                        }
                    },
                },
            }
        },
        {
            $sort: {
                createdAt: -1, 
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                ownerDetails: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                },
                isLiked: 1,
            }
        },
    ]


    if(!videoComments){
        throw new ApiError(500, "Failed to fetch video comments")
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const comments = await Comment.aggregatePaginate( 
        Comment.aggregate(videoComments), 
        options, 
    )

    if(!comments){
        throw new ApiError(500, "Failed to load paginated comments")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, comments, "Video Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
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