# Week 2 Backlog

Week 2 begins after the existing repository and local environment are verified.

## Authentication

- Configure Supabase browser and server clients
- Add sign-in and sign-out
- Add protected dashboard layout
- Create profile automatically after signup
- Add platform-role authorization

## Multi-Society Foundation

- Create database enums and tables
- Enable Row Level Security
- Add society membership policies
- Seed one super admin
- Create society management APIs
- Add society member invitations

## Camera Registration

- Create camera table and policies
- Add camera list page
- Add camera registration form
- Generate a one-time device token
- Store only the token hash
- Add camera status and heartbeat fields

## Verification

- Test that Society A cannot access Society B
- Test operator and admin permissions
- Test unauthenticated access
- Test invalid and revoked camera tokens
- Add seed data for two societies and four cameras

## Week 2 Completion Target

A super admin can create societies and assign administrators. A society
administrator can sign in and register cameras, while Supabase prevents access
to every other society's data.

