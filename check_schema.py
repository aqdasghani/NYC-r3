import sqlite3

db_path = r'C:\Users\sbhrn\.gemini\antigravity\scratch\greenshop-ai\.claude\worktrees\audit-fix\backend\greenshop.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check table schema
schema = cursor.execute("PRAGMA table_info(users)").fetchall()
print('=== USERS SCHEMA ===')
for col in schema:
    print(col)

# Get exact stored value for sbhrnsnk
user = cursor.execute("SELECT id, typeof(id), length(id) FROM users WHERE email='sbhrnsnk@gmail.com'").fetchone()
print('sbhrnsnk row:', user)

# Get exact stored value for rahul 
user2 = cursor.execute("SELECT id, typeof(id), length(id) FROM users WHERE email='rahul@greenshop.ai'").fetchone()
print('rahul row:', user2)
conn.close()
