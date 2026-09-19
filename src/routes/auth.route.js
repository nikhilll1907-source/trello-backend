import express from 'express';
export const authRouter = express.Router();

import {
  signup,
  login,
  logout,
  getAccessToken,
  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,
  verifyEmail,
  resendOtp,
} from '../controllers/auth.Controller.js';

authRouter.post('/signup', signup);
authRouter.post('/register', signup);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/access-token', getAccessToken);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/verify-forgot-password-otp', verifyForgotPasswordOtp);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-otp', resendOtp);

