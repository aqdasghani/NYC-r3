import sqlite3

db_path = r'C:\Users\sbhrn\.gemini\antigravity\scratch\greenshop-ai\.claude\worktrees\audit-fix\backend\greenshop.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

users = cursor.execute('SELECT id, email, role, store_id FROM users').fetchall()
print('=== EXISTING USERS ===')
for u in users:
    print(u)

owner = cursor.execute("SELECT id, store_id FROM users WHERE email='rahul@greenshop.ai'").fetchone()
print('Owner:', owner)

conn.close()
