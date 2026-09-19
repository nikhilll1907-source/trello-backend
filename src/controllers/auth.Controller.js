import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../services/nodemailer.helper.js';
import { getVerificationHtml } from '../services/getHtml/verification.html.js';
import { getForgotPasswordHtml } from '../services/getHtml/forgotPassword.html.js';
const isProduction = process.env.NODE_ENV === 'production';
export const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
});

export const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

export const createOtpPayload = async () => {
  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(String(otp), 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  return { otp, otpHash, otpExpiresAt };
};

export const compareOtpCode = async (otp, otpHash) => {
  if (!otp || !otpHash) {
    return false;
  }

  try {
    return await bcrypt.compare(String(otp), otpHash);
  } catch (error) {
    return false;
  }
};

const sendAuthenticationEmail = async (email, otp) => {
  const html = getVerificationHtml(otp);

  return await sendEmail(
    email,
    "Email Verification OTP",
    `Your email verification OTP is ${otp}`,
    html
  );
};
const sendForgotPasswordEmail = async (email, otp) => {
  const html = getForgotPasswordHtml(otp);

  return await sendEmail(
    email,
    "Password Reset OTP",
    `Your password reset OTP is ${otp}`,
    html
  );
};

// signup
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = name || email.split('@')[0];

    const user = await User.create({
      name: displayName,
      email,
      password: hashedPassword,
      emailVerified: false,
    });

    const { otp, otpHash, otpExpiresAt } = await createOtpPayload();
    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

   await sendAuthenticationEmail(user.email, otp);

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, getCookieOptions());

    return res.status(201).json({
      message: 'User created successfully. Please verify your email with the OTP sent to your mail.',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, emailVerified: user.emailVerified },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

//login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
      });
    }

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('refreshToken', refreshToken, getCookieOptions());
    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, emailVerified: user.emailVerified },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// logout
export const logout = (req, res) => {
  try {
    res.clearCookie('refreshToken', getCookieOptions());
    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    return res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};

// get access token
export const getAccessToken = (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshTokenNew = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('refreshToken', refreshTokenNew, getCookieOptions());
    return res.status(200).json({ accessToken });
  } catch (error) {
    return res.status(500).json({ message: 'Error getting access token', error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { otp, otpHash, otpExpiresAt } = await createOtpPayload();

    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    user.passwordResetVerified = false;
    await user.save();

    await sendForgotPasswordEmail(user.email, otp);

    return res.status(200).json({
      message: 'OTP sent to your email. Please verify it to reset your password.',
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error sending password reset OTP', error: error.message });
  }
};

export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValidOtp = await compareOtpCode(otp, user.otpHash);
    if (!isValidOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.otpHash = null;
    user.otpExpiresAt = null;
    user.passwordResetVerified = true;
    await user.save();

    return res.status(200).json({
      message: 'OTP verified successfully. You can now reset your password.',
      email: user.email,
      canResetPassword: true,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error verifying password reset OTP', error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.passwordResetVerified) {
      return res.status(403).json({ message: 'Please verify the OTP before resetting your password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetVerified = false;
    await user.save();

    return res.status(200).json({
      message: 'Password reset successfully',
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, userId, otp } = req.body;

    const user = userId ? await User.findById(userId) : await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'No OTP found for this user. Please request a new code.' });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      await user.save();
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValidOtp = await compareOtpCode(otp, user.otpHash);
    if (!isValidOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.emailVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully',
      user: { id: user._id, email: user.email, emailVerified: user.emailVerified },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error verifying email', error: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email, userId } = req.body;

    const user = userId ? await User.findById(userId) : await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
    return res.status(400).json({
        message: "Email is already verified",
    });
}

    const { otp, otpHash, otpExpiresAt } = await createOtpPayload();


    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    user.emailVerified = false;
    await user.save();

   await sendAuthenticationEmail(user.email, otp);

    return res.status(200).json({
      message: 'A new OTP has been sent to the email address provided.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

