import mongoose, {isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const {channelId} = req.params;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channel id")
    }

    // Only channel Owner should be able to access
    if(channelId.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only channel owner can access the dashboard")
    }

    const stats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            },
        },
        {
            $group: {
                _id: "$owner",
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 },
                videoIds: { $push: "$_id" },
            }
        },
        {
            $project: {
                _id: 0,
                totalViews: 1,
                totalVideos: 1,
            }
        }
    ])

    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    })

    const totalLikes = await Like.countDocuments({
        video: { $in: await Video.find({ owner: channelId}).select("_id") }
    })

    const finalStats = {
        totalVideos: stats[0]?.totalVideos || 0,
        totalSubscribers,
        totalLikes,
        totalViews: stats[0]?.totalViews || 0,
    }

    if(!finalStats){
        throw new ApiError(500, "Unable to fetch final stats")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, finalStats, "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const { channelId } = req.params;
    const { page = 1, limit = 10 } = req.query;
  
    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid channel id");
    }

    // Only channel Owner should be able to access
    if(channelId.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only channel owner can access the dashboard")
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
    
    const aggregate = Video.aggregate([
      { 
        $match: { 
            owner: new mongoose.Types.ObjectId(channelId) 
        } 
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes"
        }
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
        }
      },
      {
        $sort: {
          createdAt: 1,
        }
      },
      {
        $project: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          likesCount: 1,
          title: 1,
          description: 1,
          createdAt: 1,
          isPublished: 1,
        }
      }
    ]);

    const videos = await Video.aggregatePaginate(aggregate, options);
  
    if (!videos) {
      throw new ApiError(404, "No videos found for this channel");
    }
  
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
})

const getChannelInfo = asyncHandler(async (req, res) => {
    try {
      const userId = req.user._id;
  
      const channelAbouts = await User.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "_id",
            foreignField: "owner",
            as: "videos",
          },
        },
        {
          $lookup: {
            from: "tweets",
            localField: "_id",
            foreignField: "owner",
            as: "tweets",
          },
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "video",
            as: "videoLikes",
          },
        },
        {
          $project: {
            username: 1,
            fullname: 1,
            email: 1,
            description: 1,
            createdAt: 1,
            totalVideos: { $size: "$videos" },
            totalTweets: { $size: "$tweets" },
            totalLikes: { $size: "$videoLikes" },
            totalViews: { $sum: "$videos.views" },
          },
        },
      ]);
  
      if (!channelAbouts || channelAbouts.length === 0) {
        throw new ApiError(404, "Channel information not found");
      }
  
      const channelInfo = channelAbouts[0];
  
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            channelInfo,
            "Channel information fetched successfully"
          )
        );
    } catch (error) {
      console.error("Error in getChannelInfo:", error);
      throw new ApiError(500, "Error fetching channel information", error);
    }
});

export {
    getChannelStats, 
    getChannelVideos,
    getChannelInfo,
}