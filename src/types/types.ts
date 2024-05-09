import { User } from 'src/users/entities/user.entity';

export interface RequesthUser extends Request {
  user: User;
}
