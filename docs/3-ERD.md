erDiagram

    BOOK_CLUB ||--o{ MEETING : has
    BOOK_CLUB ||--o{ MEMBER : has
    MEETING ||--o{ READING_RECORD : has
    MEMBER ||--o{ READING_RECORD : writes
    MEETING ||--|| SESSION : has

    BOOK_CLUB {
        uuid id PK
        varchar name
        varchar invite_code
        timestamp created_at
        timestamp updated_at
    }

    MEETING {
        uuid id PK
        uuid book_club_id FK
        varchar book_title
        date meeting_date
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    MEMBER {
        uuid id PK
        uuid book_club_id FK
        uuid user_id FK
        varchar nickname
        boolean is_host
        timestamp joined_at
        timestamp created_at
        timestamp updated_at
    }

    READING_RECORD {
        uuid id PK
        uuid meeting_id FK
        uuid member_id FK
        text memorable_quote
        text discussion_question
        text takeaway
        timestamp created_at
        timestamp updated_at
    }

    SESSION {
        uuid id PK
        uuid meeting_id FK
        varchar current_step
        integer current_question_index
        integer remaining_seconds
        timestamp started_at
        timestamp ended_at
        timestamp created_at
        timestamp updated_at
    }

## Key Constraints

### Unique Constraints
- **MEMBER**: (user_id, book_club_id) — Ensures one member record per user per book club
- **READING_RECORD**: (meeting_id, member_id) — Ensures one reading record per member per meeting
- **SESSION**: (meeting_id) — Ensures one session per meeting

### Foreign Key References
- **MEMBER.user_id** → **auth.users** (Supabase auth user mapping)
  - ON DELETE RESTRICT