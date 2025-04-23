import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';
// import serviceAccount from './firebase-adminsdk.json' assert { type: 'json' };

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const serviceAccount = JSON.parse(await fs.readFile(new URL('./firebase-adminsdk.json', import.meta.url)));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "videocallactivity-fafbb.appspot.com"
});

export const bucket = admin.storage().bucket();

export default admin;