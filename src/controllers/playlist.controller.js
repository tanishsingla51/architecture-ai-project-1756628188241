import mongoose, { isValidObjectId } from 'mongoose';
import { Playlist } from '../models/playlist.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        throw new ApiError(400, 'Name is required for the playlist');
    }

    const playlist = await Playlist.create({
        name,
        description: description || '',
        owner: req.user?._id,
        videos: []
    });

    return res.status(201).json(new ApiResponse(201, playlist, 'Playlist created successfully'));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid userId');
    }

    const playlists = await Playlist.find({ owner: userId });

    return res.status(200).json(new ApiResponse(200, playlists, 'User playlists fetched successfully'));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlistId');
    }

    const playlist = await Playlist.findById(playlistId).populate('videos');

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    return res.status(200).json(new ApiResponse(200, playlist, 'Playlist fetched successfully'));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid playlistId or videoId');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to add videos to this playlist');
    }

    if (playlist.videos.includes(videoId)) {
        throw new ApiError(400, 'Video already exists in the playlist');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $push: { videos: videoId } },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, 'Video added to playlist successfully'));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid playlistId or videoId');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to remove videos from this playlist');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, 'Video removed from playlist successfully'));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlistId');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete this playlist');
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(new ApiResponse(200, {}, 'Playlist deleted successfully'));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlistId');
    }

    if (!name && !description) {
        throw new ApiError(400, 'Name or description is required to update');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to update this playlist');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $set: { name, description } },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, 'Playlist updated successfully'));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};
