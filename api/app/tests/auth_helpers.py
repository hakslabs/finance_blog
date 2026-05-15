from datetime import datetime, timedelta, timezone

import jwt


TEST_JWT_SECRET = "test-supabase-jwt-secret-32-bytes-minimum"
TEST_USER_ID = "00000000-0000-4000-8000-000000000001"


def auth_header(user_id: str = TEST_USER_ID, email: str = "tester@example.com") -> dict[str, str]:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "aud": "authenticated",
            "exp": now + timedelta(minutes=15),
            "email": email,
            "iat": now,
            "iss": "https://example.supabase.co/auth/v1",
            "role": "authenticated",
            "sub": user_id,
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
