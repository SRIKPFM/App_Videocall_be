import callLogRoutes from '../routes/callLogRouters.js';
import userRoutes from '../routes/userRouters.js';
import contactRoutes from '../routes/contactRouters.js';
import agoraRoutes from '../routes/agoraRouters.js';
import fcmRoutes from '../routes/fcmRouters.js';
import messageRoutes from '../routes/MessageRouters.js';
import cloudinaryRoutes from '../routes/cloudinary.js';
import tdlRoutes from '../routes/todolistRouters.js';

export const initiateApp = (expressApp) => {

    expressApp.use(userRoutes);

    expressApp.use(callLogRoutes);

    expressApp.use(contactRoutes);

    expressApp.use(agoraRoutes);

    expressApp.use(fcmRoutes);

    expressApp.use(messageRoutes);

    expressApp.use(cloudinaryRoutes);

    expressApp.use(tdlRoutes);
};