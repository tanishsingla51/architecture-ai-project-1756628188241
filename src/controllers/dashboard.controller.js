import mongoose from 'mongoose';
import { Video } from '../models/video.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Like } from '../models/like.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    const videoStats = await Video.aggregate([
        { $match: { owner: userId } },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes'
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: '$views' },
                totalLikes: { $sum: { $size: '$likes' } }
            }
        }
    ]);

    const stats = {
        totalSubscribers,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0
    };

    return res.status(200).json(new ApiResponse(200, stats, 'Channel stats fetched successfully'));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const videos = await Video.find({ owner: userId });

    if (!videos) {
        throw new ApiError(404, 'No videos found for this channel');
    }

    return res.status(200).json(new ApiResponse(200, videos, 'Channel videos fetched successfully'));
});

export {
    getChannelStats,
    getChannelVideos
};
