import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;

    if(!content){
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content: content,
        owner: req.user?._id,
    })

    if(!tweet){
        throw new ApiError(500, "Tweet creation failed")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;
    
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(400, "User not found")
    }

    // aggregation pipeline to find all tweets and the associated data
    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
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
                            username: 1,
                            avatar: 1,
                        }
                    }
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
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
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likeDetails.likedBy"],   //if userId is there in likeDetails.likedBy
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $sort: {
              createdAt: -1,
            },
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1,
            },
        },
    ])

    if(!userTweets){
        throw new ApiError(500, "Failed to fetch all the user tweets");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "All user tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;

    if(!content){
        throw new ApiError(400, "Tweet content is required")   
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400, "Tweet not found")
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can edit their tweet");
    }
    
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content,
            },
        },
        { new: true }
    )

    if(!updatedTweet){
        throw new ApiError(500, "Failed to update the tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400, "Tweet not found")
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only the owner can edit their tweet");
    }

    const deleteTweet = await Tweet.findByIdAndDelete(tweetId)

    if(!deleteTweet){
        throw new ApiError(500, "Tweet deletion failed")
    }
    
    return res 
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "Tweet deletion successful"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}