import express from 'express';
import { ContactDetails } from '../models/contactsModels.js';

const router = express.Router();

router.post('/api/createNewContact', async (req, res) => {
    try {
        const { userId, fName, lName, idNum, birthday, mobNum, saveTo, saveAnyways } = req.body;
        const isUserExcist = await ContactDetails.findOne({ userId: userId });
        if (!isUserExcist) {
            const newContact = {
                userId: userId,
                userContactDetails: [
                    {
                        firstName: fName,
                        lastName: lName,
                        fullName: fName + (lName !== '' ? " " + lName : lName),
                        idNumber: idNum,
                        birthday: birthday,
                        mobNum: mobNum,
                        saveTo: saveTo
                    }
                ]
            }
            const createNewContact = await ContactDetails.create(newContact)
            .then((data) => { return res.status(200).json({ success: true, message: "Contact created successfully..", data: data })})
            .catch((error) => { return res.status(400).json({ success: false, error: "Faild to create contact this time. Please try again..!!" })});
        } else {
            const findUserNameExcist = isUserExcist.userContactDetails.find((data) => data.firstName === fName && data.lastName === lName );
            if (findUserNameExcist) {return res.status(400).json({ success: false, error: "Name already excist."})}
            const userContactDetails = {
                firstName: fName,
                lastName: lName,
                fullName: fName + (lName !== '' ? " " + lName : lName),
                idNumber: idNum,
                birthday: birthday,
                mobNum: mobNum,
                saveTo: saveTo
            };
            const addUserContact = isUserExcist.userContactDetails.push(userContactDetails);
            await isUserExcist.save()
            .then((data) => { return res.status(200).json({ success: true, message: "Contact added successfully..", data: data })})
            .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getUserContacts', async ( req, res ) => {
    try {
        const { userId } = req.body;
        const getAllContacts = await ContactDetails.findOne({ userId: userId });
        if (getAllContacts) {
            return res.status(200).json({ success: true, data: getAllContacts.userContactDetails });
        } 
        return res.status(404).json({ success: false, error: "Can't find any contact details." });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/getUserUniqueContact', async (req, res) => {
    try {
        const { userId, idNum } = req.body;
        const getUserContacts = await ContactDetails.findOne({ userId: userId });
        if (!getUserContacts && getUserContacts.userContactDetails.length === 0) {
            return res.status(404).json({ success: fasle, error: "Can't find user contact details." });
        }
        const getUserUniqueContact = getUserContacts.userContactDetails.filter((data) => data.idNumber === idNum );
        if (!getUserUniqueContact) {
            return res.status(404).json({ success: false, error: "Can't find that unique contact.." });
        }
        return res.status(200).json({ success: true, data: getUserUniqueContact });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/api/removeContact', async (req, res) => {
    try {
        const { userId, idNum, userName } =  req.body;
        const getUserContact = await ContactDetails.findOne({ userId: userId });
        if (!getUserContact) { return res.status(404).json({ success: false, error: "This user don't have a contact..!!" })};
        const filterContact = getUserContact.userContactDetails.filter((data) => data.fullName !== userName || data.idNumber !== idNum );
        getUserContact.userContactDetails = filterContact;
        getUserContact.save()
        .then(() => { return res.status(200).json({ success: true, message: "Contact removed successfully.." })})
        .catch((error) => { return res.status(400).json({ success: false, error: error.message })});
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router;