import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './appconfig.service.js';

@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}

