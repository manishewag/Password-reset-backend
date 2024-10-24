import ejs from "ejs";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import { dirname } from "path";

const currentFilePath = import.meta.url;
const currentDirectory = dirname(fileURLToPath(currentFilePath));

import dotenv from "dotenv";
dotenv.config();

// Mail configure
const mail = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PWD,
    },
  });

 async function sendPasswordResetLink(email, token, name) {
    try {
        const renderedcontent = await ejs.renderFile(
            `${currentDirectory}/../template/reset_pwd.ejs`,
            { token, name}
        );
        const mailOptions = {
            from: process.env.NODEMAILER_USER, // sender address
            to: email, // list of receivers
            subject: "Password reset link", // Subject line
            html: renderedcontent, // html body
          };
          const verificationInfo = await mail.sendMail(mailOptions);
          return verificationInfo;
    }
    catch (error) {
      console.log(error)
        return { error };
    }

 }

 export {sendPasswordResetLink}
