--
-- PostgreSQL database dump
--

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.announcements (
    id uuid NOT NULL,
    category character varying(255) NOT NULL,
    content character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    image_url character varying(500),
    is_pinned boolean NOT NULL,
    title character varying(200) NOT NULL,
    updated_at timestamp without time zone,
    user_id uuid NOT NULL,
    organization_id uuid,
    CONSTRAINT constraint_d CHECK (((category)::text = ANY ((ARRAY['GENERAL'::character varying, 'WORSHIP'::character varying, 'EVENTS'::character varying, 'MINISTRY'::character varying, 'YOUTH'::character varying, 'MISSIONS'::character varying, 'PRAYER'::character varying, 'COMMUNITY'::character varying, 'URGENT'::character varying, 'CELEBRATION'::character varying])::text[])))
);


ALTER TABLE public.announcements OWNER TO church_user;

--
-- Name: audit_log_details; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.audit_log_details (
    audit_log_id uuid NOT NULL,
    detail_value character varying,
    detail_key character varying(255) NOT NULL
);


ALTER TABLE public.audit_log_details OWNER TO church_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    action character varying(255) NOT NULL,
    ip_address character varying(45),
    target_id uuid,
    target_type character varying(100),
    "timestamp" timestamp without time zone NOT NULL,
    user_agent character varying(500),
    user_id uuid NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO church_user;

--
-- Name: chat_group_members; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.chat_group_members (
    id uuid NOT NULL,
    custom_name character varying(50),
    invited_by uuid,
    is_active boolean NOT NULL,
    is_muted boolean NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    last_read_at timestamp without time zone,
    left_at timestamp without time zone,
    member_role character varying(255) NOT NULL,
    notifications_enabled boolean NOT NULL,
    updated_at timestamp without time zone,
    chat_group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT constraint_a CHECK (((member_role)::text = ANY ((ARRAY['OWNER'::character varying, 'ADMIN'::character varying, 'MODERATOR'::character varying, 'MEMBER'::character varying, 'GUEST'::character varying, 'RESTRICTED'::character varying])::text[])))
);


ALTER TABLE public.chat_group_members OWNER TO church_user;

--
-- Name: chat_groups; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.chat_groups (
    id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL,
    description character varying,
    image_url character varying(500),
    is_active boolean NOT NULL,
    is_private boolean NOT NULL,
    max_members integer,
    name character varying(100) NOT NULL,
    type character varying(255) NOT NULL,
    updated_at timestamp without time zone,
    created_by uuid,
    CONSTRAINT constraint_87 CHECK (((type)::text = ANY ((ARRAY['MAIN'::character varying, 'SUBGROUP'::character varying, 'PRIVATE'::character varying, 'DIRECT_MESSAGE'::character varying, 'ANNOUNCEMENT'::character varying, 'PRAYER'::character varying, 'MINISTRY'::character varying, 'EVENT'::character varying, 'STUDY'::character varying, 'YOUTH'::character varying, 'MENS'::character varying, 'WOMENS'::character varying, 'LEADERSHIP'::character varying])::text[])))
);


ALTER TABLE public.chat_groups OWNER TO church_user;

--
-- Name: donation_subscriptions; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.donation_subscriptions (
    id uuid NOT NULL,
    amount numeric(19,2) NOT NULL,
    canceled_at timestamp without time zone,
    category character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    currency character varying(3) NOT NULL,
    current_period_end timestamp without time zone,
    current_period_start timestamp without time zone,
    ended_at timestamp without time zone,
    failure_count integer NOT NULL,
    frequency character varying(20) NOT NULL,
    last_failure_date timestamp without time zone,
    last_failure_reason character varying(500),
    next_payment_date timestamp without time zone,
    notes character varying(1000),
    payment_method_brand character varying(20),
    payment_method_last4 character varying(4),
    purpose character varying(500),
    started_at timestamp without time zone,
    status character varying(30) NOT NULL,
    stripe_customer_id character varying(100) NOT NULL,
    stripe_price_id character varying(100) NOT NULL,
    stripe_subscription_id character varying(100) NOT NULL,
    trial_end timestamp without time zone,
    trial_start timestamp without time zone,
    updated_at timestamp without time zone,
    user_id uuid NOT NULL,
    organization_id uuid,
    CONSTRAINT constraint_e CHECK (((category)::text = ANY ((ARRAY['TITHES'::character varying, 'OFFERINGS'::character varying, 'MISSIONS'::character varying])::text[]))),
    CONSTRAINT constraint_e8 CHECK (((frequency)::text = ANY ((ARRAY['WEEKLY'::character varying, 'MONTHLY'::character varying, 'QUARTERLY'::character varying, 'YEARLY'::character varying])::text[]))),
    CONSTRAINT constraint_e8f CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'CANCELED'::character varying, 'PAST_DUE'::character varying, 'INCOMPLETE'::character varying, 'INCOMPLETE_EXPIRED'::character varying, 'TRIALING'::character varying, 'UNPAID'::character varying])::text[])))
);


ALTER TABLE public.donation_subscriptions OWNER TO church_user;

--
-- Name: donations; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.donations (
    id uuid NOT NULL,
    amount numeric(19,2) NOT NULL,
    category character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    currency character varying(3) NOT NULL,
    fee_amount numeric(19,2),
    is_recurring boolean NOT NULL,
    net_amount numeric(19,2),
    notes character varying(1000),
    payment_method_brand character varying(20),
    payment_method_last4 character varying(4),
    purpose character varying(500),
    receipt_email character varying(255),
    receipt_sent boolean NOT NULL,
    receipt_sent_at timestamp without time zone,
    stripe_charge_id character varying(100),
    stripe_payment_intent_id character varying(100),
    "timestamp" timestamp without time zone NOT NULL,
    transaction_id character varying(100) NOT NULL,
    subscription_id uuid,
    user_id uuid NOT NULL,
    organization_id uuid,
    CONSTRAINT constraint_2 CHECK (((category)::text = ANY ((ARRAY['TITHES'::character varying, 'OFFERINGS'::character varying, 'MISSIONS'::character varying])::text[])))
);


ALTER TABLE public.donations OWNER TO church_user;

--
-- Name: event_bring_claims; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.event_bring_claims (
    id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL,
    note character varying(500),
    quantity integer NOT NULL,
    updated_at timestamp without time zone,
    item_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.event_bring_claims OWNER TO church_user;

--
-- Name: event_bring_items; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.event_bring_items (
    id uuid NOT NULL,
    allow_multiple_claims boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    description character varying(500),
    name character varying(200) NOT NULL,
    quantity_needed integer,
    updated_at timestamp without time zone,
    created_by uuid,
    event_id uuid NOT NULL
);


ALTER TABLE public.event_bring_items OWNER TO church_user;

--
-- Name: event_rsvps; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.event_rsvps (
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    guest_count integer,
    notes character varying(500),
    response character varying(255) NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    CONSTRAINT constraint_d1 CHECK (((response)::text = ANY ((ARRAY['YES'::character varying, 'NO'::character varying, 'MAYBE'::character varying])::text[])))
);


ALTER TABLE public.event_rsvps OWNER TO church_user;

--
-- Name: events; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.events (
    id uuid NOT NULL,
    category character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    description character varying,
    end_time timestamp without time zone,
    is_recurring boolean NOT NULL,
    location character varying(500),
    max_attendees integer,
    original_category character varying(255),
    recurrence_end_date timestamp without time zone,
    recurrence_type character varying(255),
    requires_approval boolean NOT NULL,
    start_time timestamp without time zone NOT NULL,
    status character varying(255) NOT NULL,
    title character varying(200) NOT NULL,
    updated_at timestamp without time zone,
    creator_id uuid NOT NULL,
    group_id uuid,
    bring_list_enabled boolean DEFAULT false NOT NULL,
    organization_id uuid,
    CONSTRAINT constraint_7 CHECK (((category)::text = ANY ((ARRAY['GENERAL'::character varying, 'WORSHIP'::character varying, 'BIBLE_STUDY'::character varying, 'PRAYER'::character varying, 'FELLOWSHIP'::character varying, 'OUTREACH'::character varying, 'YOUTH'::character varying, 'CHILDREN'::character varying, 'MENS'::character varying, 'WOMENS'::character varying, 'SENIORS'::character varying, 'MISSIONS'::character varying, 'MINISTRY'::character varying, 'SOCIAL'::character varying, 'EDUCATION'::character varying, 'MUSIC'::character varying, 'OTHER'::character varying, 'MENS_MINISTRY'::character varying, 'WOMENS_MINISTRY'::character varying, 'SPECIAL_EVENT'::character varying, 'MEETING'::character varying, 'VOLUNTEER'::character varying])::text[]))),
    CONSTRAINT constraint_7a CHECK (((recurrence_type)::text = ANY ((ARRAY['DAILY'::character varying, 'WEEKLY'::character varying, 'MONTHLY'::character varying, 'YEARLY'::character varying])::text[]))),
    CONSTRAINT constraint_7a9 CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'POSTPONED'::character varying])::text[])))
);


ALTER TABLE public.events OWNER TO church_user;

--
-- Name: feed_preferences; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.feed_preferences (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    active_filter character varying(30) NOT NULL,
    selected_group_ids jsonb,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    CONSTRAINT chk_feed_preferences_filter CHECK (((active_filter)::text = ANY ((ARRAY['ALL'::character varying, 'PRIMARY_ONLY'::character varying, 'SELECTED_GROUPS'::character varying])::text[])))
);


ALTER TABLE public.feed_preferences OWNER TO church_user;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE public.flyway_schema_history OWNER TO church_user;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.groups (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(30) NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_by_org_id uuid,
    tags jsonb,
    allowed_org_ids jsonb,
    settings jsonb,
    member_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    CONSTRAINT chk_groups_type CHECK (((type)::text = ANY ((ARRAY['PUBLIC'::character varying, 'ORG_PRIVATE'::character varying, 'CROSS_ORG'::character varying, 'INVITE_ONLY'::character varying])::text[])))
);


ALTER TABLE public.groups OWNER TO church_user;

--
-- Name: hashtags; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.hashtags (
    id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL,
    last_used timestamp without time zone,
    tag character varying(100) NOT NULL,
    usage_count integer NOT NULL
);


ALTER TABLE public.hashtags OWNER TO church_user;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.messages (
    id uuid NOT NULL,
    content character varying,
    deleted_at timestamp without time zone,
    deleted_by uuid,
    edited_at timestamp without time zone,
    is_deleted boolean NOT NULL,
    is_edited boolean NOT NULL,
    media_filename character varying(255),
    media_size bigint,
    media_type character varying(50),
    media_url character varying(500),
    mentioned_users character varying,
    message_type character varying(255) NOT NULL,
    reactions character varying,
    system_metadata character varying,
    "timestamp" timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    chat_group_id uuid NOT NULL,
    parent_message_id uuid,
    user_id uuid NOT NULL,
    CONSTRAINT constraint_1 CHECK (((message_type)::text = ANY ((ARRAY['TEXT'::character varying, 'IMAGE'::character varying, 'VIDEO'::character varying, 'AUDIO'::character varying, 'DOCUMENT'::character varying, 'LINK'::character varying, 'SYSTEM'::character varying, 'ANNOUNCEMENT'::character varying, 'POLL'::character varying, 'LOCATION'::character varying, 'CONTACT'::character varying, 'STICKER'::character varying, 'GIF'::character varying])::text[])))
);


