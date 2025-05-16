// apps/blockchain-node/src/config/configuration.ts

export default () => ({
  // Node information
  nodeName:
    process.env.NODE_NAME || `node-${Math.floor(Math.random() * 10000)}`,
  port: parseInt(process.env.NODE_PORT || '4000', 10),
  environment: process.env.NODE_ENV || 'development',

  // API settings
  api: {
    port: parseInt(process.env.API_PORT || '4001', 10),
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    enableGraphQL: process.env.ENABLE_GRAPHQL === 'true',
    apiKey: process.env.API_KEY || 'development-api-key',
  },

  // Network settings
  network: {
    name: process.env.NETWORK || 'testnet',
    bootstrapNodes: (process.env.BOOTSTRAP_NODES || '')
      .split(',')
      .filter(Boolean),
    maxPeers: parseInt(process.env.MAX_PEERS || '25', 10),
    minPeers: parseInt(process.env.MIN_PEERS || '3', 10),
    peerDiscoveryInterval: parseInt(
      process.env.PEER_DISCOVERY_INTERVAL || '60000',
      10
    ),
    p2pPort: parseInt(process.env.P2P_PORT || '40000', 10),
  },

  // Blockchain settings
  blockchain: {
    dataDir: process.env.DATA_DIR || './data',
    genesisFile: process.env.GENESIS_FILE || './genesis.json',
    blockTime: parseInt(process.env.BLOCK_TIME || '5000', 10), // 5 seconds
    maxTransactionsPerBlock: parseInt(
      process.env.MAX_TX_PER_BLOCK || '5000',
      10
    ),
    confirmations: parseInt(process.env.CONFIRMATIONS || '6', 10),
  },

  // Consensus settings
  consensus: {
    type: process.env.CONSENSUS_TYPE || 'hybrid-poa-dpos',
    requiredConsensus: parseInt(process.env.REQUIRED_CONSENSUS || '66', 10), // 66%
    validatorRotationInterval: parseInt(
      process.env.VALIDATOR_ROTATION || '86400000',
      10
    ), // 24 hours
    maxValidators: parseInt(process.env.MAX_VALIDATORS || '100', 10),
    blockProposerTimeout: parseInt(
      process.env.BLOCK_PROPOSER_TIMEOUT || '10000',
      10
    ), // 10 seconds
    governmentValidatorRatio: parseInt(
      process.env.GOVERNMENT_VALIDATOR_RATIO || '50',
      10
    ), // 50%
  },

  // Mempool settings
  mempool: {
    maxSize: parseInt(process.env.MEMPOOL_MAX_SIZE || '50000', 10),
    maxSizePerAccount: parseInt(
      process.env.MEMPOOL_MAX_PER_ACCOUNT || '25',
      10
    ),
    expirationTime: parseInt(process.env.MEMPOOL_EXPIRATION || '3600000', 10), // 1 hour
    minFee: parseInt(process.env.MEMPOOL_MIN_FEE || '1', 10), // 1 Cash
  },

  // Validator settings
  validator: {
    isValidator: process.env.IS_VALIDATOR === 'true',
    validatorType: process.env.VALIDATOR_TYPE || 'citizen', // government or citizen
    validatorAddress: process.env.VALIDATOR_ADDRESS,
    validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY, // Only in secure environment
    validatorKeyFile: process.env.VALIDATOR_KEY_FILE || './validator-key.json',
    stakeAmount: process.env.VALIDATOR_STAKE || '0', // For citizen validators
  },

  // Sync settings
  sync: {
    fastSync: process.env.FAST_SYNC === 'true',
    syncBatchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100', 10),
    syncTimeout: parseInt(process.env.SYNC_TIMEOUT || '30000', 10), // 30 seconds
    maxBlocksInMemory: parseInt(process.env.MAX_BLOCKS_IN_MEMORY || '1000', 10),
  },

  // Wallet settings
  wallet: {
    defaultWalletPath: process.env.DEFAULT_WALLET_PATH || './wallet.json',
    autoGenerateWallet: process.env.AUTO_GENERATE_WALLET === 'true',
    walletPassword: process.env.WALLET_PASSWORD, // Only in secure environment or for dev
  },

  // Storage settings
  storage: {
    database: {
      type: process.env.DB_TYPE || 'leveldb',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'chuckram',
    },
    cacheSize: parseInt(process.env.CACHE_SIZE || '5000', 10),
    pruning: process.env.PRUNING === 'true',
    pruningAge: parseInt(process.env.PRUNING_AGE || '2592000000', 10), // 30 days in milliseconds
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    console: process.env.LOG_CONSOLE !== 'false',
    file: process.env.LOG_FILE === 'true',
    logFilePath: process.env.LOG_FILE_PATH || './logs',
  },
});
