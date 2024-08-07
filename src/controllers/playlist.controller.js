import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!(name || description)){
        throw new ApiError(400, "Playlist name and description are required")
    }

    //TODO: create playlist
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
    //TODO: get user playlists
    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
              owner: new mongoose.Types.ObjectId(userId)
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              playlistBy: {
                $first: "$owner"
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
              name: 1,
              description: 1,
              playlistBy: 1,
              videos: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
    ])

    if(!userPlaylists){
        throw new ApiError(500, "Unable to fetch user playlists")
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
    //TODO: get playlist by id

    const playlist = await Playlist.aggregate([
        {
            $match: {
              _id: new mongoose.Types.ObjectId(playlistId),
            }
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullname: 1,
                  avatar: 1,
                }
              }
            ]
          }
        },
        {
            $addFields: {
              playlistBy: {
                $first: "$owner"
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
              name: 1,
              description: 1,
              playlistBy: 1,
              videos: 1,
              createdAt: 1,
              updatedAt: 1
            }
        }
    ])

    if(!playlist){
        throw new ApiError(500, "Failed to fetch playlist by id")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}