import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
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
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    // aggregation pipeline to find all tweets and the associated data
    const pipeline = [
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
    ]

    const options = {
        page: parseInt(page, 1),
        limit: parseInt(limit, 10),
    }

    const userTweets = await Tweet.aggregatePaginate(
        Tweet.aggregate(pipeline),
        options
    );

    if(!userTweets){
        throw new ApiError(500, "Failed to fetch all the user tweets");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "All user tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
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

const getAllTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const isGuest = req.query.guest === "true";

    const aggregationPipeline = [
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
                ]
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
                  },
                },
              ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: isGuest,
                        then: false,
                        else: {
                            $cond : {
                                if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
                                then: true,
                                else: false,
                            }
                        }
                    }
                }
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
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1,
            }
        },
    ]

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const tweets = await Tweet.aggregatePaginate(
        Tweet.aggregate(aggregationPipeline),
        options
    )

    return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All Tweets fetched successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    getAllTweets,
}