import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model.js';
import { LoginInput, CreateUserInput } from './auth.schemas.js';
import { AppError } from '../../shared/errors/app-error.js';
import { config } from '../../config/index.js';
import { AuditService } from '../audit/audit.service.js';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  };
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  static async register(data: CreateUserInput): Promise<IUser> {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw AppError.conflict('A user with this email address already exists');
    }

    const passwordHash = await this.hashPassword(data.password);
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      isActive: true,
    });

    return user;
  }

  static async login(data: LoginInput): Promise<AuthResponse> {
    const user = await User.findOne({ email: data.email }).select('+passwordHash');
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await this.comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('User account is deactivated');
    }

    const token = this.generateToken(user._id.toString(), user.role);

    // Audit log for login
    AuditService.record({
      actorId: user._id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user._id,
      metadata: { email: user.email, role: user.role },
    }).catch(() => {
      // Non-blocking background audit
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  static async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user;
  }
}
