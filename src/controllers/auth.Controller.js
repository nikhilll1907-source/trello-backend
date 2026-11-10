import { respondToUseCaseError } from "./controllerError.js";
import {
  forgotPassword as forgotPasswordUseCase,
  getAccessToken as getAccessTokenUseCase,
  login as loginUseCase,
  resendOtp as resendOtpUseCase,
  resetPassword as resetPasswordUseCase,
  signup as signupUseCase,
  verifyEmail as verifyEmailUseCase,
  verifyForgotPasswordOtp as verifyForgotPasswordOtpUseCase,
} from "../usecases/auth.usecase.js";

const isProduction = process.env.NODE_ENV === "production";

export const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
});

export const signup = async (req, res) => {
  try {
    const result = await signupUseCase(req.body);
    res.cookie("refreshToken", result.refreshToken, getCookieOptions());

    return res.status(201).json({
      message:
        "User created successfully. Please verify your email with the OTP sent to your mail.",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error creating user");
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUseCase(req.body);
    res.cookie("refreshToken", result.refreshToken, getCookieOptions());

    return res.status(200).json({
      message: "Login successful",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error logging in");
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("refreshToken", getCookieOptions());
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error logging out");
  }
};

export const getAccessToken = async (req, res) => {
  try {
    const result = await getAccessTokenUseCase({
      refreshToken: req.cookies?.refreshToken,
    });
    res.cookie("refreshToken", result.refreshToken, getCookieOptions());
    return res.status(200).json({ accessToken: result.accessToken });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error getting access token");
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = await forgotPasswordUseCase(req.body);
    return res.status(200).json({
      message: "OTP sent to your email. Please verify it to reset your password.",
      email,
    });
  } catch (error) {
    return respondToUseCaseError(
      res,
      error,
      "Error sending password reset OTP"
    );
  }
};

export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const result = await verifyForgotPasswordOtpUseCase(req.body);
    return res.status(200).json({
      message: "OTP verified successfully. You can now reset your password.",
      email: result.email,
      canResetPassword: result.canResetPassword,
    });
  } catch (error) {
    return respondToUseCaseError(
      res,
      error,
      "Error verifying password reset OTP"
    );
  }
};

export const resetPassword = async (req, res) => {
  try {
    const user = await resetPasswordUseCase(req.body);
    return res.status(200).json({
      message: "Password reset successfully",
      user,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error resetting password");
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const user = await verifyEmailUseCase(req.body);
    return res.status(200).json({
      message: "Email verified successfully",
      user,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error verifying email");
  }
};

export const resendOtp = async (req, res) => {
  try {
    await resendOtpUseCase(req.body);
    return res.status(200).json({
      message: "A new OTP has been sent to the email address provided.",
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Error resending OTP");
  }
};
