import Stripe from "stripe"
import Course from "../models/Course.js"
import { Purchase } from "../models/Purchase.js"
import User from "../models/User.js"
import { CourseProgress } from "../models/CourseProgress.js"

// Get User Data
export const getUserData = async (req, res) => {
    try {
        const userId = req.auth.userId
        const user = await User.findById(userId)

        if(!user) {
            return res.json({success: false, message: 'User not found'})
        }

        res.json({success: true, user})
    } catch (err) {
        res.json({success: false, message: err.message})
    }
}

// Users enrolled courses with Lecture links

export const userEnrolledCourses = async (req, res) => {
    try {
        const userId = req.auth.userId
        const userData = await User.findById(userId).populate('enrolledCourses')
        res.json({success: true, enrolledCourses: userData.enrolledCourses})
    } catch (err) {
        res.json({success: false, message: err.message})
    }
}

// Purchase course
export const purchaseCourse = async (req, res) => {
    try {
        const {courseId} = req.body
        const {origin} = req.headers
        const userId = req.auth.userId
        const userData = await User.findById(userId)
        const courseData = await Course.findById(courseId)

        if(!userData || !courseData) {
            return res.json({success: false, message: 'User or course not found'})
        }
        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
        }

        const newPurchase = await Purchase.create(purchaseData)

        // stripe gateway initialize
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
        const currency = process.env.CURRENCY.toLowerCase()

        // creating line items for stripe
        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount) * 100, 
            },
            quantity: 1,
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString(),
            }
        })

        res.json({success: true, session_url: session.url})
    }
    catch(err) {
        res.json({success: false, message: err.message})
    }
}

// Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {
    try {
        const {courseId, lectureId} = req.body
        const userId = req.auth.userId
        const progressData = await CourseProgress.findOne({userId, courseId})

        if(progressData) {
            if(progressData.lectureCompleted.includes(lectureId)) {
                return res.json({success: true, message: 'You have already completed this lecture'})
            }
            progressData.lectureCompleted.push(lectureId)
            await progressData.save()
        }
        else {
            await CourseProgress.create({userId, courseId, lectureCompleted: [lectureId]})

        }

        res.json({success: true, message: 'Lecture completed successfully / Progress Updated'})
    } catch (err) {
        res.json({success: false, message: err.message})
    }
}

// Get User Course Progress
export const getUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth.userId
        const {courseId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})
        res.json({success: true, progressData})
    } catch (err) {
        res.json({success: false, message: err.message})
    }
}

// Add User Ratings to course
export const addUserRating = async (req, res) => {
    
    const {courseId, rating} = req.body
    const userId = req.auth.userId
    if(!courseId || !userId || !rating || rating < 1 || rating > 5) {
        return res.json({success: false, message: 'Invalid data'})
    }

    try{
        const course = await Course.findById(courseId)
        if(!course) {
            return res.json({success: false, message: 'Course not found'})
        }

        const user = await User.findById(userId)
        if(!user || !user.enrolledCourses.includes(courseId)) {
            return res.json({success: false, message: 'User has not purchased this course'})
        }

        const existingRatingIndex = course.courseRatings.findIndex(rating => rating.userId === userId)
        if(existingRatingIndex > -1) {
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            course.courseRatings.push({userId, rating})
        }
        await course.save();

        res.json({success: true, message: 'Rating added successfully'}) 
    } catch(err) {
        res.json({success: false, message: err.message})
    }
}
