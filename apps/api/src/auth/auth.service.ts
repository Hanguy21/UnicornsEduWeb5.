import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { UserRole } from 'generated/enums';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class AuthService {
    private readonly refreshTokenOptions: JwtSignOptions;
    private readonly accessTokenOptions: JwtSignOptions;
    private readonly accessTokenExpiresIn = 60 * 15; // 1 day in seconds
    private readonly refreshTokenExpiresIn = 60 * 60 * 24 * 30; // 30 days in seconds

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) {
        this.refreshTokenOptions = {
            expiresIn: this.refreshTokenExpiresIn,
            secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        };
        this.accessTokenOptions = {
            expiresIn: this.accessTokenExpiresIn,
            secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        };
    }

    async login(email: string, password: string): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateTokenPairAndSave(user.id, user.email, user.roleType);
    }

    /**
     * Refresh token rotation: only the current stored refresh token is valid.
     * After use we issue a new pair and update the stored token; reuse is rejected.
     */
    async refreshTokens(
        userId: string,
        usedRefreshToken: string,
    ): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, roleType: true, refreshToken: true },
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const tokenHash = this.hashToken(usedRefreshToken);
        if (user.refreshToken !== tokenHash) {
            throw new UnauthorizedException('Invalid or already used refresh token');
        }

        return this.generateTokenPairAndSave(user.id, user.email, user.roleType);
    }

    async register(email: string, password: string): Promise<{ message: string }> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        await this.prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(password, 10),
                roleType: UserRole.guest,
            },
        });

        return { message: 'User created successfully' };
    }

    private async generateTokenPairAndSave(
        userId: string,
        email: string,
        role: string,
    ): Promise<TokenPair> {
        const payload = { sub: userId, email, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, this.accessTokenOptions),
            this.jwtService.signAsync(payload, this.refreshTokenOptions),
        ]);
        const refreshTokenHash = this.hashToken(refreshToken);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: refreshTokenHash },
        });
        return {
            accessToken,
            refreshToken,
        };
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
