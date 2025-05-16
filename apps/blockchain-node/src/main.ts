// apps/blockchain-node/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Get port from configuration, defaulting to 4000 (different from API Gateway)
  const port = configService.get<number>('port') || 4000;

  // Start the application
  await app.listen(port);

  logger.log(`Blockchain Node started on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('environment')}`);
  logger.log(`Network: ${configService.get<string>('network.name')}`);
  logger.log(
    `Genesis Block: ${
      configService.get<string>('blockchain.genesisHash') || 'Not loaded'
    }`
  );
}

bootstrap();
