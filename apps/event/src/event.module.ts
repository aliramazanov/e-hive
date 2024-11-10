import { PostgresModule } from '@app/postgres';
import { Module } from '@nestjs/common';
import { Event } from './entity/event.entity';
import { EventController } from './event.controller';
import { EventService } from './event.service';

@Module({
  imports: [PostgresModule, PostgresModule.forFeature([Event])],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
