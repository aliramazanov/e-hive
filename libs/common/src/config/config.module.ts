import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: 'mongo.config.env',
      validationSchema: Joi.object({
        mongo_uri: Joi.string().required(),
      }),
    }),
  ],
})
export class ConfigModule {}
