from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.core.database import SessionLocal
from app.models.department import Department

DEFAULT_DEPARTMENTS = (
    ("Public Works", "PUBLIC_WORKS", "Roads and public infrastructure."),
    ("Water Department", "WATER", "Water supply and distribution."),
    ("Electrical", "ELECTRICAL", "Streetlights and electrical infrastructure."),
    ("Waste Management", "WASTE", "Household and public waste collection."),
    ("Sanitation", "SANITATION", "Drainage and sanitation services."),
    ("Health", "HEALTH", "Public health concerns."),
    ("General Services", "GENERAL", "Requests outside a specialized department."),
)


def ensure_workflow_columns(engine: Engine) -> None:
    additions = {
        "users": {"department_id": "INTEGER"},
        "service_requests": {
            "department_id": "INTEGER",
            "assigned_officer_id": "INTEGER",
        },
    }
    with engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, columns in additions.items():
            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name not in existing_columns:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} NULL"))
        if engine.dialect.name != "sqlite":
            foreign_keys = {
                (foreign_key["referred_table"], tuple(foreign_key["constrained_columns"]))
                for table_name in additions
                for foreign_key in inspector.get_foreign_keys(table_name)
            }
            constraints = (
                ("users", "fk_users_department_id", "department_id", "departments", "id"),
                ("service_requests", "fk_service_requests_department_id", "department_id", "departments", "id"),
                ("service_requests", "fk_service_requests_assigned_officer_id", "assigned_officer_id", "users", "id"),
            )
            for table_name, constraint_name, column_name, referred_table, referred_column in constraints:
                if (referred_table, (column_name,)) not in foreign_keys:
                    connection.execute(text(
                        f"ALTER TABLE {table_name} ADD CONSTRAINT {constraint_name} "
                        f"FOREIGN KEY ({column_name}) REFERENCES {referred_table}({referred_column})"
                    ))


def seed_default_departments() -> None:
    with SessionLocal() as db:
        for name, code, description in DEFAULT_DEPARTMENTS:
            department = db.query(Department).filter(Department.code == code).first()
            if department is None:
                db.add(Department(name=name, code=code, description=description, is_active=True))
        db.commit()