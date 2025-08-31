import mongoose, { isValidObjectId } from 'mongoose';
import { Like } from '../models/like.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId');
    }

    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready._id);
        return res.status(200).json(new ApiResponse(200, { isLiked: false }, 'Like removed'));
    } else {
        await Like.create({
            video: videoId,
            likedBy: req.user?._id
        });
        return res.status(200).json(new ApiResponse(200, { isLiked: true }, 'Like added'));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid commentId');
    }

    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready._id);
        return res.status(200).json(new ApiResponse(200, { isLiked: false }, 'Like removed'));
    } else {
        await Like.create({
            comment: commentId,
            likedBy: req.user?._id
        });
        return res.status(200).json(new ApiResponse(200, { isLiked: true }, 'Like added'));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.find({ likedBy: req.user?._id, video: { $exists: true } }).populate('video');
    return res.status(200).json(new ApiResponse(200, likedVideos, 'Liked videos fetched successfully'));
});

export {
    toggleCommentLike,
    toggleVideoLike,
    getLikedVideos
};
