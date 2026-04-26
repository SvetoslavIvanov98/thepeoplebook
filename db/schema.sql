-- social_db schema
-- Run: psql -U postgres -d social_db -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast ILIKE search

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             BIGSERIAL PRIMARY KEY,
  username       VARCHAR(30)  UNIQUE NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  TEXT,
  full_name      VARCHAR(100),
  bio            TEXT,
  avatar_url     TEXT,
  cover_url      TEXT,
  google_id      TEXT UNIQUE,
  is_verified    BOOLEAN  NOT NULL DEFAULT FALSE,
  date_of_birth  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions (safe to run on existing databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_username ON users USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users USING gin (full_name gin_trgm_ops);

-- ─── Follows ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id           BIGSERIAL PRIMARY KEY,
  follower_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower   ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following  ON follows (following_id);

-- ─── Groups ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  description TEXT,
  cover_url   TEXT,
  owner_id    BIGINT NOT NULL REFERENCES users(id),
  privacy     VARCHAR(10) NOT NULL DEFAULT 'public',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent: add privacy column on existing databases
ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy VARCHAR(10) NOT NULL DEFAULT 'public';

CREATE TABLE IF NOT EXISTS group_members (
  id           BIGSERIAL PRIMARY KEY,
  group_id     BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_join_requests (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_join_requests ON group_join_requests (group_id, status);

CREATE TABLE IF NOT EXISTS group_invites (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  inviter_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, invitee_id)
);

-- ─── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT,
  media_urls  JSONB NOT NULL DEFAULT '[]',
  hashtags    JSONB NOT NULL DEFAULT '[]',
  repost_id   BIGINT REFERENCES posts(id) ON DELETE SET NULL,
  group_id    BIGINT REFERENCES groups(id) ON DELETE SET NULL,
  deleted_at  TIMESTAMPTZ,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id   ON posts (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_hashtags  ON posts USING gin (hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_content   ON posts USING gin (content gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_group_id  ON posts (group_id) WHERE group_id IS NOT NULL;

-- Idempotent: add edited_at column on existing databases
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- ─── Likes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post ON likes (post_id);

-- ─── Comments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          BIGSERIAL PRIMARY KEY,
  post_id     BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  parent_id   BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  deleted_at  TIMESTAMPTZ,
  edited_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at) WHERE deleted_at IS NULL;

-- Idempotent: add edited_at column on existing databases
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add FK for likes.comment_id now that comments table exists (idempotent)
DO $$ BEGIN
  ALTER TABLE likes ADD CONSTRAINT fk_likes_comment
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Stories ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_user       ON stories (user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories (expires_at);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL,  -- like, comment, follow, repost, message
  actor_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
  post_id     BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent: add group_id column on existing databases
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read, created_at DESC);

-- ─── Conversations / Messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content          TEXT,
  media_url        TEXT,
  read             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at DESC);

-- ─── Blocks & Mutes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_blocks (
  id          BIGSERIAL PRIMARY KEY,
  blocker_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

CREATE TABLE IF NOT EXISTS user_mutes (
  id         BIGSERIAL PRIMARY KEY,
  muter_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (muter_id, muted_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes (muter_id);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);

-- ─── Push Tokens (Expo) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

-- ─── Web Push Subscriptions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subs_user ON web_push_subscriptions (user_id);

-- ─── Content Reports (DSA Art. 16) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_reports (
  id              BIGSERIAL PRIMARY KEY,
  reporter_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id         BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id      BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  reason          VARCHAR(50) NOT NULL,  -- illegal_content, harassment, spam, misinformation, other
  reported_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  description     TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, reviewed, action_taken, dismissed
  admin_note      TEXT,
  decided_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_has_target CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_post ON content_reports (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_reports_comment ON content_reports (comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_reports_user ON content_reports (reported_user_id) WHERE reported_user_id IS NOT NULL;

-- ─── Moderation Decisions / Statement of Reasons (DSA Art. 17) ───────────────
CREATE TABLE IF NOT EXISTS moderation_decisions (
  id              BIGSERIAL PRIMARY KEY,
  report_id       BIGINT REFERENCES content_reports(id) ON DELETE SET NULL,
  target_user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type     VARCHAR(30) NOT NULL,  -- content_removed, account_suspended, warning, no_action
  reason          TEXT NOT NULL,
  legal_basis     TEXT,
  decided_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  appealed        BOOLEAN NOT NULL DEFAULT FALSE,
  appeal_outcome  VARCHAR(20),  -- upheld, overturned, NULL
  appeal_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_decisions_user ON moderation_decisions (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_decisions_report ON moderation_decisions (report_id) WHERE report_id IS NOT NULL;

-- ─── Counter Columns (Optimization) ──────────────────────────────────────────

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_count INT NOT NULL DEFAULT 0;

-- Groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS members_count INT NOT NULL DEFAULT 0;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS post_count INT NOT NULL DEFAULT 0;

-- Posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INT NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reposts_count INT NOT NULL DEFAULT 0;

-- Comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

-- ─── Backfill Current Counts ──────────────────────────────────────────────────

-- Safe to run multiple times, though slightly expensive.
UPDATE users u SET 
  followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = u.id),
  following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = u.id),
  post_count = (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND deleted_at IS NULL);

UPDATE groups g SET 
  members_count = (SELECT COUNT(*) FROM group_members WHERE group_id = g.id),
  post_count = (SELECT COUNT(*) FROM posts WHERE group_id = g.id AND deleted_at IS NULL);

UPDATE posts p SET 
  likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = p.id),
  comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL),
  reposts_count = (SELECT COUNT(*) FROM posts WHERE repost_id = p.id AND deleted_at IS NULL);

UPDATE comments c SET 
  likes_count = (SELECT COUNT(*) FROM likes WHERE comment_id = c.id);

-- ─── Triggers to Maintain Counts ──────────────────────────────────────────────

-- Follows Trigger
CREATE OR REPLACE FUNCTION update_follow_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Likes Trigger
CREATE OR REPLACE FUNCTION update_like_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_like_counts ON likes;
CREATE TRIGGER trigger_update_like_counts
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_like_counts();

-- Comments Trigger (Soft Delete means UPDATE)
CREATE OR REPLACE FUNCTION update_comment_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE posts SET comments_count = comments_count - 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_counts ON comments;
CREATE TRIGGER trigger_update_comment_counts
AFTER INSERT OR UPDATE OF deleted_at ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

-- Posts Trigger (Reposts & User Post Count & Group Post Count)
CREATE OR REPLACE FUNCTION update_post_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
    IF NEW.repost_id IS NOT NULL THEN
      UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.repost_id;
    END IF;
    IF NEW.group_id IS NOT NULL THEN
      UPDATE groups SET post_count = post_count + 1 WHERE id = NEW.group_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      UPDATE users SET post_count = post_count - 1 WHERE id = NEW.user_id;
      IF NEW.repost_id IS NOT NULL THEN
        UPDATE posts SET reposts_count = reposts_count - 1 WHERE id = NEW.repost_id;
      END IF;
      IF NEW.group_id IS NOT NULL THEN
        UPDATE groups SET post_count = post_count - 1 WHERE id = NEW.group_id;
      END IF;
    END IF;
    IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
      UPDATE users SET post_count = post_count + 1 WHERE id = NEW.user_id;
      IF NEW.repost_id IS NOT NULL THEN
        UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.repost_id;
      END IF;
      IF NEW.group_id IS NOT NULL THEN
        UPDATE groups SET post_count = post_count + 1 WHERE id = NEW.group_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_counts ON posts;
CREATE TRIGGER trigger_update_post_counts
AFTER INSERT OR UPDATE OF deleted_at ON posts
FOR EACH ROW EXECUTE FUNCTION update_post_counts();

-- Group Members Trigger
CREATE OR REPLACE FUNCTION update_group_member_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET members_count = members_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET members_count = members_count - 1 WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_member_counts ON group_members;
CREATE TRIGGER trigger_update_group_member_counts
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_counts();
