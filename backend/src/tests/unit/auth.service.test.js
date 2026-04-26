const authService = require('../../services/auth.service');
const prisma = require('../../config/prisma');
const bcrypt = require('bcryptjs');

jest.mock('../../config/prisma', () => ({
  users: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refresh_tokens: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Auth Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      date_of_birth: '2000-01-01',
    };

    it('should successfully register a user', async () => {
      // 1. Mock "user exists" check (no user found)
      prisma.users.findFirst.mockResolvedValue(null);

      // 2. Mock bcrypt hash
      bcrypt.hash.mockResolvedValue('hashed_password');

      // 3. Mock database insertion
      const mockUser = { id: BigInt(1), username: 'testuser', email: 'test@example.com' };
      prisma.users.create.mockResolvedValue(mockUser);

      // 4. Mock refresh token storage
      prisma.refresh_tokens.create.mockResolvedValue({ id: BigInt(1) });

      const result = await authService.registerUser(validData);

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      prisma.users.findFirst.mockResolvedValue({ id: BigInt(1) });

      await expect(authService.registerUser(validData)).rejects.toThrow(
        'Email or username already taken'
      );
    });

    it('should throw error if user is under 16', async () => {
      const youngData = { ...validData, date_of_birth: new Date().toISOString() };

      await expect(authService.registerUser(youngData)).rejects.toThrow(
        /must be at least 16 years old/
      );
    });
  });

  describe('loginUser', () => {
    it('should successfully login a user', async () => {
      const mockUser = {
        id: BigInt(1),
        email: 'test@example.com',
        password_hash: 'hashed',
        is_banned: false,
      };
      prisma.users.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      prisma.refresh_tokens.create.mockResolvedValue({ id: BigInt(1) }); // refresh token storage

      const result = await authService.loginUser('test@example.com', 'password123');

      expect(result.user.email).toEqual('test@example.com');
      expect(result.token).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      prisma.users.findUnique.mockResolvedValue(null); // User not found

      await expect(authService.loginUser('wrong@example.com', 'pass')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
