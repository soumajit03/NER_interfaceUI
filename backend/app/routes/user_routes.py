from fastapi import APIRouter, Depends

from ..auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/me")
def read_me(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "id": current_user.get("sub"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
    }
