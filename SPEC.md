# Ardmore Cricket Club — Full Site + Weekly Draw

## Overview
Build a complete Next.js website for Ardmore Cricket Club with an integrated weekly numbers draw (ClubDraw). Deploy-ready for ardmorecricket.com.

## Design Direction
- **Tone:** Community cricket club — warm, proud, local. NOT corporate.
- **Colours:** Navy (#1a365d) primary, Gold/Amber (#c9a84c) accent, Sky Blue (#87CEEB) for highlights (club colours are blue/sky blue)
- **Typography:** A distinctive display font for headings (something with character — maybe a slab serif or strong sans), clean readable body font.
- **Feel:** Think premium amateur sports club — photo-heavy, celebrating community and history. The Bleach Green and Sperrin Mountains should feel ever-present.
- **Mobile-first** — most users will access on phones.

## Tech Stack
- Next.js 14+ (App Router)
- Tailwind CSS
- Supabase (Auth + DB) — already set up
- TypeScript

## Supabase Connection
- URL: https://smhzgkvatlwbaxlyhnbm.supabase.co
- Anon Key: sb_publishable_cp581S0l9VXqEATr0U32TQ_F8gCpF5g
- (Service role key in env only, never in client code)

## Pages & Sections

### 1. Homepage
- **Hero:** Full-width photo (use ground-2.jpg or ground-3.jpg — the Bleach Green with mountains). Overlay with club name, est. 1879, tagline.
- **About snippet:** Brief intro — established 1879, The Bleach Green, Ardmore, Co. Derry. North West Cricket Union.
- **Weekly Draw CTA:** Prominent section — "Support Your Club" — link to draw page
- **Photo gallery:** Grid of team/community photos (use all provided images)
- **Sponsors section:** Logo grid with placeholder slots. Empty for now, admin can add later.
- **Fixtures/News:** Section that can pull from external sources later

### 2. About Page
- History: Founded 1879. Club colours Blue/Sky Blue. Home ground: The Bleach Green, 10 Green Road, Ardmore, BT47 3RG.
- Facilities: Club House, Changing rooms & showers, Off Pitch net, 2 Cricket Pitches, 2 All weather match playing surfaces, Floodlit training area, Function Room, Kitchen Facilities
- Teams: 1st XI, 2nd XI, 3rd XI, Midweek XI, U13, U11
- Training: Adults (14+) Tuesday & Friday 6:30-8:30pm (Apr-Aug). Juniors (U14) Monday 6:30-7:30pm (Apr-Aug)
- Captain: Rachit Gaur
- Honours: North West Senior League 2023, North West Senior Cup 1994
- DO NOT make up any other facts. Only use what is listed here.

### 3. Weekly Draw Page (/draw)
This is the MAIN revenue feature.

#### How It Works:
- 500 numbers available (1-500)
- Users pick numbers and pay £1 per number per week
- Only PAID numbers enter the draw
- Draw happens automatically every Friday at 7PM
- 3 winning numbers drawn: 1st, 2nd, 3rd place
- Users can assign a NAME to each number (e.g. "Christopher" — for gifting/dedicating)
- Direct debit option for recurring weekly payment

#### Prize Split (of total weekly pot):
- 50% → Winners (25% first, 15% second, 10% third)
- 40% → Club (auto-disbursed)
- 7.5% → Platform (ClubDraw)
- 2.5% → Stripe fees

#### Draw UI:
- Show available numbers grid (1-500)
- Taken numbers greyed out with owner assigned name (if public)
- Animated draw reveal on Friday evenings
- Results history
- Countdown timer to next draw
- Current pot size
- Previous winners

### 4. Auth
- Google SSO (Supabase Auth with Google provider)
- Email/password manual signup
- Profile page with: your numbers, payment history, draw results
- Email notifications for draw results

### 5. Sponsors Page/Section
- Logo grid on homepage
- Dedicated /sponsors page with larger logos + descriptions
- Placeholder slots — "Become a Sponsor" CTA
- Admin can manage via Supabase

## Images Available (in public/images/):
- ground-1.jpg — The Bleach Green, wide shot with clubhouse
- ground-2.jpg — Pitch with mountains behind, high-res
- ground-3.jpg — Another ground angle with Sperrins
- trophy-1.jpg — Team celebrating with trophy, sky blue kits, TK Broux sponsor
- team-1.jpg — Cup-winning squad photo, O Neills kits
- team-2.jpg — Another squad photo
- community-1.jpg — Big community/family group photo at the ground

## Social Links
- Instagram: https://www.instagram.com/ardmorecricketclub/
- Facebook: Ardmore Cricket Club
- Twitter/X: @Ardmore1879
- NWCU: https://northwestcricket.com/clubs/ardmore-cricket-club/

## Important Rules
1. DO NOT make up any facts about the club not listed in this spec
2. Use only the verified information provided
3. The draw system is the revenue engine — make it prominent and easy to use
4. Mobile-first design
5. All Supabase tables already exist (clubs, profiles, draws, selections, payments)
6. Make the site feel like it belongs to a REAL community club, not a tech startup
