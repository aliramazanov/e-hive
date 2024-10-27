import { Logger, NotFoundException } from '@nestjs/common';
import { FilterQuery, Model, Types, UpdateQuery } from 'mongoose';
import { AbstractDocument } from './abstract.schema';

export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;
  constructor(protected readonly model: Model<TDocument>) {}

  private logAndThrow(
    message: string,
    filterQuery: FilterQuery<TDocument>,
  ): void {
    this.logger.warn(`${message}. Filter query:`, filterQuery);
    throw new NotFoundException(message);
  }

  async create(data: Omit<TDocument, '_id'>): Promise<TDocument> {
    const document = new this.model({
      ...data,
      _id: new Types.ObjectId(),
    });
    return document.save().then((doc) => doc.toJSON() as TDocument);
  }

  async findOne(filterQuery: FilterQuery<TDocument>): Promise<TDocument> {
    const document = await this.model.findOne(filterQuery).lean<TDocument>();

    if (!document) {
      this.logAndThrow('Document not found', filterQuery);
    }

    return document;
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<TDocument> {
    const document = this.model
      .findOneAndUpdate(filterQuery, update, {
        new: true,
      })
      .lean<TDocument>(true);
    return document;
  }

  async find(filterQuery: FilterQuery<TDocument>): Promise<TDocument[]> {
    return this.model.find(filterQuery).lean<TDocument[]>(true);
  }

  async findOneAndDelete(
    filterQuery: FilterQuery<TDocument>,
  ): Promise<TDocument> {
    return this.model.findOneAndDelete(filterQuery).lean<TDocument>(true);
  }
}
