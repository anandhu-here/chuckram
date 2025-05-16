// apps/api-gateway/src/app/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { WinstonModule } from 'nest-winston';
import { JwtModule } from '@nestjs/jwt';
import { GraphQLJSON } from 'graphql-type-json';
import * as winston from 'winston';
import { join } from 'path';

// Configuration imports
import configuration from '../config/configuration';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { IdentityModule } from './identity/identity.module';
import { CurrencyModule } from './currency/currency.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';
import { VotingModule } from './voting/voting.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') || 60,
            limit: config.get<number>('throttle.limit') || 10,
          },
        ],
      }),
    }),

    // JWT Authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('jwt.secret') ||
          'fallback-secret-do-not-use-in-production',
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn') || '1d',
        },
      }),
    }),

    // Logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        level: config.get<string>('log.level', 'info'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(
                (info) => `${info.timestamp} ${info.level}: ${info.message}`
              )
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ],
      }),
    }),

    // GraphQL
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        playground: config.get<boolean>('graphql.playground', false),
        introspection: config.get<boolean>('graphql.introspection', false),
        debug: config.get<boolean>('graphql.debug', false),
        context: ({ req }: { req: any }) => ({ req }),
        // Add JSON scalar support
        resolvers: { JSON: GraphQLJSON },
      }),
    }),

    // Feature modules
    AuthModule,
    BlockchainModule,
    VotingModule,
    IdentityModule,
    CurrencyModule,
    WebsocketModule,
    HealthModule,
  ],
})
export class AppModule {}
