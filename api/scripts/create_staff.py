import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.department import Department
from app.models.user import User, UserRole


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an admin or officer account")
    parser.add_argument("role", choices=("admin", "officer"))
    parser.add_argument("email")
    parser.add_argument("name")
    parser.add_argument("--department-code", help="Required for officer accounts, e.g. PUBLIC_WORKS")
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match")
    if len(password) < 8:
        raise SystemExit("Password must contain at least 8 characters")

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == args.email)):
            raise SystemExit("A user with this email already exists")

        department_id = None
        if args.role == "officer":
            if not args.department_code:
                raise SystemExit("--department-code is required for officers")
            department = db.scalar(
                select(Department).where(
                    Department.code == args.department_code.upper(),
                    Department.is_active.is_(True),
                )
            )
            if department is None:
                raise SystemExit("Active department code was not found")
            department_id = department.id

        user = User(
            name=args.name,
            email=args.email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN if args.role == "admin" else UserRole.OFFICER,
            department_id=department_id,
        )
        db.add(user)
        db.commit()
        print(f"Created {args.role} account: {args.email}")


if __name__ == "__main__":
    main()
