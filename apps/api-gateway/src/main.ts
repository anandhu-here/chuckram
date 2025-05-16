// apps/api-gateway/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Apply global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Apply security middleware
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('cors.origin'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Set up Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Digital Chuckram API')
    .setDescription('API endpoints for the Digital Chuckram platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('blockchain', 'Blockchain interaction endpoints')
    .addTag('voting', 'Governance and voting endpoints')
    .addTag('identity', 'Identity management endpoints')
    .addTag('currency', 'Digital currency endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Start server
  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`Digital Chuckram API Gateway running on port ${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/docs`
  );
}

bootstrap();
