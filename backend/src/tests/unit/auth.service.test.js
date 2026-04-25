const authService = require('../../services/auth.service');
const db = require('../../config/db');
const bcrypt = require('bcryptjs');
const { mockQuery, mockQueryError } = require('../helpers/dbMock');

jest.mock('../../config/db', () => ({
  query: jest.fn(),
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
      mockQuery(db.query, { rows: [] });

      // 2. Mock bcrypt hash
      bcrypt.hash.mockResolvedValue('hashed_password');

      // 3. Mock database insertion
      const mockUser = { id: '1', username: 'testuser', email: 'test@example.com' };
      mockQuery(db.query, { rows: [mockUser] });

      // 4. Mock refresh token storage
      mockQuery(db.query, { rows: [] });

      const result = await authService.registerUser(validData);

      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error if user already exists', async () => {
      mockQuery(db.query, { rows: [{ id: '1' }] });

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
      const mockUser = { id: '1', email: 'test@example.com', password_hash: 'hashed' };
      mockQuery(db.query, { rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      mockQuery(db.query, { rows: [] }); // refresh token storage

      const result = await authService.loginUser('test@example.com', 'password123');

      expect(result.user.email).toEqual('test@example.com');
      expect(result.token).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      mockQuery(db.query, { rows: [] }); // User not found

      await expect(authService.loginUser('wrong@example.com', 'pass')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });
});
