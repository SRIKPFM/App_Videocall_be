import callLogRoutes from '../routes/callLogRouters.js';
import loginRoutes from '../routes/loginRouters.js';
import contactRoutes from '../routes/contactRouters.js';

export const initiateApp = (expressApp) => {

    expressApp.use(loginRoutes);

    expressApp.use(callLogRoutes);

    expressApp.use(contactRoutes);
};