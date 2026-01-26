-- Add max weekly drinks setting for alcohol tracking
alter table user_settings
add column max_weekly_drinks integer not null default 10 check (max_weekly_drinks >= 0);
