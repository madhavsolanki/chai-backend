import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while genarting refresh and Access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  /*
    Get User details from Frontend
    Validation - not empty 
    check if user already esists: username, email
    check for images, check for avatar
    upload them to cloudinary, avatar
    create user object - create entry in db
    remove password and refresh token field from from response 
    check for user creation
    return res
  */

  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All Fields Required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is Required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while saving the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  /*
      1. take data from request body
      2. validate username or email
      3. find user already exist is DB
      4. Check password is correct or not 
      5. Generate access token and refresh token 
      6. Send Secure cookie
    */

  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username and password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User Not Fopund");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Make access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user in the database
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    // Check if the incoming refresh token matches the user's stored refresh token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new tokens
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    // Update user's refresh token in the database
    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async(req, res)  => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect =  user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError("Inavlid Old Password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave:false})

  return res.status(200)
  .json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser= asyncHandler(async(req, res)=>{
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
  const {fullName, email} = req.body

  if(!fullName || !email){
    throw new ApiError(400,"All Fields are required")
  }

  User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email:email
      }
    },
    {new:true}
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200, user, "Account Details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res)=>{
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
      throw new ApiError(400, "Avatar file is Missing")
  }

  const avatar =await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Error while Uploading on Avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar:avatar.url
      }
    },
    {new:true}
  ).select("-password")

  return res.status(200)
  .json(
    new ApiResponse(200, user, "Avatar Image is Updated Successfully")
  )
}) 

const updateUserCoverOImage = asyncHandler(async(req, res)=>{
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
      throw new ApiError(400, "Cover Image file is Missing")
  }

  const coverImage =  await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(400, "Error while Uploading on Cover Image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {new:true}
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200,user, "Cover Image Updated successfully"))
}) 
export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken , 
  changeCurrentPassword, 
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverOImage
};
