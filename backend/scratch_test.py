import sys
sys.path.append(".")
from backend.app.auth import get_password_hash, verify_password

pw = "password"
h = get_password_hash(pw)
print("Hashed:", h)
print("Verify correct:", verify_password(pw, h))
print("Verify wrong:", verify_password("wrong", h))
