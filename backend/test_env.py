import os
from dotenv import load_dotenv

load_dotenv()
print("ATTOM_API_KEY from .env:", os.getenv("ATTOM_API_KEY"))