ALTER TABLE public.messages OWNER TO church_user;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    tier character varying(20) NOT NULL,
    status character varying(30) NOT NULL,
    stripe_connect_account_id character varying(255),
    subscription_expires_at timestamp without time zone,
    settings jsonb,
    metadata jsonb,
    parent_organization_id uuid,
    member_count integer DEFAULT 0 NOT NULL,
    primary_member_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone,
    CONSTRAINT chk_organizations_status CHECK (((status)::text = ANY ((ARRAY['TRIAL'::character varying, 'ACTIVE'::character varying, 'SUSPENDED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT chk_organizations_tier CHECK (((tier)::text = ANY ((ARRAY['BASIC'::character varying, 'PREMIUM'::character varying])::text[]))),
    CONSTRAINT chk_organizations_type CHECK (((type)::text = ANY ((ARRAY['CHURCH'::character varying, 'MINISTRY'::character varying, 'NONPROFIT'::character varying, 'GLOBAL'::character varying])::text[])))
);


ALTER TABLE public.organizations OWNER TO church_user;

--
-- Name: post_bookmarks; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_bookmarks (
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.post_bookmarks OWNER TO church_user;

--
-- Name: post_comment_media_types; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_comment_media_types (
    comment_id uuid NOT NULL,
    media_type character varying(255)
);


ALTER TABLE public.post_comment_media_types OWNER TO church_user;

--
-- Name: post_comment_media_urls; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_comment_media_urls (
    comment_id uuid NOT NULL,
    media_url character varying(255)
);


ALTER TABLE public.post_comment_media_urls OWNER TO church_user;

--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_comments (
    id uuid NOT NULL,
    content character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    is_anonymous boolean NOT NULL,
    likes_count integer NOT NULL,
    updated_at timestamp without time zone,
    parent_comment_id uuid,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.post_comments OWNER TO church_user;

--
-- Name: post_hashtags; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_hashtags (
    hashtag_id uuid NOT NULL,
    post_id uuid NOT NULL
);


ALTER TABLE public.post_hashtags OWNER TO church_user;

--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_likes (
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.post_likes OWNER TO church_user;

--
-- Name: post_media_types; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_media_types (
    post_id uuid NOT NULL,
    media_type character varying(255)
);


ALTER TABLE public.post_media_types OWNER TO church_user;

--
-- Name: post_media_urls; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_media_urls (
    post_id uuid NOT NULL,
    media_url character varying(255)
);


ALTER TABLE public.post_media_urls OWNER TO church_user;

--
-- Name: post_shares; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.post_shares (
    id uuid NOT NULL,
    content character varying,
    created_at timestamp without time zone NOT NULL,
    share_type character varying(255) NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT constraint_4 CHECK (((share_type)::text = ANY ((ARRAY['REPOST'::character varying, 'QUOTE'::character varying])::text[])))
);


ALTER TABLE public.post_shares OWNER TO church_user;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.posts (
    id uuid NOT NULL,
    bookmarks_count integer NOT NULL,
    category character varying(100),
    comments_count integer NOT NULL,
    content character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    is_anonymous boolean NOT NULL,
    is_quote boolean NOT NULL,
    is_reply boolean NOT NULL,
    likes_count integer NOT NULL,
    location character varying(255),
    post_type character varying(255) NOT NULL,
    shares_count integer NOT NULL,
    updated_at timestamp without time zone,
    parent_post_id uuid,
    quoted_post_id uuid,
    user_id uuid NOT NULL,
    organization_id uuid,
    group_id uuid,
    user_primary_org_id_snapshot uuid,
    visibility character varying(20) DEFAULT 'PUBLIC'::character varying,
    CONSTRAINT chk_posts_visibility CHECK (((visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'ORG_ONLY'::character varying])::text[]))),
    CONSTRAINT constraint_48 CHECK (((post_type)::text = ANY ((ARRAY['GENERAL'::character varying, 'PRAYER'::character varying, 'TESTIMONY'::character varying, 'ANNOUNCEMENT'::character varying])::text[])))
);


ALTER TABLE public.posts OWNER TO church_user;

--
-- Name: prayer_interactions; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.prayer_interactions (
    id uuid NOT NULL,
    content character varying,
    "timestamp" timestamp without time zone NOT NULL,
    type character varying(255) NOT NULL,
    prayer_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_interaction_id uuid,
    CONSTRAINT constraint_10 CHECK (((type)::text = ANY ((ARRAY['PRAY'::character varying, 'COMMENT'::character varying, 'ENCOURAGE'::character varying, 'AMEN'::character varying, 'HEART'::character varying, 'PRAISE'::character varying])::text[])))
);


ALTER TABLE public.prayer_interactions OWNER TO church_user;

--
-- Name: prayer_requests; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.prayer_requests (
    id uuid NOT NULL,
    category character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    description character varying,
    is_anonymous boolean NOT NULL,
    status character varying(255) NOT NULL,
    title character varying(200) NOT NULL,
    updated_at timestamp without time zone,
    user_id uuid NOT NULL,
    image_url character varying(500),
    organization_id uuid,
    CONSTRAINT constraint_276 CHECK (((category)::text = ANY ((ARRAY['HEALTH'::character varying, 'FAMILY'::character varying, 'PRAISE'::character varying, 'GUIDANCE'::character varying, 'HEALING'::character varying, 'SALVATION'::character varying, 'WORK'::character varying, 'TRAVEL'::character varying, 'GENERAL'::character varying, 'THANKSGIVING'::character varying, 'PROTECTION'::character varying, 'FINANCIAL'::character varying, 'RELATIONSHIPS'::character varying])::text[]))),
    CONSTRAINT constraint_2767 CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'ANSWERED'::character varying, 'RESOLVED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE public.prayer_requests OWNER TO church_user;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.resources (
    id uuid NOT NULL,
    category character varying(255) NOT NULL,
    created_at timestamp without time zone NOT NULL,
    description character varying,
    download_count integer NOT NULL,
    file_name character varying(500),
    file_size bigint,
    file_type character varying(100),
    file_url character varying(1000),
    is_approved boolean NOT NULL,
    title character varying(200) NOT NULL,
    youtube_channel character varying(200),
    youtube_duration character varying(20),
    youtube_thumbnail_url character varying(1000),
    youtube_title character varying(200),
    youtube_url character varying(500),
    youtube_video_id character varying(50),
    uploaded_by uuid NOT NULL,
    CONSTRAINT constraint_2f CHECK (((category)::text = ANY ((ARRAY['GENERAL'::character varying, 'BIBLE_STUDY'::character varying, 'DEVOTIONAL'::character varying, 'SERMON'::character varying, 'WORSHIP'::character varying, 'PRAYER'::character varying, 'YOUTH'::character varying, 'CHILDREN'::character varying, 'MENS_MINISTRY'::character varying, 'WOMENS_MINISTRY'::character varying, 'SMALL_GROUPS'::character varying, 'MINISTRY_RESOURCES'::character varying, 'ANNOUNCEMENTS'::character varying, 'FORMS'::character varying, 'POLICIES'::character varying, 'TRAINING'::character varying, 'MUSIC'::character varying, 'AUDIO'::character varying, 'VIDEO'::character varying, 'DOCUMENTS'::character varying, 'IMAGES'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.resources OWNER TO church_user;

--
-- Name: user_follows; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.user_follows (
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_follows OWNER TO church_user;

--
-- Name: user_group_memberships; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.user_group_memberships (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    group_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    CONSTRAINT chk_user_group_membership_role CHECK (((role)::text = ANY ((ARRAY['MEMBER'::character varying, 'MODERATOR'::character varying, 'CREATOR'::character varying])::text[])))
);


ALTER TABLE public.user_group_memberships OWNER TO church_user;

--
-- Name: user_organization_history; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.user_organization_history (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    from_organization_id uuid,
    to_organization_id uuid,
    switched_at timestamp without time zone NOT NULL,
    reason text
);


ALTER TABLE public.user_organization_history OWNER TO church_user;

--
-- Name: user_organization_memberships; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.user_organization_memberships (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    role character varying(20) NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    CONSTRAINT chk_user_org_role CHECK (((role)::text = ANY ((ARRAY['MEMBER'::character varying, 'MODERATOR'::character varying, 'ADMIN'::character varying])::text[])))
);


ALTER TABLE public.user_organization_memberships OWNER TO church_user;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.user_settings (
    user_id uuid NOT NULL,
    allow_direct_messages boolean NOT NULL,
    announcement_notifications boolean NOT NULL,
    auto_backup_enabled boolean NOT NULL,
    chat_notifications boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    data_sharing_analytics boolean NOT NULL,
    donation_reminders boolean NOT NULL,
    email_notifications boolean NOT NULL,
    event_notifications boolean NOT NULL,
    event_reminders_hours integer NOT NULL,
    fcm_token character varying(500),
    font_size character varying(255) NOT NULL,
    high_contrast_mode boolean NOT NULL,
    language character varying(10) NOT NULL,
    last_backup_date timestamp without time zone,
    newsletter_subscription boolean NOT NULL,
    prayer_notifications boolean NOT NULL,
    prayer_request_visibility character varying(255) NOT NULL,
    preferred_contact_method character varying(255) NOT NULL,
    profile_visibility character varying(255) NOT NULL,
    push_notifications boolean NOT NULL,
    reduce_motion boolean NOT NULL,
    screen_reader_optimized boolean NOT NULL,
    show_donation_history boolean NOT NULL,
    show_online_status boolean NOT NULL,
    theme character varying(255) NOT NULL,
    timezone character varying(50),
    updated_at timestamp without time zone,
    weekly_digest boolean NOT NULL,
    CONSTRAINT constraint_9a CHECK (((font_size)::text = ANY ((ARRAY['SMALL'::character varying, 'MEDIUM'::character varying, 'LARGE'::character varying, 'EXTRA_LARGE'::character varying])::text[]))),
    CONSTRAINT constraint_9ad CHECK (((prayer_request_visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'CHURCH_MEMBERS'::character varying, 'PRIVATE'::character varying, 'ANONYMOUS'::character varying])::text[]))),
    CONSTRAINT constraint_9ad2 CHECK (((preferred_contact_method)::text = ANY ((ARRAY['EMAIL'::character varying, 'PHONE'::character varying, 'APP_ONLY'::character varying, 'NONE'::character varying])::text[]))),
    CONSTRAINT constraint_9ad20 CHECK (((profile_visibility)::text = ANY ((ARRAY['PUBLIC'::character varying, 'CHURCH_MEMBERS'::character varying, 'FRIENDS_ONLY'::character varying, 'PRIVATE'::character varying])::text[]))),
    CONSTRAINT constraint_9ad20e CHECK (((theme)::text = ANY ((ARRAY['LIGHT'::character varying, 'DARK'::character varying, 'AUTO'::character varying])::text[])))
);


ALTER TABLE public.user_settings OWNER TO church_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    ban_reason character varying,
    banned_at timestamp without time zone,
    bio character varying,
    birthday date,
    created_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    email character varying(255) NOT NULL,
    google_id character varying(255),
    interests character varying,
    is_active boolean NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    last_login timestamp without time zone,
    location character varying(255),
    name character varying(100) NOT NULL,
    password_hash character varying(255),
    phone_number character varying(20),
    profile_pic_url character varying(500),
    role character varying(255) NOT NULL,
    spiritual_gift character varying(255),
    updated_at timestamp without time zone,
    warning_count integer DEFAULT 0 NOT NULL,
    website character varying(500),
    banner_image_url character varying(500),
    equipping_gifts character varying(255),
    address_line1 character varying(255) DEFAULT ''::character varying NOT NULL,
    address_line2 character varying(255),
    city character varying(100) DEFAULT ''::character varying NOT NULL,
    state_province character varying(100) DEFAULT ''::character varying NOT NULL,
    postal_code character varying(20) DEFAULT ''::character varying NOT NULL,
    country character varying(100) DEFAULT 'United States'::character varying NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    geocode_status character varying(50),
    primary_organization_id uuid,
    created_via character varying(100),
    last_org_switch_at timestamp without time zone,
    CONSTRAINT constraint_4d CHECK (((role)::text = ANY ((ARRAY['MEMBER'::character varying, 'MODERATOR'::character varying, 'ADMIN'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO church_user;

--
-- Name: COLUMN users.birthday; Type: COMMENT; Schema: public; Owner: church_user
--

COMMENT ON COLUMN public.users.birthday IS 'User birthday for celebrations and age-based features';


--
-- Name: COLUMN users.phone_number; Type: COMMENT; Schema: public; Owner: church_user
--

COMMENT ON COLUMN public.users.phone_number IS 'User phone number for contact purposes';


--
-- Name: COLUMN users.spiritual_gift; Type: COMMENT; Schema: public; Owner: church_user
--

COMMENT ON COLUMN public.users.spiritual_gift IS 'User spiritual gifts for ministry matching';


--
-- Name: COLUMN users.banner_image_url; Type: COMMENT; Schema: public; Owner: church_user
--

COMMENT ON COLUMN public.users.banner_image_url IS 'User profile banner image URL for profile header display';


--
-- Name: worship_play_history; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.worship_play_history (
    id uuid NOT NULL,
    completed_at timestamp without time zone,
    participant_count integer,
    played_at timestamp without time zone NOT NULL,
    skip_vote_count integer,
    upvote_count integer,
    video_duration integer,
    video_id character varying(100) NOT NULL,
    video_thumbnail_url character varying(500),
    video_title character varying(500) NOT NULL,
    was_skipped boolean NOT NULL,
    leader_id uuid NOT NULL,
    worship_room_id uuid NOT NULL
);


ALTER TABLE public.worship_play_history OWNER TO church_user;

--
-- Name: worship_queue_entries; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.worship_queue_entries (
    id uuid NOT NULL,
    completed_at timestamp without time zone,
    played_at timestamp without time zone,
    "position" integer NOT NULL,
    queued_at timestamp without time zone NOT NULL,
    status character varying(255) NOT NULL,
    updated_at timestamp without time zone,
    video_duration integer,
    video_id character varying(100) NOT NULL,
    video_thumbnail_url character varying(500),
    video_title character varying(500) NOT NULL,
    user_id uuid NOT NULL,
    worship_room_id uuid NOT NULL,
    CONSTRAINT constraint_d9 CHECK (((status)::text = ANY ((ARRAY['WAITING'::character varying, 'PLAYING'::character varying, 'COMPLETED'::character varying, 'SKIPPED'::character varying])::text[])))
);


ALTER TABLE public.worship_queue_entries OWNER TO church_user;

--
-- Name: worship_room_participants; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.worship_room_participants (
    id uuid NOT NULL,
    is_active boolean NOT NULL,
    is_in_waitlist boolean NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    last_active_at timestamp without time zone NOT NULL,
    left_at timestamp without time zone,
    role character varying(255) NOT NULL,
    updated_at timestamp without time zone,
    waitlist_position integer,
    user_id uuid NOT NULL,
    worship_room_id uuid NOT NULL,
    CONSTRAINT constraint_95 CHECK (((role)::text = ANY ((ARRAY['LISTENER'::character varying, 'DJ'::character varying, 'LEADER'::character varying, 'MODERATOR'::character varying])::text[])))
);


ALTER TABLE public.worship_room_participants OWNER TO church_user;

--
-- Name: worship_room_settings; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.worship_room_settings (
    worship_room_id uuid NOT NULL,
    afk_timeout_minutes integer,
    allow_duplicate_songs boolean NOT NULL,
    allow_voting boolean NOT NULL,
    allowed_video_categories character varying,
    auto_advance_queue boolean NOT NULL,
    banned_video_ids character varying,
    created_at timestamp without time zone NOT NULL,
    enable_chat boolean NOT NULL,
    enable_waitlist boolean NOT NULL,
    max_queue_size integer,
    max_song_duration integer,
    max_songs_per_user integer,
    max_waitlist_size integer,
    min_song_duration integer,
    require_approval boolean NOT NULL,
    skip_threshold double precision,
    slow_mode_seconds integer,
    song_cooldown_hours integer,
    updated_at timestamp without time zone
);


ALTER TABLE public.worship_room_settings OWNER TO church_user;

--
-- Name: worship_rooms; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.worship_rooms (
    id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL,
    current_video_id character varying(100),
    current_video_thumbnail character varying(500),
    current_video_title character varying(500),
    description character varying,
    image_url character varying(500),
    is_active boolean NOT NULL,
    is_private boolean NOT NULL,
    max_participants integer,
    name character varying(100) NOT NULL,
    playback_position double precision,
    playback_started_at timestamp without time zone,
    playback_status character varying(20),
    skip_threshold double precision,
    updated_at timestamp without time zone,
    created_by uuid NOT NULL,
    current_leader_id uuid
);


ALTER TABLE public.worship_rooms OWNER TO church_user;

--
-- Name: worship_song_votes; Type: TABLE; Schema: public; Owner: church_user
--

CREATE TABLE public.worship_song_votes (
    id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL,
    vote_type character varying(255) NOT NULL,
    queue_entry_id uuid NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT constraint_35 CHECK (((vote_type)::text = ANY ((ARRAY['UPVOTE'::character varying, 'SKIP'::character varying])::text[])))
);


ALTER TABLE public.worship_song_votes OWNER TO church_user;

--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.announcements (id, category, content, created_at, deleted_at, image_url, is_pinned, title, updated_at, user_id, organization_id) FROM stdin;
27503f48-db4e-43ea-920d-f3e04f0240a5	GENERAL	We're excited to have you join our digital church family! This app will help you stay connected with our community, receive important updates, and participate in church activities. Feel free to explore all the features and reach out if you have any questions.	2025-11-14 15:56:01.254279	\N	\N	t	Welcome to Our Church Community! 🏛️	2025-11-14 15:56:01.254279	3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N
5a3abdb6-f87a-40f9-9701-302b4984e538	WORSHIP	Join us this Sunday at 10:00 AM for our weekly worship service. We'll be continuing our sermon series on 'Faith in Action' and we're excited to worship together as a community.	2025-11-14 15:56:01.257971	\N	\N	f	Sunday Service Update ⛪	2025-11-14 15:56:01.257971	3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N
ecfc9c42-e51a-4472-955e-9c818514d873	EVENTS	Save the date! Our monthly community potluck dinner is coming up next Friday at 6:00 PM in the fellowship hall. Bring a dish to share and enjoy great food and fellowship with your church family.	2025-11-14 15:56:01.259617	\N	\N	f	Community Potluck Dinner 🍽️	2025-11-14 15:56:01.259617	3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N
fb3fba18-6e97-41d8-acf0-f3df59b9ca78	YOUTH	Attention youth and parents! Our youth group meets every Wednesday at 7:00 PM. This week we're having a game night with pizza. All middle and high school students are welcome!	2025-11-14 15:56:01.261223	\N	\N	f	Youth Group Activities 🎮	2025-11-14 15:56:01.261223	3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N
c7f1e0a8-91e8-48a4-baec-511465b787d8	PRAYER	We encourage you to share your prayer requests through our app. Please remember that prayer requests can be submitted anonymously if you prefer. Our prayer team reviews and prays over each request.	2025-11-14 15:56:01.263367	\N	\N	f	Prayer Request Guidelines 🙏	2025-11-14 15:56:01.263367	3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N
\.


--
-- Data for Name: audit_log_details; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.audit_log_details (audit_log_id, detail_value, detail_key) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.audit_logs (id, action, ip_address, target_id, target_type, "timestamp", user_agent, user_id) FROM stdin;
\.


--
-- Data for Name: chat_group_members; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.chat_group_members (id, custom_name, invited_by, is_active, is_muted, joined_at, last_read_at, left_at, member_role, notifications_enabled, updated_at, chat_group_id, user_id) FROM stdin;
c2d196e2-ab14-4e9a-a940-4c603819f196	\N	\N	t	f	2025-11-14 15:56:01.232294	\N	\N	OWNER	t	2025-11-14 15:56:01.232294	6ad03573-ad78-4dfe-8f72-293bae059403	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
f8b9376c-ab14-4e23-bed0-afae73ce9d77	\N	\N	t	f	2025-11-14 15:56:01.237579	\N	\N	OWNER	t	2025-11-14 15:56:01.237579	4db261b1-7920-4c69-88d2-29de99912237	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
d1a8f825-f11a-4a67-b897-de8be4918101	\N	\N	t	f	2025-11-14 15:56:01.241318	\N	\N	OWNER	t	2025-11-14 15:56:01.241318	cfbb0399-a672-4aae-97b4-c9986a370ed1	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
14284b18-2376-465d-84ac-4d54bbc4063f	\N	\N	t	f	2025-11-14 15:56:01.244522	\N	\N	OWNER	t	2025-11-14 15:56:01.244522	24b0d303-1492-4950-9319-b04266040b71	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
8f5b580f-e574-4fe3-a985-2b81577de371	\N	\N	t	f	2025-11-14 15:56:01.248432	\N	\N	OWNER	t	2025-11-14 15:56:01.248432	83106636-dfd6-49c0-8492-45b3dd08071a	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
\.


--
-- Data for Name: chat_groups; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.chat_groups (id, created_at, description, image_url, is_active, is_private, max_members, name, type, updated_at, created_by) FROM stdin;
6ad03573-ad78-4dfe-8f72-293bae059403	2025-11-14 15:56:01.216442	Welcome to our church community! This is the main chat for general discussions.	\N	t	f	\N	General Chat	MAIN	2025-11-14 15:56:01.217442	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
4db261b1-7920-4c69-88d2-29de99912237	2025-11-14 15:56:01.235998	Share your prayer requests and pray for others in our community.	\N	t	f	\N	Prayer Requests	PRAYER	2025-11-14 15:56:01.235998	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
cfbb0399-a672-4aae-97b4-c9986a370ed1	2025-11-14 15:56:01.239192	Discuss scripture, share insights, and grow together in God's word.	\N	t	f	\N	Bible Study	STUDY	2025-11-14 15:56:01.239192	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
24b0d303-1492-4950-9319-b04266040b71	2025-11-14 15:56:01.24292	Important church announcements and updates.	\N	t	f	\N	Announcements	ANNOUNCEMENT	2025-11-14 15:56:01.24292	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
83106636-dfd6-49c0-8492-45b3dd08071a	2025-11-14 15:56:01.246103	A place for our young people to connect and share.	\N	t	f	\N	Youth Group	YOUTH	2025-11-14 15:56:01.246103	3412a9fc-c5fd-4395-b993-0b28deb3bd8c
\.


--
-- Data for Name: donation_subscriptions; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.donation_subscriptions (id, amount, canceled_at, category, created_at, currency, current_period_end, current_period_start, ended_at, failure_count, frequency, last_failure_date, last_failure_reason, next_payment_date, notes, payment_method_brand, payment_method_last4, purpose, started_at, status, stripe_customer_id, stripe_price_id, stripe_subscription_id, trial_end, trial_start, updated_at, user_id, organization_id) FROM stdin;
\.


--
-- Data for Name: donations; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.donations (id, amount, category, created_at, currency, fee_amount, is_recurring, net_amount, notes, payment_method_brand, payment_method_last4, purpose, receipt_email, receipt_sent, receipt_sent_at, stripe_charge_id, stripe_payment_intent_id, "timestamp", transaction_id, subscription_id, user_id, organization_id) FROM stdin;
\.


--
-- Data for Name: event_bring_claims; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.event_bring_claims (id, created_at, note, quantity, updated_at, item_id, user_id) FROM stdin;
\.


--
-- Data for Name: event_bring_items; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.event_bring_items (id, allow_multiple_claims, created_at, description, name, quantity_needed, updated_at, created_by, event_id) FROM stdin;
\.


--
-- Data for Name: event_rsvps; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.event_rsvps (event_id, user_id, guest_count, notes, response, "timestamp", updated_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.events (id, category, created_at, description, end_time, is_recurring, location, max_attendees, original_category, recurrence_end_date, recurrence_type, requires_approval, start_time, status, title, updated_at, creator_id, group_id, bring_list_enabled, organization_id) FROM stdin;
0e066f7d-234b-4334-aa2a-97d2ebd96f85	FELLOWSHIP	2025-11-09 12:21:53.700854	The men will be having a get together for chow and praise and worship.	\N	f	Church Building	\N	FELLOWSHIP	\N	\N	f	2025-11-13 13:00:00	SCHEDULED	Men's Chow Time!	2025-11-09 12:21:53.700854	3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N	t	00000000-0000-0000-0000-000000000001
\.


--
-- Data for Name: feed_preferences; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.feed_preferences (id, user_id, active_filter, selected_group_ids, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flyway_schema_history; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) FROM stdin;
1	1	initial schema	SQL	V1__initial_schema.sql	2111883320	church_user	2025-11-08 16:48:30.958564	1116	t
2	2	social feed schema	SQL	V2__social_feed_schema.sql	1723657209	church_user	2025-11-08 16:48:32.212004	19	t
3	3	user profile enhancements	SQL	V3__user_profile_enhancements.sql	-917516087	church_user	2025-11-08 16:48:32.254379	30	t
4	4	add youtube support to resources	SQL	V4__add_youtube_support_to_resources.sql	840779657	church_user	2025-11-08 16:48:32.304581	26	t
5	5	add banner image to users	SQL	V5__add_banner_image_to_users.sql	779635662	church_user	2025-11-08 16:48:32.351702	6	t
6	6	add equipping gifts to users	SQL	V6__add_equipping_gifts_to_users.sql	-1996880006	church_user	2025-11-08 16:48:32.379848	6	t
7	7	deactivate legacy worship rooms	SQL	V7__deactivate_legacy_worship_rooms.sql	-125214362	church_user	2025-11-08 16:48:32.40804	7	t
8	8	event bring list	SQL	V8__event_bring_list.sql	679873561	church_user	2025-11-08 16:48:32.431903	13	t
9	9	structured user address	SQL	V9__structured_user_address.sql	-321673827	church_user	2025-11-09 12:44:42.386217	40	t
10	10	add parent to prayer interactions	SQL	V10__add_parent_to_prayer_interactions.sql	2043113475	church_user	2025-11-11 17:01:34.615704	42	t
11	11	add image url to prayer requests	SQL	V11__add_image_url_to_prayer_requests.sql	1690601720	church_user	2025-11-12 13:22:41.629968	24	t
12	12	multi tenant architecture	SQL	V12__multi_tenant_architecture.sql	1973804102	church_user	2025-11-14 15:23:07.615168	379	t
13	13	migrate existing data to multitenant	SQL	V13__migrate_existing_data_to_multitenant.sql	-298822889	church_user	2025-11-14 15:23:08.070166	34	t
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.groups (id, name, description, type, created_by_user_id, created_by_org_id, tags, allowed_org_ids, settings, member_count, created_at, updated_at, deleted_at) FROM stdin;
f18776a1-163d-4e45-b5e2-47544ce67250	General Discussion	A place for general community discussions and fellowship	PUBLIC	e17cebaf-b87d-4734-9b24-820f8f62e647	00000000-0000-0000-0000-000000000001	["general", "community", "fellowship"]	\N	{}	0	2025-11-14 15:23:08.079862	2025-11-14 23:54:46.447894	\N
\.


--
-- Data for Name: hashtags; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.hashtags (id, created_at, last_used, tag, usage_count) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.messages (id, content, deleted_at, deleted_by, edited_at, is_deleted, is_edited, media_filename, media_size, media_type, media_url, mentioned_users, message_type, reactions, system_metadata, "timestamp", updated_at, chat_group_id, parent_message_id, user_id) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.organizations (id, name, slug, type, tier, status, stripe_connect_account_id, subscription_expires_at, settings, metadata, parent_organization_id, member_count, primary_member_count, created_at, updated_at, deleted_at) FROM stdin;
00000000-0000-0000-0000-000000000002	Migration Tracker	migration-tracker	GLOBAL	BASIC	ACTIVE	\N	\N	{}	{"postsMigrated": 4, "usersMigrated": 4, "eventsMigrated": 1, "prayersMigrated": 3, "migrationVersion": "V13", "donationsMigrated": 0, "isMigrationTracker": true, "migrationCompletedAt": "2025-11-14 15:23:08.079862-08", "announcementsMigrated": 5}	\N	0	0	2025-11-14 15:23:08.079862	2025-11-14 15:23:08.079862	\N
00000000-0000-0000-0000-000000000001	The Gathering	the-gathering	GLOBAL	BASIC	ACTIVE	\N	\N	\N	\N	\N	0	0	2025-11-14 15:23:07.653514	2025-11-14 23:54:46.444776	\N
\.


--
-- Data for Name: post_bookmarks; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_bookmarks (post_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: post_comment_media_types; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_comment_media_types (comment_id, media_type) FROM stdin;
\.


--
-- Data for Name: post_comment_media_urls; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_comment_media_urls (comment_id, media_url) FROM stdin;
\.


--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_comments (id, content, created_at, is_anonymous, likes_count, updated_at, parent_comment_id, post_id, user_id) FROM stdin;
\.


--
-- Data for Name: post_hashtags; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_hashtags (hashtag_id, post_id) FROM stdin;
\.


--
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_likes (post_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: post_media_types; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_media_types (post_id, media_type) FROM stdin;
\.


--
-- Data for Name: post_media_urls; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_media_urls (post_id, media_url) FROM stdin;
\.


--
-- Data for Name: post_shares; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.post_shares (id, content, created_at, share_type, post_id, user_id) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.posts (id, bookmarks_count, category, comments_count, content, created_at, is_anonymous, is_quote, is_reply, likes_count, location, post_type, shares_count, updated_at, parent_post_id, quoted_post_id, user_id, organization_id, group_id, user_primary_org_id_snapshot, visibility) FROM stdin;
\.


--
-- Data for Name: prayer_interactions; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.prayer_interactions (id, content, "timestamp", type, prayer_id, user_id, parent_interaction_id) FROM stdin;
\.


--
-- Data for Name: prayer_requests; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.prayer_requests (id, category, created_at, description, is_anonymous, status, title, updated_at, user_id, image_url, organization_id) FROM stdin;
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.resources (id, category, created_at, description, download_count, file_name, file_size, file_type, file_url, is_approved, title, youtube_channel, youtube_duration, youtube_thumbnail_url, youtube_title, youtube_url, youtube_video_id, uploaded_by) FROM stdin;
\.


--
-- Data for Name: user_follows; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.user_follows (follower_id, following_id, created_at) FROM stdin;
\.


--
-- Data for Name: user_group_memberships; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.user_group_memberships (id, user_id, group_id, role, is_muted, joined_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_organization_history; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.user_organization_history (id, user_id, from_organization_id, to_organization_id, switched_at, reason) FROM stdin;
\.


--
-- Data for Name: user_organization_memberships; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.user_organization_memberships (id, user_id, organization_id, is_primary, role, joined_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.user_settings (user_id, allow_direct_messages, announcement_notifications, auto_backup_enabled, chat_notifications, created_at, data_sharing_analytics, donation_reminders, email_notifications, event_notifications, event_reminders_hours, fcm_token, font_size, high_contrast_mode, language, last_backup_date, newsletter_subscription, prayer_notifications, prayer_request_visibility, preferred_contact_method, profile_visibility, push_notifications, reduce_motion, screen_reader_optimized, show_donation_history, show_online_status, theme, timezone, updated_at, weekly_digest) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.users (id, ban_reason, banned_at, bio, birthday, created_at, deleted_at, email, google_id, interests, is_active, is_banned, last_login, location, name, password_hash, phone_number, profile_pic_url, role, spiritual_gift, updated_at, warning_count, website, banner_image_url, equipping_gifts, address_line1, address_line2, city, state_province, postal_code, country, latitude, longitude, geocode_status, primary_organization_id, created_via, last_org_switch_at) FROM stdin;
e17cebaf-b87d-4734-9b24-820f8f62e647	\N	\N	Default church administrator account	\N	2025-11-08 17:02:59.250293	\N	admin@church.local	\N	\N	t	f	2025-11-09 13:00:57.620904	\N	Church Administrator	$2a$10$nDKJOki30hkiwLGnupbAuObqZ08gOI1pQnWJ.FLKqZt3Szy8Nll/q	\N	\N	ADMIN	\N	2025-11-09 13:00:57.62196	0	\N	\N	\N		\N				United States	\N	\N	\N	00000000-0000-0000-0000-000000000001	\N	\N
3412a9fc-c5fd-4395-b993-0b28deb3bd8c	\N	\N	I super love Jesus! I love praise and worship. If your reading this reach out and say hello!	1977-05-23	2025-11-08 17:19:43.547522	\N	stevensills2@gmail.com	\N	["Codeing"]	t	f	2025-11-14 15:45:39.986854	Crescent City, CA	Steven Sills II	\N	7079548087	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/profile-pictures/d9c59443-4f29-4069-abeb-74d2bbd96337.png	ADMIN	Prophecy, Teaching, Faith	2025-11-14 15:45:39.987957	0	https://www.facebook.com/steven.sills.ii	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/banner-images/26aac070-cfb2-47e4-ab5a-37b0a90ef4fa.jpeg	Teacher, Apostle	900 North Crest Drive #213	\N	Crescent City	CA	95531	United States	\N	\N	\N	00000000-0000-0000-0000-000000000001	\N	\N
defb5801-d254-43f6-a60b-3e2ea10d5074	\N	\N	\N	1977-05-23	2025-11-08 17:21:29.7852	\N	mb@gmail.com	\N	["Jumping Bikes!"]	t	f	2025-11-14 15:56:27.208048	Crescent City, CA	Microsoft  Browser	$2a$10$JjUP5vMlVmYPcVN0nQLLYOfNxlx4.nR/gjTylpjZjDtza/m/nrhbC	5416609014	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/profile-pictures/5bd2bfc8-e136-4dfa-a697-ba7ae136fd7c.jpg	MEMBER	Message of Wisdom, Giving	2025-11-14 15:56:27.320548	0	https://www.linkedin.com/in/steven-sills-ii-90781b53/	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/banner-images/b2693c72-fb97-41bc-a43c-20b0cafe5fc3.jpg	Teacher		\N				United States	\N	\N	\N	00000000-0000-0000-0000-000000000001	\N	\N
c35e9241-1d69-4467-9329-b7728aa399c7	\N	\N	\N	\N	2025-11-09 15:22:45.277353	\N	charleseboles@gmail.com	\N	[]	t	f	2025-11-14 15:38:41.675845	\N	Charles Boles	\N	7079548087	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/profile-pictures/2f32d3e6-47fe-4b00-8517-0044a00d3e94.png	MEMBER	Interpretation of Tongues	2025-11-14 15:38:41.677436	0	\N	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/banner-images/429dba22-5b67-4153-b861-67aceaaff3ee.jpg	Evangelist	900 North Crest Drive #213	\N	Crescent City	CA	95531	United States	\N	\N	\N	00000000-0000-0000-0000-000000000001	\N	\N
e1887540-4bf6-4097-a3f3-f2536475552d	\N	\N	\N	\N	2025-11-14 15:39:57.55926	\N	adam@gmail.com	\N	\N	t	f	\N	\N	Adam Adamson	$2a$10$XAyhj/J2b.6NG5tU1YlDWu3Xk/6qJ7T4Zj7XZESRMUu0LFVQvSfNO	\N	\N	MEMBER	\N	2025-11-14 15:39:57.55926	0	\N	\N	\N		\N				United States	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: worship_play_history; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.worship_play_history (id, completed_at, participant_count, played_at, skip_vote_count, upvote_count, video_duration, video_id, video_thumbnail_url, video_title, was_skipped, leader_id, worship_room_id) FROM stdin;
\.


--
-- Data for Name: worship_queue_entries; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.worship_queue_entries (id, completed_at, played_at, "position", queued_at, status, updated_at, video_duration, video_id, video_thumbnail_url, video_title, user_id, worship_room_id) FROM stdin;
\.


--
-- Data for Name: worship_room_participants; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.worship_room_participants (id, is_active, is_in_waitlist, joined_at, last_active_at, left_at, role, updated_at, waitlist_position, user_id, worship_room_id) FROM stdin;
\.


--
-- Data for Name: worship_room_settings; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.worship_room_settings (worship_room_id, afk_timeout_minutes, allow_duplicate_songs, allow_voting, allowed_video_categories, auto_advance_queue, banned_video_ids, created_at, enable_chat, enable_waitlist, max_queue_size, max_song_duration, max_songs_per_user, max_waitlist_size, min_song_duration, require_approval, skip_threshold, slow_mode_seconds, song_cooldown_hours, updated_at) FROM stdin;
d148b78d-5554-4194-b8e1-0e13193f0940	30	f	t	\N	t	\N	2025-11-08 17:22:14.974066	t	t	50	900	5	20	60	f	0.5	0	1	2025-11-08 17:22:14.974066
141a5142-0cf0-46c0-aa37-c194609b4ebb	30	f	t	\N	t	\N	2025-11-09 15:05:41.404298	t	t	50	900	5	20	60	f	0.5	0	1	2025-11-09 15:05:41.404298
30ffd021-b39f-48de-a2c7-5867e6badcb2	30	f	t	\N	t	\N	2025-11-09 17:34:34.834936	t	t	50	900	5	20	60	f	0.5	0	1	2025-11-09 17:34:34.834936
\.


--
-- Data for Name: worship_rooms; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.worship_rooms (id, created_at, current_video_id, current_video_thumbnail, current_video_title, description, image_url, is_active, is_private, max_participants, name, playback_position, playback_started_at, playback_status, skip_threshold, updated_at, created_by, current_leader_id) FROM stdin;
d148b78d-5554-4194-b8e1-0e13193f0940	2025-11-08 17:22:14.964432	es34Nr2JovU	https://img.youtube.com/vi/es34Nr2JovU/mqdefault.jpg	YouTube Video es34Nr2JovU	We browsing hard for Jesus baby!	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/worship-rooms/38cd7fae-8d43-4dc4-8cc4-4c3c2378f3bc.jpeg	f	f	50	Microsoft Browser Room	91	2025-11-08 17:24:30.944448	playing	0.5	2025-11-09 15:04:59.208929	defb5801-d254-43f6-a60b-3e2ea10d5074	defb5801-d254-43f6-a60b-3e2ea10d5074
141a5142-0cf0-46c0-aa37-c194609b4ebb	2025-11-09 15:05:41.392299	In8TQY8NbRU	https://img.youtube.com/vi/In8TQY8NbRU/mqdefault.jpg	YouTube Video In8TQY8NbRU	This is a worshipful room. Not too exciting with praise. Lots of worship!		f	f	50	I CAN DO ANYTHING IN CHRIST!	0	2025-11-09 15:06:10.760461	playing	0.5	2025-11-09 15:22:02.057077	e17cebaf-b87d-4734-9b24-820f8f62e647	e17cebaf-b87d-4734-9b24-820f8f62e647
30ffd021-b39f-48de-a2c7-5867e6badcb2	2025-11-09 17:34:34.822403	L0u0hKWbmX8	https://img.youtube.com/vi/L0u0hKWbmX8/mqdefault.jpg	YouTube Video L0u0hKWbmX8	Bethel Redding California Live Church	https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/worship-rooms/915253cf-c338-40c1-a2a3-9485ede3bccf.png	t	f	50	Bethel Live Church	0	2025-11-13 19:33:32.195221	playing	0.5	2025-11-13 19:33:32.199496	defb5801-d254-43f6-a60b-3e2ea10d5074	defb5801-d254-43f6-a60b-3e2ea10d5074
\.


--
-- Data for Name: worship_song_votes; Type: TABLE DATA; Schema: public; Owner: church_user
--

COPY public.worship_song_votes (id, created_at, vote_type, queue_entry_id, user_id) FROM stdin;
\.


--
-- Name: prayer_interactions constraint_102; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_interactions
    ADD CONSTRAINT constraint_102 PRIMARY KEY (id);


--
-- Name: messages constraint_13; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT constraint_13 PRIMARY KEY (id);


--
-- Name: donations constraint_27; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT constraint_27 PRIMARY KEY (id);


--
-- Name: prayer_requests constraint_2767d; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_requests
    ADD CONSTRAINT constraint_2767d PRIMARY KEY (id);


--
-- Name: resources constraint_2fe; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT constraint_2fe PRIMARY KEY (id);


--
-- Name: hashtags constraint_3; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.hashtags
    ADD CONSTRAINT constraint_3 PRIMARY KEY (id);


--
-- Name: worship_room_settings constraint_30; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_room_settings
    ADD CONSTRAINT constraint_30 PRIMARY KEY (worship_room_id);


--
-- Name: worship_song_votes constraint_355; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_song_votes
    ADD CONSTRAINT constraint_355 PRIMARY KEY (id);


--
-- Name: post_shares constraint_45; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT constraint_45 PRIMARY KEY (id);


--
-- Name: posts constraint_48c; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT constraint_48c PRIMARY KEY (id);


--
-- Name: event_bring_claims constraint_4b; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_claims
    ADD CONSTRAINT constraint_4b PRIMARY KEY (id);


--
-- Name: users constraint_4d4; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT constraint_4d4 PRIMARY KEY (id);


--
-- Name: post_bookmarks constraint_5; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_bookmarks
    ADD CONSTRAINT constraint_5 PRIMARY KEY (post_id, user_id);


--
-- Name: post_comments constraint_6; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT constraint_6 PRIMARY KEY (id);


--
-- Name: events constraint_7a9a; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT constraint_7a9a PRIMARY KEY (id);


--
-- Name: audit_log_details constraint_8; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.audit_log_details
    ADD CONSTRAINT constraint_8 PRIMARY KEY (audit_log_id, detail_key);


--
-- Name: audit_logs constraint_83; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT constraint_83 PRIMARY KEY (id);


--
-- Name: chat_groups constraint_870; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT constraint_870 PRIMARY KEY (id);


--
-- Name: event_bring_items constraint_8f; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_items
    ADD CONSTRAINT constraint_8f PRIMARY KEY (id);


--
-- Name: post_hashtags constraint_9; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_hashtags
    ADD CONSTRAINT constraint_9 PRIMARY KEY (hashtag_id, post_id);


--
-- Name: worship_play_history constraint_92; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_play_history
    ADD CONSTRAINT constraint_92 PRIMARY KEY (id);


--
-- Name: worship_room_participants constraint_954; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_room_participants
    ADD CONSTRAINT constraint_954 PRIMARY KEY (id);


--
-- Name: user_settings constraint_9ad20e1; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT constraint_9ad20e1 PRIMARY KEY (user_id);


--
-- Name: chat_group_members constraint_a6; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT constraint_a6 PRIMARY KEY (id);


--
-- Name: user_follows constraint_b; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT constraint_b PRIMARY KEY (follower_id, following_id);


--
-- Name: post_likes constraint_c; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT constraint_c PRIMARY KEY (post_id, user_id);


--
-- Name: event_rsvps constraint_d1b; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT constraint_d1b PRIMARY KEY (event_id, user_id);


--
-- Name: worship_rooms constraint_d4; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_rooms
    ADD CONSTRAINT constraint_d4 PRIMARY KEY (id);


--
-- Name: worship_queue_entries constraint_d97; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_queue_entries
    ADD CONSTRAINT constraint_d97 PRIMARY KEY (id);


--
-- Name: announcements constraint_db; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT constraint_db PRIMARY KEY (id);


--
-- Name: donation_subscriptions constraint_e8f8; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donation_subscriptions
    ADD CONSTRAINT constraint_e8f8 PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: feed_preferences pk_feed_preferences; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.feed_preferences
    ADD CONSTRAINT pk_feed_preferences PRIMARY KEY (id);


--
-- Name: groups pk_groups; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT pk_groups PRIMARY KEY (id);


--
-- Name: organizations pk_organizations; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT pk_organizations PRIMARY KEY (id);


--
-- Name: user_group_memberships pk_user_group_memberships; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_group_memberships
    ADD CONSTRAINT pk_user_group_memberships PRIMARY KEY (id);


--
-- Name: user_organization_history pk_user_org_history; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_history
    ADD CONSTRAINT pk_user_org_history PRIMARY KEY (id);


--
-- Name: user_organization_memberships pk_user_org_memberships; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_memberships
    ADD CONSTRAINT pk_user_org_memberships PRIMARY KEY (id);


--
-- Name: donations uk_1jmptl6ntsqt03qvtshfq6mus; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT uk_1jmptl6ntsqt03qvtshfq6mus UNIQUE (transaction_id);


--
-- Name: hashtags uk_2iu9ec68uadi38oo9e9p13q5m; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.hashtags
    ADD CONSTRAINT uk_2iu9ec68uadi38oo9e9p13q5m UNIQUE (tag);


--
-- Name: users uk_6dotkott2kjsp8vw4d0m25fb7; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_6dotkott2kjsp8vw4d0m25fb7 UNIQUE (email);


--
-- Name: feed_preferences uk_feed_preferences_user; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.feed_preferences
    ADD CONSTRAINT uk_feed_preferences_user UNIQUE (user_id);


--
-- Name: donation_subscriptions uk_jxw7nf8x4qlc865bs6tgk9dn2; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donation_subscriptions
    ADD CONSTRAINT uk_jxw7nf8x4qlc865bs6tgk9dn2 UNIQUE (stripe_subscription_id);


--
-- Name: organizations uk_organizations_slug; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT uk_organizations_slug UNIQUE (slug);


--
-- Name: chat_group_members uk_user_group; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT uk_user_group UNIQUE (user_id, chat_group_id);


--
-- Name: user_group_memberships uk_user_group_membership; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_group_memberships
    ADD CONSTRAINT uk_user_group_membership UNIQUE (user_id, group_id);


--
-- Name: user_organization_memberships uk_user_org; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_memberships
    ADD CONSTRAINT uk_user_org UNIQUE (user_id, organization_id);


--
-- Name: worship_room_participants uk_worship_participant; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_room_participants
    ADD CONSTRAINT uk_worship_participant UNIQUE (worship_room_id, user_id);


--
-- Name: worship_song_votes uk_worship_vote; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_song_votes
    ADD CONSTRAINT uk_worship_vote UNIQUE (queue_entry_id, user_id, vote_type);


--
-- Name: event_bring_claims uq_event_bring_claim; Type: CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_claims
    ADD CONSTRAINT uq_event_bring_claim UNIQUE (item_id, user_id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: idx_announcement_category; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcement_category ON public.announcements USING btree (category NULLS FIRST);


--
-- Name: idx_announcement_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcement_created_at ON public.announcements USING btree (created_at NULLS FIRST);


--
-- Name: idx_announcement_pinned; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcement_pinned ON public.announcements USING btree (is_pinned NULLS FIRST);


--
-- Name: idx_announcement_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcement_user_id ON public.announcements USING btree (user_id NULLS FIRST);


--
-- Name: idx_announcements_org_created; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcements_org_created ON public.announcements USING btree (organization_id, created_at DESC);


--
-- Name: idx_announcements_org_pinned; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcements_org_pinned ON public.announcements USING btree (organization_id, is_pinned);


--
-- Name: idx_announcements_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_announcements_organization_id ON public.announcements USING btree (organization_id);


--
-- Name: idx_chat_group_created_by; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_created_by ON public.chat_groups USING btree (created_by NULLS FIRST);


--
-- Name: idx_chat_group_is_active; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_is_active ON public.chat_groups USING btree (is_active NULLS FIRST);


--
-- Name: idx_chat_group_member_active; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_member_active ON public.chat_group_members USING btree (is_active NULLS FIRST);


--
-- Name: idx_chat_group_member_group; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_member_group ON public.chat_group_members USING btree (chat_group_id NULLS FIRST);


--
-- Name: idx_chat_group_member_role; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_member_role ON public.chat_group_members USING btree (member_role NULLS FIRST);


--
-- Name: idx_chat_group_member_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_member_user ON public.chat_group_members USING btree (user_id NULLS FIRST);


--
-- Name: idx_chat_group_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_chat_group_type ON public.chat_groups USING btree (type NULLS FIRST);


--
-- Name: idx_donation_category; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donation_category ON public.donations USING btree (category NULLS FIRST);


--
-- Name: idx_donation_subs_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donation_subs_organization_id ON public.donation_subscriptions USING btree (organization_id);


--
-- Name: idx_donation_timestamp; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donation_timestamp ON public.donations USING btree ("timestamp" NULLS FIRST);


--
-- Name: idx_donation_transaction_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donation_transaction_id ON public.donations USING btree (transaction_id NULLS FIRST);


--
-- Name: idx_donation_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donation_user_id ON public.donations USING btree (user_id NULLS FIRST);


--
-- Name: idx_donation_user_timestamp; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donation_user_timestamp ON public.donations USING btree (user_id NULLS FIRST, "timestamp" NULLS FIRST);


--
-- Name: idx_donations_org_timestamp; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donations_org_timestamp ON public.donations USING btree (organization_id, "timestamp" DESC);


--
-- Name: idx_donations_org_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donations_org_user ON public.donations USING btree (organization_id, user_id);


--
-- Name: idx_donations_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_donations_organization_id ON public.donations USING btree (organization_id);


--
-- Name: idx_event_bring_claims_item_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_bring_claims_item_id ON public.event_bring_claims USING btree (item_id NULLS FIRST);


--
-- Name: idx_event_bring_claims_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_bring_claims_user_id ON public.event_bring_claims USING btree (user_id NULLS FIRST);


--
-- Name: idx_event_bring_items_created_by; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_bring_items_created_by ON public.event_bring_items USING btree (created_by NULLS FIRST);


--
-- Name: idx_event_bring_items_event_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_bring_items_event_id ON public.event_bring_items USING btree (event_id NULLS FIRST);


--
-- Name: idx_event_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_created_at ON public.events USING btree (created_at NULLS FIRST);


--
-- Name: idx_event_creator_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_creator_id ON public.events USING btree (creator_id NULLS FIRST);


--
-- Name: idx_event_end_time; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_end_time ON public.events USING btree (end_time NULLS FIRST);


--
-- Name: idx_event_group_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_group_id ON public.events USING btree (group_id NULLS FIRST);


--
-- Name: idx_event_start_time; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_event_start_time ON public.events USING btree (start_time NULLS FIRST);


--
-- Name: idx_events_org_start_time; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_events_org_start_time ON public.events USING btree (organization_id, start_time);


--
-- Name: idx_events_org_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_events_org_status ON public.events USING btree (organization_id, status);


--
-- Name: idx_events_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_events_organization_id ON public.events USING btree (organization_id);


--
-- Name: idx_feed_preferences_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_feed_preferences_user_id ON public.feed_preferences USING btree (user_id);


--
-- Name: idx_groups_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_groups_created_at ON public.groups USING btree (created_at);


--
-- Name: idx_groups_created_by_org; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_groups_created_by_org ON public.groups USING btree (created_by_org_id);


--
-- Name: idx_groups_created_by_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_groups_created_by_user ON public.groups USING btree (created_by_user_id);


--
-- Name: idx_groups_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_groups_type ON public.groups USING btree (type);


--
-- Name: idx_hashtags_last_used; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_hashtags_last_used ON public.hashtags USING btree (last_used NULLS FIRST);


--
-- Name: idx_hashtags_tag; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_hashtags_tag ON public.hashtags USING btree (tag NULLS FIRST);


--
-- Name: idx_hashtags_usage_count; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_hashtags_usage_count ON public.hashtags USING btree (usage_count NULLS FIRST);


--
-- Name: idx_message_chat_group; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_message_chat_group ON public.messages USING btree (chat_group_id NULLS FIRST);


--
-- Name: idx_message_deleted; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_message_deleted ON public.messages USING btree (is_deleted NULLS FIRST);


--
-- Name: idx_message_parent; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_message_parent ON public.messages USING btree (parent_message_id NULLS FIRST);


--
-- Name: idx_message_timestamp; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_message_timestamp ON public.messages USING btree ("timestamp" NULLS FIRST);


--
-- Name: idx_message_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_message_type ON public.messages USING btree (message_type NULLS FIRST);


--
-- Name: idx_message_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_message_user ON public.messages USING btree (user_id NULLS FIRST);


--
-- Name: idx_organizations_parent; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_organizations_parent ON public.organizations USING btree (parent_organization_id);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_organizations_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_organizations_status ON public.organizations USING btree (status);


--
-- Name: idx_organizations_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_organizations_type ON public.organizations USING btree (type);


--
-- Name: idx_post_comments_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_comments_created_at ON public.post_comments USING btree (created_at NULLS FIRST);


--
-- Name: idx_post_comments_parent_comment_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_comments_parent_comment_id ON public.post_comments USING btree (parent_comment_id NULLS FIRST);


--
-- Name: idx_post_comments_post_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_comments_post_id ON public.post_comments USING btree (post_id NULLS FIRST);


--
-- Name: idx_post_comments_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_comments_user_id ON public.post_comments USING btree (user_id NULLS FIRST);


--
-- Name: idx_post_hashtags_hashtag_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_hashtags_hashtag_id ON public.post_hashtags USING btree (hashtag_id NULLS FIRST);


--
-- Name: idx_post_hashtags_post_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_hashtags_post_id ON public.post_hashtags USING btree (post_id NULLS FIRST);


--
-- Name: idx_post_shares_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_shares_created_at ON public.post_shares USING btree (created_at NULLS FIRST);


--
-- Name: idx_post_shares_post_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_shares_post_id ON public.post_shares USING btree (post_id NULLS FIRST);


--
-- Name: idx_post_shares_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_post_shares_user_id ON public.post_shares USING btree (user_id NULLS FIRST);


--
-- Name: idx_posts_category; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_category ON public.posts USING btree (category NULLS FIRST);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at NULLS FIRST);


--
-- Name: idx_posts_group_created; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_group_created ON public.posts USING btree (group_id, created_at DESC);


--
-- Name: idx_posts_group_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_group_id ON public.posts USING btree (group_id);


--
-- Name: idx_posts_is_quote; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_is_quote ON public.posts USING btree (is_quote NULLS FIRST);


--
-- Name: idx_posts_is_reply; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_is_reply ON public.posts USING btree (is_reply NULLS FIRST);


--
-- Name: idx_posts_org_created; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_org_created ON public.posts USING btree (organization_id, created_at DESC);


--
-- Name: idx_posts_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_organization_id ON public.posts USING btree (organization_id);


--
-- Name: idx_posts_parent_post_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_parent_post_id ON public.posts USING btree (parent_post_id NULLS FIRST);


--
-- Name: idx_posts_post_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_post_type ON public.posts USING btree (post_type NULLS FIRST);


--
-- Name: idx_posts_quoted_post_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_quoted_post_id ON public.posts USING btree (quoted_post_id NULLS FIRST);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id NULLS FIRST);


--
-- Name: idx_posts_user_primary_org_snapshot; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_posts_user_primary_org_snapshot ON public.posts USING btree (user_primary_org_id_snapshot);


--
-- Name: idx_prayer_category; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_category ON public.prayer_requests USING btree (category NULLS FIRST);


--
-- Name: idx_prayer_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_created_at ON public.prayer_requests USING btree (created_at NULLS FIRST);


--
-- Name: idx_prayer_interaction_parent_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_interaction_parent_id ON public.prayer_interactions USING btree (parent_interaction_id);


--
-- Name: idx_prayer_interaction_prayer_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_interaction_prayer_id ON public.prayer_interactions USING btree (prayer_id NULLS FIRST);


--
-- Name: idx_prayer_interaction_timestamp; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_interaction_timestamp ON public.prayer_interactions USING btree ("timestamp" NULLS FIRST);


--
-- Name: idx_prayer_interaction_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_interaction_type ON public.prayer_interactions USING btree (type NULLS FIRST);


--
-- Name: idx_prayer_interaction_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_interaction_user_id ON public.prayer_interactions USING btree (user_id NULLS FIRST);


--
-- Name: idx_prayer_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_status ON public.prayer_requests USING btree (status NULLS FIRST);


--
-- Name: idx_prayer_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayer_user_id ON public.prayer_requests USING btree (user_id NULLS FIRST);


--
-- Name: idx_prayers_org_created; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayers_org_created ON public.prayer_requests USING btree (organization_id, created_at DESC);


--
-- Name: idx_prayers_org_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayers_org_status ON public.prayer_requests USING btree (organization_id, status);


--
-- Name: idx_prayers_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_prayers_organization_id ON public.prayer_requests USING btree (organization_id);


--
-- Name: idx_resource_category; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_resource_category ON public.resources USING btree (category NULLS FIRST);


--
-- Name: idx_resource_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_resource_created_at ON public.resources USING btree (created_at NULLS FIRST);


--
-- Name: idx_resource_title; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_resource_title ON public.resources USING btree (title NULLS FIRST);


--
-- Name: idx_resource_uploaded_by; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_resource_uploaded_by ON public.resources USING btree (uploaded_by NULLS FIRST);


--
-- Name: idx_resource_youtube_url; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_resource_youtube_url ON public.resources USING btree (youtube_url);


--
-- Name: idx_resource_youtube_video_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_resource_youtube_video_id ON public.resources USING btree (youtube_video_id);


--
-- Name: idx_rsvp_event_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_rsvp_event_id ON public.event_rsvps USING btree (event_id NULLS FIRST);


--
-- Name: idx_rsvp_response; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_rsvp_response ON public.event_rsvps USING btree (response NULLS FIRST);


--
-- Name: idx_rsvp_timestamp; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_rsvp_timestamp ON public.event_rsvps USING btree ("timestamp" NULLS FIRST);


--
-- Name: idx_rsvp_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_rsvp_user_id ON public.event_rsvps USING btree (user_id NULLS FIRST);


--
-- Name: idx_subscription_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_subscription_status ON public.donation_subscriptions USING btree (status NULLS FIRST);


--
-- Name: idx_subscription_stripe_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_subscription_stripe_id ON public.donation_subscriptions USING btree (stripe_subscription_id NULLS FIRST);


--
-- Name: idx_subscription_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_subscription_user_id ON public.donation_subscriptions USING btree (user_id NULLS FIRST);


--
-- Name: idx_subscription_user_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_subscription_user_status ON public.donation_subscriptions USING btree (user_id NULLS FIRST, status NULLS FIRST);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_email ON public.users USING btree (email NULLS FIRST);


--
-- Name: idx_user_follows_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_follows_created_at ON public.user_follows USING btree (created_at NULLS FIRST);


--
-- Name: idx_user_follows_follower_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_follows_follower_id ON public.user_follows USING btree (follower_id NULLS FIRST);


--
-- Name: idx_user_follows_following_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_follows_following_id ON public.user_follows USING btree (following_id NULLS FIRST);


--
-- Name: idx_user_google_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_google_id ON public.users USING btree (google_id NULLS FIRST);


--
-- Name: idx_user_group_group_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_group_group_id ON public.user_group_memberships USING btree (group_id);


--
-- Name: idx_user_group_is_muted; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_group_is_muted ON public.user_group_memberships USING btree (is_muted);


--
-- Name: idx_user_group_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_group_user_id ON public.user_group_memberships USING btree (user_id);


--
-- Name: idx_user_org_history_switched_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_org_history_switched_at ON public.user_organization_history USING btree (switched_at);


--
-- Name: idx_user_org_history_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_org_history_user_id ON public.user_organization_history USING btree (user_id);


--
-- Name: idx_user_org_is_primary; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_org_is_primary ON public.user_organization_memberships USING btree (is_primary);


--
-- Name: idx_user_org_organization_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_org_organization_id ON public.user_organization_memberships USING btree (organization_id);


--
-- Name: idx_user_org_user_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_user_org_user_id ON public.user_organization_memberships USING btree (user_id);


--
-- Name: idx_users_birthday; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_users_birthday ON public.users USING btree (birthday);


--
-- Name: idx_users_last_org_switch; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_users_last_org_switch ON public.users USING btree (last_org_switch_at);


--
-- Name: idx_users_primary_org; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_users_primary_org ON public.users USING btree (primary_organization_id);


--
-- Name: idx_users_spiritual_gift; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_users_spiritual_gift ON public.users USING btree (spiritual_gift);


--
-- Name: idx_worship_history_leader; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_history_leader ON public.worship_play_history USING btree (leader_id NULLS FIRST);


--
-- Name: idx_worship_history_played_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_history_played_at ON public.worship_play_history USING btree (played_at NULLS FIRST);


--
-- Name: idx_worship_history_room; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_history_room ON public.worship_play_history USING btree (worship_room_id NULLS FIRST);


--
-- Name: idx_worship_history_video_id; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_history_video_id ON public.worship_play_history USING btree (video_id NULLS FIRST);


--
-- Name: idx_worship_participant_active; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_participant_active ON public.worship_room_participants USING btree (is_active NULLS FIRST);


--
-- Name: idx_worship_participant_role; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_participant_role ON public.worship_room_participants USING btree (role NULLS FIRST);


--
-- Name: idx_worship_participant_room; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_participant_room ON public.worship_room_participants USING btree (worship_room_id NULLS FIRST);


--
-- Name: idx_worship_participant_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_participant_user ON public.worship_room_participants USING btree (user_id NULLS FIRST);


--
-- Name: idx_worship_queue_position; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_queue_position ON public.worship_queue_entries USING btree ("position" NULLS FIRST);


--
-- Name: idx_worship_queue_room; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_queue_room ON public.worship_queue_entries USING btree (worship_room_id NULLS FIRST);


--
-- Name: idx_worship_queue_status; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_queue_status ON public.worship_queue_entries USING btree (status NULLS FIRST);


--
-- Name: idx_worship_queue_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_queue_user ON public.worship_queue_entries USING btree (user_id NULLS FIRST);


--
-- Name: idx_worship_room_created_at; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_room_created_at ON public.worship_rooms USING btree (created_at NULLS FIRST);


--
-- Name: idx_worship_room_created_by; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_room_created_by ON public.worship_rooms USING btree (created_by NULLS FIRST);


--
-- Name: idx_worship_room_is_active; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_room_is_active ON public.worship_rooms USING btree (is_active NULLS FIRST);


--
-- Name: idx_worship_vote_entry; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_vote_entry ON public.worship_song_votes USING btree (queue_entry_id NULLS FIRST);


--
-- Name: idx_worship_vote_type; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_vote_type ON public.worship_song_votes USING btree (vote_type NULLS FIRST);


--
-- Name: idx_worship_vote_user; Type: INDEX; Schema: public; Owner: church_user
--

CREATE INDEX idx_worship_vote_user ON public.worship_song_votes USING btree (user_id NULLS FIRST);


--
-- Name: events fk1i9l1342ujwmwa1sssh0vdeop; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT fk1i9l1342ujwmwa1sssh0vdeop FOREIGN KEY (group_id) REFERENCES public.chat_groups(id);


--
-- Name: post_comments fk21q7y8a124im4g0l4aaxn4ol1; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT fk21q7y8a124im4g0l4aaxn4ol1 FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id);


--
-- Name: event_bring_items fk28m8ttwl03pcqefbinrpte9kl; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_items
    ADD CONSTRAINT fk28m8ttwl03pcqefbinrpte9kl FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: donations fk2aa90vd3jc4ih742vpdotsrst; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk2aa90vd3jc4ih742vpdotsrst FOREIGN KEY (subscription_id) REFERENCES public.donation_subscriptions(id);


--
-- Name: event_rsvps fk46d4781rhlidxpk7m9qg0eqsy; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT fk46d4781rhlidxpk7m9qg0eqsy FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: post_media_types fk4j95rquelhtlfqaj3mpwrinla; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_media_types
    ADD CONSTRAINT fk4j95rquelhtlfqaj3mpwrinla FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: post_media_urls fk5at7kq4on2x0x29rcr1eui50f; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_media_urls
    ADD CONSTRAINT fk5at7kq4on2x0x29rcr1eui50f FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: posts fk5lidm6cqbc7u4xhqpxm898qme; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk5lidm6cqbc7u4xhqpxm898qme FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: worship_play_history fk5uajxlxiabg50j4qkowvfydxf; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_play_history
    ADD CONSTRAINT fk5uajxlxiabg50j4qkowvfydxf FOREIGN KEY (worship_room_id) REFERENCES public.worship_rooms(id);


--
-- Name: worship_rooms fk68i3epvx7afymm7jylmyn6jgp; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_rooms
    ADD CONSTRAINT fk68i3epvx7afymm7jylmyn6jgp FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: worship_room_settings fk6bp3kdpjgucwv9uyy41arsf5h; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_room_settings
    ADD CONSTRAINT fk6bp3kdpjgucwv9uyy41arsf5h FOREIGN KEY (worship_room_id) REFERENCES public.worship_rooms(id);


--
-- Name: event_bring_claims fk78mamu581oxass6hjl8ny4wjo; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_claims
    ADD CONSTRAINT fk78mamu581oxass6hjl8ny4wjo FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: events fk7ljm71n1057envlomdxcni5hs; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT fk7ljm71n1057envlomdxcni5hs FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: worship_rooms fk87c5cwp0vw3xm3l7uci9iqcxl; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_rooms
    ADD CONSTRAINT fk87c5cwp0vw3xm3l7uci9iqcxl FOREIGN KEY (current_leader_id) REFERENCES public.users(id);


--
-- Name: messages fk8cs7qdu3mdbr08xirdmsfxpgk; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk8cs7qdu3mdbr08xirdmsfxpgk FOREIGN KEY (parent_message_id) REFERENCES public.messages(id);


--
-- Name: donation_subscriptions fk8op5g85r83c8lyfe49kdp3vse; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donation_subscriptions
    ADD CONSTRAINT fk8op5g85r83c8lyfe49kdp3vse FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_settings fk8v82nj88rmai0nyck19f873dw; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT fk8v82nj88rmai0nyck19f873dw FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: post_bookmarks fk9b5c09u5arho7ei76d78bn7ww; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_bookmarks
    ADD CONSTRAINT fk9b5c09u5arho7ei76d78bn7ww FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: worship_song_votes fk9o5lqq0xgxqrrk8tmckio5l10; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_song_votes
    ADD CONSTRAINT fk9o5lqq0xgxqrrk8tmckio5l10 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: announcements fk_announcements_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_announcements_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: donation_subscriptions fk_donation_subs_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donation_subscriptions
    ADD CONSTRAINT fk_donation_subs_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: donations fk_donations_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fk_donations_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: events fk_events_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT fk_events_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: feed_preferences fk_feed_preferences_user; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.feed_preferences
    ADD CONSTRAINT fk_feed_preferences_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: groups fk_groups_created_by_org; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT fk_groups_created_by_org FOREIGN KEY (created_by_org_id) REFERENCES public.organizations(id);


--
-- Name: groups fk_groups_created_by_user; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT fk_groups_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: organizations fk_organizations_parent; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT fk_organizations_parent FOREIGN KEY (parent_organization_id) REFERENCES public.organizations(id);


--
-- Name: posts fk_posts_group; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_posts_group FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: posts fk_posts_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fk_posts_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: prayer_interactions fk_prayer_interaction_parent; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_interactions
    ADD CONSTRAINT fk_prayer_interaction_parent FOREIGN KEY (parent_interaction_id) REFERENCES public.prayer_interactions(id) ON DELETE CASCADE;


--
-- Name: prayer_requests fk_prayers_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_requests
    ADD CONSTRAINT fk_prayers_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: user_group_memberships fk_user_group_membership_group; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_group_memberships
    ADD CONSTRAINT fk_user_group_membership_group FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: user_group_memberships fk_user_group_membership_user; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_group_memberships
    ADD CONSTRAINT fk_user_group_membership_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_organization_history fk_user_org_history_from; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_history
    ADD CONSTRAINT fk_user_org_history_from FOREIGN KEY (from_organization_id) REFERENCES public.organizations(id);


--
-- Name: user_organization_history fk_user_org_history_to; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_history
    ADD CONSTRAINT fk_user_org_history_to FOREIGN KEY (to_organization_id) REFERENCES public.organizations(id);


--
-- Name: user_organization_history fk_user_org_history_user; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_history
    ADD CONSTRAINT fk_user_org_history_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_organization_memberships fk_user_org_organization; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_memberships
    ADD CONSTRAINT fk_user_org_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: user_organization_memberships fk_user_org_user; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.user_organization_memberships
    ADD CONSTRAINT fk_user_org_user FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users fk_users_primary_org; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_primary_org FOREIGN KEY (primary_organization_id) REFERENCES public.organizations(id);


--
-- Name: post_comments fkaawaqxjs3br8dw5v90w7uu514; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT fkaawaqxjs3br8dw5v90w7uu514 FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: prayer_requests fkamqkwb6154uudk58yxabhlltv; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_requests
    ADD CONSTRAINT fkamqkwb6154uudk58yxabhlltv FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: post_shares fkaqcgoc82dbvm91c4s6ybp0d80; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT fkaqcgoc82dbvm91c4s6ybp0d80 FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: event_bring_items fkbpt2wndacgsjid40jy7oynxx; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_items
    ADD CONSTRAINT fkbpt2wndacgsjid40jy7oynxx FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: audit_log_details fkccxqjxnp62ptfumge14ck90ak; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.audit_log_details
    ADD CONSTRAINT fkccxqjxnp62ptfumge14ck90ak FOREIGN KEY (audit_log_id) REFERENCES public.audit_logs(id);


--
-- Name: post_bookmarks fkclpw1l6wrci96rfj0dtt3bfah; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_bookmarks
    ADD CONSTRAINT fkclpw1l6wrci96rfj0dtt3bfah FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: donations fkd2p196clbvqgbemy05ndspwu; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT fkd2p196clbvqgbemy05ndspwu FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: prayer_interactions fkdk5wlgt8dhdog0ieqek0bobf4; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_interactions
    ADD CONSTRAINT fkdk5wlgt8dhdog0ieqek0bobf4 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: event_rsvps fke51sdypclsvg35oo2iscsxa3v; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT fke51sdypclsvg35oo2iscsxa3v FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chat_group_members fkewjk3724m9ci5f5ynd8k8b16k; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT fkewjk3724m9ci5f5ynd8k8b16k FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: resources fkf3dn169v0hyegkheyvmck8x5l; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT fkf3dn169v0hyegkheyvmck8x5l FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: chat_groups fkfmxjt8wof1k93nf0imifnih6q; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT fkfmxjt8wof1k93nf0imifnih6q FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: prayer_interactions fkhbqopinyhs8o0i6m87mtshvyd; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.prayer_interactions
    ADD CONSTRAINT fkhbqopinyhs8o0i6m87mtshvyd FOREIGN KEY (prayer_id) REFERENCES public.prayer_requests(id);


--
-- Name: post_shares fkhrf6mxii6ey1akrwfd5xwp85c; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_shares
    ADD CONSTRAINT fkhrf6mxii6ey1akrwfd5xwp85c FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: worship_room_participants fkimvp6qs1dw68413mh28xparh2; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_room_participants
    ADD CONSTRAINT fkimvp6qs1dw68413mh28xparh2 FOREIGN KEY (worship_room_id) REFERENCES public.worship_rooms(id);


--
-- Name: worship_song_votes fkj1w70ipidsa6g7728t1syptd5; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_song_votes
    ADD CONSTRAINT fkj1w70ipidsa6g7728t1syptd5 FOREIGN KEY (queue_entry_id) REFERENCES public.worship_queue_entries(id);


--
-- Name: worship_queue_entries fkk1o1vmj2vyk8e9a5nx6qxcy13; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_queue_entries
    ADD CONSTRAINT fkk1o1vmj2vyk8e9a5nx6qxcy13 FOREIGN KEY (worship_room_id) REFERENCES public.worship_rooms(id);


--
-- Name: worship_play_history fkk695ws1tt3spfmprhykq3qac0; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_play_history
    ADD CONSTRAINT fkk695ws1tt3spfmprhykq3qac0 FOREIGN KEY (leader_id) REFERENCES public.users(id);


--
-- Name: post_comment_media_urls fkk7kp1xou5lhqjdlrj5ee8im81; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_comment_media_urls
    ADD CONSTRAINT fkk7kp1xou5lhqjdlrj5ee8im81 FOREIGN KEY (comment_id) REFERENCES public.post_comments(id);


--
-- Name: announcements fklfxjojfcdhlx73ofpifkc6j92; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fklfxjojfcdhlx73ofpifkc6j92 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chat_group_members fklvoe5sok23sdg7lcf8cyncj0n; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.chat_group_members
    ADD CONSTRAINT fklvoe5sok23sdg7lcf8cyncj0n FOREIGN KEY (chat_group_id) REFERENCES public.chat_groups(id);


--
-- Name: worship_queue_entries fkm1lruk61hlju49sb6ue0vc4ov; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_queue_entries
    ADD CONSTRAINT fkm1lruk61hlju49sb6ue0vc4ov FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages fkpsmh6clh3csorw43eaodlqvkn; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fkpsmh6clh3csorw43eaodlqvkn FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: event_bring_claims fkrpd5s04awtm0rdu690mxq8vyq; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.event_bring_claims
    ADD CONSTRAINT fkrpd5s04awtm0rdu690mxq8vyq FOREIGN KEY (item_id) REFERENCES public.event_bring_items(id);


--
-- Name: post_comment_media_types fkrt6yigj4sb0fudsyyc59x3sss; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_comment_media_types
    ADD CONSTRAINT fkrt6yigj4sb0fudsyyc59x3sss FOREIGN KEY (comment_id) REFERENCES public.post_comments(id);


--
-- Name: posts fks9qqorlnw8545u7motk55f91g; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fks9qqorlnw8545u7motk55f91g FOREIGN KEY (parent_post_id) REFERENCES public.posts(id);


--
-- Name: post_comments fksnxoecngu89u3fh4wdrgf0f2g; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT fksnxoecngu89u3fh4wdrgf0f2g FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages fksyd4u23sd5aet59v3o8fsxw03; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fksyd4u23sd5aet59v3o8fsxw03 FOREIGN KEY (chat_group_id) REFERENCES public.chat_groups(id);


--
-- Name: worship_room_participants fktcu4fmgr6o7tm307bqyh1qr4m; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.worship_room_participants
    ADD CONSTRAINT fktcu4fmgr6o7tm307bqyh1qr4m FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: posts fkthylir8ewq8pgukgw6iam541; Type: FK CONSTRAINT; Schema: public; Owner: church_user
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT fkthylir8ewq8pgukgw6iam541 FOREIGN KEY (quoted_post_id) REFERENCES public.posts(id);


--
-- PostgreSQL database dump complete
--

