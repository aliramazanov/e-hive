import { Module } from '@nestjs/common';
import { LoggerModule as Pino } from 'nestjs-pino';

@Module({
  imports: [
    Pino.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: { singleLine: true },
        },
      },
    }),
  ],
})
export class LoggerModule {}
