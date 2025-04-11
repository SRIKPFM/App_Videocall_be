import callLogRoutes from '../routes/callLogRouters.js';
import loginRoutes from '../routes/loginRouters.js';
import contactRoutes from '../routes/contactRouters.js';
import agoraRoutes from '../routes/agoraRouters.js'

export const initiateApp = (expressApp) => {

    expressApp.use(loginRoutes);

    expressApp.use(callLogRoutes);

    expressApp.use(contactRoutes);

    expressApp.use(agoraRoutes);
};