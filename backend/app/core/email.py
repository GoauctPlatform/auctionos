from typing import List
import resend
from app.core.config import settings
from pydantic import EmailStr

# Configure Resend
resend.api_key = settings.RESEND_API_KEY

async def send_email(subject: str, recipients: List[EmailStr], body: str):
    """
    Send an email asynchronously using Resend API.
    """
    if not settings.RESEND_API_KEY:
        print("CRITICAL: RESEND_API_KEY not configured. Email sending failed.")
        return False

    # Use MAIL_FROM if configured, otherwise use Resend's default onboarding email
    # Note: Resend requires a verified domain to use custom MAIL_FROM addresses.
    # If using the test key or no verified domain, 'onboarding@resend.dev' must be used.
    from_email = settings.MAIL_FROM if settings.MAIL_FROM and "@" in settings.MAIL_FROM else "onboarding@resend.dev"
    
    # If the domain is not verified, Resend only allows sending to the account owner email.
    # For initial testing, this is usually fine.
    
    try:
        # Resend library handles the HTTP request
        params = {
            "from": f"{settings.MAIL_FROM_NAME} <{from_email}>",
            "to": recipients,
            "subject": subject,
            "html": body,
        }
        
        response = resend.Emails.send(params)
        print(f"Resend API Response: {response}")
        return True
    except Exception as e:
        print(f"Resend API Error: {str(e)}")
        return False
