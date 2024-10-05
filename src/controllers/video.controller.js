import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteImageFromCloudinary, deleteVideoFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    if (userId){
      if (!isValidObjectId(userId)) {
       throw new ApiError(400, "Invalid User Id")
      }
    }

    const pipeline = [];

    // Filter videos published by the user/owner 
    if(userId){
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            }
        })
    }

    // Filter by query by title using regex
    if(query){
        pipeline.push({
            $match: {
                title: {
                    $regex: query,
                    $options: "i", //i for case insensitive search
                },
            },
        })
    }

    // show only published videos
    pipeline.push({
        $match: {
            isPublished: true,
        }
    })

    // Sort 1 - ascending, -1 - descending order
    if(sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1,
            }
        })
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1,
            }
        })
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const videoAggregate = await Video.aggregate(pipeline);
    const video = await Video.aggregatePaginate(videoAggregate, options)

    //To add ownerDetails after pagination
    const populatedVideos = await Video.aggregate([
        {
            $match: {
                _id: { $in: video.docs.map((v) => v._id) }, //Only for paginated results
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
                ]
            },
        },
        {
        $unwind: "$ownerDetails",
        },
    ]);

    //Merge ownerDetails into paginated result
    const finalResult = {
        ...video,
        docs: populatedVideos,
    };

    return res
    .status(200)
    .json(new ApiResponse(200, finalResult, "All videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    // get file path
    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path
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
    const { videoId } = req.params;

    const isGuest = req.query.guest === "true";

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }
    // Aggregation pipeline to fetch likes, comments, etc
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
                                    if: isGuest,
                                    then: false,
                                    else: {
                                        $cond: {
                                            if: {
                                                $in: [req.user?._id, "$subscribers.subscriber"]
                                            },
                                            then: true,
                                            else: false,
                                        },
                                    }
                                }
                            },
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ]
            }
        },
        { //Comment count only
            $lookup: {
              from: "comments",
              localField: "_id",
              foreignField: "video",
              as: "comments"
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
                        if: isGuest,
                        then: false,
                        else: {
                            $cond: {
                                if: { $in: [req.user?._id, "$likes.likedBy"]},
                                then: true,
                                else: false,
                            }
                        }
                    },
                },
                commentsCount: {
                    $size: "$comments"
                }
            },
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                commentsCount: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                isSubscribed: 1,
                subscribersCount: 1,
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

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }

    const {title, description} = req.body

    if (!title || !description) {
        throw new ApiError(400, "title and description fields are required");
    }

    const thumbnailLocalPath = req.file?.path
    const existingVideo = await Video.findById(videoId)
    const existingThumbnail = existingVideo.thumbnail 

    // upload
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath) 

    if(!thumbnail.url){
        throw new ApiError(400, "Error while uploading thumbnail")
    }

    // Delete existing thumbnail
    await deleteImageFromCloudinary(existingThumbnail)

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail.url
            }
        },
        { new: true}
    )

    if(!video){
        throw new ApiError(404, "Error updating video details")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        video,
        "Video details updated successfully"
    ))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }

    // Find the video by id
    const existingVideo = await Video.findById(videoId)

    if(!existingVideo){
        throw new ApiError(404, "Unable to find the video with given id")
    }

    // Delete from db
    const deleteFromDb = await Video.findByIdAndDelete(existingVideo)

    if(!deleteFromDb){
        throw new ApiError(400, "Unable to delete video")
    }
    
    // Delete video and thumbnail from cloudinary
    const cloudinaryVideo = await deleteVideoFromCloudinary(existingVideo.videoFile)
    const cloudinaryThumbnail = await deleteImageFromCloudinary(existingVideo.thumbnail)

    if(!cloudinaryVideo){
        throw new ApiError(500, "Unable to delete video from cloudinary")
    }

    if(!cloudinaryThumbnail){
        throw new ApiError(500, "Unable to delete thumbnail from cloudinary")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Unable to find the video from db")
    }

    const togglePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished,
            }
        },
        { new: true }
    )

    if(!togglePublish){
        throw new ApiError(500, "Failed to toggle published status")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Published status toggled successfully"))
})

const getNextVideos = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    const nextVideos = await Video.aggregate([
        {
            $match: {
                _id: {
                    $ne: new mongoose.Types.ObjectId(videoId), //excludes the current video
                },
                isPublished: true, //matches only published videos
            },
        },
        {
            $sample: {
                size: 10, //randomly selects 10 vidoes from the input(match stage)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner", //in video document
                foreignField: "_id", //in users
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$ownerDetails",
        }
    ]);

    // Check if nextVideos array is empty
    if (nextVideos.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, [], "No next videos found"));
    }

    return res
    .status(200)
    .json(new ApiResponse(200, nextVideos, "Next videos fetched successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getNextVideos,
}