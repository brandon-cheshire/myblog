import { Injectable } from '@nestjs/common';
import { getAppConfig } from './config-manager.js';
import type { AppConfig } from './config.schemas.js';

@Injectable()
export class AppConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = getAppConfig();
  }

  get(): AppConfig {
    return this.config;
  }
}

