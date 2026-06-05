from sqlalchemy import create_engine, text

db_url = "postgresql://postgres:JbEkstWQnhmNJQLMoXCefBntLFHsfSOx@crossover.proxy.rlwy.net:43302/railway"

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT email, hashed_password FROM users WHERE email='admin@goauct.com'")).first()
        if res:
            print(f"Email: {res[0]}")
            print(f"Hashed Password: {res[1]}")
        else:
            print("User not found!")
except Exception as e:
    print(f"Error: {e}")
