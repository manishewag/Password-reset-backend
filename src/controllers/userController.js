import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";
import { sendPasswordResetLink } from "../utils/resetPassword.js";
import jwt from "jsonwebtoken";


const createUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  console.log(name, email, password);
  // validation
  if (!name || !email || !password) {
    res.status(400);
    const err = new Error("Please provide name, email and password");
    return next(err);
  }

  if (password.length < 8) {
    res.status(400);
    const err = new Error("Password must be atleast 8 charecters");
    return next(err);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    const err = new Error("Invalid email address");
    return next(err);
  }

  try {
    // const userExists = await User.findOne({ email });
    // if (userExists) {
    //   res.status(400);
    //   const err = new Error(
    //     "Email is already registered. Please use a different email address"
    //   );
    //   return next(err);
    // }

    // hash logic

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      generateToken(res, user._id);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
      });
    }
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      res.status(400);
      const err = new Error(
        "Email is already registered. Please use a different email address..."
      );
      return next(err);
    }
    res.status(500).json({ error: error.message } || "Internal server error");
  }
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.checkPassword(password))) {
    generateToken(res, user._id);
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  console.log(email, password);
});

const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out.." });
});


const getProfile = asyncHandler(async (req, res) => {
  const user = {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
  };
  res.status(200).json(user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (password && password.length < 8) { //check for password if present
    res.status(400); 
    throw new Error("Password must be atleast 8 charecters");
  }

  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    if (password) {
      user.password = password;
    }
    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } else {
    res.status(404);
    throw new Error("User not found.");
  }
});

const forgotPassword = asyncHandler(async(req, res, next) => {
  const {email} = req.body;
  if(!email) {
    const err = new Error("Email is required")
    res.status(404);
    return next(err);
  }
  // check user 
  const user = await User.findOne({ email });
  if(!user) {
    const err = new Error("Invalid email address");
    res.status(404);
    return next(err);
  }
  // user found - generate token
  const token = jwt.sign({ userId: user._id}, process.env.JWT_SECRET_KEY, {
    expiresIn: 300,
  });
  const date = new Date();
  const newMinutes = date.getMinutes() + 5;
  date.setMinutes(newMinutes);
  user.reset_password_token = token
  user.reset_password_expiration = date
  await user.save();
  // send mail
  const verificationEmailResponse = await sendPasswordResetLink(
    email,
    token,
    user.name
  );
  if (verificationEmailResponse.error) {
    const err = new Error(
      "Failed to send  reset password link, pleace try later"
    );
    res.statusCode = 500;
    return next(err);
  }
  res.status(200)
  res.json({ message:"Reset password link send, pleace check your email"});
});

const resetPassword = asyncHandler(async(req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!token) {
    const err = new Error("Invalid token");
    res.statusCode = 500;
    return next(err);
  }
  if (!password) {
    const err = new Error("Bad request, password is missing");
    res.statusCode = 400;
    return next(err);
  }
  const user = await User.findOne({
    reset_password_token: token,
    reset_password_expiration: { $gt: Date.now()},
  });
  if (!user) {
    const err = new Error(
      " Reset password link is expired, please try again"
    );
    res.statusCode = 404;
    return next(err);
  }
  // user found
  user.password = password;
  user.reset_password_token = undefined;
  user.reset_password_expiration = undefined;
  await user.save();
  res.status(200).json({
    message: "Password updated successfully. please login to continue",
  });
});


export { createUser, login, logout, getProfile, updateProfile, forgotPassword, resetPassword };
