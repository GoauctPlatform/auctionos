from app.core.config import settings

def get_base_template(content: str) -> str:
    """
    Base HTML wrapper for all GoAuct emails to ensure consistent branding.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
                        <tr>
                            <td style="background: linear-gradient(135deg, #0A84FF 0%, #12B3B6 100%); padding: 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">GoAuct</h1>
                                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Real Estate Intelligence OS</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                {content}
                            </td>
                        </tr>
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 24px; text-align: center;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                    &copy; 2026 GoAuct Intelligence. All rights reserved.
                                </p>
                                <div style="margin-top: 12px;">
                                    <a href="{settings.FRONTEND_URL}" style="color: #0A84FF; text-decoration: none; font-size: 12px;">Visit Platform</a>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_welcome_template(user_name: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Welcome to GoAuct, {user_name}!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Thank you for joining the most advanced real estate auction intelligence platform. Your account is now active and ready to help you find the best opportunities.
        </p>
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
            <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">What's next?</h3>
            <ul style="color: #64748b; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Explore the <strong>Auctions</strong> dashboard to see live events.</li>
                <li style="margin-bottom: 8px;">Add properties to your <strong>My List</strong> to receive alerts.</li>
                <li>Set up your <strong>Company Profile</strong> to collaborate with your team.</li>
            </ul>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/login" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(10, 132, 255, 0.2);">
                Get Started
            </a>
        </div>
    """
    return get_base_template(content)

def get_team_invite_template(invitee_name: str, inviter_name: str, company_name: str, role: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">You've been invited!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Hi <strong>{invitee_name}</strong>, you have been added to <strong>{company_name}</strong> as a <strong>{role}</strong> by {inviter_name}.
        </p>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0A84FF; padding: 16px; margin-bottom: 32px;">
            <p style="color: #0369a1; font-size: 14px; line-height: 20px; margin: 0;">
                Collaborate with your team, manage tasks, and track auction results in real-time.
            </p>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/login" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Join your Team
            </a>
        </div>
    """
    return get_base_template(content)

def get_plan_upgrade_template(user_name: str, plan_name: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Plan Upgraded Successfully!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Congratulations <strong>{user_name}</strong>! Your account has been upgraded to the <strong>{plan_name}</strong>.
        </p>
        <div style="background: linear-gradient(to right, #eff6ff, #f0fdfa); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
            <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">New Features Unlocked:</h3>
            <ul style="color: #64748b; font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Unlimited Property Exports</li>
                <li style="margin-bottom: 8px;">Advanced Due Diligence Tasks</li>
                <li>Priority Support and Notifications</li>
            </ul>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/dashboard" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Go to Dashboard
            </a>
        </div>
    """
    return get_base_template(content)

def get_new_auctions_template(auctions_list: list) -> str:
    """
    auctions_list is a list of dicts: [{'name': str, 'county': str, 'state': str, 'date': str}]
    """
    rows = ""
    for auction in auctions_list[:5]:  # Show top 5
        rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 0;">
                <div style="font-weight: 700; color: #0f172a; font-size: 14px;">{auction['name']}</div>
                <div style="font-size: 12px; color: #94a3b8;">{auction['county']}, {auction['state']}</div>
            </td>
            <td style="padding: 12px 0; text-align: right; color: #0A84FF; font-weight: 700; font-size: 14px;">
                {auction['date']}
            </td>
        </tr>
        """
    
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">New Opportunities Found!</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
            Our intelligence engine just identified new auctions added to the system. Here are the latest highlights:
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
            {rows}
        </table>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/auctions" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                View All New Auctions
            </a>
        </div>
    """
    return get_base_template(content)

def get_auction_reminder_template(address: str, date: str, days: int) -> str:
    content = f"""
        <div style="background-color: #fff7ed; border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: center; border: 1px solid #ffedd5;">
            <span style="color: #9a3412; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Upcoming Auction Alert</span>
        </div>
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">7 Days Remaining</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            The property at <strong>{address}</strong> is scheduled for auction on <strong>{date}</strong>. This is the perfect time to finalize your Due Diligence.
        </p>
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">Address:</p>
            <p style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 4px 0 0 0;">{address}</p>
        </div>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/my-list" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                Review Property Details
            </a>
        </div>
    """
    return get_base_template(content)

def get_task_update_template(task_title: str, status: str, updated_by: str) -> str:
    status_color = "#10b981" if status.lower() in ["completed", "reviewed"] else "#0A84FF"
    
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Task Update</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            The task <strong>"{task_title}"</strong> has been updated to <span style="color: {status_color}; font-weight: 700;">{status.upper()}</span> by {updated_by}.
        </p>
        <div style="text-align: center;">
            <a href="{settings.FRONTEND_URL}/#/tasks" style="display: inline-block; border: 2px solid #0A84FF; color: #0A84FF; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px;">
                View Task Status
            </a>
        </div>
    """
    return get_base_template(content)


def get_verification_email_template(name: str, verification_link: str) -> str:
    content = f"""
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Verify Your Email</h2>
        <p style="color: #64748b; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
            Hi {name},<br><br>
            Welcome to GoAuct! To start using your account and access our real estate intelligence tools, please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
            <a href="{verification_link}" style="display: inline-block; background-color: #0A84FF; color: #ffffff; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(10, 132, 255, 0.2);">
                Verify Email Address
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 0;">
            If you didn't create an account with GoAuct, you can safely ignore this email.
        </p>
    """
    return get_base_template(content)
