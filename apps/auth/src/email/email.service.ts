import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private oauth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    this.initializeOAuth2Client();
  }

  private initializeOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GMAIL_CLIENT_ID'),
      this.configService.get<string>('GMAIL_CLIENT_SECRET'),
      'https://developers.google.com/oauthplayground',
    );

    this.oauth2Client.setCredentials({
      refresh_token: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
    });
  }

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async getAccessToken(): Promise<string> {
    try {
      const { token } = await this.oauth2Client.getAccessToken();
      if (!token) throw new Error('Failed to get access token');
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to get access token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async initializeTransporter() {
    try {
      const accessToken = await this.getAccessToken();

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.configService.get<string>('EMAIL_FROM_ADDRESS'),
          clientId: this.configService.get<string>('GMAIL_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GMAIL_CLIENT_SECRET'),
          refreshToken: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
          accessToken: accessToken,
        },
      });

      await this.transporter.verify();
      this.logger.log('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize email transporter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.configService.get<string>('EMAIL_FROM_NAME')}" <${this.configService.get<string>('EMAIL_FROM_ADDRESS')}>`,
        to,
        subject: 'Verify Your Email Address',
        html: `
          <h1>Email Verification</h1>
          <p>Please use the following token to verify your email address:</p>
          <p><strong>${token}</strong></p>
          <p>This token will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        `,
      });

      this.logger.debug(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      if (error.message.includes('auth')) {
        try {
          await this.initializeTransporter();
          return this.sendVerificationEmail(to, token);
        } catch (reinitError) {
          this.logger.error(
            `Failed to reinitialize transporter: ${reinitError.message}`,
          );
        }
      }

      return false;
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.configService.get<string>('EMAIL_FROM_NAME')}" <${this.configService.get<string>('EMAIL_FROM_ADDRESS')}>`,
        to,
        subject: 'Reset Your Password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Please use the following token to reset your password:</p>
          <p><strong>${token}</strong></p>
          <p>This token will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        `,
      });

      this.logger.debug(
        `Password reset email sent successfully: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email: ${error.message}`,
        error.stack,
      );

      if (error.message.includes('auth')) {
        try {
          await this.initializeTransporter();
          return this.sendPasswordResetEmail(to, token);
        } catch (reinitError) {
          this.logger.error(
            `Failed to reinitialize transporter: ${reinitError.message}`,
          );
        }
      }

      return false;
    }
  }
}
