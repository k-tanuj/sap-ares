from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional, Dict, Any

from .. import crud, schemas, auth, models
from ..database import get_db
from ..services.sso_service import EnterpriseSSOService

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register-supplier", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_supplier(payload: schemas.UserCreate, org_name: str, db: Session = Depends(get_db)):
    """
    Registers a new supplier organization and its admin user.
    Organization starts in REGISTERED status.
    """
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check if organization ID is unique
    existing_org = crud.get_organization(db, payload.organization_id)
    if existing_org:
        raise HTTPException(status_code=400, detail="Organization ID already exists")

    # Create Organization
    org_schema = schemas.OrganizationCreate(
        id=payload.organization_id,
        name=org_name,
        type="SUPPLIER",
        onboarding_status="REGISTERED"
    )
    crud.create_organization(db, org_schema)

    # Create User
    user = crud.create_user(db, payload)
    
    # Initialize Supplier Profile
    profile_schema = schemas.SupplierProfileCreate(
        organization_id=payload.organization_id
    )
    crud.create_supplier_profile(db, profile_schema)

    # Log audit action
    crud.log_action(
        db,
        action="SUPPLIER_REGISTERED",
        entity_type="Organization",
        entity_id=payload.organization_id,
        description=f"Supplier organization '{org_name}' registered by '{payload.email}'.",
        user_id=user.id,
        email=user.email
    )

    return user

@router.post("/login", response_model=schemas.Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, returning JWT token and setting an HttpOnly secure cookie.
    """
    user = crud.get_user_by_email(db, form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    # Create access token
    access_token_expires = timedelta(minutes=auth.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role, "org": user.organization_id},
        expires_delta=access_token_expires
    )
    
    # Set HttpOnly, Secure cookie to protect against XSS token theft
    response.set_cookie(
        key="ares_access_token",
        value=access_token,
        httponly=True,
        max_age=auth.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,  # Set to True in HTTPS production
        path="/"
    )

    # Audit log
    crud.log_action(
        db,
        action="USER_LOGIN",
        entity_type="User",
        entity_id=user.id,
        description=f"User {user.email} successfully logged in.",
        user_id=user.id,
        email=user.email
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """
    Logs out the user and clears the HttpOnly auth cookie.
    """
    response.delete_cookie(key="ares_access_token", path="/")
    crud.log_action(
        db,
        action="USER_LOGOUT",
        entity_type="User",
        entity_id=current_user.id,
        description=f"User {current_user.email} logged out.",
        user_id=current_user.id,
        email=current_user.email
    )
    return {"status": "SUCCESS", "message": "Successfully logged out."}

@router.get("/sso/providers")
def get_sso_providers():
    """
    List configured enterprise SSO Identity Providers (SAP IAS, Azure AD, Okta).
    """
    return EnterpriseSSOService.get_available_providers()

@router.get("/sso/authorize")
def authorize_sso(provider: str, redirect_uri: str = "http://localhost:3000/auth/callback"):
    """
    Generates OIDC / SAML SSO redirection URL for corporate IDP authentication.
    """
    try:
        return EnterpriseSSOService.generate_sso_authorization_url(provider, redirect_uri)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sso/callback")
def sso_callback(
    response: Response,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Validates enterprise SSO IDP token, auto-provisions user, and sets HttpOnly session cookie.
    """
    provider = payload.get("provider", "SAP_IAS")
    code = payload.get("code", "mock_sso_code")
    email = payload.get("email")

    user, token = EnterpriseSSOService.process_sso_login(
        provider_id=provider,
        code=code,
        user_email=email,
        db=db
    )

    response.set_cookie(
        key="ares_access_token",
        value=token,
        httponly=True,
        max_age=auth.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,
        path="/"
    )

    return {
        "status": "SUCCESS",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "organization_id": user.organization_id
        }
    }

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    """
    Returns current authenticated user details.
    """
    return current_user

