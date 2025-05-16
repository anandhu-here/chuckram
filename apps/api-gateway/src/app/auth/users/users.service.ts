// apps/api-gateway/src/app/auth/users/users.service.ts

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from '../dto/register.dto';

// In a real application, this would be a database model
// Here we use a simple in-memory store for demo purposes
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  did: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  private readonly users: Map<string, User> = new Map();

  constructor() {
    // Add some initial users for testing
    this.createInitialUsers();
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async create(registerDto: RegisterDto): Promise<User> {
    // Check if username or email already exists
    const existingUsername = await this.findByUsername(registerDto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.findByEmail(registerDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    // Create new user
    const now = new Date();
    const newUser: User = {
      id: uuidv4(),
      username: registerDto.username,
      email: registerDto.email,
      passwordHash,
      did: `did:chuckram:main:${uuidv4()}`, // In real app, use IdentityService to generate
      roles: ['user'], // Default role
      createdAt: now,
      updatedAt: now,
    };

    // Store user
    this.users.set(newUser.id, newUser);

    return newUser;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user
    const updatedUser = {
      ...user,
      ...updateData,
      updatedAt: new Date(),
    };

    // Store updated user
    this.users.set(id, updatedUser);

    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    const exists = this.users.has(id);
    if (!exists) {
      throw new NotFoundException('User not found');
    }

    return this.users.delete(id);
  }

  private createInitialUsers() {
    // Create admin user
    const adminId = uuidv4();
    const admin: User = {
      id: adminId,
      username: 'admin',
      email: 'admin@chuckram.gov.in',
      passwordHash: bcrypt.hashSync('admin123', 10), // Never hardcode in production!
      did: `did:chuckram:main:${uuidv4()}`,
      roles: ['admin', 'user'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminId, admin);

    // Create test user
    const testUserId = uuidv4();
    const testUser: User = {
      id: testUserId,
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: bcrypt.hashSync('test123', 10), // Never hardcode in production!
      did: `did:chuckram:main:${uuidv4()}`,
      roles: ['user'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(testUserId, testUser);
  }
}
