import sqlite3
import datetime
import hashlib

# The ACTUAL running backend database
db_path = r'C:\Users\sbhrn\.gemini\antigravity\scratch\greenshop-ai\.claude\worktrees\audit-fix\backend\greenshop.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get the owner's hashed_password and store_id
owner = cursor.execute("SELECT id, store_id, hashed_password FROM users WHERE email='rahul@greenshop.ai'").fetchone()
print('Owner:', owner[:2])

store_id = owner[1]
hashed_pw = owner[2]

# The user ID from the JWT token they have in browser
user_id = '9065962d-9766-4e9d-8332-a397818f864d'  # from the JWT sub in the error message
email = 'sbhrnsnk@gmail.com'
now = datetime.datetime.now().isoformat()

# Remove dashes from UUID for CHAR(32) storage
user_id_hex = user_id.replace('-', '')
store_id_hex = store_id  # already without dashes

cursor.execute('''
    INSERT OR IGNORE INTO users (id, name, email, phone, role, hashed_password, store_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (user_id_hex, 'Admin (sbhrnsnk)', email, '1234567890', 'OWNER', hashed_pw, store_id_hex, now))

conn.commit()

# Verify
user = cursor.execute("SELECT id, email, role, store_id FROM users WHERE email='sbhrnsnk@gmail.com'").fetchone()
print('Injected user:', user)

conn.close()
