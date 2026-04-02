const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { verifyToken } = require('../middleware/auth');
const { authLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');

const validate = require('../middleware/validate');
const { 
    registrationSchema, 
    loginSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema,
    profileUpdateSchema
} = require('../schemas/auth.schema');

// Public routes
router.post('/register', authLimiter, validate(registrationSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', resetPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verify-email', authLimiter, authController.resendVerifyEmail);

// Policy routes (Public reading)
router.get('/policies/current', authController.getCurrentPoliciesHandler);
router.get('/policies/:slug', authController.getPolicyHandler);

// Protected routes (Require auth)
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.getMe);
router.post('/profile', verifyToken, validate(profileUpdateSchema), authController.updateProfile);
router.post('/confirm-fiscal-name', verifyToken, authController.confirmFiscalName);
router.post('/policies/accept', verifyToken, authController.acceptPolicies);
router.post('/onboarding/complete', verifyToken, authController.completeOnboarding);

module.exports = router;
