import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HashService } from '../hash/hash.service';
import { QueryFailedError, Repository, FindOneOptions } from 'typeorm';
import { User } from './entities/user.entity';
import { CONFLICT_ERR } from '../constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private hashServise: HashService,
  ) {}
  async create(createUserDto: CreateUserDto): Promise<User> {
    const hash = await this.hashServise.hashPassword(createUserDto.password);
    try {
      const user = await this.userRepository.save({
        ...createUserDto,
        password: hash,
      });

      delete user.password;
      return user;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const err = error.driverError;
        if (err.code === CONFLICT_ERR) {
          throw new ConflictException(
            'Пользователь с таким email или username уже зарегистрирован',
          );
        }
      }
    }
  }

  async findOne(query: FindOneOptions<User>): Promise<User> {
    return this.userRepository.findOne(query);
  }

  async updateOne(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.email || updateUserDto.username) {
      const userExist = await this.userRepository.findOne({
        where: [
          { username: updateUserDto.username },
          { email: updateUserDto.email },
        ],
      });
      if (!!userExist) {
        throw new ConflictException(
          'Пользователь с таким email или username уже зарегистрирован',
        );
      }
    }
    if (updateUserDto.password) {
      updateUserDto.password = await this.hashServise.hashPassword(
        updateUserDto.password,
      );
    }
    await this.userRepository.update({ id }, updateUserDto);

    const updatedUser = await this.findOne({
      where: { id: +id },
    });

    delete updatedUser.password;

    return updatedUser;
  }

  async findByUsername(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });
    return user;
  }
}
