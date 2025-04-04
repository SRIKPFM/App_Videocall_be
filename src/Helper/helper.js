import callLogRoutes from '../routes/callLogRouters.js';
import loginRoutes from '../routes/loginRouters.js';

export const initiateApp = (expressApp) => {

    expressApp.use(loginRoutes);

    expressApp.use(callLogRoutes)
};