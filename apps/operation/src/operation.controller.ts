import {
  Controller,
  Header,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OperationService } from './operation.service';

@ApiTags('Operations')
@Controller('operation')
export class OperationController {
  private readonly logger = new Logger(OperationController.name);

  constructor(private readonly operationService: OperationService) {}

  @Post('generate-ticket/:eventId')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Generate a ticket PDF for an event' })
  @ApiResponse({ status: 200, description: 'Returns the ticket PDF file' })
  @ApiResponse({ status: 400, description: 'Invalid event ID' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async generateTicket(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
  ): Promise<StreamableFile> {
    try {
      this.logger.log(`Generating ticket for eventId: ${eventId}`);
      const pdfBuffer = await this.operationService.generateTicket(eventId);

      return new StreamableFile(pdfBuffer, {
        type: 'application/pdf',
        disposition: `attachment; filename="ticket-${eventId}.pdf"`,
        length: pdfBuffer.length,
      });
    } catch (error) {
      this.logger.error(
        `Error generating ticket for eventId: ${eventId}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'Failed to generate ticket',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
