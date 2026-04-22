import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>("CORS_ORIGINS");
  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins.split(",").map((s) => s.trim()),
      credentials: false,
    });
  }

  const port = config.get<number>("PORT") ?? 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}

void bootstrap();
