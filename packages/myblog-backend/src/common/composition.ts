import { db } from '../database/database.js';
import { KyselyTransactionProvider } from '../transaction/transaction.provider.js';
import { UserRepository } from '../users/user.repository.js';
import { UserService } from '../users/user.service.js';
import { PostRepository } from '../posts/post.repository.js';
import { PostService } from '../posts/post.service.js';
import { AuthService } from '../auth/auth.service.js';

const transactionProvider = new KyselyTransactionProvider(db);
const userRepository = new UserRepository(transactionProvider);
const postRepository = new PostRepository(transactionProvider);
const userService = new UserService(userRepository);
const postService = new PostService(postRepository);
const authService = new AuthService(userRepository, userService);

export { userRepository, postRepository, userService, postService, authService };
