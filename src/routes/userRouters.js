import express from 'express';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UserLoginCredentials } from '../models/loginModels.js';
import { ContactDetails } from '../models/contactsModels.js';
import { generateToken, getFolderByMimeType, getUserDataFromToken, getUserIdFromToken } from '../Helper/helper.js';
import { authendicate } from '../middleware/middleware.js';

const router = express.Router();

cloudinary.config({
    cloud_name: "divinwelb",
    api_key: "731699916219541",
    api_secret: "4VIx6OnQAaDr3tQjdHpaFgRWOdA"
});

const upload = multer({ dest: 'temp/' });

router.get('/api/checkServer', async (req, res) => {
    console.log("Server is running...");
});

router.post('/api/userRegister', upload.single('profile'), async (req, res) => {
    try {
        const { userId, userName, email, password, confirmPassword } = req.body;

        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId, email: email });
        if (isUserExcist) {
            return res.status(400).json({ success: false, error: "This email already registered.." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, error: "Passwords do not match." });
        }

        let profilePicUrl = null;

        if (req.file) {
            const filePath = req.file.path;
            const mimetype = req.file.mimetype;

            const folder = getFolderByMimeType(mimetype);

            const originalNameWithExt = path.parse(req.file.originalname);

            const result = await cloudinary.uploader.upload(filePath, {
                resource_type: 'image',
                folder: `ProfilePicture/Individual/${userName}-${userId}`,
                public_id: `${userName}.${userId}_profilePic`
            });

            fs.unlinkSync(filePath);

            profilePicUrl = result.secure_url;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userStructure = new UserLoginCredentials({
            userId: userId,
            userName: userName,
            email: email,
            password: hashedPassword,
            fcmToken: null,
            isLoggedin: false,
            passwordForArchive: null,
            profilePicUrl: profilePicUrl
        })
        await userStructure.save()
            .then(() => { return res.status(200).json({ success: true, message: "User register successfully.." }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/userLoginOrLogout', async (req, res) => {
    try {
        const { type, email, password } = req.body;
        const isUser = await UserLoginCredentials.findOne({ email: email });
        if (!isUser) {
            return res.status(404).json({ success: false, error: "Couldn't find any user using this email. Enter a valid mail." });
        } else if (type === 'login') {
            console.log(isUser.password)
            const unHashPassword = await bcrypt.compare(password, isUser.password);
            console.log(unHashPassword)
            if (unHashPassword === true) {
                isUser.isLoggedin = true;
                await isUser.save();
                const data = {
                    userId: isUser.userId
                }
                const token = generateToken(data);
                return res.status(200).json({ success: true, message: "User loggedin successfully..", userId: isUser.userId, token: token });
            }
            return res.status(404).json({ success: false, error: "Please enter the correct details." });
        } else if (type === "logout") {
            isUser.isLoggedin = false;
            await isUser.save();
            return res.status(200).json({ success: true, message: "User loggedout successfully..", userId: isUser.userId });
        } else {
            return res.status(400).json({ success: false, message: "Please enter the valid type value.." });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getUser', async (req, res) => {
    try {
        const { userId } = req.body;
        const findUserData = await UserLoginCredentials.findOne({ userId: userId });
        if (!findUserData) {
            return res.status(404).json({ success: false, error: "User not found..!!" });
        }
        return res.status(200).json({ success: true, data: findUserData });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateUserDetails', authendicate, upload.single('file'), async (req, res) => {
    try {
        const token = req.header('Authorization');
        if (!token) {
            return res.status(400).json({ success: false, error: "Token required..!!" });
        }
        const userId = await getUserIdFromToken(token);
        const updates = req.body;

        const findUserData = await UserLoginCredentials.findOne({ userId: userId });
        if (!findUserData) {
            return res.status(404).json({ success: false, error: "Can't find user details." });
        }

        if (req.file) {
            if (findUserData.profilePicUrl) {
                const publicId = findUserData.profilePicUrl.split('/').slice(-1)[0].split('.')[0];
                console.log(publicId);

                await cloudinary.uploader.destroy(
                    `ProfilePicture/Individual/${findUserData.userName}-${findUserData.userId}/${publicId}`,
                    { resource_type: 'image' }
                );
            }

            const filePath = req.file.path;
            const result = await cloudinary.uploader.upload(filePath, {
                resource_type: 'image',
                folder: `ProfilePicture/Individual/${findUserData.userName}-${findUserData.userId}`,
                public_id: `${findUserData.userName}-${findUserData.userId}_profilePic`
            });

            fs.unlinkSync(filePath);

            updates.profilePicUrl = result.secure_url;
        }
        delete updates.file;
        delete updates.userId;

        const updateUserDetails = await UserLoginCredentials.findOneAndUpdate({ userId: userId }, { $set: updates }, { new: true });
        if (!updateUserDetails) {
            return res.status(400).json({ success: false, error: "Can't update user details." });
        }
        return res.status(200).json({ success: true, message: "User details successfully updated..!!" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/sendFcmTokenToBackend', authendicate, async (req, res) => {
    try {
        const { token } = req.body;
        const loginToken = req.header('Authorization');
        const userData = await getUserDataFromToken(loginToken);
        if (!token || !loginToken) { return res.status(404).json({ success: false, error: "Token is missing..!!" }) };
        const updateToken = await UserLoginCredentials.findOneAndUpdate({ userId: userData.userId }, { $set: { fcmToken: token } });
        if (updateToken) { return res.status(200).json({ success: true, message: "Token stored successfully.." }) };
        return res.status(400).json({ success: false, error: "Error occured while storing token.." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/pinUser', async (req, res) => {
    try {
        const { userName } = req.body;
        const token = req.header('Authorization');
        if (!token) {
            return res.status(400).json({ success: false, error: "Token is missing...." })
        }
        const userData = await getUserDataFromToken(token);
        const isUserExcist = await UserLoginCredentials.findOne({ userId: userData.userId });
        if (!isUserExcist) {
            return res.status(404).json({ success: false, error: "User not found..!!" });
        } else {
            const findUserContact = await ContactDetails.findOne({ userId: userData.userId });
            if (!findUserContact) { return res.status(404).json({ success: false, error: "There is no contacts for this user..!!" }) }
            const getSpecificUser = findUserContact.userContactDetails.find((data) => data.fullName === userName)
            if (!getSpecificUser) { return res.status(404).json({ success: false, error: "There is no User in your contact..!!" }) }
            const pinUser = {
                userName: getSpecificUser.fullName,
                userId: getSpecificUser.idNumber
            }
            isUserExcist.pinedUsers.push(pinUser);
            isUserExcist.save()
                .then(() => { return res.status(200).json({ success: true, message: "User pined successfully..!!" }) })
                .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
        }
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/api/unPinUser', async (req, res) => {
    try {
        const { userId, userName, idNumber } = req.body;
        const token = req.header('Authorization');
        if (!token) {
            return res.status(400).json({ success: false, error: "Token is missing.." });
        }
        const userData = await getUserDataFromToken(token);
        const isUserPined = userData.pinedUsers.filter((data) => data.userName !== userName && data.userId !== idNumber);
        userData.pinedUsers = isUserPined;
        userData.save();
        return res.status(200).json({ success: true, message: "User unpined successfully.." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/lockUserChat', authendicate, async (req, res) => {
    try {
        const { userIdForLock, userName, password } = req.body;
        const token = req.header('Authorization');
        const userData = await getUserDataFromToken(token);
        // const isUserExcist = await UserLoginCredentials.findOne({ userId: userData.userId });
        if (!userData) {
            return res.status(404).json(userData);
        }
        const userContactDetail = await ContactDetails.findOne({ userId: userData.userId });
        const isReceiverExcist = userContactDetail.userContactDetails.find((data) => data.idNumber === userIdForLock);
        if (!isReceiverExcist) {
            return res.status(404).json({ success: false, error: "Receiver not in the user's contact list..!!" });
        }
        const isUserChatLocked = isUserExcist.lockedUserChat.find((data) => data.userId === userIdForLock);
        if (isUserChatLocked) { return res.status(400).json({ success: false, error: "Already you have locked this user chat..!!" }) }
        if (password.toString().split('').length === 4) {
            const hashPassword = await bcrypt.hash(password.toString(), 10);
            const newLockEntry = {
                userName: userName,
                userId: userIdForLock,
                password: hashPassword
            }
            const addUserToChatLock = isUserExcist.lockedUserChat.push(newLockEntry);
            isUserExcist.save()
                .then(() => { return res.status(200).json({ success: true, message: "User Chat Locked successfully..!!" }) })
                .catch((error) => { return res.status(400).json({ success: false, error: error.message }) })
        }
        return res.status(400).json({ success: false, error: "The password must be a 4-digit number." })
    } catch (error) {
        return res.status(500).json({ success: true, error: error.message });
    }
});

router.post('/api/unlockUserChat', authendicate, async (req, res) => {
    try {
        const { userIdForLock, password } = req.body;
        const token = req.header('Authorization');
        const userData = await getUserDataFromToken(token);
        const userDetails = await UserLoginCredentials.findOne({ userId: userData.userId });
        const isUserChatLocked = userDetails.lockedUserChat.find((data) => data.userId === userIdForLock);
        if (!isUserChatLocked) {
            return res.status(400).json({ success: false, error: "This user chat hasn't locked yet..!!" })
        }
        const hashedPassword = await bcrypt.compare(password, isUserChatLocked.password);
        if (!hashedPassword) {
            return res.status(400).json({ success: false, error: "Please enter the correct pin..!!" });
        }
        return res.status(200).json({ success: true, message: "You have successfully unlocked.." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getAllChatLockedUser', authendicate, async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userData = await getUserDataFromToken(token);
        const getAllChatLockedUser = await UserLoginCredentials.findOne({ userId: userData.userId });
        if (!getAllChatLockedUser) { return res.status(404).json({ success: true, error: "Usern't found.." }) }
        return res.status(200).json({ success: true, data: getAllChatLockedUser.lockedUserChat });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/createOrChangeArchivePassword', authendicate, async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        const token = req.header('Authorization');
        const userData = await getUserDataFromToken(token);
        const isUserExcist = await UserLoginCredentials.findOne({ userId: userData.userId });
        if (!isUserExcist) { return res.status(404).json({ success: false, error: "User not found..!!" }) };
        const hashedPassword = await bcrypt.hash(password, 10);
        if (isUserExcist.passwordForArchive === null) {
            if (password === confirmPassword) {
                isUserExcist.passwordForArchive = hashedPassword
            }
        } else {
            const unHashPassword = await bcrypt.compare(password, isUserExcist.passwordForArchive)
            if (unHashPassword === true) {
                return res.status(400).json({ success: false, error: "The new password can't same as old password..!!" });
            } else {
                isUserExcist.passwordForArchive = hashedPassword
            }
        }
        await isUserExcist.save()
            .then(() => { return res.status(200).json({ success: true, message: "Password created or changed successfully..!!" }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/addUserIntoArchive', async (req, res) => {
    try {

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/updateOnlineStatus', authendicate, async (req, res) => {
    try {
        const { userId, status } = req.body;
        const token = req.header('Authorization');
        const userData = await getUserDataFromToken(token);
        const isUserExcist = await UserLoginCredentials.findOne({ userId: userData.userId });
        if (!isUserExcist) { return res.status(404).json({ success: false, error: "User not found..!!" }) };
        isUserExcist.status = status;
        await isUserExcist.save()
            .then(() => { return res.status(200).json({ success: true, message: "User status updated successfully..!!" }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/addFavoriteUser', authendicate, async (req, res) => {
    try {
        const { favoriteUserId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        if (!isUserExcist) {
            return res.status(404).json({ success: false, error: "User not found..!!" });
        }
        if (isUserExcist.favoritedUser.length !== 0) {
            isUserExcist.favoritedUser = [...isUserExcist.favoritedUser, ...favoriteUserId]
        } else {
            isUserExcist.favoritedUser = favoriteUserId;
        }
        await isUserExcist.save()
            .then(() => { return res.status(200).json({ success: true, message: "Favorite user added successfully.." }) })
            .catch((error) => { return res.status(400).json({ success: false, error: error.message }) });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/removeFavoriteUser', authendicate, async (req, res) => {
    try {
        const { removeUserId } = req.body;
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        if (!isUserExcist) {
            return res.status(404).json({ success: false, error: "User not found..!!" });
        }
        const result = await UserLoginCredentials.updateOne({ userId: userId }, { $pull: { favoritedUser: { $in: removeUserId } } });
        if (result.modifiedCount === 0) {
            return res.status(400).json({ success: false, error: "Can't remove favorite user.." });
        }
        return res.status(200).json({ success: true, message: "Favorite user removed successfully.." })
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getFavoriteUsers', authendicate, async (req, res) => {
    try {
        const token = req.header('Authorization');
        const userId = await getUserIdFromToken(token);

        const isUserExcist = await UserLoginCredentials.findOne({ userId: userId });
        if (!isUserExcist) {
            return res.status(404).json({ success: false, error: "User not found..!!" });
        }
        return res.status(200).json({ success: true, favoriteUserId: isUserExcist.favoritedUser });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;