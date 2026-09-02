from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
import bcrypt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User, Organization
from .schemas import TokenData
from .tenant import set_current_tenant

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

from fastapi import Request

def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Priority 1: Check HttpOnly Secure Cookie ('ares_access_token')
    # Priority 2: Check Authorization: Bearer header
    token = request.cookies.get("ares_access_token") or bearer_token
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
        
    # Bind tenant scope for the active request execution
    set_current_tenant(user.organization_id, user.role)
    return user

def require_role(allowed_roles: list[str]):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized to access this resource"
            )
        return current_user
    return dependency

# Specific role shortcuts
require_buyer = require_role(["BUYER_ADMIN", "BUYER_USER"])
require_supplier = require_role(["SUPPLIER_ADMIN", "SUPPLIER_USER"])
require_admin = require_role(["BUYER_ADMIN", "SUPPLIER_ADMIN"])

def get_supplier_org(current_user: User = Depends(require_supplier), db: Session = Depends(get_db)) -> Organization:
    """
    Retrieves the supplier organization, verifying its onboarding status is APPROVED or ACTIVE.
    """
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier organization not found")
    
    if org.onboarding_status not in ["APPROVED", "ACTIVE"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Supplier status is '{org.onboarding_status}'. Trusted operational portal is restricted."
        )
    return org
