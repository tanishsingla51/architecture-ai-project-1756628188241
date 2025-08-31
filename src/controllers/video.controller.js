import mongoose, { isValidObjectId } from 'mongoose';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];

    if (query) {
        pipeline.push({
            $search: {
                index: 'search-videos',
                text: {
                    query: query,
                    path: ['title', 'description']
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, 'Invalid userId');
        }
        pipeline.push({ $match: { owner: new mongoose.Types.ObjectId(userId) } });
    }

    pipeline.push({ $match: { isPublished: true } });

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerDetails',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: '$ownerDetails'
        }
    );

    const videoAggregate = Video.aggregate(pipeline);
    const options = { page: parseInt(page, 10), limit: parseInt(limit, 10) };

    const videos = await Video.aggregatePaginate(videoAggregate, options);

    return res.status(200).json(new ApiResponse(200, videos, 'Videos fetched successfully'));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if ([title, description].some((field) => field?.trim() === '')) {
        throw new ApiError(400, 'All fields are required');
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, 'Video file is required');
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, 'Thumbnail file is required');
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(500, 'Video file upload failed');
    }

    if (!thumbnail) {
        throw new ApiError(500, 'Thumbnail upload failed');
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user?._id,
        isPublished: true
    });

    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new ApiError(500, 'Video upload failed, please try again');
    }

    return res.status(201).json(new ApiResponse(201, video, 'Video uploaded successfully'));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId');
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    return res.status(200).json(new ApiResponse(200, video, 'Video fetched successfully'));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId');
    }

    if (!(title || description || thumbnailLocalPath)) {
        throw new ApiError(400, 'At least one field to update is required');
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to update this video');
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;

    if (thumbnailLocalPath) {
        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!newThumbnail.url) {
            throw new ApiError(500, 'Thumbnail upload failed');
        }
        updateFields.thumbnail = newThumbnail.url;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedVideo, 'Video updated successfully'));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId');
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete this video');
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, {}, 'Video deleted successfully'));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId');
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to toggle publish status');
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: { isPublished: !video.isPublished } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, 'Publish status toggled successfully'));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
