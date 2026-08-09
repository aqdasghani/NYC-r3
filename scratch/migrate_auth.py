import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "greenshop.db")

print(f"Migrating {db_path}...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Add new columns to users table
    cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
    cursor.execute("ALTER TABLE users ADD COLUMN last_login DATETIME")
    print("Added columns to users table.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Columns already exist in users table.")
    else:
        raise e

# Create audit_logs table
cursor.execute("""
CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(32) PRIMARY KEY,
    store_id CHAR(32) NOT NULL,
    user_id CHAR(32),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255),
    resource_id VARCHAR(255),
    metadata_json TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
)
""")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON audit_logs(store_id)")
print("Created audit_logs table.")

# Create invitations table
cursor.execute("""
CREATE TABLE IF NOT EXISTS invitations (
    id CHAR(32) PRIMARY KEY,
    store_id CHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    invited_by CHAR(32) NOT NULL,
    accepted_at DATETIME,
    created_at DATETIME NOT NULL,
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(invited_by) REFERENCES users(id)
)
""")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_invitations_store_id ON invitations(store_id)")
cursor.execute("CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email)")
print("Created invitations table.")

conn.commit()
conn.close()

print("Migration completed successfully.")
