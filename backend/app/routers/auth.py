from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from .. import crud, schemas, auth, models
from ..database import get_db

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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 compatible token login, returning a JWT token.
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

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    """
    Returns current authenticated user details.
    """
    return current_user
