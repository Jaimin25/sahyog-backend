import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

import { UserVerification } from '../models/verificationModal.js';

import { baseurl } from './lib.js';

import 'dotenv/config';

export const sendVerificationMail = (sendTo, uid) => {
    const transporter = nodemailer.createTransport({
        host: 'mail.mail.ee',
        port: 465,
        secure: true,
        auth: {
            user: process.env.OFFICIAL_MAIL,
            pass: process.env.OFFICIAL_MAIL_PASSWORD,
        },
    });

    const token = jwt.sign(
        {
            data: { email: sendTo, uid: uid },
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '30m' }
    );

    const mailConfigurations = {
        from: process.env.OFFICIAL_MAIL,
        to: sendTo,
        subject: 'Email Verification',
        text: `Hi! There, You have recently created an account or asked for verification mail on our website.\n\nPlease follow the given link to verify your email\n\n${baseurl}/user/verify?token=${token}\n\nThe link will expire in 30 minutes\n\nThank You!`,
    };

    const checkBeforeSending = async (uid, sendTo) => {
        const verificationData = await UserVerification.findOne({
            uid,
            email: sendTo,
        });

        if (!verificationData) {
            const verification = await UserVerification.create({
                uid,
                email: sendTo,
            });
            if (verification) {
                transporter.sendMail(
                    mailConfigurations,
                    function (error, info) {
                        if (error) {
                            console.log(error);
                        }
                    }
                );
                return 'sent';
            }
        } else if (
            Math.floor(
                (new Date() -
                    new Date(verificationData.updatedAt)) /
                    60000
            ) > 2
        ) {
            verificationData.updatedAt = new Date();
            await verificationData.save();
            transporter.sendMail(
                mailConfigurations,
                function (error, info) {
                    if (error) {
                        console.log(error);
                    }
                }
            );
            return 'sent';
        } else {
            return 'cooldown';
        }
    };
    return checkBeforeSending(uid, sendTo);
};
