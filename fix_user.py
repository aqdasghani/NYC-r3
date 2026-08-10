import sqlite3
import datetime

conn = sqlite3.connect('backend/greenshop.db')
cursor = conn.cursor()

cursor.execute('SELECT id FROM stores LIMIT 1')
store_id = cursor.fetchone()[0]

cursor.execute("SELECT hashed_password FROM users WHERE email='rahul@greenshop.ai'")
hashed_pw = cursor.fetchone()[0]

user_id = '9065962d97664e9d8332a397818f864d'
email = 'sbhrnsnk@gmail.com'
now = datetime.datetime.now().isoformat()

cursor.execute('''
    INSERT OR IGNORE INTO users (id, name, email, phone, role, hashed_password, store_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (user_id, 'Admin (Restored)', email, '1234567890', 'OWNER', hashed_pw, store_id, now))

conn.commit()
print('User injected successfully! Store ID:', store_id)
