import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { Logger, NotFoundException } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export abstract class AbstractRepository<T extends AbstractEntity<T>> {
  protected abstract readonly logger: Logger;

  constructor(
    private readonly entityRepository: Repository<T>,
    private readonly entityManager: EntityManager,
  ) {}

  async create(entity: T): Promise<T> {
    try {
      return await this.entityManager.save(entity);
    } catch (error) {
      this.logger.error(
        `Failed to create entity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOne(where: FindOptionsWhere<T>): Promise<T> {
    try {
      const entity = await this.entityRepository.findOne({ where });
      if (!entity) {
        throw new NotFoundException(
          `Entity not found with criteria: ${JSON.stringify(where)}`,
        );
      }
      return entity;
    } catch (error) {
      this.logger.error(`Failed to find entity: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOneAndUpdate(
    where: FindOptionsWhere<T>,
    update: QueryDeepPartialEntity<T>,
  ): Promise<T> {
    try {
      const result = await this.entityRepository.update(where, update);
      if (!result.affected) {
        throw new NotFoundException(
          `Entity not found with criteria: ${JSON.stringify(where)}`,
        );
      }
      return await this.findOne(where);
    } catch (error) {
      this.logger.error(
        `Failed to update entity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async find(where: FindOptionsWhere<T>): Promise<T[]> {
    try {
      return await this.entityRepository.findBy(where);
    } catch (error) {
      this.logger.error(
        `Failed to find entities: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOneAndDelete(where: FindOptionsWhere<T>): Promise<void> {
    try {
      const result = await this.entityRepository.delete(where);
      if (!result.affected) {
        throw new NotFoundException(
          `Entity not found with criteria: ${JSON.stringify(where)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete entity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
