const { Resend } = require('resend');

const sendEmail = async (to, subject, html, text = '') => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'quickwatch@resend.dev';

    if (!apiKey) {
        console.error('Error sending email: RESEND_API_KEY is not configured');
        return false;
    }

    try {
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({ from, to, subject, html, text });
        if (error) {
            console.error('Error sending email:', error);
            return false;
        }
        console.log('Email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = sendEmail;