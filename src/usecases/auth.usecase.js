import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { sendEmail } from "../services/nodemailer.helper.js";
import { getVerificationHtml } from "../services/getHtml/verification.html.js";
import { getForgotPasswordHtml } from "../services/getHtml/forgotPassword.html.js";
import { UseCaseError } from "./usecase.helpers.js";

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createTokenPair = (userId, rememberMe = false) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" }),
  refreshToken: jwt.sign(
    { userId, rememberMe },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL_MS / 1000 }
  ),
  rememberMe,
});

export const generateOtpCode = () =>
  Math.floor(100000 + Math.random() * 900000);

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

  return bcrypt.compare(String(otp), otpHash);
};

const sendAuthenticationEmail = async (email, otp) =>
  sendEmail(
    email,
    "Email Verification OTP",
    `Your email verification OTP is ${otp}`,
    getVerificationHtml(otp)
  );

const sendForgotPasswordEmail = async (email, otp) =>
  sendEmail(
    email,
    "Password Reset OTP",
    `Your password reset OTP is ${otp}`,
    getForgotPasswordHtml(otp)
  );

export const signup = async ({ name, email, password }) => {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !email ||
    typeof password !== "string" ||
    !password
  ) {
    throw new UseCaseError("Name, email, and password are required", 400);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new UseCaseError("User already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email,
    password: hashedPassword,
    emailVerified: false,
  });

  const { otp, otpHash, otpExpiresAt } = await createOtpPayload();
  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();
  await sendAuthenticationEmail(user.email, otp);

  return {
    ...createTokenPair(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  };
};

export const login = async ({ email, password, rememberMe = false }) => {
  if (typeof rememberMe !== "boolean") {
    throw new UseCaseError("Remember me preference must be a boolean", 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new UseCaseError("User not found", 400);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UseCaseError("Invalid password", 400);
  }

  if (!user.emailVerified) {
    throw new UseCaseError("Please verify your email before logging in.", 403);
  }

  return {
    ...createTokenPair(user._id, rememberMe),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  };
};

export const getAccessToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new UseCaseError("Refresh token required", 401);
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  const rememberMe = decoded.rememberMe === true;
  const tokens = createTokenPair(decoded.userId, rememberMe);
  return tokens;
};

export const forgotPassword = async ({ email }) => {
  if (!email) {
    throw new UseCaseError("Email is required", 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new UseCaseError("User not found", 404);
  }

  const { otp, otpHash, otpExpiresAt } = await createOtpPayload();
  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.passwordResetVerified = false;
  await user.save();
  await sendForgotPasswordEmail(user.email, otp);

  return { email: user.email };
};

export const verifyForgotPasswordOtp = async ({ email, otp }) => {
  if (!email || !otp) {
    throw new UseCaseError("Email and OTP are required", 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new UseCaseError("User not found", 404);
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new UseCaseError("No OTP found. Please request a new one.", 400);
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    await user.save();
    throw new UseCaseError("OTP has expired. Please request a new one.", 400);
  }

  if (!(await compareOtpCode(otp, user.otpHash))) {
    throw new UseCaseError("Invalid OTP", 400);
  }

  user.otpHash = null;
  user.otpExpiresAt = null;
  user.passwordResetVerified = true;
  await user.save();

  return { email: user.email, canResetPassword: true };
};

export const resetPassword = async ({ email, newPassword }) => {
  if (!email || !newPassword) {
    throw new UseCaseError("Email and new password are required", 400);
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw new UseCaseError("Password must be at least 6 characters long", 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new UseCaseError("User not found", 404);
  }

  if (!user.passwordResetVerified) {
    throw new UseCaseError(
      "Please verify the OTP before resetting your password.",
      403
    );
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordResetVerified = false;
  await user.save();

  return { id: user._id, email: user.email };
};

export const verifyEmail = async ({ email, userId, otp }) => {
  const user = userId
    ? await User.findById(userId)
    : await User.findOne({ email });

  if (!user) {
    throw new UseCaseError("User not found", 404);
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw new UseCaseError(
      "No OTP found for this user. Please request a new code.",
      400
    );
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    user.otpHash = null;
    user.otpExpiresAt = null;
    await user.save();
    throw new UseCaseError("OTP has expired. Please request a new one.", 400);
  }

  if (!(await compareOtpCode(otp, user.otpHash))) {
    throw new UseCaseError("Invalid OTP", 400);
  }

  user.emailVerified = true;
  user.otpHash = null;
  user.otpExpiresAt = null;
  await user.save();

  return {
    id: user._id,
    email: user.email,
    emailVerified: user.emailVerified,
  };
};

export const resendOtp = async ({ email, userId }) => {
  const user = userId
    ? await User.findById(userId)
    : await User.findOne({ email });

  if (!user) {
    throw new UseCaseError("User not found", 404);
  }

  if (user.emailVerified) {
    throw new UseCaseError("Email is already verified", 400);
  }

  const { otp, otpHash, otpExpiresAt } = await createOtpPayload();
  user.otpHash = otpHash;
  user.otpExpiresAt = otpExpiresAt;
  user.emailVerified = false;
  await user.save();
  await sendAuthenticationEmail(user.email, otp);

  return { success: true };
};
