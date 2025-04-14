import admin from 'firebase-admin';
import serviceAccount from './permanentid-a6ff3-firebase-adminsdk-fbsvc-f4dbed2254.json' assert { type: 'json' };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export default admin;