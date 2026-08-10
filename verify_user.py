import sqlite3

db_path = r'C:\Users\sbhrn\.gemini\antigravity\scratch\greenshop-ai\.claude\worktrees\audit-fix\backend\greenshop.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check all users
users = cursor.execute('SELECT id, email, role, store_id FROM users').fetchall()
print('=== ALL USERS ===')
for u in users:
    print(u)

# Direct lookup by ID (both with and without dashes)
u1 = cursor.execute("SELECT * FROM users WHERE id='9065962d97664e9d8332a397818f864d'").fetchone()
u2 = cursor.execute("SELECT * FROM users WHERE id='9065962d-9766-4e9d-8332-a397818f864d'").fetchone()
print('By hex ID:', u1)
print('By dashed ID:', u2)

conn.close()
