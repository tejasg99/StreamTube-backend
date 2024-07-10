import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId,
    })

    // Unsubscribe if exists
    if(existingSubscription){
        await Subscription.findByIdAndDelete(existingSubscription._id)
        return res
        .status(200)
        .json(new ApiResponse(200, { isSubscribed: false }, "User unsubscribed successfully"))
    }

    const newSubscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId,
    })

    if(!newSubscription){
        throw new ApiError(500, "Error while subscribing to the channel")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { isSubscribed: true }, "Channel subscribed successfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    const channelSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber",
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [channelId, "$subscribedToSubscriber.subscriber"]
                                    },
                                    then: true,
                                    else: false,
                                }
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber",
                            },
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriberDetails",
        },
        {
            $project: {
                _id: 0,
                subscriberDetails: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1,
                }
            }
        }
    ])

    if(!channelSubscribers){
        throw new ApiError(500, "Error while fetching channel subscribers")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, channelSubscribers, "Channel subscribers fetched successfully"))
})



// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriber id")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [subscriberId, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false,
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channelDetails",
        },
        {
            $project: {
                _id: 0,
                channelDetails: 1,
            }
        }
    ])

    if(!subscribedChannels){
        throw new ApiError(500, "Error while fetching subscribed channels")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}