CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE announcements(
    id UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    content VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    image_url VARCHAR(500),
    is_pinned BOOLEAN NOT NULL,
    title VARCHAR(200) NOT NULL,
    updated_at TIMESTAMP,
    user_id UUID NOT NULL
);
ALTER TABLE announcements ADD CONSTRAINT constraint_db PRIMARY KEY(id);
CREATE INDEX idx_announcement_created_at ON announcements(created_at NULLS FIRST);
CREATE INDEX idx_announcement_category ON announcements(category NULLS FIRST);
CREATE INDEX idx_announcement_pinned ON announcements(is_pinned NULLS FIRST);
CREATE INDEX idx_announcement_user_id ON announcements(user_id NULLS FIRST);
CREATE TABLE audit_log_details(
    audit_log_id UUID NOT NULL,
    detail_value VARCHAR,
    detail_key VARCHAR(255) NOT NULL
);
ALTER TABLE audit_log_details ADD CONSTRAINT constraint_8 PRIMARY KEY(audit_log_id, detail_key);
CREATE TABLE audit_logs(
    id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    target_id UUID,
    target_type VARCHAR(100),
    timestamp TIMESTAMP NOT NULL,
    user_agent VARCHAR(500),
    user_id UUID NOT NULL
);
ALTER TABLE audit_logs ADD CONSTRAINT constraint_83 PRIMARY KEY(id);
CREATE TABLE chat_group_members(
    id UUID NOT NULL,
    custom_name VARCHAR(50),
    invited_by UUID,
    is_active BOOLEAN NOT NULL,
    is_muted BOOLEAN NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    last_read_at TIMESTAMP,
    left_at TIMESTAMP,
    member_role VARCHAR(255) NOT NULL,
    notifications_enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMP,
    chat_group_id UUID NOT NULL,
    user_id UUID NOT NULL
);
ALTER TABLE chat_group_members ADD CONSTRAINT constraint_a6 PRIMARY KEY(id);
CREATE INDEX idx_chat_group_member_user ON chat_group_members(user_id NULLS FIRST);
CREATE INDEX idx_chat_group_member_group ON chat_group_members(chat_group_id NULLS FIRST);
CREATE INDEX idx_chat_group_member_role ON chat_group_members(member_role NULLS FIRST);
CREATE INDEX idx_chat_group_member_active ON chat_group_members(is_active NULLS FIRST);
CREATE TABLE chat_groups(
    id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    description VARCHAR,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL,
    is_private BOOLEAN NOT NULL,
    max_members INTEGER,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP,
    created_by UUID
);
ALTER TABLE chat_groups ADD CONSTRAINT constraint_870 PRIMARY KEY(id);
CREATE INDEX idx_chat_group_type ON chat_groups(type NULLS FIRST);
CREATE INDEX idx_chat_group_created_by ON chat_groups(created_by NULLS FIRST);
CREATE INDEX idx_chat_group_is_active ON chat_groups(is_active NULLS FIRST);
CREATE TABLE donation_subscriptions(
    id UUID NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    canceled_at TIMESTAMP,
    category VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    currency VARCHAR(3) NOT NULL,
    current_period_end TIMESTAMP,
    current_period_start TIMESTAMP,
    ended_at TIMESTAMP,
    failure_count INTEGER NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    last_failure_date TIMESTAMP,
    last_failure_reason VARCHAR(500),
    next_payment_date TIMESTAMP,
    notes VARCHAR(1000),
    payment_method_brand VARCHAR(20),
    payment_method_last4 VARCHAR(4),
    purpose VARCHAR(500),
    started_at TIMESTAMP,
    status VARCHAR(30) NOT NULL,
    stripe_customer_id VARCHAR(100) NOT NULL,
    stripe_price_id VARCHAR(100) NOT NULL,
    stripe_subscription_id VARCHAR(100) NOT NULL,
    trial_end TIMESTAMP,
    trial_start TIMESTAMP,
    updated_at TIMESTAMP,
    user_id UUID NOT NULL
);
ALTER TABLE donation_subscriptions ADD CONSTRAINT constraint_e8f8 PRIMARY KEY(id);
CREATE INDEX idx_subscription_user_id ON donation_subscriptions(user_id NULLS FIRST);
CREATE INDEX idx_subscription_stripe_id ON donation_subscriptions(stripe_subscription_id NULLS FIRST);
CREATE INDEX idx_subscription_status ON donation_subscriptions(status NULLS FIRST);
CREATE INDEX idx_subscription_user_status ON donation_subscriptions(user_id NULLS FIRST, status NULLS FIRST);
CREATE TABLE donations(
    id UUID NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    category VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    currency VARCHAR(3) NOT NULL,
    fee_amount NUMERIC(19, 2),
    is_recurring BOOLEAN NOT NULL,
    net_amount NUMERIC(19, 2),
    notes VARCHAR(1000),
    payment_method_brand VARCHAR(20),
    payment_method_last4 VARCHAR(4),
    purpose VARCHAR(500),
    receipt_email VARCHAR(255),
    receipt_sent BOOLEAN NOT NULL,
    receipt_sent_at TIMESTAMP,
    stripe_charge_id VARCHAR(100),
    stripe_payment_intent_id VARCHAR(100),
    timestamp TIMESTAMP NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    subscription_id UUID,
    user_id UUID NOT NULL
);
ALTER TABLE donations ADD CONSTRAINT constraint_27 PRIMARY KEY(id);
CREATE INDEX idx_donation_user_id ON donations(user_id NULLS FIRST);
CREATE INDEX idx_donation_timestamp ON donations(timestamp NULLS FIRST);
CREATE INDEX idx_donation_transaction_id ON donations(transaction_id NULLS FIRST);
CREATE INDEX idx_donation_category ON donations(category NULLS FIRST);
CREATE INDEX idx_donation_user_timestamp ON donations(user_id NULLS FIRST, timestamp NULLS FIRST);
CREATE TABLE event_rsvps(
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    guest_count INTEGER,
    notes VARCHAR(500),
    response VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);
