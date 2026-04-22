import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET is not set");
        }
        const isProduction = config.get<string>("NODE_ENV") === "production";
        if (isProduction) {
          if (secret === "change-me-in-production") {
            throw new Error("JWT_SECRET must not use the default value in production");
          }
          if (secret.length < 32) {
            throw new Error("JWT_SECRET must be at least 32 characters in production");
          }
        }
        const expiresIn = config.get<string>("JWT_EXPIRES_IN") ?? "7d";
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as `${number}${"s" | "m" | "h" | "d"}`,
            algorithm: "HS256",
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService, AuthRepository, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
