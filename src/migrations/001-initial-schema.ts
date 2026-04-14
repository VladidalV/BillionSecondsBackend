import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE auth_provider_enum AS ENUM ('anonymous', 'apple', 'google', 'email');
    `);
    await queryRunner.query(`
      CREATE TYPE platform_enum AS ENUM ('android', 'ios', 'web');
    `);
    await queryRunner.query(`
      CREATE TYPE relation_type_enum AS ENUM ('SELF', 'CHILD', 'PARTNER', 'MOTHER', 'FATHER', 'SIBLING', 'OTHER');
    `);
    await queryRunner.query(`
      CREATE TYPE unlock_condition_type_enum AS ENUM ('exact_date_time', 'billion_seconds_event');
    `);
    await queryRunner.query(`
      CREATE TYPE notification_type_enum AS ENUM (
        'milestone_approaching', 'milestone_reached',
        'family_milestone_approaching', 'family_milestone_reached',
        'reengagement', 'capsule_unlocked'
      );
    `);

    // users
    await queryRunner.query(`
      CREATE TABLE users (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ,
        anonymous_id        VARCHAR,
        email               VARCHAR UNIQUE,
        display_name        VARCHAR,
        auth_provider       auth_provider_enum NOT NULL DEFAULT 'anonymous',
        auth_provider_id    VARCHAR,
        fcm_token           VARCHAR,
        platform            platform_enum,
        app_version         VARCHAR,
        timezone            VARCHAR,
        locale              VARCHAR
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);`);

    // profiles
    await queryRunner.query(`
      CREATE TABLE profiles (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at            TIMESTAMPTZ,
        name                  VARCHAR(80) NOT NULL,
        relation_type         relation_type_enum NOT NULL,
        custom_relation_name  VARCHAR(80),
        birth_year            SMALLINT NOT NULL,
        birth_month           SMALLINT NOT NULL,
        birth_day             SMALLINT NOT NULL,
        birth_hour            SMALLINT NOT NULL DEFAULT 12,
        birth_minute          SMALLINT NOT NULL DEFAULT 0,
        unknown_birth_time    BOOLEAN NOT NULL DEFAULT FALSE,
        is_primary            BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order            SMALLINT NOT NULL DEFAULT 0
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_profiles_user_id ON profiles(user_id);`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_profiles_one_primary_per_user
        ON profiles(user_id)
        WHERE is_primary = TRUE AND deleted_at IS NULL;
    `);

    // user_settings
    await queryRunner.query(`
      CREATE TABLE user_settings (
        user_id                      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        active_profile_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
        onboarding_completed         BOOLEAN NOT NULL DEFAULT FALSE,
        notifications_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
        milestone_reminders_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
        family_reminders_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
        reengagement_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
        approximate_labels_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
        use_24_hour_format           BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // event_history
    await queryRunner.query(`
      CREATE TABLE event_history (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        first_shown_at         TIMESTAMPTZ,
        celebration_shown_at   TIMESTAMPTZ,
        share_prompt_shown_at  TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, profile_id)
      );
    `);

    // time_capsules
    await queryRunner.query(`
      CREATE TABLE time_capsules (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at              TIMESTAMPTZ,
        title                   VARCHAR(80) NOT NULL,
        message                 TEXT NOT NULL,
        recipient_profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
        unlock_condition_type   unlock_condition_type_enum NOT NULL,
        unlock_at_epoch_ms      BIGINT,
        unlock_profile_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
        is_draft                BOOLEAN NOT NULL DEFAULT FALSE,
        opened_at               TIMESTAMPTZ
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_capsules_user_id ON time_capsules(user_id) WHERE deleted_at IS NULL;`);

    // user_milestone_progress
    await queryRunner.query(`
      CREATE TABLE user_milestone_progress (
        user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        last_seen_reached_id  VARCHAR,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, profile_id)
      );
    `);

    // scheduled_notifications
    await queryRunner.query(`
      CREATE TABLE scheduled_notifications (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        profile_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
        capsule_id    UUID REFERENCES time_capsules(id) ON DELETE CASCADE,
        type          notification_type_enum NOT NULL,
        scheduled_at  TIMESTAMPTZ NOT NULL,
        sent_at       TIMESTAMPTZ,
        cancelled_at  TIMESTAMPTZ,
        payload       JSONB NOT NULL DEFAULT '{}'
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_notif_pending ON scheduled_notifications(scheduled_at)
        WHERE sent_at IS NULL AND cancelled_at IS NULL;
    `);

    // analytics_events
    await queryRunner.query(`
      CREATE TABLE analytics_events (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type   VARCHAR NOT NULL,
        occurred_at  TIMESTAMPTZ NOT NULL,
        properties   JSONB NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);`);

    // refresh_tokens
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id          UUID PRIMARY KEY,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_events CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS scheduled_notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_milestone_progress CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS time_capsules CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_history CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_settings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS profiles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS unlock_condition_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS relation_type_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS platform_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS auth_provider_enum;`);
  }
}
