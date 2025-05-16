// apps/api-gateway/src/config/configuration.ts

export default () => ({
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chuckram',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // Rate limiting configuration
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10), // seconds
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10), // requests per TTL
  },

  // GraphQL configuration
  graphql: {
    playground: process.env.GRAPHQL_PLAYGROUND === 'true',
    introspection: process.env.GRAPHQL_INTROSPECTION === 'true',
    debug: process.env.GRAPHQL_DEBUG === 'true',
  },

  // Blockchain node configuration
  blockchain: {
    url: process.env.BLOCKCHAIN_URL || 'http://localhost:4000',
    apiKey: process.env.BLOCKCHAIN_API_KEY,
  },

  // Logging configuration
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Cache configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // seconds
  },

  // WebSocket configuration
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
    path: process.env.WEBSOCKET_PATH || '/ws',
  },

  // Identity service configuration
  identity: {
    aadhaarApiUrl: process.env.AADHAAR_API_URL || 'http://localhost:4001',
    aadhaarApiKey: process.env.AADHAAR_API_KEY,
  },
});
