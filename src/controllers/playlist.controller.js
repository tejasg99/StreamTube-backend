import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import { Video } from "../models/video.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!(name || description)){
        throw new ApiError(400, "Playlist name and description are required")
    }

    const newPlaylist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    })

    if(!newPlaylist){
        throw new ApiError(500, "Unable to create a new playlist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, newPlaylist, "New Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "UserId is required")
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
              owner: new mongoose.Types.ObjectId(userId)
            }
          },
          {
            $lookup: {
              from: "videos",
              localField: "videos",
              foreignField: "_id",
              as: "videos",
            }
          },
          {
            $addFields: {
              totalVideos: {
                $size: "$videos",
              },
              totalDuration: {
                $sum: "$videos.duration",
              },
              totalViews: {
                $sum: "$videos.views",
              },
              coverImage: {
                $let: {
                  vars: {
                    latestVideo: {
                      $arrayElemAt: [
                        {
                          $sortArray: { input: "$videos", sortBy: { createdAt: -1 } },
                        },
                        0,
                      ],
                    },
                  },
                  in: "$$latestVideo.thumbnail",
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              totalVideos: 1,
              totalViews: 1,
              updatedAt: 1,
              coverImage: 1,
            }
          }
    ])

    if(!userPlaylists){
        throw new ApiError(500, "Unable to fetch user playlists")
    }

    // Incase user has not created any playlists
    if (userPlaylists.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "User has not created any playlists"));
    }

    return res
    .status(200)
    .json(new ApiResponse(200, userPlaylists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
              _id: new mongoose.Types.ObjectId(playlistId),
            }
        },
        {
          $lookup: {
            from: "videos",
            localField: "videos",
            foreignField: "_id",
            as: "videos",
          }
        },
        {
          $match: {
            "videos.isPublished": true,
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          }
        },
        {
          $lookup: {
            from: "subscriptions",
            let: { ownerId: { $arrayElemAt: ["$owner._id", 0] }},
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$channel", "$$ownerId"],
                  }
                }
              },
              {
                $count: "subscriberCount",
              },
            ],
            as: "subscriberInfo",
          },
        },
        {
          $addFields: {
            totalVideos: {
              $size: "$videos",
            },
            totalDuration: {
              $sum: "$videos.duration",
            },
            totalViews: {
              $sum: "$videos.views",
            },
            owner: {
              $mergeObjects: [
                { $arrayElemAt: ["$owner", 0] },
                {
                  subscribers: {
                    $ifNull: [
                      { $arrayElemAt: ["$subscriberInfo.subscriberCount", 0] },
                      0,
                    ]
                  }
                }
              ]
            },
            coverImage: {
              $let: {
                vars: {
                  latestVideo: {
                    $arrayElemAt: [
                      {
                        $sortArray: { input: "$videos", sortBy: { createdAt: -1 } },
                      },
                      0,
                    ]
                  }
                },
                in: "$$latestVideo.thumbnail",
              },
            },
          },
        },
        {
            $project: {
              name: 1,
              description: 1,
              createdAt: 1,
              updatedAt: 1,
              totalVideos: 1,
              totalViews: 1,
              coverImage: 1,
              videos: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                createdAt: 1,
                views: 1,
              },
              owner: {
                username: 1,
                fullname: 1,
                avatar: 1,
                _id: 1,
                subscribers: 1,
              }
            }
        }
    ])
    
    if(!playlistVideos) {
      throw new ApiError(500, "Failed to fetch playlist")
    }

    if(playlistVideos[0] === undefined){
        return res
        .status(200)
        .json(new ApiResponse(200, [], "Playlist fetched successfully"))
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlistVideos, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    
    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlist ID");
    }
    
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video ID");
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    //check if the video already exists in the playlist
    if(playlist.videos.includes(videoId)){
        throw new ApiError(400, "Video already exists in the playlist")
    }

    playlist.videos.push(videoId);
    await playlist.save();

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to the playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId)) {
      throw new ApiError(400, "Invalid playlist ID");
    }
      
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video ID");
    }
  
    const playlist = await Playlist.findById(playlistId)
  
    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
  
    const video = await Video.findById(videoId);
  
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    //The video should exist in the playlist
    if(!playlist.videos.includes(videoId)){
        throw new ApiError(400, "Video does not exist in the playlist")
    }

    playlist.videos.pull(videoId);
    await playlist.save();

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from the playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    
    // Find the playlist
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    // Only authorized user should be able to delete
    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Unauthorized to delete this playlist")
    }

    await playlist.deleteOne();

    return res
    .status(200)
    .json(new ApiResponse(200, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    
    if(!(name || description)){
        throw new ApiError(400, "Name or description are required to update")
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(404, "Playlist not found");
    }
  
    //Authenticated user
    if (playlist.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "not authorized to update this playlist");
    }

    if(name) playlist.name = name;
    if(description) playlist.description = description;

    await playlist.save();

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
})

const isVideoInPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlistId or videoId");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  const isVideoPresent = playlist.videos.includes(videoId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPresent: isVideoPresent },
        "Video presence in playlist checked successfully"
      )
    );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    isVideoInPlaylist,
}