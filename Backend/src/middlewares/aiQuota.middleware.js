const userModel = require("../models/user.model")
const catchAsync = require("../utils/catchAsync")

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const checkAiQuota = catchAsync(async function checkAiQuota(req, res, next) {

    const limit = Number(process.env.DAILY_AI_LIMIT) || 20

    const user = await userModel.findById(req.user.id)

    const windowExpired = Date.now() - new Date(user.aiUsage.windowStart).getTime() > ONE_DAY_MS

    if (windowExpired) {
        user.aiUsage.count = 0
        user.aiUsage.windowStart = new Date()
    }

    if (user.aiUsage.count >= limit) {
        return res.status(429).json({
            message: `Daily AI usage limit of ${limit} reached. Please try again after 24 hours.`
        })
    }

    user.aiUsage.count += 1
    await user.save()

    next()
})

module.exports = { checkAiQuota }
