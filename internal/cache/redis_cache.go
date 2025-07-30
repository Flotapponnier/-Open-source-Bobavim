package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"boba-vim/internal/utils"
	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	client *redis.Client
	ctx    context.Context
}

var GlobalCache *RedisCache

// InitializeRedis initializes the Redis cache connection
func InitializeRedis() *RedisCache {
	ctx := context.Background()
	
	// Get Redis configuration from environment variables
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost:6379"
	}
	
	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisDB := os.Getenv("REDIS_DB")
	
	db := 0
	if redisDB != "" {
		if parsedDB, err := strconv.Atoi(redisDB); err == nil {
			db = parsedDB
		}
	}
	
	client := redis.NewClient(&redis.Options{
		Addr:     redisHost,
		Password: redisPassword,
		DB:       db,
		
		// Connection pool settings optimized for high concurrency
		PoolSize:     500,  // Maximum number of socket connections
		MinIdleConns: 50,   // Minimum number of idle connections
		
		// Connection timeouts
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		
		// Connection pool timeouts
		PoolTimeout: 4 * time.Second,
		
		// Retry settings
		MaxRetries:      3,
		MinRetryBackoff: 8 * time.Millisecond,
		MaxRetryBackoff: 512 * time.Millisecond,
	})
	
	// Test the connection
	if err := client.Ping(ctx).Err(); err != nil {
		utils.Error("Redis connection failed: %v", err)
		utils.Info("Continuing without Redis cache (degraded performance)")
		return &RedisCache{client: nil, ctx: ctx}
	}
	
	utils.Info("Redis cache initialized successfully")
	utils.Info("  - Host: %s", redisHost)
	utils.Info("  - DB: %d", db)
	utils.Info("  - Pool Size: %d", 500)
	utils.Info("  - Min Idle Connections: %d", 50)
	
	cache := &RedisCache{
		client: client,
		ctx:    ctx,
	}
	
	GlobalCache = cache
	return cache
}

// IsAvailable checks if Redis is available
func (r *RedisCache) IsAvailable() bool {
	return r.client != nil
}

// Set stores a value in Redis with expiration
func (r *RedisCache) Set(key string, value interface{}, expiration time.Duration) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	jsonValue, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %v", err)
	}
	
	return r.client.Set(r.ctx, key, jsonValue, expiration).Err()
}

// Get retrieves a value from Redis
func (r *RedisCache) Get(key string, dest interface{}) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	val, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return fmt.Errorf("key not found")
	} else if err != nil {
		return fmt.Errorf("failed to get value: %v", err)
	}
	
	return json.Unmarshal([]byte(val), dest)
}

// Delete removes a key from Redis
func (r *RedisCache) Delete(key string) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	return r.client.Del(r.ctx, key).Err()
}

// SetString stores a string value in Redis
func (r *RedisCache) SetString(key string, value string, expiration time.Duration) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	return r.client.Set(r.ctx, key, value, expiration).Err()
}

// GetString retrieves a string value from Redis
func (r *RedisCache) GetString(key string) (string, error) {
	if !r.IsAvailable() {
		return "", fmt.Errorf("redis not available")
	}
	
	val, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found")
	}
	return val, err
}

// Increment atomically increments a counter
func (r *RedisCache) Increment(key string) (int64, error) {
	if !r.IsAvailable() {
		return 0, fmt.Errorf("redis not available")
	}
	
	return r.client.Incr(r.ctx, key).Result()
}

// SetExpire sets expiration for an existing key
func (r *RedisCache) SetExpire(key string, expiration time.Duration) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	return r.client.Expire(r.ctx, key, expiration).Err()
}

// Exists checks if a key exists in Redis
func (r *RedisCache) Exists(key string) (bool, error) {
	if !r.IsAvailable() {
		return false, fmt.Errorf("redis not available")
	}
	
	val, err := r.client.Exists(r.ctx, key).Result()
	return val > 0, err
}

// FlushAll clears all keys from Redis (use with caution)
func (r *RedisCache) FlushAll() error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	return r.client.FlushAll(r.ctx).Err()
}

// GetGameSessionKey returns the Redis key for game sessions
func GetGameSessionKey(sessionID string) string {
	return fmt.Sprintf("game_session:%s", sessionID)
}

// GetLeaderboardKey returns the Redis key for leaderboards
func GetLeaderboardKey(mapID string) string {
	return fmt.Sprintf("leaderboard:%s", mapID)
}

// GetMultiplayerLeaderboardKey returns the Redis key for multiplayer leaderboards
func GetMultiplayerLeaderboardKey() string {
	return "multiplayer_leaderboard"
}

// GetPlayerStatsKey returns the Redis key for player statistics
func GetPlayerStatsKey(playerID string) string {
	return fmt.Sprintf("player_stats:%s", playerID)
}

// GetActiveGameKey returns the Redis key for active games
func GetActiveGameKey(gameID string) string {
	return fmt.Sprintf("active_game:%s", gameID)
}

// GetMatchmakingQueueKey returns the Redis key for matchmaking queue
func GetMatchmakingQueueKey() string {
	return "matchmaking_queue"
}

// SetMultipleWithPipeline sets multiple key-value pairs efficiently using Redis pipeline
func (r *RedisCache) SetMultipleWithPipeline(keyValues map[string]interface{}, expiration time.Duration) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	pipe := r.client.Pipeline()
	for key, value := range keyValues {
		jsonValue, err := json.Marshal(value)
		if err != nil {
			return fmt.Errorf("failed to marshal value for key %s: %v", key, err)
		}
		pipe.Set(r.ctx, key, jsonValue, expiration)
	}
	
	_, err := pipe.Exec(r.ctx)
	return err
}

// GetMultipleWithPipeline retrieves multiple values efficiently using Redis pipeline
func (r *RedisCache) GetMultipleWithPipeline(keys []string) (map[string]string, error) {
	if !r.IsAvailable() {
		return nil, fmt.Errorf("redis not available")
	}
	
	pipe := r.client.Pipeline()
	for _, key := range keys {
		pipe.Get(r.ctx, key)
	}
	
	cmds, err := pipe.Exec(r.ctx)
	if err != nil {
		return nil, err
	}
	
	results := make(map[string]string)
	for i, cmd := range cmds {
		if getCmd, ok := cmd.(*redis.StringCmd); ok {
			val, err := getCmd.Result()
			if err == nil {
				results[keys[i]] = val
			}
		}
	}
	
	return results, nil
}

// SetWithHash stores data in Redis hash for efficient updates
func (r *RedisCache) SetWithHash(key string, field string, value interface{}, expiration time.Duration) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	jsonValue, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %v", err)
	}
	
	pipe := r.client.Pipeline()
	pipe.HSet(r.ctx, key, field, jsonValue)
	pipe.Expire(r.ctx, key, expiration)
	
	_, err = pipe.Exec(r.ctx)
	return err
}

// GetFromHash retrieves data from Redis hash
func (r *RedisCache) GetFromHash(key string, field string, dest interface{}) error {
	if !r.IsAvailable() {
		return fmt.Errorf("redis not available")
	}
	
	val, err := r.client.HGet(r.ctx, key, field).Result()
	if err == redis.Nil {
		return fmt.Errorf("field not found")
	} else if err != nil {
		return fmt.Errorf("failed to get value: %v", err)
	}
	
	return json.Unmarshal([]byte(val), dest)
}

// Close gracefully closes the Redis connection
func (r *RedisCache) Close() error {
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}