// Configuration loader
import { config as developmentConfig } from './development';
import { config as productionConfig } from './production';

const isDevelopment = process.env.NODE_ENV === 'development';

export const config = isDevelopment ? developmentConfig : productionConfig;