ALTER TABLE event_rsvps ADD CONSTRAINT constraint_d1b PRIMARY KEY(event_id, user_id);
CREATE INDEX idx_rsvp_event_id ON event_rsvps(event_id NULLS FIRST);
CREATE INDEX idx_rsvp_user_id ON event_rsvps(user_id NULLS FIRST);
CREATE INDEX idx_rsvp_response ON event_rsvps(response NULLS FIRST);
CREATE INDEX idx_rsvp_timestamp ON event_rsvps(timestamp NULLS FIRST);
CREATE TABLE events(
    id UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    description VARCHAR,
    end_time TIMESTAMP,
    is_recurring BOOLEAN NOT NULL,
    location VARCHAR(500),
    max_attendees INTEGER,
    original_category VARCHAR(255),
    recurrence_end_date TIMESTAMP,
    recurrence_type VARCHAR(255),
    requires_approval BOOLEAN NOT NULL,
    start_time TIMESTAMP NOT NULL,
    status VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    updated_at TIMESTAMP,
    creator_id UUID NOT NULL,
    group_id UUID
);
ALTER TABLE events ADD CONSTRAINT constraint_7a9a PRIMARY KEY(id);
CREATE INDEX idx_event_creator_id ON events(creator_id NULLS FIRST);
CREATE INDEX idx_event_group_id ON events(group_id NULLS FIRST);
CREATE INDEX idx_event_start_time ON events(start_time NULLS FIRST);
CREATE INDEX idx_event_end_time ON events(end_time NULLS FIRST);
CREATE INDEX idx_event_created_at ON events(created_at NULLS FIRST);
CREATE TABLE hashtags(
    id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    last_used TIMESTAMP,
    tag VARCHAR(100) NOT NULL,
    usage_count INTEGER NOT NULL
);
ALTER TABLE hashtags ADD CONSTRAINT constraint_3 PRIMARY KEY(id);
CREATE INDEX idx_hashtags_tag ON hashtags(tag NULLS FIRST);
CREATE INDEX idx_hashtags_usage_count ON hashtags(usage_count NULLS FIRST);
CREATE INDEX idx_hashtags_last_used ON hashtags(last_used NULLS FIRST);
CREATE TABLE messages(
    id UUID NOT NULL,
    content VARCHAR,
    deleted_at TIMESTAMP,
    deleted_by UUID,
    edited_at TIMESTAMP,
    is_deleted BOOLEAN NOT NULL,
    is_edited BOOLEAN NOT NULL,
    media_filename VARCHAR(255),
    media_size BIGINT,
    media_type VARCHAR(50),
    media_url VARCHAR(500),
    mentioned_users VARCHAR,
    message_type VARCHAR(255) NOT NULL,
    reactions VARCHAR,
    system_metadata VARCHAR,
    timestamp TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    chat_group_id UUID NOT NULL,
    parent_message_id UUID,
    user_id UUID NOT NULL
);
ALTER TABLE messages ADD CONSTRAINT constraint_13 PRIMARY KEY(id);
CREATE INDEX idx_message_chat_group ON messages(chat_group_id NULLS FIRST);
CREATE INDEX idx_message_user ON messages(user_id NULLS FIRST);
CREATE INDEX idx_message_timestamp ON messages(timestamp NULLS FIRST);
CREATE INDEX idx_message_type ON messages(message_type NULLS FIRST);
CREATE INDEX idx_message_deleted ON messages(is_deleted NULLS FIRST);
CREATE INDEX idx_message_parent ON messages(parent_message_id NULLS FIRST);
CREATE TABLE post_bookmarks(
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL
);
ALTER TABLE post_bookmarks ADD CONSTRAINT constraint_5 PRIMARY KEY(post_id, user_id);
CREATE TABLE post_comment_media_types(
    comment_id UUID NOT NULL,
    media_type VARCHAR(255)
);
CREATE TABLE post_comment_media_urls(
    comment_id UUID NOT NULL,
    media_url VARCHAR(255)
);
CREATE TABLE post_comments(
    id UUID NOT NULL,
    content VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    is_anonymous BOOLEAN NOT NULL,
    likes_count INTEGER NOT NULL,
    updated_at TIMESTAMP,
    parent_comment_id UUID,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL
);
ALTER TABLE post_comments ADD CONSTRAINT constraint_6 PRIMARY KEY(id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id NULLS FIRST);
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id NULLS FIRST);
CREATE INDEX idx_post_comments_parent_comment_id ON post_comments(parent_comment_id NULLS FIRST);
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at NULLS FIRST);
CREATE TABLE post_hashtags(
    hashtag_id UUID NOT NULL,
    post_id UUID NOT NULL
);
ALTER TABLE post_hashtags ADD CONSTRAINT constraint_9 PRIMARY KEY(hashtag_id, post_id);
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(post_id NULLS FIRST);
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id NULLS FIRST);
CREATE TABLE post_likes(
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL
);
ALTER TABLE post_likes ADD CONSTRAINT constraint_c PRIMARY KEY(post_id, user_id);
CREATE TABLE post_media_types(
    post_id UUID NOT NULL,
    media_type VARCHAR(255)
);
CREATE TABLE post_media_urls(
    post_id UUID NOT NULL,
    media_url VARCHAR(255)
);
CREATE TABLE post_shares(
    id UUID NOT NULL,
    content VARCHAR,
    created_at TIMESTAMP NOT NULL,
    share_type VARCHAR(255) NOT NULL,
    post_id UUID NOT NULL,
    user_id UUID NOT NULL
);
ALTER TABLE post_shares ADD CONSTRAINT constraint_45 PRIMARY KEY(id);
CREATE INDEX idx_post_shares_post_id ON post_shares(post_id NULLS FIRST);
CREATE INDEX idx_post_shares_user_id ON post_shares(user_id NULLS FIRST);
CREATE INDEX idx_post_shares_created_at ON post_shares(created_at NULLS FIRST);
CREATE TABLE posts(
    id UUID NOT NULL,
    bookmarks_count INTEGER NOT NULL,
    category VARCHAR(100),
    comments_count INTEGER NOT NULL,
    content VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL,
    is_anonymous BOOLEAN NOT NULL,
    is_quote BOOLEAN NOT NULL,
    is_reply BOOLEAN NOT NULL,
    likes_count INTEGER NOT NULL,
    location VARCHAR(255),
    post_type VARCHAR(255) NOT NULL,
    shares_count INTEGER NOT NULL,
    updated_at TIMESTAMP,
    parent_post_id UUID,
    quoted_post_id UUID,
    user_id UUID NOT NULL
);
ALTER TABLE posts ADD CONSTRAINT constraint_48c PRIMARY KEY(id);
CREATE INDEX idx_posts_user_id ON posts(user_id NULLS FIRST);
CREATE INDEX idx_posts_created_at ON posts(created_at NULLS FIRST);
CREATE INDEX idx_posts_post_type ON posts(post_type NULLS FIRST);
CREATE INDEX idx_posts_category ON posts(category NULLS FIRST);
CREATE INDEX idx_posts_parent_post_id ON posts(parent_post_id NULLS FIRST);
CREATE INDEX idx_posts_quoted_post_id ON posts(quoted_post_id NULLS FIRST);
CREATE INDEX idx_posts_is_reply ON posts(is_reply NULLS FIRST);
CREATE INDEX idx_posts_is_quote ON posts(is_quote NULLS FIRST);
CREATE TABLE prayer_interactions(
    id UUID NOT NULL,
    content VARCHAR,
    timestamp TIMESTAMP NOT NULL,
    type VARCHAR(255) NOT NULL,
    prayer_id UUID NOT NULL,
    user_id UUID NOT NULL
);
ALTER TABLE prayer_interactions ADD CONSTRAINT constraint_102 PRIMARY KEY(id);
CREATE INDEX idx_prayer_interaction_prayer_id ON prayer_interactions(prayer_id NULLS FIRST);
CREATE INDEX idx_prayer_interaction_user_id ON prayer_interactions(user_id NULLS FIRST);
CREATE INDEX idx_prayer_interaction_type ON prayer_interactions(type NULLS FIRST);
CREATE INDEX idx_prayer_interaction_timestamp ON prayer_interactions(timestamp NULLS FIRST);
CREATE TABLE prayer_requests(
    id UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    description VARCHAR,
    is_anonymous BOOLEAN NOT NULL,
    status VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    updated_at TIMESTAMP,
    user_id UUID NOT NULL
);
ALTER TABLE prayer_requests ADD CONSTRAINT constraint_2767d PRIMARY KEY(id);
CREATE INDEX idx_prayer_user_id ON prayer_requests(user_id NULLS FIRST);
CREATE INDEX idx_prayer_category ON prayer_requests(category NULLS FIRST);
CREATE INDEX idx_prayer_status ON prayer_requests(status NULLS FIRST);
CREATE INDEX idx_prayer_created_at ON prayer_requests(created_at NULLS FIRST);
CREATE TABLE resources(
    id UUID NOT NULL,
    category VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    description VARCHAR,
    download_count INTEGER NOT NULL,
    file_name VARCHAR(500),
    file_size BIGINT,
    file_type VARCHAR(100),
    file_url VARCHAR(1000),
    is_approved BOOLEAN NOT NULL,
    title VARCHAR(200) NOT NULL,
    youtube_channel VARCHAR(200),
    youtube_duration VARCHAR(20),
    youtube_thumbnail_url VARCHAR(1000),
    youtube_title VARCHAR(200),
    youtube_url VARCHAR(500),
    youtube_video_id VARCHAR(50),
    uploaded_by UUID NOT NULL
);
ALTER TABLE resources ADD CONSTRAINT constraint_2fe PRIMARY KEY(id);
CREATE INDEX idx_resource_uploaded_by ON resources(uploaded_by NULLS FIRST);
CREATE INDEX idx_resource_category ON resources(category NULLS FIRST);
CREATE INDEX idx_resource_created_at ON resources(created_at NULLS FIRST);
CREATE INDEX idx_resource_title ON resources(title NULLS FIRST);
CREATE TABLE user_follows(
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL
);
ALTER TABLE user_follows ADD CONSTRAINT constraint_b PRIMARY KEY(follower_id, following_id);
CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id NULLS FIRST);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id NULLS FIRST);
CREATE INDEX idx_user_follows_created_at ON user_follows(created_at NULLS FIRST);
CREATE TABLE user_settings(
    user_id UUID NOT NULL,
    allow_direct_messages BOOLEAN NOT NULL,
    announcement_notifications BOOLEAN NOT NULL,
    auto_backup_enabled BOOLEAN NOT NULL,
    chat_notifications BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    data_sharing_analytics BOOLEAN NOT NULL,
    donation_reminders BOOLEAN NOT NULL,
    email_notifications BOOLEAN NOT NULL,
    event_notifications BOOLEAN NOT NULL,
    event_reminders_hours INTEGER NOT NULL,
    fcm_token VARCHAR(500),
    font_size VARCHAR(255) NOT NULL,
    high_contrast_mode BOOLEAN NOT NULL,
    language VARCHAR(10) NOT NULL,
    last_backup_date TIMESTAMP,
    newsletter_subscription BOOLEAN NOT NULL,
    prayer_notifications BOOLEAN NOT NULL,
    prayer_request_visibility VARCHAR(255) NOT NULL,
    preferred_contact_method VARCHAR(255) NOT NULL,
    profile_visibility VARCHAR(255) NOT NULL,
    push_notifications BOOLEAN NOT NULL,
    reduce_motion BOOLEAN NOT NULL,
    screen_reader_optimized BOOLEAN NOT NULL,
    show_donation_history BOOLEAN NOT NULL,
    show_online_status BOOLEAN NOT NULL,
    theme VARCHAR(255) NOT NULL,
    timezone VARCHAR(50),
    updated_at TIMESTAMP,
    weekly_digest BOOLEAN NOT NULL
);
ALTER TABLE user_settings ADD CONSTRAINT constraint_9ad20e1 PRIMARY KEY(user_id);
CREATE TABLE users(
    id UUID NOT NULL,
    address VARCHAR(500),
    ban_reason VARCHAR,
    banned_at TIMESTAMP,
    bio VARCHAR,
    birthday DATE,
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP,
    email VARCHAR(255) NOT NULL,
    google_id VARCHAR(255),
    interests VARCHAR,
    is_active BOOLEAN NOT NULL,
    is_banned BOOLEAN DEFAULT FALSE NOT NULL,
    last_login TIMESTAMP,
    location VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    phone_number VARCHAR(20),
    profile_pic_url VARCHAR(500),
    role VARCHAR(255) NOT NULL,
    spiritual_gift VARCHAR(255),
    updated_at TIMESTAMP,
    warning_count INTEGER DEFAULT 0 NOT NULL,
    website VARCHAR(500),
    banner_image_url VARCHAR(500),
    equipping_gifts VARCHAR(255)
);
ALTER TABLE users ADD CONSTRAINT constraint_4d4 PRIMARY KEY(id);
CREATE INDEX idx_user_email ON users(email NULLS FIRST);
CREATE INDEX idx_user_google_id ON users(google_id NULLS FIRST);
CREATE TABLE worship_play_history(
    id UUID NOT NULL,
    completed_at TIMESTAMP,
    participant_count INTEGER,
    played_at TIMESTAMP NOT NULL,
    skip_vote_count INTEGER,
    upvote_count INTEGER,
    video_duration INTEGER,
    video_id VARCHAR(100) NOT NULL,
    video_thumbnail_url VARCHAR(500),
    video_title VARCHAR(500) NOT NULL,
    was_skipped BOOLEAN NOT NULL,
    leader_id UUID NOT NULL,
    worship_room_id UUID NOT NULL
);
ALTER TABLE worship_play_history ADD CONSTRAINT constraint_92 PRIMARY KEY(id);
CREATE INDEX idx_worship_history_room ON worship_play_history(worship_room_id NULLS FIRST);
CREATE INDEX idx_worship_history_leader ON worship_play_history(leader_id NULLS FIRST);
CREATE INDEX idx_worship_history_played_at ON worship_play_history(played_at NULLS FIRST);
CREATE INDEX idx_worship_history_video_id ON worship_play_history(video_id NULLS FIRST);
CREATE TABLE worship_queue_entries(
    id UUID NOT NULL,
    completed_at TIMESTAMP,
    played_at TIMESTAMP,
    position INTEGER NOT NULL,
    queued_at TIMESTAMP NOT NULL,
    status VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP,
    video_duration INTEGER,
    video_id VARCHAR(100) NOT NULL,
    video_thumbnail_url VARCHAR(500),
    video_title VARCHAR(500) NOT NULL,
    user_id UUID NOT NULL,
    worship_room_id UUID NOT NULL
);
ALTER TABLE worship_queue_entries ADD CONSTRAINT constraint_d97 PRIMARY KEY(id);
CREATE INDEX idx_worship_queue_room ON worship_queue_entries(worship_room_id NULLS FIRST);
CREATE INDEX idx_worship_queue_user ON worship_queue_entries(user_id NULLS FIRST);
CREATE INDEX idx_worship_queue_status ON worship_queue_entries(status NULLS FIRST);
CREATE INDEX idx_worship_queue_position ON worship_queue_entries(position NULLS FIRST);
CREATE TABLE worship_room_participants(
    id UUID NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_in_waitlist BOOLEAN NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    last_active_at TIMESTAMP NOT NULL,
    left_at TIMESTAMP,
    role VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP,
    waitlist_position INTEGER,
    user_id UUID NOT NULL,
    worship_room_id UUID NOT NULL
);
ALTER TABLE worship_room_participants ADD CONSTRAINT constraint_954 PRIMARY KEY(id);
CREATE INDEX idx_worship_participant_room ON worship_room_participants(worship_room_id NULLS FIRST);
CREATE INDEX idx_worship_participant_user ON worship_room_participants(user_id NULLS FIRST);
CREATE INDEX idx_worship_participant_role ON worship_room_participants(role NULLS FIRST);
CREATE INDEX idx_worship_participant_active ON worship_room_participants(is_active NULLS FIRST);
CREATE TABLE worship_room_settings(
    worship_room_id UUID NOT NULL,
    afk_timeout_minutes INTEGER,
    allow_duplicate_songs BOOLEAN NOT NULL,
    allow_voting BOOLEAN NOT NULL,
    allowed_video_categories VARCHAR,
    auto_advance_queue BOOLEAN NOT NULL,
    banned_video_ids VARCHAR,
    created_at TIMESTAMP NOT NULL,
    enable_chat BOOLEAN NOT NULL,
    enable_waitlist BOOLEAN NOT NULL,
    max_queue_size INTEGER,
    max_song_duration INTEGER,
    max_songs_per_user INTEGER,
    max_waitlist_size INTEGER,
    min_song_duration INTEGER,
    require_approval BOOLEAN NOT NULL,
    skip_threshold FLOAT(53),
    slow_mode_seconds INTEGER,
    song_cooldown_hours INTEGER,
    updated_at TIMESTAMP
);
ALTER TABLE worship_room_settings ADD CONSTRAINT constraint_30 PRIMARY KEY(worship_room_id);
CREATE TABLE worship_rooms(
    id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    current_video_id VARCHAR(100),
    current_video_thumbnail VARCHAR(500),
    current_video_title VARCHAR(500),
    description VARCHAR,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL,
    is_private BOOLEAN NOT NULL,
    max_participants INTEGER,
    name VARCHAR(100) NOT NULL,
    playback_position FLOAT(53),
    playback_started_at TIMESTAMP,
    playback_status VARCHAR(20),
    skip_threshold FLOAT(53),
    updated_at TIMESTAMP,
    created_by UUID NOT NULL,
    current_leader_id UUID
);
ALTER TABLE worship_rooms ADD CONSTRAINT constraint_d4 PRIMARY KEY(id);
CREATE INDEX idx_worship_room_created_by ON worship_rooms(created_by NULLS FIRST);
CREATE INDEX idx_worship_room_is_active ON worship_rooms(is_active NULLS FIRST);
CREATE INDEX idx_worship_room_created_at ON worship_rooms(created_at NULLS FIRST);
CREATE TABLE worship_song_votes(
    id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    vote_type VARCHAR(255) NOT NULL,
    queue_entry_id UUID NOT NULL,
    user_id UUID NOT NULL
);
ALTER TABLE worship_song_votes ADD CONSTRAINT constraint_355 PRIMARY KEY(id);
CREATE INDEX idx_worship_vote_entry ON worship_song_votes(queue_entry_id NULLS FIRST);
CREATE INDEX idx_worship_vote_user ON worship_song_votes(user_id NULLS FIRST);
CREATE INDEX idx_worship_vote_type ON worship_song_votes(vote_type NULLS FIRST);
CREATE TABLE event_bring_claims(
    id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    note VARCHAR(500),
    quantity INTEGER NOT NULL,
    updated_at TIMESTAMP,
    item_id UUID NOT NULL,
    user_id UUID NOT NULL
);
ALTER TABLE event_bring_claims ADD CONSTRAINT constraint_4b PRIMARY KEY(id);
CREATE INDEX idx_event_bring_claims_item_id ON event_bring_claims(item_id NULLS FIRST);
CREATE INDEX idx_event_bring_claims_user_id ON event_bring_claims(user_id NULLS FIRST);
CREATE TABLE event_bring_items(
    id UUID NOT NULL,
    allow_multiple_claims BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    description VARCHAR(500),
    name VARCHAR(200) NOT NULL,
    quantity_needed INTEGER,
    updated_at TIMESTAMP,
    created_by UUID,
    event_id UUID NOT NULL
);
ALTER TABLE event_bring_items ADD CONSTRAINT constraint_8f PRIMARY KEY(id);
CREATE INDEX idx_event_bring_items_event_id ON event_bring_items(event_id NULLS FIRST);
CREATE INDEX idx_event_bring_items_created_by ON event_bring_items(created_by NULLS FIRST);
ALTER TABLE chat_group_members ADD CONSTRAINT constraint_a CHECK(member_role IN('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER', 'GUEST', 'RESTRICTED'));
ALTER TABLE chat_groups ADD CONSTRAINT constraint_87 CHECK(type IN('MAIN', 'SUBGROUP', 'PRIVATE', 'DIRECT_MESSAGE', 'ANNOUNCEMENT', 'PRAYER', 'MINISTRY', 'EVENT', 'STUDY', 'YOUTH', 'MENS', 'WOMENS', 'LEADERSHIP'));
ALTER TABLE donations ADD CONSTRAINT constraint_2 CHECK(category IN('TITHES', 'OFFERINGS', 'MISSIONS'));
ALTER TABLE post_shares ADD CONSTRAINT constraint_4 CHECK(share_type IN('REPOST', 'QUOTE'));
ALTER TABLE events ADD CONSTRAINT constraint_7 CHECK(category IN('GENERAL', 'WORSHIP', 'BIBLE_STUDY', 'PRAYER', 'FELLOWSHIP', 'OUTREACH', 'YOUTH', 'CHILDREN', 'MENS', 'WOMENS', 'SENIORS', 'MISSIONS', 'MINISTRY', 'SOCIAL', 'EDUCATION', 'MUSIC', 'OTHER', 'MENS_MINISTRY', 'WOMENS_MINISTRY', 'SPECIAL_EVENT', 'MEETING', 'VOLUNTEER'));
ALTER TABLE messages ADD CONSTRAINT constraint_1 CHECK(message_type IN('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LINK', 'SYSTEM', 'ANNOUNCEMENT', 'POLL', 'LOCATION', 'CONTACT', 'STICKER', 'GIF'));
ALTER TABLE worship_room_participants ADD CONSTRAINT constraint_95 CHECK(role IN('LISTENER', 'DJ', 'LEADER', 'MODERATOR'));
ALTER TABLE events ADD CONSTRAINT constraint_7a CHECK(recurrence_type IN('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'));
ALTER TABLE announcements ADD CONSTRAINT constraint_d CHECK(category IN('GENERAL', 'WORSHIP', 'EVENTS', 'MINISTRY', 'YOUTH', 'MISSIONS', 'PRAYER', 'COMMUNITY', 'URGENT', 'CELEBRATION'));
ALTER TABLE donation_subscriptions ADD CONSTRAINT constraint_e CHECK(category IN('TITHES', 'OFFERINGS', 'MISSIONS'));
ALTER TABLE prayer_requests ADD CONSTRAINT constraint_276 CHECK(category IN('HEALTH', 'FAMILY', 'PRAISE', 'GUIDANCE', 'HEALING', 'SALVATION', 'WORK', 'TRAVEL', 'GENERAL', 'THANKSGIVING', 'PROTECTION', 'FINANCIAL', 'RELATIONSHIPS'));
ALTER TABLE events ADD CONSTRAINT constraint_7a9 CHECK(status IN('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'));
ALTER TABLE user_settings ADD CONSTRAINT constraint_9ad20 CHECK(profile_visibility IN('PUBLIC', 'CHURCH_MEMBERS', 'FRIENDS_ONLY', 'PRIVATE'));
ALTER TABLE resources ADD CONSTRAINT constraint_2f CHECK(category IN('GENERAL', 'BIBLE_STUDY', 'DEVOTIONAL', 'SERMON', 'WORSHIP', 'PRAYER', 'YOUTH', 'CHILDREN', 'MENS_MINISTRY', 'WOMENS_MINISTRY', 'SMALL_GROUPS', 'MINISTRY_RESOURCES', 'ANNOUNCEMENTS', 'FORMS', 'POLICIES', 'TRAINING', 'MUSIC', 'AUDIO', 'VIDEO', 'DOCUMENTS', 'IMAGES', 'OTHER'));
ALTER TABLE user_settings ADD CONSTRAINT constraint_9a CHECK(font_size IN('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'));
ALTER TABLE prayer_interactions ADD CONSTRAINT constraint_10 CHECK(type IN('PRAY', 'COMMENT', 'ENCOURAGE', 'AMEN', 'HEART', 'PRAISE'));
ALTER TABLE user_settings ADD CONSTRAINT constraint_9ad20e CHECK(theme IN('LIGHT', 'DARK', 'AUTO'));
ALTER TABLE posts ADD CONSTRAINT constraint_48 CHECK(post_type IN('GENERAL', 'PRAYER', 'TESTIMONY', 'ANNOUNCEMENT'));
ALTER TABLE users ADD CONSTRAINT constraint_4d CHECK(role IN('MEMBER', 'MODERATOR', 'ADMIN'));
ALTER TABLE donation_subscriptions ADD CONSTRAINT constraint_e8 CHECK(frequency IN('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'));
ALTER TABLE event_rsvps ADD CONSTRAINT constraint_d1 CHECK(response IN('YES', 'NO', 'MAYBE'));
ALTER TABLE worship_song_votes ADD CONSTRAINT constraint_35 CHECK(vote_type IN('UPVOTE', 'SKIP'));
ALTER TABLE prayer_requests ADD CONSTRAINT constraint_2767 CHECK(status IN('ACTIVE', 'ANSWERED', 'RESOLVED', 'ARCHIVED'));
ALTER TABLE worship_queue_entries ADD CONSTRAINT constraint_d9 CHECK(status IN('WAITING', 'PLAYING', 'COMPLETED', 'SKIPPED'));
ALTER TABLE user_settings ADD CONSTRAINT constraint_9ad CHECK(prayer_request_visibility IN('PUBLIC', 'CHURCH_MEMBERS', 'PRIVATE', 'ANONYMOUS'));
ALTER TABLE donation_subscriptions ADD CONSTRAINT constraint_e8f CHECK(status IN('ACTIVE', 'CANCELED', 'PAST_DUE', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID'));
ALTER TABLE user_settings ADD CONSTRAINT constraint_9ad2 CHECK(preferred_contact_method IN('EMAIL', 'PHONE', 'APP_ONLY', 'NONE'));
ALTER TABLE worship_song_votes ADD CONSTRAINT uk_worship_vote UNIQUE(queue_entry_id, user_id, vote_type);
ALTER TABLE worship_room_participants ADD CONSTRAINT uk_worship_participant UNIQUE(worship_room_id, user_id);
ALTER TABLE donations ADD CONSTRAINT uk_1jmptl6ntsqt03qvtshfq6mus UNIQUE(transaction_id);
ALTER TABLE donation_subscriptions ADD CONSTRAINT uk_jxw7nf8x4qlc865bs6tgk9dn2 UNIQUE(stripe_subscription_id);
ALTER TABLE event_bring_claims ADD CONSTRAINT uq_event_bring_claim UNIQUE(item_id, user_id);
ALTER TABLE hashtags ADD CONSTRAINT uk_2iu9ec68uadi38oo9e9p13q5m UNIQUE(tag);
ALTER TABLE users ADD CONSTRAINT uk_6dotkott2kjsp8vw4d0m25fb7 UNIQUE(email);
ALTER TABLE chat_group_members ADD CONSTRAINT uk_user_group UNIQUE(user_id, chat_group_id);
ALTER TABLE post_comments ADD CONSTRAINT fksnxoecngu89u3fh4wdrgf0f2g FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE messages ADD CONSTRAINT fkpsmh6clh3csorw43eaodlqvkn FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE event_bring_items ADD CONSTRAINT fkbpt2wndacgsjid40jy7oynxx FOREIGN KEY(created_by) REFERENCES users(id);
ALTER TABLE user_settings ADD CONSTRAINT fk8v82nj88rmai0nyck19f873dw FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE prayer_requests ADD CONSTRAINT fkamqkwb6154uudk58yxabhlltv FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE post_comments ADD CONSTRAINT fk21q7y8a124im4g0l4aaxn4ol1 FOREIGN KEY(parent_comment_id) REFERENCES post_comments(id);
ALTER TABLE event_rsvps ADD CONSTRAINT fk46d4781rhlidxpk7m9qg0eqsy FOREIGN KEY(event_id) REFERENCES events(id);
ALTER TABLE post_media_types ADD CONSTRAINT fk4j95rquelhtlfqaj3mpwrinla FOREIGN KEY(post_id) REFERENCES posts(id);
ALTER TABLE worship_room_participants ADD CONSTRAINT fkimvp6qs1dw68413mh28xparh2 FOREIGN KEY(worship_room_id) REFERENCES worship_rooms(id);
ALTER TABLE worship_queue_entries ADD CONSTRAINT fkk1o1vmj2vyk8e9a5nx6qxcy13 FOREIGN KEY(worship_room_id) REFERENCES worship_rooms(id);
ALTER TABLE post_comment_media_urls ADD CONSTRAINT fkk7kp1xou5lhqjdlrj5ee8im81 FOREIGN KEY(comment_id) REFERENCES post_comments(id);
ALTER TABLE announcements ADD CONSTRAINT fklfxjojfcdhlx73ofpifkc6j92 FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE audit_log_details ADD CONSTRAINT fkccxqjxnp62ptfumge14ck90ak FOREIGN KEY(audit_log_id) REFERENCES audit_logs(id);
ALTER TABLE worship_rooms ADD CONSTRAINT fk68i3epvx7afymm7jylmyn6jgp FOREIGN KEY(created_by) REFERENCES users(id);
ALTER TABLE posts ADD CONSTRAINT fk5lidm6cqbc7u4xhqpxm898qme FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE worship_song_votes ADD CONSTRAINT fkj1w70ipidsa6g7728t1syptd5 FOREIGN KEY(queue_entry_id) REFERENCES worship_queue_entries(id);
ALTER TABLE resources ADD CONSTRAINT fkf3dn169v0hyegkheyvmck8x5l FOREIGN KEY(uploaded_by) REFERENCES users(id);
ALTER TABLE chat_groups ADD CONSTRAINT fkfmxjt8wof1k93nf0imifnih6q FOREIGN KEY(created_by) REFERENCES users(id);
ALTER TABLE event_bring_claims ADD CONSTRAINT fk78mamu581oxass6hjl8ny4wjo FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE post_media_urls ADD CONSTRAINT fk5at7kq4on2x0x29rcr1eui50f FOREIGN KEY(post_id) REFERENCES posts(id);
ALTER TABLE posts ADD CONSTRAINT fkthylir8ewq8pgukgw6iam541 FOREIGN KEY(quoted_post_id) REFERENCES posts(id);
ALTER TABLE worship_play_history ADD CONSTRAINT fkk695ws1tt3spfmprhykq3qac0 FOREIGN KEY(leader_id) REFERENCES users(id);
ALTER TABLE event_bring_items ADD CONSTRAINT fk28m8ttwl03pcqefbinrpte9kl FOREIGN KEY(event_id) REFERENCES events(id);
ALTER TABLE post_bookmarks ADD CONSTRAINT fk9b5c09u5arho7ei76d78bn7ww FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE messages ADD CONSTRAINT fk8cs7qdu3mdbr08xirdmsfxpgk FOREIGN KEY(parent_message_id) REFERENCES messages(id);
ALTER TABLE donations ADD CONSTRAINT fk2aa90vd3jc4ih742vpdotsrst FOREIGN KEY(subscription_id) REFERENCES donation_subscriptions(id);
ALTER TABLE events ADD CONSTRAINT fk1i9l1342ujwmwa1sssh0vdeop FOREIGN KEY(group_id) REFERENCES chat_groups(id);
ALTER TABLE prayer_interactions ADD CONSTRAINT fkhbqopinyhs8o0i6m87mtshvyd FOREIGN KEY(prayer_id) REFERENCES prayer_requests(id);
ALTER TABLE worship_song_votes ADD CONSTRAINT fk9o5lqq0xgxqrrk8tmckio5l10 FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE worship_rooms ADD CONSTRAINT fk87c5cwp0vw3xm3l7uci9iqcxl FOREIGN KEY(current_leader_id) REFERENCES users(id);
ALTER TABLE posts ADD CONSTRAINT fks9qqorlnw8545u7motk55f91g FOREIGN KEY(parent_post_id) REFERENCES posts(id);
ALTER TABLE post_comment_media_types ADD CONSTRAINT fkrt6yigj4sb0fudsyyc59x3sss FOREIGN KEY(comment_id) REFERENCES post_comments(id);
ALTER TABLE donations ADD CONSTRAINT fkd2p196clbvqgbemy05ndspwu FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE post_shares ADD CONSTRAINT fkhrf6mxii6ey1akrwfd5xwp85c FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE prayer_interactions ADD CONSTRAINT fkdk5wlgt8dhdog0ieqek0bobf4 FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE post_shares ADD CONSTRAINT fkaqcgoc82dbvm91c4s6ybp0d80 FOREIGN KEY(post_id) REFERENCES posts(id);
ALTER TABLE worship_room_settings ADD CONSTRAINT fk6bp3kdpjgucwv9uyy41arsf5h FOREIGN KEY(worship_room_id) REFERENCES worship_rooms(id);
ALTER TABLE post_comments ADD CONSTRAINT fkaawaqxjs3br8dw5v90w7uu514 FOREIGN KEY(post_id) REFERENCES posts(id);
ALTER TABLE worship_play_history ADD CONSTRAINT fk5uajxlxiabg50j4qkowvfydxf FOREIGN KEY(worship_room_id) REFERENCES worship_rooms(id);
ALTER TABLE event_rsvps ADD CONSTRAINT fke51sdypclsvg35oo2iscsxa3v FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE worship_room_participants ADD CONSTRAINT fktcu4fmgr6o7tm307bqyh1qr4m FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE post_bookmarks ADD CONSTRAINT fkclpw1l6wrci96rfj0dtt3bfah FOREIGN KEY(post_id) REFERENCES posts(id);
ALTER TABLE donation_subscriptions ADD CONSTRAINT fk8op5g85r83c8lyfe49kdp3vse FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE worship_queue_entries ADD CONSTRAINT fkm1lruk61hlju49sb6ue0vc4ov FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE messages ADD CONSTRAINT fksyd4u23sd5aet59v3o8fsxw03 FOREIGN KEY(chat_group_id) REFERENCES chat_groups(id);
ALTER TABLE event_bring_claims ADD CONSTRAINT fkrpd5s04awtm0rdu690mxq8vyq FOREIGN KEY(item_id) REFERENCES event_bring_items(id);
ALTER TABLE chat_group_members ADD CONSTRAINT fkewjk3724m9ci5f5ynd8k8b16k FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE chat_group_members ADD CONSTRAINT fklvoe5sok23sdg7lcf8cyncj0n FOREIGN KEY(chat_group_id) REFERENCES chat_groups(id);
ALTER TABLE events ADD CONSTRAINT fk7ljm71n1057envlomdxcni5hs FOREIGN KEY(creator_id) REFERENCES users(id);