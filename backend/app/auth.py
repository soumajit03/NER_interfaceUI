import os
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import requests

security = HTTPBearer(auto_error=False)


class CurrentUser(dict):
    """Simple dict wrapper for authenticated user claims."""


def _read_value_from_env_file(key: str) -> str | None:
    """Fallback parser for backend/.env when terminal env injection is disabled."""
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if not os.path.exists(env_path):
        return None

    try:
        with open(env_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue

                current_key, value = line.split("=", 1)
                if current_key.strip() == key:
                    return value.strip().strip('"').strip("'")
    except OSError:
        return None

    return None


def _get_config_value(key: str) -> str | None:
    return os.getenv(key) or _read_value_from_env_file(key)


def _decode_with_jwt_secret(token: str) -> Dict[str, Any] | None:
    jwt_secret = _get_config_value("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        return None

    try:
        return jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        return None


def _decode_via_supabase_user_api(token: str) -> Dict[str, Any]:
    supabase_url = _get_config_value("SUPABASE_URL") or _get_config_value(
        "VITE_SUPABASE_URL"
    )
    anon_key = _get_config_value("SUPABASE_ANON_KEY") or _get_config_value(
        "VITE_SUPABASE_ANON_KEY"
    )

    if not supabase_url or not anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Supabase auth configuration missing. Set SUPABASE_URL and "
                "SUPABASE_ANON_KEY in backend/.env"
            ),
        )

    user_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
    response = requests.get(
        user_url,
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {token}",
        },
        timeout=8,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = response.json()
    return {
        "sub": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role", "authenticated"),
        "raw_user": user,
    }


def decode_supabase_token(token: str) -> Dict[str, Any]:
    # Try local JWT verification first, then fallback to Supabase user API.
    claims = _decode_with_jwt_secret(token)
    if not claims:
        claims = _decode_via_supabase_user_api(token)

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    return claims


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    claims = decode_supabase_token(credentials.credentials)
    return CurrentUser(claims)
