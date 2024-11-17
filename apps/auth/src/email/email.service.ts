import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);
  private etherealAccount: any;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    this.etherealAccount = await nodemailer.createTestAccount();

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: this.etherealAccount.user,
        pass: this.etherealAccount.pass,
      },
    });

    this.logger.log('=============== ETHEREAL EMAIL ACCOUNT ===============');
    this.logger.log(`Username: ${this.etherealAccount.user}`);
    this.logger.log(`Password: ${this.etherealAccount.pass}`);
    this.logger.log(`Web interface: https://ethereal.email`);
    this.logger.log('===================================================');
  }

  async sendVerificationEmail(email: string, token: string) {
    try {
      const info = await this.transporter.sendMail({
        from: '"Your App" <noreply@yourdomain.com>',
        to: email,
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="http://localhost:3000/api/auth/verify-email/${token}">
            Verify Email
          </a>
        `,
      });

      this.logger.log('=============== EMAIL SENT ===============');
      this.logger.log(`To: ${email}`);
      this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      this.logger.log('=========================================');

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      return false;
    }
  }

  getEtherealAccount() {
    return {
      user: this.etherealAccount?.user,
      pass: this.etherealAccount?.pass,
      webInterface: 'https://ethereal.email',
    };
  }
}
