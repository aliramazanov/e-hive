import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import * as path from 'path';
import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(process.cwd(), 'email.config.env'),
      validationSchema: Joi.object({
        GMAIL_CLIENT_ID: Joi.string().required(),
        GMAIL_CLIENT_SECRET: Joi.string().required(),
        GMAIL_REFRESH_TOKEN: Joi.string().required(),
        EMAIL_FROM_ADDRESS: Joi.string().email().required(),
        EMAIL_FROM_NAME: Joi.string().required(),
        APP_URL: Joi.string().uri().required(),
        EMAIL_VERIFICATION_EXPIRY: Joi.string().default('24h'),
        PASSWORD_RESET_EXPIRY: Joi.string().default('1h'),
      }),
      expandVariables: true,
      cache: true,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
